import { crearBloquesPdfDesdeHtml, dibujarHtmlEnPdf } from "./reporte-pdf-html";

const crearDoc = () => {
	const doc = {
		fuente: ["helvetica", "normal"],
		tamano: 10,
		setFont: jest.fn(function (familia, estilo) { doc.fuente = [familia, estilo]; }),
		setFontSize: jest.fn(function (tamano) { doc.tamano = tamano; }),
		// Ancho aproximado: cada carácter mide la mitad del tamaño de fuente.
		getTextWidth: jest.fn((texto) => texto.length * (doc.tamano / 2)),
		text: jest.fn(),
		line: jest.fn(),
	};
	return doc;
};

describe("crearBloquesPdfDesdeHtml", () => {
	test("separa párrafos y conserva negritas y cursivas", () => {
		const bloques = crearBloquesPdfDesdeHtml(
			"<p>Hallazgos <strong>normales</strong> y <em>simétricos</em>.</p><p>Segundo párrafo.</p>",
		);
		expect(bloques).toHaveLength(2);
		expect(bloques[0].tramos.map((t) => [t.texto, t.negrita, t.cursiva])).toEqual([
			["Hallazgos ", false, false],
			["normales", true, false],
			[" y ", false, false],
			["simétricos", false, true],
			[".", false, false],
		]);
		expect(bloques[1].tramos[0].texto).toBe("Segundo párrafo.");
	});

	test("respeta la alineación y el tamaño declarados en el estilo", () => {
		const bloques = crearBloquesPdfDesdeHtml(
			'<p style="text-align: center; font-size: 24px">CONCLUSIÓN</p>',
		);
		expect(bloques[0].alineacion).toBe("center");
		expect(bloques[0].tramos[0].escala).toBe(1.5);
	});

	test("los títulos salen en negritas y más grandes", () => {
		const [bloque] = crearBloquesPdfDesdeHtml("<h2>HALLAZGOS</h2>");
		expect(bloque.tramos[0]).toMatchObject({ negrita: true, escala: 1.28 });
	});

	test("los saltos de línea abren un bloque nuevo", () => {
		const bloques = crearBloquesPdfDesdeHtml("Primera<br>Segunda");
		expect(bloques.map((bloque) => bloque.tramos.map((t) => t.texto).join(""))).toEqual([
			"Primera",
			"Segunda",
		]);
	});

	test("las listas llevan viñeta y sangría", () => {
		const bloques = crearBloquesPdfDesdeHtml("<ul><li>Uno</li><li>Dos</li></ul>");
		expect(bloques.map((bloque) => [bloque.vinieta, bloque.sangria])).toEqual([
			["•", 1],
			["•", 1],
		]);
		const ordenada = crearBloquesPdfDesdeHtml("<ol><li>Uno</li><li>Dos</li></ol>");
		expect(ordenada.map((bloque) => bloque.vinieta)).toEqual(["1.", "2."]);
	});
});

describe("dibujarHtmlEnPdf", () => {
	test("escribe cada tramo con su tipografía", () => {
		const doc = crearDoc();
		dibujarHtmlEnPdf(doc, "<p>Rodete <strong>íntegro</strong></p>", { x: 16.9, y: 44.7, ancho: 176 });
		const escritos = doc.text.mock.calls.map((llamada) => llamada[0]);
		expect(escritos).toEqual(["Rodete", "íntegro"]);
		expect(doc.setFont).toHaveBeenCalledWith("helvetica", "bold");
	});

	test("parte el texto largo en renglones dentro del ancho útil", () => {
		const doc = crearDoc();
		const y = dibujarHtmlEnPdf(doc, `<p>${"palabra ".repeat(60)}</p>`, {
			x: 16.9,
			y: 44.7,
			ancho: 176,
			interlineado: 4.9,
			limiteInferior: 999,
		});
		const alturas = new Set(doc.text.mock.calls.map((llamada) => llamada[2]));
		expect(alturas.size).toBeGreaterThan(1);
		expect(y).toBeGreaterThan(44.7);
	});

	test("pide una hoja nueva cuando el texto pasa del límite inferior", () => {
		const doc = crearDoc();
		const nuevaPagina = jest.fn(() => 44.7);
		dibujarHtmlEnPdf(doc, `<p>${"palabra ".repeat(200)}</p>`, {
			x: 16.9,
			y: 44.7,
			ancho: 176,
			limiteInferior: 100,
			nuevaPagina,
		});
		expect(nuevaPagina).toHaveBeenCalled();
	});

	test("centra el bloque alineado al centro", () => {
		const doc = crearDoc();
		dibujarHtmlEnPdf(doc, '<p style="text-align:center">AB</p>', { x: 0, y: 10, ancho: 100 });
		const [, posicion] = doc.text.mock.calls[0];
		expect(posicion).toBeGreaterThan(40);
	});

	test("subraya los tramos marcados", () => {
		const doc = crearDoc();
		dibujarHtmlEnPdf(doc, "<p><u>Firmado</u></p>", { x: 10, y: 20, ancho: 100 });
		expect(doc.line).toHaveBeenCalled();
	});
});
