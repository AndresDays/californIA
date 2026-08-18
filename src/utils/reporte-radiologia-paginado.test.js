import {
	crearBloquesReporteParaImprimir,
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
		const bloques = crearBloquesReporteParaImprimir(`<p>${texto}</p>`, {
			caracteresPorBloque: 200,
		});

		expect(bloques).toHaveLength(20);
		expect(dividirReporteEnPaginas(bloques, 100)).toHaveLength(20);
	});

	test('omite páginas sin texto antes de imprimir', () => {
		const paginaConTexto = [{ html: '<p>Hallazgo</p>', alto: 35 }];
		expect(omitirPaginasVacias([[], [{ html: '<p><br></p>', alto: 35 }], paginaConTexto]))
			.toEqual([paginaConTexto]);
	});
});
