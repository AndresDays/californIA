import { construirLoteSwelab } from "./swelab-import";

describe("construirLoteSwelab", () => {
	test("agrupa resultados BHC de un mismo folio", () => {
		expect(construirLoteSwelab([
			{ id: 10, folio: "1911250003", clave: "BH4", resultado: "8.7" },
			{ id: 11, folio: "1911250003", clave: "BH10", resultado: 150 },
		])).toEqual({
			folio: "1911250003",
			idsOrigen: [10, 11],
			resultados: { BH4: "8.7", BH10: "150" },
		});
	});

	test("rechaza folios mezclados, claves no BHC y claves duplicadas", () => {
		expect(() => construirLoteSwelab([
			{ id: 1, folio: "A", clave: "BH2", resultado: "4" },
			{ id: 2, folio: "B", clave: "BH3", resultado: "5" },
		])).toThrow("folio");
		expect(() => construirLoteSwelab([
			{ id: 1, folio: "A", clave: "HGB", resultado: "4" },
		])).toThrow("BHC");
		expect(() => construirLoteSwelab([
			{ id: 1, folio: "A", clave: "BH4", resultado: "4" },
			{ id: 2, folio: "A", clave: "BH4", resultado: "5" },
		])).toThrow("duplicado");
	});
});
