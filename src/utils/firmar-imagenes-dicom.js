import { normalizarStoragePathDicom } from "./dicom-series";

// Un TAC trae cientos o miles de cortes. Antes se pedía una URL firmada por
// imagen y todas a la vez: cada petición evalúa la política del bucket contra la
// base de datos de Storage, que se saturaba y respondía 544 "Database timeout";
// como era un Promise.all, un solo corte fallido tumbaba el estudio completo.
// Ahora se firma por lotes con `createSignedUrls` (una petición para muchas
// rutas), con pocos lotes en vuelo y reintentos cuando Storage se satura.
export const TAMANO_LOTE_FIRMAS = 100;
const LOTES_SIMULTANEOS = 3;
const REINTENTOS = 3;

const esperarMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const esErrorReintentable = (error) => {
	const estado = Number(error?.status ?? error?.statusCode);
	// Sin estado es un fallo de red; 5xx (incluido el 544 de Storage) es
	// saturación. Un 4xx es un permiso o ruta mal formada: reintentar no ayuda.
	return !estado || estado >= 500;
};

const firmarLote = async (storage, bucket, rutas, expiraEn, esperar) => {
	for (let intento = 1; ; intento++) {
		const { data, error } = await storage.from(bucket).createSignedUrls(rutas, expiraEn);
		if (!error) return data || [];
		if (intento >= REINTENTOS || !esErrorReintentable(error)) throw error;
		await esperar(400 * 2 ** (intento - 1));
	}
};

export const firmarImagenesDicom = async (
	storage,
	imagenes = [],
	{ expiraEn = 900, tamanoLote = TAMANO_LOTE_FIRMAS, esperar = esperarMs } = {},
) => {
	const normalizadas = imagenes.map((imagen) => {
		const bucket = imagen.bucket || "radiologia";
		return { ...imagen, bucket, storage_path: normalizarStoragePathDicom(imagen.storage_path, bucket) };
	});

	const lotes = [];
	const rutasPorBucket = new Map();
	normalizadas.forEach(({ bucket, storage_path }) => {
		if (!rutasPorBucket.has(bucket)) rutasPorBucket.set(bucket, new Set());
		rutasPorBucket.get(bucket).add(storage_path);
	});
	rutasPorBucket.forEach((rutas, bucket) => {
		const lista = [...rutas];
		for (let i = 0; i < lista.length; i += tamanoLote) {
			lotes.push({ bucket, rutas: lista.slice(i, i + tamanoLote) });
		}
	});

	const firmas = new Map();
	let siguiente = 0;
	const trabajador = async () => {
		while (siguiente < lotes.length) {
			const { bucket, rutas } = lotes[siguiente++];
			const firmadas = await firmarLote(storage, bucket, rutas, expiraEn, esperar);
			firmadas.forEach((firma) => {
				if (firma?.signedUrl && !firma.error) firmas.set(`${bucket}\n${firma.path}`, firma.signedUrl);
			});
		}
	};
	await Promise.all(
		Array.from({ length: Math.min(LOTES_SIMULTANEOS, lotes.length) }, trabajador),
	);

	const firmadas = normalizadas
		.map((imagen) => ({ ...imagen, url: firmas.get(`${imagen.bucket}\n${imagen.storage_path}`) }))
		.filter((imagen) => imagen.url);
	// Un corte suelto que no se pudo firmar ya no deja al estudio sin abrir; si
	// no se firmó ninguno es un problema de permisos o de rutas y sí se avisa.
	if (normalizadas.length && !firmadas.length) {
		throw new Error("No se pudo autorizar la imagen del estudio");
	}
	return firmadas;
};
