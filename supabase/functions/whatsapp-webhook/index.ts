import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { esSecretoBearerValido } from "../_shared/request-auth.js";

const respuestaVacia = (status = 200) => new Response(null, { status });

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

const extraerRespuestaInfobip = (payload: unknown, codigoPais: string) => {
	const resultado = (payload as { results?: Array<Record<string, unknown>> })?.results?.[0];
	const mensaje = resultado?.message as {
		type?: string;
		text?: string;
		interactive?: { buttonReply?: { id?: string } };
	} | undefined;
	const from = resultado?.from as string | undefined;
	const messageId = resultado?.messageId as string | undefined;
	if (!from || !messageId || !mensaje) return null;

	const buttonPayload = mensaje.interactive?.buttonReply?.id || null;
	const body = mensaje.type === "TEXT" ? mensaje.text || null : null;
	const telefono = normalizarTelefonoDesdeWhatsapp(from, codigoPais);
	if (!telefono || (!buttonPayload && !body)) return null;
	return { telefono, messageId, buttonPayload, body };
};

Deno.serve(async (req) => {
	if (req.method !== "POST") return respuestaVacia(405);

	const supabaseUrl = Deno.env.get("SUPABASE_URL");
	const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
	const infobipWebhookSecret = Deno.env.get("INFOBIP_WEBHOOK_SECRET");
	const codigoPais = Deno.env.get("WHATSAPP_DEFAULT_COUNTRY_CODE") || "52";

	if (!supabaseUrl || !serviceRoleKey || !infobipWebhookSecret) {
		return respuestaVacia(500);
	}
	if (!esSecretoBearerValido(req.headers.get("Authorization"), infobipWebhookSecret)) {
		return respuestaVacia(403);
	}

	const payload = await req.json().catch(() => null);
	const respuesta = extraerRespuestaInfobip(payload, codigoPais);
	if (!respuesta) return respuestaVacia();

	const accion = obtenerAccionConfirmacionWhatsapp(respuesta);

	if (!accion) return respuestaVacia();

	const supabase = createClient(supabaseUrl, serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});

	const { data: cita, error: citaError } = await supabase
		.from("citas")
		.select("id_cita")
		.eq("telefono_paciente", respuesta.telefono)
		.not("whatsapp_recordatorio_enviado_at", "is", null)
		.eq("whatsapp_confirmacion_estado", "pendiente")
		.is("whatsapp_respuesta_sid", null)
		.order("fecha_estudio", { ascending: true })
		.limit(1)
		.maybeSingle();

	if (citaError || !cita?.id_cita) {
		return respuestaVacia();
	}

	const { error: updateError } = await supabase
		.from("citas")
		.update({
			estado: accion.estadoCita,
			whatsapp_confirmacion_estado: accion.estadoWhatsapp,
			whatsapp_confirmacion_respuesta: respuesta.buttonPayload || respuesta.body,
			whatsapp_confirmacion_at: new Date().toISOString(),
			whatsapp_respuesta_sid: respuesta.messageId,
		})
		.eq("id_cita", cita.id_cita)
		.is("whatsapp_respuesta_sid", null);

	if (updateError) {
		return respuestaVacia(500);
	}

	return respuestaVacia();
});
