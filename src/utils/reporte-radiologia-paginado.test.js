import {
	ALTURA_UTIL_REPORTE_CON_FIRMA,
	medirBloquesReporte,
	crearBloquesReporteParaImprimir,
	dividirReporteParaImpresion,
	dividirReporteEnPaginas,
	omitirPaginasVacias,
} from './reporte-radiologia-paginado';

describe('dividirReporteEnPaginas', () => {
	test('mueve los bloques que no caben a una pagina nueva', () => {
		const bloques = Array.from({ length: 5 }, (_, indice) => ({
			html: `<p>Bloque ${indice + 1}</p>`,
			alto: 120,
		}));

		expect(dividirReporteEnPaginas(bloques, 300)).toEqual([
			bloques.slice(0, 2),
			bloques.slice(2, 4),
			bloques.slice(4, 5),
		]);
	});

	test('fragmenta un parrafo muy largo antes de paginarlo', () => {
		const texto = Array.from({ length: 450 }, () => 'hallazgo').join(' ');
		const bloques = crearBloquesReporteParaImprimir('<p class="MsoNormal" align="right" style="font-family:Arial;font-size:12pt;margin-left:4cm">' + texto + '</p>', {
			caracteresPorBloque: 200,
		});

		expect(bloques).toHaveLength(20);
		expect(dividirReporteEnPaginas(bloques, 100)).toHaveLength(20);
		bloques.forEach(({ html }) => {
			expect(html).toContain('class="MsoNormal"');
			expect(html).toContain('align="right"');
			expect(html).toContain('font-family:Arial');
			expect(html).toContain('font-size:12pt');
			expect(html).toContain('margin-left:4cm');
		});
	});

	test('conserva los estilos anidados cuando un bloque largo se parte para imprimir', () => {
		const texto = Array.from({ length: 90 }, () => 'hallazgo').join(' ');
		const bloques = crearBloquesReporteParaImprimir(
			`<p class="MsoNormal" style="font-size:12pt"><strong><span style="font-family:Arial;color:#123456">${texto}</span></strong></p>`,
			{ caracteresPorBloque: 120 },
		);

		expect(bloques.length).toBeGreaterThan(1);
		bloques.forEach(({ html }) => {
			expect(html).toContain('<strong>');
			expect(html).toContain('font-family:Arial');
			expect(html).toContain('color:#123456');
		});
	});

	test('omite páginas sin texto antes de imprimir', () => {
		const paginaConTexto = [{ html: '<p>Hallazgo</p>', alto: 35 }];
		expect(omitirPaginasVacias([[], [{ html: '<p><br></p>', alto: 35 }], paginaConTexto]))
			.toEqual([paginaConTexto]);
	});

	test('aprovecha el espacio hasta el footer antes de continuar en otra página', () => {
		const bloques = Array.from({ length: 3 }, (_, indice) => ({
			html: `<p>Bloque ${indice + 1}</p>`,
			alto: 250,
		}));

		expect(dividirReporteEnPaginas(bloques, ALTURA_UTIL_REPORTE_CON_FIRMA))
			.toEqual([bloques.slice(0, 2), bloques.slice(2)]);
	});

	test('reserva el espacio de firma únicamente en la última página', () => {
		const bloques = Array.from({ length: 6 }, (_, indice) => ({
			html: `<p>Bloque ${indice + 1}</p>`,
			alto: 250,
		}));

		expect(dividirReporteParaImpresion(bloques, 900, 650)).toEqual([
			bloques.slice(0, 3),
			bloques.slice(3, 4),
			bloques.slice(4),
		]);
	});
});

describe('medirBloquesReporte', () => {
	test('conserva los bloques y no deja rastro en el documento', () => {
		const bloques = [{ html: '<p>Hallazgo</p>', alto: 35 }];

		const medidos = medirBloquesReporte(bloques);

		expect(medidos).toHaveLength(1);
		expect(medidos[0].html).toBe('<p>Hallazgo</p>');
		expect(document.querySelectorAll('.rr-editor')).toHaveLength(0);
	});

	test('mantiene la altura estimada cuando el entorno no calcula layout', () => {
		expect(medirBloquesReporte([{ html: '<p>Hallazgo</p>', alto: 35 }])[0].alto).toBe(35);
	});
});
