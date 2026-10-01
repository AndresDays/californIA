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

// Firmar todo el estudio antes de enseñar la primera imagen hacía esperar a un
// TAC o una resonancia de miles de cortes a que terminaran decenas de lotes.
// El firmador bajo demanda firma cada corte cuando de verdad se va a cargar:
// las peticiones que llegan juntas se agrupan en un solo lote, se atienden en
// el orden en que se pidieron (la imagen en pantalla primero, luego las
// vecinas) y la URL se reutiliza mientras no esté por expirar.
export const crearFirmadorDicom = (
	storage,
	{ expiraEn = 900, tamanoLote = TAMANO_LOTE_FIRMAS, esperar = esperarMs, ahora = () => Date.now() } = {},
) => {
	const firmadas = new Map();
	const pendientes = new Map();
	const cola = [];
	let lotesEnVuelo = 0;
	let programado = false;
	// Se vuelve a firmar con un minuto de margen antes de que expire.
	const vigenciaMs = Math.max(0, expiraEn - 60) * 1000;

	const despachar = () => {
		programado = false;
		while (lotesEnVuelo < LOTES_SIMULTANEOS && cola.length) {
			const bucket = cola[0].bucket;
			const lote = [];
			for (let i = 0; i < cola.length && lote.length < tamanoLote; ) {
				if (cola[i].bucket === bucket) lote.push(...cola.splice(i, 1));
				else i += 1;
			}
			lotesEnVuelo += 1;
			firmarLote(storage, bucket, lote.map(({ ruta }) => ruta), expiraEn, esperar)
				.then((respuesta) => {
					const porRuta = new Map(
						respuesta.filter((firma) => firma?.signedUrl && !firma.error).map((firma) => [firma.path, firma.signedUrl]),
					);
					lote.forEach(({ clave, ruta, resolver, rechazar }) => {
						pendientes.delete(clave);
						const url = porRuta.get(ruta);
						if (url) {
							firmadas.set(clave, { url, vence: ahora() + vigenciaMs });
							resolver(url);
						} else {
							rechazar(new Error("No se pudo autorizar la imagen del estudio"));
						}
					});
				})
				.catch((error) =>
					lote.forEach(({ clave, rechazar }) => {
						pendientes.delete(clave);
						rechazar(error);
					}),
				)
				.finally(() => {
					lotesEnVuelo -= 1;
					despachar();
				});
		}
	};

	// `prioritaria`: la imagen que se va a pintar ahora salta la fila de la
	// precarga, que puede traer cientos de cortes pendientes por firmar.
	const firmar = (bucketOriginal, rutaOriginal, { prioritaria = false } = {}) => {
		const bucket = bucketOriginal || "radiologia";
		const ruta = normalizarStoragePathDicom(rutaOriginal, bucket);
		const clave = `${bucket}\n${ruta}`;
		const vigente = firmadas.get(clave);
		if (vigente && vigente.vence > ahora()) return Promise.resolve(vigente.url);
		if (pendientes.has(clave)) {
			if (prioritaria) {
				const indice = cola.findIndex((pedido) => pedido.clave === clave);
				if (indice > 0) cola.unshift(...cola.splice(indice, 1));
			}
			return pendientes.get(clave);
		}
		const promesa = new Promise((resolver, rechazar) => {
			const pedido = { bucket, ruta, clave, resolver, rechazar };
			if (prioritaria) cola.unshift(pedido);
			else cola.push(pedido);
		});
		pendientes.set(clave, promesa);
		// Se espera al siguiente ciclo para juntar en un lote todo lo que se
		// pidió a la vez (la imagen visible y su precarga).
		if (!programado) {
			programado = true;
			setTimeout(despachar, 0);
		}
		return promesa;
	};
	// Cuando Storage rechaza una URL (venció antes de tiempo), se olvida para
	// volver a firmarla.
	firmar.olvidar = (bucketOriginal, rutaOriginal) => {
		const bucket = bucketOriginal || "radiologia";
		firmadas.delete(`${bucket}\n${normalizarStoragePathDicom(rutaOriginal, bucket)}`);
	};
	return firmar;
};

export const ESQUEMA_DICOM_FIRMADO = "dicomsb";

export const crearImageIdDicomFirmado = (imagen) => {
	const bucket = imagen.bucket || "radiologia";
	return `${ESQUEMA_DICOM_FIRMADO}:${bucket}/${normalizarStoragePathDicom(imagen.storage_path, bucket)}`;
};

export const leerImageIdDicomFirmado = (imageId = "") => {
	const resto = String(imageId).slice(ESQUEMA_DICOM_FIRMADO.length + 1);
	const separador = resto.indexOf("/");
	return { bucket: resto.slice(0, separador), ruta: resto.slice(separador + 1) };
};
