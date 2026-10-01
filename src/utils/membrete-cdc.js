import JSZip from "jszip";
import cdcPlantillaUrl from "../assets/CDC Plantilla.docx?url";
import { MEMBRETE_B64 } from "../pages/radiologia/pages/reporte-radiologia-template";

// Membrete embebido en el bundle. Sólo se usa mientras carga la plantilla CDC
// o si el archivo no se puede leer.
export const MEMBRETE_FALLBACK = `data:image/jpeg;base64,${MEMBRETE_B64}`;

const RUTA_IMAGEN_PLANTILLA = "word/media/image1.jpg";

let promesaMembrete = null;

export const precargarImagen = (src) =>
	new Promise((resolve) => {
		if (typeof Image === "undefined") {
			resolve(src);
			return;
		}
		const imagen = new Image();
		imagen.onload = () => resolve(src);
		imagen.onerror = () => resolve(src);
		imagen.src = src;
	});

// La plantilla oficial vive en assets/CDC Plantilla.docx; de ahí se extrae la
// hoja membretada para que el reporte del visor, el portal y el PDF usen
// siempre la misma imagen.
export const cargarMembreteCdc = () => {
	if (promesaMembrete) return promesaMembrete;
	promesaMembrete = (async () => {
		try {
			const respuesta = await fetch(cdcPlantillaUrl);
			const zip = await JSZip.loadAsync(await respuesta.arrayBuffer());
			const imagen = zip.file(RUTA_IMAGEN_PLANTILLA);
			if (!imagen) return MEMBRETE_FALLBACK;
			const src = `data:image/jpeg;base64,${await imagen.async("base64")}`;
			await precargarImagen(src);
			return src;
		} catch (error) {
			console.error("No fue posible cargar la plantilla CDC:", error);
			return MEMBRETE_FALLBACK;
		}
	})();
	return promesaMembrete;
};

export const reiniciarMembreteCdc = () => {
	promesaMembrete = null;
};

const MIME_IMAGEN_DOCX = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	gif: "image/gif",
	bmp: "image/bmp",
};

// Un .docx es un zip; el membrete suele estar como la primera imagen en word/media/.
export const extraerMembreteDeDocx = async (contenido) => {
	const zip = await JSZip.loadAsync(contenido);
	const ruta = Object.keys(zip.files)
		.filter((nombre) => nombre.startsWith("word/media/") && /\.(png|jpe?g|gif|bmp)$/i.test(nombre))
		.sort()[0];
	if (!ruta) return null;
	const mime = MIME_IMAGEN_DOCX[ruta.split(".").pop().toLowerCase()] || "image/jpeg";
	return `data:${mime};base64,${await zip.file(ruta).async("base64")}`;
};

const esUrlImagen = (url) => /\.(png|jpe?g|webp)(\?|#|$)/i.test(url || "");
const esUrlDocx = (url) => /\.docx(\?|#|$)/i.test(url || "");

// Devuelve la imagen de membrete de una plantilla de plantillas_radiologia, o
// null si la plantilla no trae una imagen utilizable (por ejemplo, un PDF).
export const resolverMembretePlantilla = async (plantilla) => {
	if (!plantilla) return null;
	if (plantilla.membrete_base64?.startsWith("data:image/")) return plantilla.membrete_base64;
	const url = plantilla.archivo_url;
	if (!url) return null;
	if (plantilla.mime_type?.startsWith("image/") || esUrlImagen(url)) return url;
	const esDocx =
		plantilla.mime_type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
		esUrlDocx(url);
	if (!esDocx) return null;
	try {
		const respuesta = await fetch(url);
		if (!respuesta.ok) return null;
		return await extraerMembreteDeDocx(await respuesta.arrayBuffer());
	} catch (error) {
		console.error("No fue posible leer el membrete de la plantilla:", error);
		return null;
	}
};
