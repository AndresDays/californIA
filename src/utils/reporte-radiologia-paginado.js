// Geometría de una hoja A4 del reporte (794 x 1123 px):
// 1123 - 135 de margen superior - 64 de margen inferior = 924 px de área útil,
// menos los 34 px de separación con que arranca el editor = 890 px de texto.
// La última página además reserva los 230 px del bloque de firma y QR.
export const ALTURA_UTIL_REPORTE_SIN_FIRMA = 890;
export const ALTURA_UTIL_REPORTE_CON_FIRMA = ALTURA_UTIL_REPORTE_SIN_FIRMA - 230;

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

// Las páginas intermedias pueden usar todo el espacio útil. Sólo la última
// necesita reservar el área de la firma para que nunca se monte con el texto.
export const dividirReporteParaImpresion = (bloques, altoSinFirma, altoConFirma) => {
	const paginas = dividirReporteEnPaginas(bloques, altoSinFirma);
	if (paginas.length === 0) return paginas;

	const altoPagina = (pagina) => pagina.reduce((total, bloque) => total + bloque.alto, 0);
	let ultima = paginas[paginas.length - 1];
	while (ultima.length > 1 && altoPagina(ultima) > altoConFirma) {
		const bloque = ultima.shift();
		const anterior = paginas[paginas.length - 2];
		if (!anterior) paginas.splice(0, 0, [bloque]);
		else if (altoPagina(anterior) + bloque.alto <= altoSinFirma) anterior.push(bloque);
		else paginas.splice(paginas.length - 1, 0, [bloque]);
		ultima = paginas[paginas.length - 1];
	}
	return paginas;
};

export const omitirPaginasVacias = (paginas) =>
	paginas.filter((pagina) =>
		pagina.some((bloque) => String(bloque.html || '').replace(/<[^>]+>/g, '').trim()),
	);

const escaparHtml = (texto) => String(texto)
	.replace(/&/g, '&amp;')
	.replace(/</g, '&lt;')
	.replace(/>/g, '&gt;');

const obtenerNodosTexto = (nodo) => {
	const walker = document.createTreeWalker(nodo, NodeFilter.SHOW_TEXT);
	const nodos = [];
	let actual = walker.nextNode();
	while (actual) {
		nodos.push(actual);
		actual = walker.nextNode();
	}
	return nodos;
};

const dividirTextoLargo = (texto, caracteresPorBloque) => {
	const palabras = String(texto).trim().split(/\s+/).filter(Boolean);
	return palabras.reduce((bloques, palabra) => {
		const actual = bloques[bloques.length - 1] || '';
		if (actual && `${actual} ${palabra}`.length > caracteresPorBloque) bloques.push(palabra);
		else bloques[bloques.length - 1] = actual ? `${actual} ${palabra}` : palabra;
		return bloques;
	}, []);
};

// Clonamos el árbol completo y repartimos los nodos de texto; de este modo no
// se pierden <strong>, <span>, tipografías ni otros estilos pegados desde Word.
const dividirNodoLargoConFormato = (nodo, caracteresPorBloque) => {
	const originales = obtenerNodosTexto(nodo);
	if (!originales.length) return [nodo.outerHTML];

	return dividirTextoLargo(nodo.textContent, caracteresPorBloque).map((fragmento) => {
		const copia = nodo.cloneNode(true);
		const textosCopia = obtenerNodosTexto(copia);
		textosCopia.forEach((texto, indice) => {
			texto.textContent = indice === 0 ? fragmento : '';
		});
		return copia.outerHTML;
	});
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
			? dividirNodoLargoConFormato(nodo, caracteresPorBloque)
			: [nodo.outerHTML || `<p>${escaparHtml(texto)}</p>`];
		return fragmentos.map((fragmento) => ({
			html: fragmento,
			alto: Math.max(altoLinea + 10, Math.ceil((fragmento.replace(/<[^>]+>/g, '').length || 1) / caracteresPorLinea) * altoLinea + 10),
		}));
	});
};

// Ancho útil del texto en la hoja: 794px de A4 menos los 64px de margen a cada
// lado que define `.rr-contenido`.
export const ANCHO_UTIL_REPORTE = 666;

// Las alturas estimadas por número de caracteres cortaban las páginas mucho
// antes de tiempo. Medimos cada bloque con la tipografía real de la hoja para
// que la impresión respete el mismo flujo que se ve en el visor.
export const medirBloquesReporte = (bloques, { ancho = ANCHO_UTIL_REPORTE } = {}) => {
	if (typeof document === 'undefined' || !bloques.length) return bloques;

	const medidor = document.createElement('div');
	medidor.className = 'rr-editor';
	medidor.setAttribute('aria-hidden', 'true');
	medidor.style.cssText = [
		'position:absolute',
		'left:-10000px',
		'top:0',
		'visibility:hidden',
		`width:${ancho}px`,
		'min-height:0',
		'margin:0',
		'padding:0',
	].join(';');
	document.body.append(medidor);

	try {
		return bloques.map((bloque) => {
			// `flow-root` evita que los márgenes del párrafo se colapsen hacia
			// afuera y queden fuera de la medición.
			medidor.innerHTML = `<div style="display:flow-root">${bloque.html}</div>`;
			const alto = medidor.firstElementChild?.getBoundingClientRect().height || 0;
			return alto > 0 ? { ...bloque, alto } : bloque;
		});
	} finally {
		medidor.remove();
	}
};
