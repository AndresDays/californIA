import { normalizarHtmlReporteRadiologia } from './reporte-radiologia-html';

describe('normalizarHtmlReporteRadiologia', () => {
	test('elimina estilos y atributos de Word conservando párrafos y negritas', () => {
		const htmlWord = '<p class="MsoNormal" align="right" style="margin-top:0cm;margin-bottom:420pt">PUERTO VALLARTA</p><p style="margin-left:8cm">HALLAZGOS: <b>Sin lesiones</b></p>';

		expect(normalizarHtmlReporteRadiologia(htmlWord))
			.toBe('<p>PUERTO VALLARTA</p><p>HALLAZGOS: <strong>Sin lesiones</strong></p>');
	});
});
