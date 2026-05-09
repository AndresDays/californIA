import { esErrorColumnaSchemaCache } from "./supabase-errors";

describe("supabase-errors helpers", () => {
	test("detecta cuando PostgREST no encuentra una columna en schema cache", () => {
		expect(
			esErrorColumnaSchemaCache(
				{
					message:
						"Could not find the 'id_cita' column of 'ventas' in the schema cache",
				},
				"id_cita",
			),
		).toBe(true);
	});

	test("no marca errores de otras columnas", () => {
		expect(
			esErrorColumnaSchemaCache(
				{
					message:
						"Could not find the 'id_cliente' column of 'ventas' in the schema cache",
				},
				"id_cita",
			),
		).toBe(false);
	});
});
