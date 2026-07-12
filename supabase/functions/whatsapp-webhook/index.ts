import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validarFirmaTwilio } from "../_shared/twilio-signature.js";

const twiml = (message = "", status = 200) =>
	new Response(`<Response>${message ? `<Message>${message}</Message>` : ""}</Response>`, {
		status,
		headers: { "Content-Type": "text/xml" },
	});

const normalizarTelefonoDesdeWhatsapp = (telefono: unknown, codigoPais = "52") => {
	const digitos = String(telefono || "").replace(/\D/g, "");
	if (!digitos) return null;

	const prefijoWhatsappMexico = codigoPais === "52" ? "521" : codigoPais;
	if (
		digitos.startsWith(prefijoWhatsappMexico) &&
		digitos.length === prefijoWhatsappMexico.length + 10
	) {
		return digitos.slice(prefijoWhatsappMexico.length);
	}
	if (digitos.startsWith(codigoPais) && digitos.length === codigoPais.length + 10) {
		return digitos.slice(codigoPais.length);
	}
	if (digitos.length === 10) return digitos;
	return null;
};

const obtenerAccionConfirmacionWhatsapp = ({
	buttonPayload,
	body,
}: {
	buttonPayload?: string | null;
	body?: string | null;
}) => {
	const valor = String(buttonPayload || body || "").trim().toLowerCase();

	if (["confirmar_cita", "confirmar", "confirmada"].includes(valor)) {
		return {
			estadoCita: "confirmada",
			estadoWhatsapp: "confirmada",
			respuesta: "Tu cita ha sido confirmada. Gracias.",
		};
	}
	if (["cancelar_cita", "cancelar", "cancelada"].includes(valor)) {
		return {
			estadoCita: "cancelada",
			estadoWhatsapp: "cancelada",
			respuesta: "Tu cita ha sido cancelada. Nos pondremos en contacto para reagendar.",
		};
	}
	return null;
};

Deno.serve(async (req) => {
	if (req.method !== "POST") return twiml();

	const supabaseUrl = Deno.env.get("SUPABASE_URL");
	const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
	const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
	const twilioWebhookUrl = Deno.env.get("TWILIO_WEBHOOK_URL");
	const codigoPais = Deno.env.get("WHATSAPP_DEFAULT_COUNTRY_CODE") || "52";

	if (!supabaseUrl || !serviceRoleKey || !twilioAuthToken || !twilioWebhookUrl) {
		return twiml("No pudimos procesar tu respuesta en este momento.");
	}

	const rawBody = await req.text();
	const params = new URLSearchParams(rawBody);
	const firma = req.headers.get("X-Twilio-Signature");
	if (!(await validarFirmaTwilio(twilioAuthToken, firma, twilioWebhookUrl, params))) {
		return twiml("", 403);
	}
	const from = params.get("From");
	const body = params.get("Body");
	const buttonPayload = params.get("ButtonPayload") || params.get("ButtonText");
	const messageSid = params.get("MessageSid") || params.get("SmsSid");

	const telefono = normalizarTelefonoDesdeWhatsapp(from, codigoPais);
	const accion = obtenerAccionConfirmacionWhatsapp({ buttonPayload, body });

	if (!telefono || !accion || !messageSid) return twiml();

	const supabase = createClient(supabaseUrl, serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});

	const { data: cita, error: citaError } = await supabase
		.from("citas")
		.select("id_cita")
		.eq("telefono_paciente", telefono)
		.not("whatsapp_recordatorio_enviado_at", "is", null)
		.eq("whatsapp_confirmacion_estado", "pendiente")
		.is("whatsapp_respuesta_sid", null)
		.order("fecha_estudio", { ascending: true })
		.limit(1)
		.maybeSingle();

	if (citaError || !cita?.id_cita) {
		return twiml("No encontramos una cita pendiente para este telefono.");
	}

	const { error: updateError } = await supabase
		.from("citas")
		.update({
			estado: accion.estadoCita,
			whatsapp_confirmacion_estado: accion.estadoWhatsapp,
			whatsapp_confirmacion_respuesta: buttonPayload || body || null,
			whatsapp_confirmacion_at: new Date().toISOString(),
			whatsapp_respuesta_sid: messageSid,
		})
		.eq("id_cita", cita.id_cita)
		.is("whatsapp_respuesta_sid", null);

	if (updateError) {
		return twiml("No pudimos procesar tu respuesta en este momento.");
	}

	return twiml(accion.respuesta);
});
