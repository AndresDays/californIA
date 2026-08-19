import { htmlReporteRadiologiaParaEditor, normalizarHtmlReporteRadiologia } from './reporte-radiologia-html';

describe('normalizarHtmlReporteRadiologia', () => {
	test('conserva los estilos de Word que determinan la posición y los espacios', () => {
		const htmlWord = '<p class="MsoNormal" align="right" style="margin-top:0cm;margin-bottom:420pt">PUERTO VALLARTA</p><p style="margin-left:8cm">HALLAZGOS: <b>Sin lesiones</b></p>';
		const resultado = normalizarHtmlReporteRadiologia(htmlWord);
		const contenedor = document.createElement('div');
		contenedor.innerHTML = resultado;
		const [fecha, hallazgos] = contenedor.querySelectorAll('p');

		expect(fecha).toHaveClass('MsoNormal');
		expect(fecha).toHaveAttribute('align', 'right');
		expect(fecha.style.marginTop).toBe('0cm');
		expect(fecha.style.marginBottom).toBe('420pt');
		expect(hallazgos.style.marginLeft).toBe('8cm');
		expect(hallazgos.innerHTML).toBe('HALLAZGOS: <b>Sin lesiones</b>');
	});

	test('descarta contenido ejecutable conservando el resto del formato', () => {
		const resultado = normalizarHtmlReporteRadiologia('<p onclick="alert(1)" style="margin-left:4cm">Texto</p><script>alert(1)</script>');

		expect(resultado).toBe('<p style="margin-left:4cm">Texto</p>');
	});
});

describe('htmlReporteRadiologiaParaEditor', () => {
	it('no agrega saltos extra cuando el reporte ya viene en HTML', () => {
		const guardado = '<p><strong>HALLAZGOS</strong></p>\n<p>Sin alteraciones.</p>';
		const resultado = htmlReporteRadiologiaParaEditor(guardado);
		expect(resultado).not.toContain('<br>');
		expect(resultado).toContain('<strong>HALLAZGOS</strong>');
	});

	it('convierte los saltos de línea del texto plano en <br>', () => {
		expect(htmlReporteRadiologiaParaEditor('TÉCNICA\nHALLAZGOS')).toBe('TÉCNICA<br>HALLAZGOS');
	});

	it('escapa el texto plano peligroso', () => {
		expect(htmlReporteRadiologiaParaEditor('a < b')).toBe('a &lt; b');
	});
});
