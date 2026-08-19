const ETIQUETAS_DESCARTADAS = new Set([
	'SCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'BASE', 'LINK', 'META', 'FORM',
	'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'OPTION',
]);

const esUrlPeligrosa = (valor) => /^\s*(javascript:|data:text\/html)/i.test(valor);

const limpiarEstilo = (valor) => String(valor)
	.replace(/expression\s*\([^)]*\)/gi, '')
	.replace(/url\s*\(\s*['"]?\s*javascript:[^)]*\)/gi, '');

const clonarNodoSeguro = (nodo) => {
	if (nodo.nodeType === Node.TEXT_NODE) return document.createTextNode(nodo.textContent);
	if (nodo.nodeType !== Node.ELEMENT_NODE || ETIQUETAS_DESCARTADAS.has(nodo.tagName)) return null;

	const copia = document.createElement(nodo.tagName.toLowerCase());
	Array.from(nodo.attributes).forEach((atributo) => {
		const nombre = atributo.name.toLowerCase();
		if (nombre.startsWith('on') || nombre === 'srcdoc') return;
		if (['href', 'src', 'xlink:href'].includes(nombre) && esUrlPeligrosa(atributo.value)) return;

		copia.setAttribute(
			atributo.name,
			nombre === 'style' ? limpiarEstilo(atributo.value) : atributo.value,
		);
	});

	Array.from(nodo.childNodes).forEach((hijo) => {
		const copiaHijo = clonarNodoSeguro(hijo);
		if (copiaHijo) copia.append(copiaHijo);
	});
	return copia;
};

// Conserva el formato visual del contenido pegado (incluyendo estilos de Word),
// eliminando únicamente nodos y atributos que pueden ejecutar código.
export const normalizarHtmlReporteRadiologia = (html) => {
	if (typeof document === 'undefined') return String(html || '');
	const origen = document.createElement('div');
	origen.innerHTML = String(html || '');
	const resultado = document.createElement('div');

	Array.from(origen.childNodes).forEach((nodo) => {
		const copia = clonarNodoSeguro(nodo);
		if (copia) resultado.append(copia);
	});

	return resultado.innerHTML;
};

const escaparTextoPlano = (texto) => String(texto)
	.replace(/&/g, '&amp;')
	.replace(/</g, '&lt;')
	.replace(/>/g, '&gt;');

// El reporte guardado ya viaja como HTML (los saltos de línea sólo son formato
// del marcado). Convertirlos en <br> duplicaba los espacios al abrirlo fuera del
// visor, así que sólo se convierten cuando el contenido es texto plano.
export const htmlReporteRadiologiaParaEditor = (contenido) => {
	const valor = String(contenido || '');
	if (!valor.trim()) return '';
	const pareceHtml = /<[a-z][^>]*>/i.test(valor);
	return pareceHtml
		? normalizarHtmlReporteRadiologia(valor)
		: escaparTextoPlano(valor).replace(/\r?\n/g, '<br>');
};
