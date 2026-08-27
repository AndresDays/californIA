// La pestaña se lleva directo al PDF: así el visor nativo del navegador (móvil
// incluido) lo abre a pantalla completa, sin pasar por una página intermedia.
//
// Al guardar se abren varias pestañas de un solo clic —el ticket y las
// etiquetas— y el navegador suele dejar pasar nada más la primera: las demás
// las bloquea. Antes eso se devolvía en silencio, así que en caja sólo salía el
// ticket y nadie sabía por qué faltaban las etiquetas. Cuando la pestaña no se
// puede abrir, el PDF se descarga y se avisa.
const descargarPdf = (url, titulo) => {
	const enlace = document.createElement("a");
	enlace.href = url;
	enlace.download = `${titulo || "documento"}.pdf`;
	enlace.style.display = "none";
	document.body.appendChild(enlace);
	enlace.click();
	document.body.removeChild(enlace);
};

export const abrirPdfEnPestana = ({ url, titulo, ventana = null }) => {
	const destino = ventana || window.open(url, '_blank');

	// Sin pestaña (el navegador la bloqueó) el PDF se descarga, para que el
	// comprobante no se pierda, y se avisa devolviendo null.
	if (!destino) {
		descargarPdf(url, titulo);
		return null;
	}

	try {
		if (destino.location?.replace) destino.location.replace(url);
		else destino.location = url;
	} catch {
		destino.document.open();
		destino.document.write(
			`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${titulo}</title></head><body style="margin:0"><a href="${url}" target="_blank" rel="noopener">Abrir PDF</a></body></html>`,
		);
		destino.document.close();
	}
	return destino;
};
