import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { esSecretoBearerValido } from "../_shared/request-auth.js";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
	if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
	const secret = Deno.env.get("SWELAB_IMPORT_SECRET");
	const url = Deno.env.get("SUPABASE_URL");
	// Esta integración usa supabase-js, que necesita el service_role legacy JWT
	// (eyJ...) para el encabezado Authorization; no acepta sb_secret aquí.
	const serviceKey = Deno.env.get("SWELAB_LEGACY_SERVICE_ROLE_KEY");
	if (!secret || !url || !serviceKey) return json({ error: "Integración no configurada" }, 500);
	if (!esSecretoBearerValido(req.headers.get("Authorization"), secret)) return json({ error: "No autorizado" }, 401);
	const payload = await req.json().catch(() => null);
	const folio = String(payload?.folio || "").trim();
	const resultados = Array.isArray(payload?.resultados) ? payload.resultados : [];
	if (!folio || !resultados.length) return json({ error: "Folio y resultados son obligatorios" }, 400);
	if (resultados.some((r) => !/^BH\d+$/.test(String(r.clave || "")) || r.id === undefined || !String(r.valor ?? "").trim())) return json({ error: "Lote BHC inválido" }, 400);
	if (new Set(resultados.map((r) => r.clave)).size !== resultados.length) return json({ error: "Analito duplicado" }, 400);

	const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
	const { data: venta, error: ventaError } = await db.from("ventas").select("id_venta").eq("folio", folio).maybeSingle();
	if (ventaError) return json({ error: "Error al consultar folio", detalle: ventaError.message }, 500);
	if (!venta) return json({ error: "Folio no encontrado" }, 422);
	const { data: estudios } = await db.from("estudios_venta").select("id_estudio_venta, estado_validacion").eq("id_venta", venta.id_venta).eq("clave_estudio", "BHC").neq("estado_validacion", "validado");
	if (estudios?.length !== 1) return json({ error: "BHC no elegible o ambiguo" }, 422);
	const { data: analitos } = await db.from("estudio_analitos").select("analitos!inner(clave)").eq("clave_estudio", "BHC");
	const permitidos = new Set((analitos || []).map((a: any) => a.analitos?.clave));
	if (resultados.some((r) => !permitidos.has(r.clave))) return json({ error: "Analito sin mapeo BHC" }, 422);
	const ids = resultados.map((r) => r.id);
	const { data: anteriores } = await db.from("swelab_importaciones").select("resultado_origen_id").in("resultado_origen_id", ids);
	if (anteriores?.length) return json({ error: "Resultado ya importado" }, 409);
	const valores = Object.fromEntries(resultados.map((r) => [r.clave, String(r.valor)]));
	const idEstudio = estudios[0].id_estudio_venta;
	const { error } = await db.from("estudios_venta").update({ resultados: JSON.stringify(valores), estado_captura: "completado", estado_validacion: "guardado", updated_at: new Date().toISOString() }).eq("id_estudio_venta", idEstudio);
	if (error) return json({ error: "No se pudo guardar" }, 500);
	await db.from("swelab_importaciones").insert(resultados.map((r) => ({ resultado_origen_id: r.id, folio, id_estudio_venta: idEstudio, clave_analito: r.clave, valor_original: String(r.valor), unidad: r.unidad || null, fecha_origen: r.fecha || null })));
	return json({ estado: "guardado", folio, idEstudio, resultados: resultados.length });
});
