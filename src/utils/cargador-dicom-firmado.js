import { supabase } from "../lib/supabase-client";
import {
	ESQUEMA_DICOM_FIRMADO,
	crearFirmadorDicom,
	leerImageIdDicomFirmado,
} from "./firmar-imagenes-dicom";

// Las imágenes se identifican por su ruta y no por una URL firmada: el estudio
// abre sin esperar a firmar miles de cortes, y cada corte se firma -por lotes-
// justo cuando se va a cargar.
//   dicomsb:<bucket>/<ruta>            personal con sesión: firma Storage.
//   dicomportal:<idEstudio>/<idImagen> paciente sin sesión: firma el portal
//                                      con el pase que entregó al validar
//                                      folio y teléfono.
export const ESQUEMA_DICOM_PORTAL = "dicomportal";

let firmadorStorage = null;
const firmadoresPortal = new Map();
const imageIdsWado = new Map();
const cornerstonesRegistrados = new WeakSet();

const firmarEnStorage = (bucket, ruta) => {
	firmadorStorage ||= crearFirmadorDicom(supabase.storage);
	return firmadorStorage(bucket, ruta);
};

const leerImageIdPortal = (imageId = "") => {
	const resto = String(imageId).slice(ESQUEMA_DICOM_PORTAL.length + 1);
	const separador = resto.indexOf("/");
	return { idEstudio: resto.slice(0, separador), idImagen: resto.slice(separador + 1) };
};

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

// La URL firmada de una imagen, para descargarla.
export const resolverUrlImagenDicom = (imageId = "") => {
	if (imageId.startsWith(`${ESQUEMA_DICOM_FIRMADO}:`)) {
		const { bucket, ruta } = leerImageIdDicomFirmado(imageId);
		return firmarEnStorage(bucket, ruta);
	}
	if (imageId.startsWith(`${ESQUEMA_DICOM_PORTAL}:`)) {
		const { idEstudio, idImagen } = leerImageIdPortal(imageId);
		const firmar = firmadoresPortal.get(idEstudio);
		if (!firmar) return Promise.reject(new Error("El estudio ya no está autorizado"));
		return firmar("portal", idImagen);
	}
	return Promise.resolve(imageId.replace(/^wadouri:/, ""));
};

export const registrarCargadoresDicom = (cornerstone, cornerstoneWADO) => {
	if (cornerstonesRegistrados.has(cornerstone)) return;
	cornerstonesRegistrados.add(cornerstone);
	const cargador = (imageId) => {
		const promise = resolverUrlImagenDicom(imageId)
			.then((url) => {
				const imageIdWado = `wadouri:${url}`;
				imageIdsWado.set(imageId, imageIdWado);
				return cornerstoneWADO.wadouri.loadImage(imageIdWado).promise;
			})
			.then((imagen) => {
				// Las herramientas guardan sus trazos por imageId; debe ser el
				// estable y no la URL firmada, que cambia al volver a firmar.
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
};

// Sólo para pruebas: olvida las firmas guardadas.
export const reiniciarFirmadoresDicom = () => {
	firmadorStorage = null;
	firmadoresPortal.clear();
	imageIdsWado.clear();
};
