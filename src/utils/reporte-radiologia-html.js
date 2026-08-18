const ETIQUETAS_BLOQUE = new Set(['P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

const agregarContenido = (origen, destino) => {
	Array.from(origen.childNodes).forEach((nodo) => {
		if (nodo.nodeType === Node.TEXT_NODE) {
			destino.append(document.createTextNode(nodo.textContent.replace(/\u00a0/g, ' ')));
			return;
		}
		if (nodo.nodeType !== Node.ELEMENT_NODE) return;

		if (nodo.tagName === 'BR') {
			destino.append(document.createElement('br'));
			return;
		}

		const etiqueta = nodo.tagName === 'B' ? 'strong' : nodo.tagName.toLowerCase();
		if (['strong', 'em', 'i', 'u'].includes(etiqueta)) {
			const formato = document.createElement(etiqueta === 'i' ? 'em' : etiqueta);
			agregarContenido(nodo, formato);
			destino.append(formato);
			return;
		}

		agregarContenido(nodo, destino);
	});
};

const agregarParrafo = (origen, destino) => {
	const parrafo = document.createElement('p');
	if (origen.nodeType === Node.TEXT_NODE) {
		parrafo.append(document.createTextNode(origen.textContent.replace(/\u00a0/g, ' ')));
	} else {
		agregarContenido(origen, parrafo);
	}
	if (parrafo.textContent.trim() || parrafo.querySelector('br')) destino.append(parrafo);
};

// Convierte HTML pegado (especialmente desde Word) a un subconjunto estable sin estilos ni márgenes.
export const normalizarHtmlReporteRadiologia = (html) => {
	if (typeof document === 'undefined') return String(html || '');
	const origen = document.createElement('div');
	origen.innerHTML = String(html || '');
	const resultado = document.createElement('div');

	Array.from(origen.childNodes).forEach((nodo) => {
		if (nodo.nodeType === Node.TEXT_NODE) {
			if (nodo.textContent.trim()) agregarParrafo(nodo, resultado);
			return;
		}
		if (nodo.nodeType !== Node.ELEMENT_NODE) return;
		if (ETIQUETAS_BLOQUE.has(nodo.tagName)) {
			agregarParrafo(nodo, resultado);
			return;
		}
		agregarParrafo(nodo, resultado);
	});

	return resultado.innerHTML;
};
