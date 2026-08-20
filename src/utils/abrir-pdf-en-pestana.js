// La pestaña se lleva directo al PDF: así el visor nativo del navegador (móvil
// incluido) lo abre a pantalla completa, sin pasar por una página intermedia.
export const abrirPdfEnPestana = ({ url, titulo, ventana = null }) => {
	const destino = ventana || window.open(url, '_blank');
	if (!destino) return null;

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
