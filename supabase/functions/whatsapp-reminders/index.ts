import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { esSecretoBearerValido } from "../_shared/request-auth.js";

const CINCO_MINUTOS_MS = 5 * 60 * 1000;
const VEINTICUATRO_HORAS_MS = 24 * 60 * 60 * 1000;
const TIMEZONE_RECORDATORIOS = "America/Mexico_City";

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});

const formatearFechaHoraLocalSQL = (fecha: Date) => {
	const partes = new Intl.DateTimeFormat("en-CA", {
		timeZone: TIMEZONE_RECORDATORIOS,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23",
	}).formatToParts(fecha);
	const valor = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value;

	return `${valor("year")}-${valor("month")}-${valor("day")}T${valor("hour")}:${valor("minute")}:${valor("second")}`;
};

const obtenerVentanaRecordatorio = (fechaBase = new Date()) => {
	const objetivo = fechaBase.getTime() + VEINTICUATRO_HORAS_MS;

	return {
		inicio: formatearFechaHoraLocalSQL(new Date(objetivo - CINCO_MINUTOS_MS)),
		fin: formatearFechaHoraLocalSQL(new Date(objetivo + CINCO_MINUTOS_MS)),
	};
};

const normalizarTelefonoWhatsapp = (telefono: unknown, codigoPais = "52") => {
	const digitos = String(telefono || "").replace(/\D/g, "");
	if (!digitos) return null;

	const prefijoWhatsappMexico = codigoPais === "52" ? "521" : codigoPais;
	const sinPrefijo = digitos.startsWith(prefijoWhatsappMexico) && digitos.length === prefijoWhatsappMexico.length + 10
		? digitos.slice(prefijoWhatsappMexico.length)
		: digitos.startsWith(codigoPais) && digitos.length === codigoPais.length + 10
			? digitos.slice(codigoPais.length)
		: digitos;

	if (sinPrefijo.length !== 10) return null;
	return `whatsapp:+${prefijoWhatsappMexico}${sinPrefijo}`;
};

const MESES_ES = [
	"enero",
	"febrero",
	"marzo",
	"abril",
	"mayo",
	"junio",
	"julio",
	"agosto",
	"septiembre",
	"octubre",
	"noviembre",
	"diciembre",
];

const obtenerPartesFechaEstudioLocal = (fechaEstudio: string) => {
	const match = String(fechaEstudio || "").match(
		/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/,
	);

	if (match) {
		return {
			year: Number(match[1]),
			month: Number(match[2]),
			day: Number(match[3]),
			hour: match[4],
			minute: match[5],
		};
	}

	const fecha = new Date(fechaEstudio);
	return {
		year: fecha.getFullYear(),
		month: fecha.getMonth() + 1,
		day: fecha.getDate(),
		hour: String(fecha.getHours()).padStart(2, "0"),
		minute: String(fecha.getMinutes()).padStart(2, "0"),
	};
};

const construirMensajeRecordatorio = ({
	nombrePaciente,
	tipoEstudio,
	fechaEstudio,
}: {
	nombrePaciente?: string | null;
	tipoEstudio?: string | null;
	fechaEstudio: string;
}) => {
	const partes = obtenerPartesFechaEstudioLocal(fechaEstudio);
	const fechaTexto = `${partes.day} de ${MESES_ES[partes.month - 1]}`;
	const horaTexto = `${partes.hour}:${partes.minute}`;

	return `Hola ${nombrePaciente || "paciente"}, confirmamos tu cita de ${tipoEstudio || "estudio"} para el ${fechaTexto} a las ${horaTexto}. Responde CONFIRMAR para confirmar tu asistencia o CANCELAR si necesitas reagendar.`;
};

const construirVariablesTemplateRecordatorio = (fechaEstudio: string) => {
	const partes = obtenerPartesFechaEstudioLocal(fechaEstudio);

	return {
		1: `${partes.day}/${partes.month}`,
		2: `${partes.hour}:${partes.minute}`,
	};
};

const enviarWhatsappTwilio = async ({
	accountSid,
	authToken,
	from,
	to,
	body,
	contentSid,
	contentVariables,
}: {
	accountSid: string;
	authToken: string;
	from: string;
	to: string;
	body?: string;
	contentSid?: string;
	contentVariables?: Record<string, string>;
}) => {
	const params = new URLSearchParams({ From: from, To: to });
	if (contentSid) {
		params.set("ContentSid", contentSid);
		params.set("ContentVariables", JSON.stringify(contentVariables || {}));
	} else if (body) {
		params.set("Body", body);
	}

	const response = await fetch(
		`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
		{
			method: "POST",
			headers: {
				Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: params,
		},
	);

	const data = await response.json().catch(() => ({}));
	if (!response.ok) {
		throw new Error(data?.message || "No se pudo enviar WhatsApp con Twilio");
	}
	return data;
};

Deno.serve(async (req) => {
	if (req.method !== "POST") {
		return json({ error: "Metodo no permitido" }, 405);
	}

	const remindersCronSecret = Deno.env.get("REMINDERS_CRON_SECRET");
	if (!remindersCronSecret) {
		return json({ error: "Falta configurar el secreto de recordatorios" }, 500);
	}
	if (!esSecretoBearerValido(req.headers.get("Authorization"), remindersCronSecret)) {
		return json({ error: "No autorizado" }, 401);
	}

	const supabaseUrl = Deno.env.get("SUPABASE_URL");
	const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
	const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
	const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
	const twilioWhatsappFrom = Deno.env.get("TWILIO_WHATSAPP_FROM");
	const twilioContentSid = Deno.env.get("TWILIO_CONTENT_SID");
	const codigoPais = Deno.env.get("WHATSAPP_DEFAULT_COUNTRY_CODE") || "52";

	if (!supabaseUrl || !serviceRoleKey) {
		return json({ error: "Faltan variables de entorno de Supabase" }, 500);
	}
	if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsappFrom) {
		return json({ error: "Faltan variables de entorno de Twilio" }, 500);
	}

	const supabase = createClient(supabaseUrl, serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
	const { inicio, fin } = obtenerVentanaRecordatorio();

	const { data: citas, error } = await supabase
		.from("citas")
		.select(`
			id_cita,
			fecha_estudio,
			estado,
			tipo_estudio,
			nombre_paciente,
			telefono_paciente,
			pacientes ( nombre, telefono )
		`)
		.gte("fecha_estudio", inicio)
		.lte("fecha_estudio", fin)
		.is("whatsapp_recordatorio_enviado_at", null)
		.not("estado", "eq", "cancelada")
		.order("fecha_estudio", { ascending: true })
		.limit(100);

	if (error) return json({ error: error.message }, 500);

	const resumen = { enviados: 0, sin_telefono: 0, errores: 0 };

	for (const cita of citas || []) {
		const paciente = Array.isArray(cita.pacientes) ? cita.pacientes[0] : cita.pacientes;
		const telefono = normalizarTelefonoWhatsapp(
			cita.telefono_paciente || paciente?.telefono,
			codigoPais,
		);

		if (!telefono) {
			await supabase
				.from("citas")
				.update({ whatsapp_confirmacion_estado: "sin_telefono" })
				.eq("id_cita", cita.id_cita);
			resumen.sin_telefono += 1;
			continue;
		}

		try {
			const mensaje = construirMensajeRecordatorio({
				nombrePaciente: cita.nombre_paciente || paciente?.nombre,
				tipoEstudio: cita.tipo_estudio,
				fechaEstudio: cita.fecha_estudio,
			});

			const twilio = await enviarWhatsappTwilio({
				accountSid: twilioAccountSid,
				authToken: twilioAuthToken,
				from: twilioWhatsappFrom,
				to: telefono,
				body: mensaje,
				contentSid: twilioContentSid || undefined,
				contentVariables: construirVariablesTemplateRecordatorio(cita.fecha_estudio),
			});

			await supabase
				.from("citas")
				.update({
					whatsapp_recordatorio_enviado_at: new Date().toISOString(),
					whatsapp_confirmacion_estado: "pendiente",
					whatsapp_recordatorio_sid: twilio.sid || null,
					whatsapp_confirmacion_respuesta: null,
				})
				.eq("id_cita", cita.id_cita);

			resumen.enviados += 1;
		} catch (err) {
			await supabase
				.from("citas")
				.update({
					whatsapp_confirmacion_estado: "error_envio",
					whatsapp_confirmacion_respuesta: err instanceof Error ? err.message : String(err),
				})
				.eq("id_cita", cita.id_cita);
			console.error("No se pudo enviar recordatorio", { id_cita: cita.id_cita });
			resumen.errores += 1;
		}
	}

	return json({
		ok: true,
		procesadas: resumen.enviados + resumen.sin_telefono + resumen.errores,
		resumen,
	});
});
