import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
	"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Content-Type": "application/json",
};
const URL_EXPIRY_SECONDS = 60;

const responder = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: CORS_HEADERS });

const esArchivoCultivoPathValido = (path: unknown) =>
	/^[0-9]+\/cultivo\.pdf$/.test(String(path || ""));

const sinPaths = (resultado: any) => ({
	...resultado,
	estudios: (resultado?.estudios || []).map(({ archivo_cultivo_path: _path, ...estudio }: any) => estudio),
});

Deno.serve(async (req) => {
	if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
	if (req.method !== "POST") return responder({ error: "Método no permitido" }, 405);

	const url = Deno.env.get("SUPABASE_URL");
	const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
	const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
	if (!url || !anonKey || !serviceRoleKey) return responder({ error: "Portal no configurado" }, 500);

	const body = await req.json().catch(() => null);
	const p_folio = String(body?.p_folio || "").trim();
	const p_telefono = String(body?.p_telefono || "").trim();
	if (!p_folio || !p_telefono) return responder({ error: "Folio y teléfono son obligatorios" }, 400);

	const requestHeaders: Record<string, string> = {};
	for (const header of ["x-forwarded-for", "x-real-ip", "x-client-info"]) {
		const value = req.headers.get(header);
		if (value) requestHeaders[header] = value;
	}
	const portal = createClient(url, anonKey, {
		auth: { autoRefreshToken: false, persistSession: false },
		global: { headers: requestHeaders },
	});
	const { data: resultado, error } = await portal.rpc("buscar_resultados_portal_seguro", { p_folio, p_telefono });
	if (error) return responder({ error: error.message }, 500);
	if (!resultado?.autorizado) return responder(resultado);

	// The service client is used only after the rate-limited RPC authorizes this
	// exact folio and phone. The public response never contains storage paths.
	const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
	const { data: interno, error: internoError } = await admin.rpc("buscar_resultados_portal", { p_folio, p_telefono });
	if (internoError) return responder({ error: internoError.message }, 500);
	const paths = new Map(
		(interno?.estudios || [])
			.filter((estudio: any) => esArchivoCultivoPathValido(estudio?.archivo_cultivo_path))
			.map((estudio: any) => [String(estudio.id), estudio.archivo_cultivo_path]),
	);
	const estudios = await Promise.all((resultado.estudios || []).map(async (estudio: any) => {
		const path = paths.get(String(estudio.id));
		if (!path) return estudio;
		const { data: signed, error: signedError } = await admin.storage
			.from("resultados-cultivo-adjuntos")
			.createSignedUrl(path, URL_EXPIRY_SECONDS);
		if (signedError || !signed?.signedUrl) return estudio;
		return { ...estudio, archivo_cultivo_url: signed.signedUrl };
	}));

	return responder(sinPaths({ ...resultado, estudios }));
});
