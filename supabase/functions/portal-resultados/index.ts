import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Content-Type": "application/json",
};
const URL_EXPIRY_SECONDS = 60;
const URL_IMAGEN_EXPIRY_SECONDS = 900;

const responder = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: CORS_HEADERS });

// Las rutas guardadas a veces son URLs completas del storage; el firmado sólo
// acepta la ruta relativa al bucket.
const normalizarPathDicom = (path: unknown, bucket: string) => {
	const texto = String(path || "").trim();
	if (!texto.includes("supabase.co")) return texto.split("?")[0];
	return (texto.split(`/${bucket}/`)[1] || texto).split("?")[0];
};

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
	const p_id_estudio = String(body?.p_id_estudio || "").trim();
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

	// El visor de imágenes es público: el paciente llega por QR o desde el portal
	// sin sesión, así que las imágenes se firman aquí, sólo para un estudio que
	// pertenece al folio y teléfono ya autorizados.
	if (p_id_estudio) {
		const autorizado = (resultado.estudios || []).some(
			(estudio: any) => estudio?.tipo === "imagen" && String(estudio.id) === p_id_estudio,
		);
		if (!autorizado) return responder({ error: "El estudio no corresponde a este folio" }, 404);

		const { data: estudio, error: estudioError } = await admin
			.from("estudios_radiologia")
			.select("id_estudio, storage_path, reporte, tipo_estudio, descripcion, fecha_estudio, id_paciente")
			.eq("id_estudio", p_id_estudio)
			.maybeSingle();
		if (estudioError) return responder({ error: estudioError.message }, 500);
		if (!estudio) return responder({ error: "Estudio no disponible" }, 404);

		const { data: paciente } = await admin
			.from("pacientes")
			.select("nombre, apellido_paterno, apellido_materno, fecha_nacimiento, sexo")
			.eq("id_paciente", estudio.id_paciente)
			.maybeSingle();

		const { data: guardadas } = await admin
			.from("estudio_dicom_imagenes")
			.select("*")
			.eq("id_estudio", p_id_estudio)
			.order("instance_number", { ascending: true, nullsFirst: false });

		// Estudios antiguos guardan un único archivo en el propio estudio.
		const origen = (guardadas || []).length
			? guardadas
			: estudio.storage_path
				? [{
					id_imagen: "fallback",
					storage_path: estudio.storage_path,
					bucket: "radiologia",
					file_name: String(estudio.storage_path).split("/").pop() || "imagen.dcm",
					modality: estudio.tipo_estudio,
					series_description: estudio.descripcion || "Serie 1",
					instance_number: 1,
				}]
				: [];

		const imagenes = await Promise.all(origen.map(async (imagen: any) => {
			const bucket = imagen.bucket || "radiologia";
			const { data: signed } = await admin.storage
				.from(bucket)
				.createSignedUrl(normalizarPathDicom(imagen.storage_path, bucket), URL_IMAGEN_EXPIRY_SECONDS);
			return signed?.signedUrl ? { ...imagen, bucket, url: signed.signedUrl } : null;
		}));

		return responder({
			encontrado: true,
			autorizado: true,
			estudio: { ...estudio, storage_path: undefined },
			paciente: paciente || null,
			imagenes: imagenes.filter(Boolean),
		});
	}

	return responder(sinPaths({ ...resultado, estudios }));
});
