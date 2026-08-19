import {
	ALTURA_UTIL_REPORTE_CON_FIRMA,
	agruparConclusionReporte,
	elegirEscalaUnaHoja,
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
			bloques.slice(3, 5),
			bloques.slice(5),
		]);
	});
});

describe('dividirReporteParaImpresion', () => {
	test('llena las primeras hojas antes de bajar lo que no cabe con la firma', () => {
		const bloques = Array.from({ length: 4 }, (_, indice) => ({
			html: `<p>Bloque ${indice + 1}</p>`,
			alto: 200,
		}));

		expect(dividirReporteParaImpresion(bloques, 890, 660)).toEqual([
			bloques.slice(0, 3),
			bloques.slice(3),
		]);
	});
});

describe('agruparConclusionReporte', () => {
	const bloques = [
		{ html: '<p>Hallazgo uno</p>', alto: 200 },
		{ html: '<p>CONCLUSION:</p>', alto: 30 },
		{ html: '<p>Artrosis leve.</p>', alto: 30 },
		{ html: '<p>Tenosinovitis.</p>', alto: 30 },
	];

	test('mantiene el título y sus renglones en una sola unidad', () => {
		expect(agruparConclusionReporte(bloques, 660)).toEqual([
			bloques[0],
			{ html: '<p>CONCLUSION:</p><p>Artrosis leve.</p><p>Tenosinovitis.</p>', alto: 90 },
		]);
	});

	test('reparte normalmente cuando la conclusión no cabe en una hoja', () => {
		expect(agruparConclusionReporte(bloques, 60)).toEqual(bloques);
	});

	test('deja el reporte intacto cuando no hay conclusión', () => {
		const sinConclusion = [{ html: '<p>Hallazgo</p>', alto: 30 }];
		expect(agruparConclusionReporte(sinConclusion, 660)).toEqual(sinConclusion);
	});
});

describe('elegirEscalaUnaHoja', () => {
	test('usa el tamaño normal cuando el reporte ya cabe en una hoja', () => {
		expect(elegirEscalaUnaHoja('<p>Hallazgo</p>', 660)).toBe(1);
	});

	test('elige la mayor reducción con la que el reporte todavía cabe', () => {
		const alturas = { 1: 876, 0.95: 832, 0.9: 789, 0.85: 744, 0.8: 701, 0.75: 657 };
		const escalas = Object.keys(alturas).map(Number).sort((a, b) => b - a);

		expect(escalas.find((escala) => alturas[escala] <= 660)).toBe(0.75);
	});

	test('no propone hoja única para un reporte vacío', () => {
		expect(elegirEscalaUnaHoja('<p><br></p>', 660)).toBeNull();
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
