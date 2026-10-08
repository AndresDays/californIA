import { supabase } from "../lib/supabase-client";
import {
	ESQUEMA_DICOM_FIRMADO,
	crearFirmadorDicom,
	leerImageIdDicomFirmado,
} from "./firmar-imagenes-dicom";
import {
	existeDicomLocal,
	grupoDicom,
	guardarDicomLocal,
	hayCacheDicomLocal,
	leerDicomLocal,
	liberarEstudioDicom,
	limpiarCacheDicom,
	pedirPersistenciaDicom,
	protegerEstudioDicom,
} from "./cache-dicom-local";

// Las imágenes se identifican por su ruta y no por una URL firmada: el estudio
// abre sin esperar a firmar miles de cortes, y cada corte se firma -por lotes-
// justo cuando se va a cargar.
//   dicomsb:<bucket>/<ruta>            personal con sesión: firma Storage y el
//                                      archivo se guarda en disco.
//   dicomportal:<idEstudio>/<idImagen> paciente sin sesión: firma el portal
//                                      con el pase que entregó al validar
//                                      folio y teléfono. No se guarda en disco.
export const ESQUEMA_DICOM_PORTAL = "dicomportal";

let firmadorStorage = null;
const firmadoresPortal = new Map();
const imageIdsWado = new Map();
const cornerstonesRegistrados = new WeakSet();

const obtenerFirmadorStorage = () => {
	firmadorStorage ||= crearFirmadorDicom(supabase.storage);
	return firmadorStorage;
};

const leerImageIdPortal = (imageId = "") => {
	const resto = String(imageId).slice(ESQUEMA_DICOM_PORTAL.length + 1);
	const separador = resto.indexOf("/");
	return { idEstudio: resto.slice(0, separador), idImagen: resto.slice(separador + 1) };
};

const esDicomFirmado = (imageId = "") => String(imageId).startsWith(`${ESQUEMA_DICOM_FIRMADO}:`);
const esDicomPortal = (imageId = "") => String(imageId).startsWith(`${ESQUEMA_DICOM_PORTAL}:`);

export const crearImageIdDicomPortal = (idEstudio, idImagen) =>
	`${ESQUEMA_DICOM_PORTAL}:${idEstudio}/${idImagen}`;

// El portal firma con el pase del estudio; cada lote es una llamada a la
// función, que no vuelve a pasar por el límite de intentos de folio y teléfono.
export const configurarFirmadorPortal = (idEstudio, pase) => {
	const portal = {
		from: () => ({
			createSignedUrls: async (idsImagen) => {
				const { data, error } = await supabase.functions.invoke("portal-resultados", {
					body: { p_pase: pase, p_imagenes: idsImagen },
				});
				if (error || data?.error) {
					return { data: null, error: { status: error?.context?.status ?? error?.status, message: data?.error || error?.message } };
				}
				return {
					data: (data?.firmas || []).map(({ id_imagen, url }) => ({ path: String(id_imagen), signedUrl: url, error: null })),
					error: null,
				};
			},
		}),
	};
	firmadoresPortal.set(String(idEstudio), crearFirmadorDicom(portal));
};

const firmarImageId = (imageId, opciones) => {
	if (esDicomFirmado(imageId)) {
		const { bucket, ruta } = leerImageIdDicomFirmado(imageId);
		return obtenerFirmadorStorage()(bucket, ruta, opciones);
	}
	if (esDicomPortal(imageId)) {
		const { idEstudio, idImagen } = leerImageIdPortal(imageId);
		const firmar = firmadoresPortal.get(idEstudio);
		if (!firmar) return Promise.reject(new Error("El estudio ya no está autorizado"));
		return firmar("portal", idImagen, opciones);
	}
	return Promise.resolve(String(imageId).replace(/^wadouri:/, ""));
};

const olvidarFirma = (imageId) => {
	if (esDicomFirmado(imageId)) {
		const { bucket, ruta } = leerImageIdDicomFirmado(imageId);
		obtenerFirmadorStorage().olvidar(bucket, ruta);
	} else if (esDicomPortal(imageId)) {
		const { idEstudio, idImagen } = leerImageIdPortal(imageId);
		firmadoresPortal.get(idEstudio)?.olvidar("portal", idImagen);
	}
};

// La URL firmada de una imagen, para descargarla.
export const resolverUrlImagenDicom = (imageId = "") => firmarImageId(imageId);

const descargar = async (url) => {
	const respuesta = await fetch(url);
	if (!respuesta.ok) {
		const error = new Error(`No se pudo descargar la imagen (${respuesta.status})`);
		error.status = respuesta.status;
		throw error;
	}
	return respuesta.arrayBuffer();
};

// Cortes que ya están en esta computadora (en disco o recién descargados): con
// ellos el visor muestra cuánto lleva cargado cada serie. Los avisos se juntan
// para no redibujar la pantalla con cada uno de los miles de cortes.
const imagenesListas = new Set();
const escuchasProgreso = new Set();
let avisoProgresoPendiente = null;
const avisarProgreso = () => {
	if (avisoProgresoPendiente) return;
	avisoProgresoPendiente = setTimeout(() => {
		avisoProgresoPendiente = null;
		escuchasProgreso.forEach((escucha) => escucha());
	}, 250);
};
const marcarImagenLista = (imageId) => {
	if (imagenesListas.has(imageId)) return;
	imagenesListas.add(imageId);
	avisarProgreso();
};
export const imagenDicomLista = (imageId) => imagenesListas.has(imageId);
export const suscribirProgresoDicom = (escucha) => {
	escuchasProgreso.add(escucha);
	return () => escuchasProgreso.delete(escucha);
};
// Porcentaje (0-100) de los cortes de una serie que ya están listos.
export const porcentajeCargaDicom = (imageIds = []) => {
	if (!imageIds.length) return 100;
	const listas = imageIds.filter((imageId) => imagenesListas.has(imageId)).length;
	return Math.floor((listas / imageIds.length) * 100);
};

// Imágenes que se van a pintar ya: se firman y descargan antes que la precarga.
const prioritarias = new Set();
export const pedirImagenDicomPrioritaria = (imageId) => {
	if (imageId) prioritarias.add(imageId);
};

// Un mismo corte lo pueden pedir a la vez la pantalla, la precarga y el MPR:
// se descarga una sola vez.
const enVuelo = new Map();
export const obtenerBytesDicom = (imageId, { prioritaria = false } = {}) => {
	if (enVuelo.has(imageId)) {
		// Si ya estaba en la fila de firmas, la imagen visible se adelanta.
		if (prioritaria) void firmarImageId(imageId, { prioritaria: true }).catch(() => {});
		return enVuelo.get(imageId);
	}
	const promesa = (async () => {
		const enDisco = esDicomFirmado(imageId) ? leerImageIdDicomFirmado(imageId) : null;
		if (enDisco) {
			const local = await leerDicomLocal(enDisco.bucket, enDisco.ruta);
			if (local) return local;
		}
		let contenido;
		try {
			contenido = await descargar(await firmarImageId(imageId, { prioritaria }));
		} catch (error) {
			// Una URL rechazada (vencida antes de tiempo) se firma de nuevo una vez.
			if (![400, 401, 403].includes(error?.status)) throw error;
			olvidarFirma(imageId);
			contenido = await descargar(await firmarImageId(imageId, { prioritaria }));
		}
		if (enDisco) void guardarDicomLocal(enDisco.bucket, enDisco.ruta, contenido);
		return contenido;
	})()
		.then((contenido) => {
			marcarImagenLista(imageId);
			return contenido;
		})
		.finally(() => enVuelo.delete(imageId));
	enVuelo.set(imageId, promesa);
	return promesa;
};

// La memoria de imágenes de cornerstone es de 1 GB por omisión: un TAC con
// varias series no cabe y los cortes se descartan y se vuelven a cargar. Se
// amplía según la memoria del equipo, sin pasar de 3 GB.
const configurarMemoriaImagenes = (cornerstone) => {
	const memoriaEquipoGb = Number(globalThis.navigator?.deviceMemory) || 4;
	const bytes = Math.min(3, Math.max(1, memoriaEquipoGb * 0.3)) * 1024 ** 3;
	cornerstone.imageCache?.setMaximumSizeBytes?.(Math.round(bytes));
};

export const registrarCargadoresDicom = (cornerstone, cornerstoneWADO) => {
	if (cornerstonesRegistrados.has(cornerstone)) return;
	cornerstonesRegistrados.add(cornerstone);
	configurarMemoriaImagenes(cornerstone);
	const cargador = (imageId) => {
		const prioritaria = prioritarias.delete(imageId);
		const promise = obtenerBytesDicom(imageId, { prioritaria })
			.then((contenido) => {
				// El cargador de cornerstone lee por URL: se le entrega el archivo
				// ya descargado (o leído de disco) como blob local.
				const blobUrl = URL.createObjectURL(new Blob([contenido], { type: "application/dicom" }));
				const imageIdWado = `wadouri:${blobUrl}`;
				imageIdsWado.set(imageId, imageIdWado);
				return cornerstoneWADO.wadouri
					.loadImage(imageIdWado)
					.promise.finally(() => URL.revokeObjectURL(blobUrl));
			})
			.then((imagen) => {
				// Las herramientas guardan sus trazos por imageId; debe ser el
				// estable y no el del blob, que cambia en cada carga.
				imagen.imageId = imageId;
				return imagen;
			});
		return { promise };
	};
	cornerstone.registerImageLoader(ESQUEMA_DICOM_FIRMADO, cargador);
	cornerstone.registerImageLoader(ESQUEMA_DICOM_PORTAL, cargador);
	cornerstone.metaData?.addProvider?.((tipo, imageId) => {
		const imageIdWado = imageIdsWado.get(imageId);
		return imageIdWado ? cornerstoneWADO.wadouri.metaData.metaDataProvider(tipo, imageIdWado) : undefined;
	});
	// Cuando cornerstone saca una imagen de memoria, también se suelta el
	// archivo que el cargador DICOM guarda aparte; si no, se acumulaban.
	cornerstone.events?.addEventListener?.("cornerstoneimagecacheimageremoved", (evento) => {
		const imageId = evento?.detail?.imageId;
		const imageIdWado = imageIdsWado.get(imageId);
		if (!imageIdWado) return;
		imageIdsWado.delete(imageId);
		try {
			cornerstoneWADO.wadouri.dataSetCacheManager?.unload?.(imageIdWado.slice("wadouri:".length));
		} catch {
			// Ya no estaba cargado.
		}
	});
};

// Precarga a disco del estudio que se está viendo: todo el estudio se descarga
// en segundo plano, la serie activa primero, para que al recorrerla los cortes
// ya estén en la computadora. Sólo hay una precarga a la vez.
const DESCARGAS_SIMULTANEAS = 8;
const LOTE_REVISION = 100;
let precargaActual = null;

export const detenerPrecargaDicom = () => {
	if (!precargaActual) return;
	precargaActual.activa = false;
	precargaActual.grupos.forEach(liberarEstudioDicom);
	precargaActual = null;
};

export const precargarEstudioDicom = (imageIds = []) => {
	detenerPrecargaDicom();
	const cola = [...new Set(imageIds)].filter(esDicomFirmado);
	if (!cola.length || !hayCacheDicomLocal()) return null;
	pedirPersistenciaDicom();
	const grupos = new Set(cola.map((imageId) => {
		const { bucket, ruta } = leerImageIdDicomFirmado(imageId);
		return grupoDicom(bucket, ruta);
	}));
	grupos.forEach(protegerEstudioDicom);
	// pedidas: ya se revisó (o se está revisando) si están en disco.
	// listas: no estaban en disco y ya se pidió su firma; se pueden descargar.
	const precarga = { activa: true, cola, grupos, pedidas: new Set(), listas: new Set(), revisando: null };
	precargaActual = precarga;

	const quitarDeCola = (imageId) => {
		const indice = precarga.cola.indexOf(imageId);
		if (indice >= 0) precarga.cola.splice(indice, 1);
	};

	// Las firmas se piden de cien en cien en el orden de la fila; las que ya
	// están en disco no se firman ni se descargan.
	const revisarSiguientes = () => {
		if (precarga.revisando) return precarga.revisando;
		const pendientes = precarga.cola.filter((imageId) => !precarga.pedidas.has(imageId)).slice(0, LOTE_REVISION);
		if (!pendientes.length) return Promise.resolve();
		pendientes.forEach((imageId) => precarga.pedidas.add(imageId));
		precarga.revisando = Promise.all(pendientes.map((imageId) => {
			const { bucket, ruta } = leerImageIdDicomFirmado(imageId);
			return existeDicomLocal(bucket, ruta);
		}))
			.then((enDisco) => {
				if (!precarga.activa) return;
				pendientes.forEach((imageId, indice) => {
					if (enDisco[indice]) {
						quitarDeCola(imageId);
						marcarImagenLista(imageId);
					} else {
						precarga.listas.add(imageId);
						void firmarImageId(imageId).catch(() => {});
					}
				});
			})
			.finally(() => {
				precarga.revisando = null;
			});
		return precarga.revisando;
	};

	const trabajador = async () => {
		while (precarga.activa && precarga.cola.length) {
			const imageId = precarga.cola.find((id) => precarga.listas.has(id));
			if (!imageId) {
				await revisarSiguientes();
				continue;
			}
			quitarDeCola(imageId);
			// Se revisan y firman los siguientes antes de que se acaben.
			if (precarga.cola.filter((id) => precarga.listas.has(id)).length < LOTE_REVISION / 2) {
				void revisarSiguientes();
			}
			try {
				await obtenerBytesDicom(imageId);
			} catch {
				// Un corte que no baja no detiene la precarga; se intentará al verlo.
			}
		}
	};

	void (async () => {
		await revisarSiguientes();
		await Promise.all(Array.from({ length: DESCARGAS_SIMULTANEAS }, trabajador));
		if (precargaActual === precarga) {
			precargaActual = null;
			grupos.forEach(liberarEstudioDicom);
			void limpiarCacheDicom();
		}
	})();
	return precarga;
};

// Al cambiar de serie, sus cortes pasan al frente de la precarga.
export const priorizarPrecargaDicom = (imageIds = []) => {
	const precarga = precargaActual;
	if (!precarga?.activa) return;
	const primero = new Set(imageIds);
	const adelante = precarga.cola.filter((imageId) => primero.has(imageId));
	if (!adelante.length) return;
	precarga.cola = [...adelante, ...precarga.cola.filter((imageId) => !primero.has(imageId))];
	// Lo ya pedido a firmar pasa al frente de la fila de firmas.
	adelante
		.filter((imageId) => precarga.listas.has(imageId))
		.slice(0, LOTE_REVISION)
		.reverse()
		.forEach((imageId) => void firmarImageId(imageId, { prioritaria: true }).catch(() => {}));
};

// Sólo para pruebas: olvida las firmas guardadas.
export const reiniciarFirmadoresDicom = () => {
	detenerPrecargaDicom();
	firmadorStorage = null;
	firmadoresPortal.clear();
	imageIdsWado.clear();
	enVuelo.clear();
	prioritarias.clear();
	imagenesListas.clear();
	escuchasProgreso.clear();
	clearTimeout(avisoProgresoPendiente);
	avisoProgresoPendiente = null;
};
