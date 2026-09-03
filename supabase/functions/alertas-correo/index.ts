// Vacía la bandeja de salida de avisos por correo.
//
// El mensaje ya viene redactado desde la base -lo escribe el disparador que
// avisa de una solicitud cancelada-, así que aquí no se decide qué dice nada:
// se toma lo pendiente, se manda por Infobip y se marca. Eso mantiene el texto
// del correo y el de la campana en un solo lugar, y deja esta función lo bastante
// tonta como para no tener que tocarla cuando se agregue otro tipo de aviso.
//
// Se corre desde un programador cada pocos minutos, autenticada con el mismo
// patrón de secreto que los recordatorios de WhatsApp.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { esSecretoBearerValido } from "../_shared/request-auth.js";

// Un correo que falla se reintenta en la siguiente corrida, pero no para
// siempre: una dirección mal escrita fallaría cada cinco minutos hasta el fin
// de los tiempos. A los tres intentos se marca como error y ahí queda, visible
// para quien revise la tabla.
const MAXIMO_INTENTOS = 3;
const LOTE = 25;

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});

const enviarCorreoInfobip = async ({
	baseUrl,
	apiKey,
	remitente,
	destinatario,
	asunto,
	texto,
	html,
}: {
	baseUrl: string;
	apiKey: string;
	remitente: string;
	destinatario: string;
	asunto: string;
	texto: string;
	html: string;
}) => {
	// La API de correo de Infobip recibe multipart, no JSON.
	const formulario = new FormData();
	formulario.append("from", remitente);
	formulario.append("to", destinatario);
	formulario.append("subject", asunto);
	formulario.append("text", texto);
	formulario.append("html", html);

	const respuesta = await fetch(`${baseUrl.replace(/\/$/, "")}/email/3/send`, {
		method: "POST",
		headers: { Authorization: `App ${apiKey}` },
		body: formulario,
	});

	const datos = await respuesta.json().catch(() => ({}));
	if (!respuesta.ok) {
		throw new Error(
			datos?.requestError?.serviceException?.text ||
				datos?.message ||
				`Infobip respondio ${respuesta.status}`,
		);
	}
	return datos;
};

Deno.serve(async (req) => {
	if (req.method !== "POST") {
		return json({ error: "Metodo no permitido" }, 405);
	}

	const cronSecret = Deno.env.get("ALERTAS_CRON_SECRET");
	if (!cronSecret) {
		return json({ error: "Falta configurar el secreto de alertas" }, 500);
	}
	if (!esSecretoBearerValido(req.headers.get("Authorization"), cronSecret)) {
		return json({ error: "No autorizado" }, 401);
	}

	const supabaseUrl = Deno.env.get("SUPABASE_URL");
	const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
	const infobipBaseUrl = Deno.env.get("INFOBIP_BASE_URL");
	const infobipApiKey = Deno.env.get("INFOBIP_API_KEY");
	const remitente = Deno.env.get("INFOBIP_EMAIL_FROM");

	if (!supabaseUrl || !serviceRoleKey) {
		return json({ error: "Faltan variables de entorno de Supabase" }, 500);
	}
	if (!infobipBaseUrl || !infobipApiKey || !remitente) {
		return json({ error: "Faltan variables de entorno de Infobip" }, 500);
	}

	const supabase = createClient(supabaseUrl, serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});

	const { data: pendientes, error } = await supabase
		.from("notificaciones_correo")
		.select("id, destinatario, asunto, cuerpo_texto, cuerpo_html, intentos")
		.eq("estado", "pendiente")
		.order("created_at", { ascending: true })
		.limit(LOTE);

	if (error) return json({ error: error.message }, 500);

	const resumen = { enviados: 0, errores: 0, agotados: 0 };

	for (const correo of pendientes || []) {
		try {
			await enviarCorreoInfobip({
				baseUrl: infobipBaseUrl,
				apiKey: infobipApiKey,
				remitente,
				destinatario: correo.destinatario,
				asunto: correo.asunto,
				texto: correo.cuerpo_texto,
				html: correo.cuerpo_html,
			});

			await supabase
				.from("notificaciones_correo")
				.update({
					estado: "enviado",
					enviado_at: new Date().toISOString(),
					intentos: (correo.intentos || 0) + 1,
					error: null,
				})
				.eq("id", correo.id);
			resumen.enviados += 1;
		} catch (fallo) {
			const intentos = (correo.intentos || 0) + 1;
			const agotado = intentos >= MAXIMO_INTENTOS;
			await supabase
				.from("notificaciones_correo")
				.update({
					estado: agotado ? "error" : "pendiente",
					intentos,
					error: String((fallo as Error)?.message || fallo).slice(0, 500),
				})
				.eq("id", correo.id);
			if (agotado) resumen.agotados += 1;
			else resumen.errores += 1;
		}
	}

	return json({ ok: true, revisados: (pendientes || []).length, ...resumen });
});
