import { crearLotesPendientes } from "./import-batches.cjs";

describe("crearLotesPendientes", () => {
	test("agrupa analitos por folio y excluye IDs ya confirmados", () => {
		const lotes = crearLotesPendientes([
			{ Id: 10, Folio: "0308260001", clave: "BH4", Resultado: "14.1", Unidad: "g/dL" },
			{ Id: 11, Folio: "0308260001", clave: "BH5", Resultado: "42.0", Unidad: "%" },
			{ Id: 12, Folio: "0308260002", clave: "BH4", Resultado: "12.9" },
			{ Id: 13, Folio: "0308260002", clave: "", Resultado: "12.9" },
		], new Set([12]));

		expect(lotes).toEqual([
			{
				folio: "0308260001",
				resultados: [
					{ id: 10, clave: "BH4", valor: "14.1", unidad: "g/dL", fecha: null },
					{ id: 11, clave: "BH5", valor: "42.0", unidad: "%", fecha: null },
				],
			},
		]);
	});

	test("conserva el valor más reciente cuando el equipo reenvía un analito", () => {
		const lotes = crearLotesPendientes([
			{ Id: 21, Folio: "0308260004", clave: "BH4", Resultado: "11.4" },
			{ Id: 20, Folio: "0308260004", clave: "BH4", Resultado: "10.9" },
			{ Id: 19, Folio: "0308260004", clave: "BH5", Resultado: "35.7" },
		], new Set());

		expect(lotes).toEqual([
			{
				folio: "0308260004",
				resultados: [
					{ id: 21, clave: "BH4", valor: "11.4", unidad: null, fecha: null },
					{ id: 19, clave: "BH5", valor: "35.7", unidad: null, fecha: null },
				],
			},
		]);
	});
});
