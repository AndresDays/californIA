export const abrirPdfEnPestana = ({ url, titulo, ventana = null }) => {
	const destino = ventana || window.open('', '_blank');
	if (!destino) return null;

	destino.document.title = titulo;
	destino.document.open();
	destino.document.write(`<!doctype html><html><head><title>${titulo}</title><style>html,body,iframe{width:100%;height:100%;margin:0;border:0}</style></head><body><iframe title="${titulo}" src="${url}"></iframe></body></html>`);
	destino.document.close();
	destino.document.title = titulo;
	return destino;
};
