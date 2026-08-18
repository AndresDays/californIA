// Alto disponible entre el membrete y el pie/firma de una hoja A4 del reporte.
export const ALTURA_UTIL_REPORTE_CON_FIRMA = 650;

export const dividirReporteEnPaginas = (bloques, altoUtil) => {
	if (!bloques.length) return [[]];

	return bloques.reduce((paginas, bloque) => {
		const paginaActual = paginas[paginas.length - 1];
		const altoActual = paginaActual.reduce((total, item) => total + item.alto, 0);
		if (paginaActual.length && altoActual + bloque.alto > altoUtil) paginas.push([bloque]);
		else paginaActual.push(bloque);
		return paginas;
	}, [[]]);
};

export const omitirPaginasVacias = (paginas) =>
	paginas.filter((pagina) =>
		pagina.some((bloque) => String(bloque.html || '').replace(/<[^>]+>/g, '').trim()),
	);

const escaparHtml = (texto) => String(texto)
	.replace(/&/g, '&amp;')
	.replace(/</g, '&lt;')
	.replace(/>/g, '&gt;');

const dividirTextoLargo = (texto, caracteresPorBloque) => {
	const palabras = String(texto).trim().split(/\s+/).filter(Boolean);
	return palabras.reduce((bloques, palabra) => {
		const actual = bloques[bloques.length - 1] || '';
		if (actual && `${actual} ${palabra}`.length > caracteresPorBloque) bloques.push(palabra);
		else bloques[bloques.length - 1] = actual ? `${actual} ${palabra}` : palabra;
		return bloques;
	}, []);
};

export const crearBloquesReporteParaImprimir = (html, {
	caracteresPorLinea = 78,
	altoLinea = 25,
	caracteresPorBloque = 700,
} = {}) => {
	if (typeof document === 'undefined') return [];
	const contenedor = document.createElement('div');
	contenedor.innerHTML = html || '';
	const nodos = Array.from(contenedor.children);
	const origen = nodos.length ? nodos : (contenedor.textContent.trim() ? [contenedor] : []);

	return origen.flatMap((nodo) => {
		const texto = nodo.textContent || '';
		const fragmentos = texto.length > caracteresPorBloque
			? dividirTextoLargo(texto, caracteresPorBloque).map((fragmento) => `<p>${escaparHtml(fragmento)}</p>`)
			: [nodo.outerHTML || `<p>${escaparHtml(texto)}</p>`];
		return fragmentos.map((fragmento) => ({
			html: fragmento,
			alto: Math.max(altoLinea + 10, Math.ceil((fragmento.replace(/<[^>]+>/g, '').length || 1) / caracteresPorLinea) * altoLinea + 10),
		}));
	});
};
