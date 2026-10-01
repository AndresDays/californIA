import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Content-Type": "application/json",
};
const URL_EXPIRY_SECONDS = 60;
const URL_IMAGEN_EXPIRY_SECONDS = 900;
const LOTE_FIRMAS_DICOM = 100;
// El pase deja al visor del paciente pedir firmas por lotes mientras ve el
// estudio, sin volver a validar folio y teléfono en cada lote (esa validación
// cuenta intentos y bloquea al octavo en 15 minutos).
const PASE_EXPIRY_SECONDS = 4 * 60 * 60;
const MAX_IMAGENES_POR_PETICION = 200;

const responder = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: CORS_HEADERS });

// Las rutas guardadas a veces son URLs completas del storage; el firmado sólo
// acepta la ruta relativa al bucket.
const normalizarPathDicom = (path: unknown, bucket: string) => {
	const texto = String(path || "").trim();
	if (!texto.includes("supabase.co")) return texto.split("?")[0];
	return (texto.split(`/${bucket}/`)[1] || texto).split("?")[0];
};

const base64url = (bytes: Uint8Array) =>
	btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const desdeBase64url = (texto: string) =>
	Uint8Array.from(atob(texto.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

const llaveHmac = (secreto: string) =>
	crypto.subtle.importKey("raw", new TextEncoder().encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);

const crearPase = async (secreto: string, idEstudio: string) => {
	const contenido = `${idEstudio}.${Math.floor(Date.now() / 1000) + PASE_EXPIRY_SECONDS}`;
	const firma = await crypto.subtle.sign("HMAC", await llaveHmac(secreto), new TextEncoder().encode(contenido));
	return `${contenido}.${base64url(new Uint8Array(firma))}`;
};

// Devuelve el id del estudio si el pase es auténtico y no ha vencido.
const leerPase = async (secreto: string, pase: string) => {
	const [idEstudio, vence, firma] = pase.split(".");
	if (!idEstudio || !vence || !firma || Number(vence) < Date.now() / 1000) return null;
	try {
		const valido = await crypto.subtle.verify(
			"HMAC",
			await llaveHmac(secreto),
			desdeBase64url(firma),
			new TextEncoder().encode(`${idEstudio}.${vence}`),
		);
		return valido ? idEstudio : null;
	} catch {
		return null;
	}
};

const imagenFallback = (estudio: any) => ({
	id_imagen: "fallback",
	storage_path: estudio.storage_path,
	bucket: "radiologia",
	file_name: String(estudio.storage_path).split("/").pop() || "imagen.dcm",
	modality: estudio.tipo_estudio,
	series_description: estudio.descripcion || "Serie 1",
	instance_number: 1,
});

// Un TAC trae cientos de cortes: firmar uno por uno y todos a la vez saturaba
// la base de Storage (544 "Database timeout"). Se firma por lotes con
// createSignedUrls, reintentando el 5xx.
const firmarImagenes = async (admin: any, imagenes: any[]) => {
	const conRuta = imagenes.map((imagen: any) => {
		const bucket = imagen.bucket || "radiologia";
		return { ...imagen, bucket, ruta: normalizarPathDicom(imagen.storage_path, bucket) };
	});
	const firmas = new Map<string, string>();
	const porBucket = new Map<string, string[]>();
	for (const imagen of conRuta) {
		const rutas = porBucket.get(imagen.bucket) || [];
		if (!rutas.includes(imagen.ruta)) rutas.push(imagen.ruta);
		porBucket.set(imagen.bucket, rutas);
	}
	for (const [bucket, rutas] of porBucket) {
		for (let i = 0; i < rutas.length; i += LOTE_FIRMAS_DICOM) {
			const lote = rutas.slice(i, i + LOTE_FIRMAS_DICOM);
			for (let intento = 1; intento <= 3; intento++) {
				const { data: firmadas, error } = await admin.storage
					.from(bucket)
					.createSignedUrls(lote, URL_IMAGEN_EXPIRY_SECONDS);
				if (!error) {
					for (const firma of firmadas || []) {
						if (firma?.signedUrl && !firma.error) firmas.set(`${bucket}\n${firma.path}`, firma.signedUrl);
					}
					break;
				}
				const estado = Number((error as any)?.status ?? (error as any)?.statusCode);
				if (estado && estado < 500) break;
				if (intento < 3) await new Promise((r) => setTimeout(r, 400 * 2 ** (intento - 1)));
			}
		}
	}
	return conRuta.map(({ ruta, ...imagen }: any) => {
		const url = firmas.get(`${imagen.bucket}\n${ruta}`);
		return url ? { ...imagen, url } : null;
	});
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

	// Firmas por lotes con el pase del estudio: sólo de imágenes de ese estudio.
	const p_pase = String(body?.p_pase || "").trim();
	if (p_pase) {
		const idEstudio = await leerPase(serviceRoleKey, p_pase);
		if (!idEstudio) return responder({ error: "El acceso al estudio venció; vuelve a abrirlo" }, 401);
		const ids: string[] = Array.isArray(body?.p_imagenes)
			? [...new Set(body.p_imagenes.map((id: unknown) => String(id)))].slice(0, MAX_IMAGENES_POR_PETICION) as string[]
			: [];
		if (!ids.length) return responder({ firmas: [] });
		const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
		const numericos = ids.filter((id) => /^\d+$/.test(id));
		let imagenes: any[] = [];
		if (numericos.length) {
			const { data, error } = await admin
				.from("estudio_dicom_imagenes")
				.select("id_imagen, storage_path, bucket")
				.eq("id_estudio", idEstudio)
				.in("id_imagen", numericos);
			if (error) return responder({ error: error.message }, 500);
			imagenes = data || [];
		}
		if (ids.includes("fallback")) {
			const { data: estudio } = await admin
				.from("estudios_radiologia")
				.select("storage_path, tipo_estudio, descripcion")
				.eq("id_estudio", idEstudio)
				.maybeSingle();
			if (estudio?.storage_path) imagenes.push(imagenFallback(estudio));
		}
		const firmadas = await firmarImagenes(admin, imagenes);
		return responder({
			firmas: firmadas.filter(Boolean).map((imagen: any) => ({ id_imagen: imagen.id_imagen, url: imagen.url })),
		});
	}

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
			.select("id_estudio, storage_path, reporte, tipo_estudio, descripcion, fecha_estudio, id_paciente, id_radiologo")
			.eq("id_estudio", p_id_estudio)
			.maybeSingle();
		if (estudioError) return responder({ error: estudioError.message }, 500);
		if (!estudio) return responder({ error: "Estudio no disponible" }, 404);

		// Datos de quien firmó la interpretación: el reporte del paciente los
		// muestra al pie, igual que la hoja impresa.
		let radiologo = null;
		if (estudio.id_radiologo) {
			const { data: empleado } = await admin
				.from("empleados")
				.select("nombre, cedula, especialidad, firma_digital, firma_url")
				.eq("id_empleado", estudio.id_radiologo)
				.maybeSingle();
			if (empleado) {
				radiologo = {
					nombre: empleado.nombre || "",
					cedula: empleado.cedula || "",
					especialidad: empleado.especialidad || "",
					firmaUrl: empleado.firma_digital || empleado.firma_url || "",
				};
			}
		}

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
				? [imagenFallback(estudio)]
				: [];

		// El visor nuevo pide el pase y firma cada corte cuando lo va a cargar;
		// firmar aquí un TAC completo hacía esperar al paciente decenas de
		// lotes antes de ver la primera imagen. Los visores ya abiertos con la
		// versión anterior siguen recibiendo todo firmado.
		if (body?.p_bajo_demanda) {
			return responder({
				encontrado: true,
				autorizado: true,
				estudio: { ...estudio, storage_path: undefined },
				paciente: paciente || null,
				radiologo,
				pase: await crearPase(serviceRoleKey, String(estudio.id_estudio)),
				imagenes: origen || [],
			});
		}

		const imagenes = await firmarImagenes(admin, origen || []);

		return responder({
			encontrado: true,
			autorizado: true,
			estudio: { ...estudio, storage_path: undefined },
			paciente: paciente || null,
			radiologo,
			imagenes: imagenes.filter(Boolean),
		});
	}

	return responder(sinPaths({ ...resultado, estudios }));
});
