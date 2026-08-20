// Geometría de una hoja A4 del reporte (794 x 1123 px):
// 1123 - 135 de margen superior - 64 de margen inferior = 924 px de área útil,
// menos los 34 px de separación con que arranca el editor = 890 px de texto.
// La última página además reserva los 230 px del bloque de firma y QR.
export const ALTURA_UTIL_REPORTE_SIN_FIRMA = 890;
export const ALTURA_UTIL_REPORTE_CON_FIRMA = ALTURA_UTIL_REPORTE_SIN_FIRMA - 230;

// El visor del paciente imprime el reporte sin editor: el texto arranca en el
// px 169 de la hoja y se corta en el 985, justo antes del pie del membrete. La
// última hoja además reserva el bloque de firma del radiólogo.
export const ALTURA_TEXTO_VISOR_SIN_FIRMA = 985 - 169;
// Alto real del bloque de firma en el visor: la firma menos el traslape con la
// línea, el nombre, la leyenda, la cédula y el aire hasta el pie del membrete.
export const ALTO_FIRMA_REPORTE = 200;

// El medidor calcula el alto del reporte fuera de la hoja y se queda corto
// frente al render real (márgenes que allí no colapsan igual). Este colchón
// evita elegir una escala que después no quepa por unos pocos píxeles.
export const MARGEN_MEDICION_REPORTE = 30;
export const ALTURA_TEXTO_VISOR_CON_FIRMA = ALTURA_TEXTO_VISOR_SIN_FIRMA - ALTO_FIRMA_REPORTE;

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
// necesita reservar el área de la firma, así que lo que ya no cabe ahí baja a
// una hoja nueva al final: el texto se sigue llenando de arriba hacia abajo y
// nunca quedan huecos en las primeras páginas.
export const dividirReporteParaImpresion = (bloques, altoSinFirma, altoConFirma) => {
	const paginas = dividirReporteEnPaginas(bloques, altoSinFirma);
	if (paginas.length === 0) return paginas;

	const altoPagina = (pagina) => pagina.reduce((total, bloque) => total + bloque.alto, 0);
	let ultima = paginas[paginas.length - 1];
	while (ultima.length > 1 && altoPagina(ultima) > altoConFirma) {
		const bloque = ultima.pop();
		paginas.push([bloque]);
		ultima = paginas[paginas.length - 1];
	}
	return paginas;
};

// Los renglones en blanco del editor viajan como `<p>&nbsp;</p>`: sin tratarlos
// como vacíos, una hoja que sólo los contiene sobrevive y el reporte termina
// con una página suelta (por ejemplo, la que sólo llevaría la firma).
const textoVisibleBloque = (html) => String(html || '')
	.replace(/<[^>]+>/g, '')
	.replace(/&nbsp;/gi, ' ')
	.replace(/\u00a0/g, ' ')
	.trim();

export const omitirPaginasVacias = (paginas) =>
	paginas.filter((pagina) => pagina.some((bloque) => textoVisibleBloque(bloque.html)));

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

const ES_INICIO_DE_CONCLUSION = /^\s*conclusi[oó]n?e?s?\s*:?/i;

// Partir las conclusiones entre dos hojas deja renglones sueltos y se lee como
// si faltara texto. Se agrupan desde el título "CONCLUSIÓN:" hasta el final
// para que viajen juntas a la hoja donde quepan.
export const agruparConclusionReporte = (bloques, altoMaximo) => {
	const inicio = bloques.findIndex((bloque) =>
		ES_INICIO_DE_CONCLUSION.test(String(bloque.html || '').replace(/<[^>]+>/g, '')),
	);
	if (inicio === -1 || inicio === bloques.length - 1) return bloques;

	const conclusion = bloques.slice(inicio);
	const alto = conclusion.reduce((total, bloque) => total + bloque.alto, 0);
	if (alto > altoMaximo) return bloques;

	return [
		...bloques.slice(0, inicio),
		{ html: conclusion.map((bloque) => bloque.html).join(''), alto },
	];
};

// Reducciones que se prueban para que un reporte que se pasa por poco quepa en
// una sola hoja, como se ve en el visor. Por debajo de 0.75 el texto empieza a
// costar trabajo de leer, así que a partir de ahí se pagina normalmente.
export const ESCALAS_UNA_HOJA = [1, 0.95, 0.9, 0.85, 0.8, 0.75];

export const medirAltoReporteImpreso = (html, { ancho = ANCHO_UTIL_REPORTE, escala = 1 } = {}) => {
	if (typeof document === 'undefined') return 0;
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
		`zoom:${escala}`,
	].join(';');
	medidor.innerHTML = html || '';
	document.body.append(medidor);
	try {
		return medidor.getBoundingClientRect().height;
	} finally {
		medidor.remove();
	}
};

// Devuelve la mayor escala con la que el reporte completo cabe en una hoja, o
// null si ni con la reducción máxima alcanza.
export const elegirEscalaUnaHoja = (html, altoDisponible, escalas = ESCALAS_UNA_HOJA) => {
	if (!String(html || '').replace(/<[^>]+>/g, '').trim()) return null;
	return escalas.find((escala) => medirAltoReporteImpreso(html, { escala }) <= altoDisponible) ?? null;
};
