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
