const escaparHtml = (valor) => String(valor ?? '')
	.replace(/&/g, '&amp;')
	.replace(/</g, '&lt;')
	.replace(/>/g, '&gt;')
	.replace(/"/g, '&quot;');

// En celular el visor de PDF embebido en un iframe suele quedarse en blanco, así
// que la pestaña muestra siempre un botón para abrir o descargar el archivo y el
// iframe sólo se despliega donde el navegador sabe pintarlo.
export const abrirPdfEnPestana = ({ url, titulo, ventana = null }) => {
	const destino = ventana || window.open('', '_blank');
	if (!destino) return null;

	const tituloSeguro = escaparHtml(titulo);
	const urlSegura = escaparHtml(url);

	destino.document.title = titulo;
	destino.document.open();
	destino.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${tituloSeguro}</title><style>
:root { color-scheme: light dark; }
html, body { width: 100%; height: 100%; margin: 0; background: #1f2430; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }
body { display: flex; flex-direction: column; }
.pdf-barra { display: none; align-items: center; justify-content: space-between; gap: .75rem; padding: .75rem 1rem; background: #0d1526; color: #fff; }
.pdf-barra strong { font-size: .95rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pdf-barra a { flex: 0 0 auto; padding: .6rem 1rem; border-radius: 8px; background: #53B9DB; color: #06121c; font-weight: 700; text-decoration: none; font-size: .9rem; }
iframe { flex: 1; width: 100%; border: 0; background: #fff; }
@media (max-width: 820px), (hover: none) and (pointer: coarse) {
	.pdf-barra { display: flex; }
	iframe { min-height: 60vh; }
}
</style></head><body><div class="pdf-barra"><strong>${tituloSeguro}</strong><a href="${urlSegura}" target="_blank" rel="noopener">Abrir PDF</a></div><iframe title="${tituloSeguro}" src="${urlSegura}"></iframe></body></html>`);
	destino.document.close();
	destino.document.title = titulo;
	return destino;
};
