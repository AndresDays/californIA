const mockInvoke = jest.fn();
jest.mock("../lib/supabase-client", () => ({
	supabase: { functions: { invoke: (...args) => mockInvoke(...args) } },
}));

import { clasificarConIa } from "./use-clasificar-visita";

beforeEach(() => mockInvoke.mockReset());

test("manda el dictado a la función y devuelve las cinco columnas", async () => {
	mockInvoke.mockResolvedValue({
		data: {
			desglose: {
				actividades: " Se dejaron órdenes ",
				comentarios_medico: "Pidió precios",
				observaciones: "",
				seguimiento: "Volver en 15 días",
				tipo_convenio: "MIXTO",
			},
		},
		error: null,
	});
	await expect(clasificarConIa("Se dejaron órdenes. Pidió precios.")).resolves.toEqual({
		actividades: "Se dejaron órdenes",
		comentarios_medico: "Pidió precios",
		observaciones: "",
		seguimiento: "Volver en 15 días",
		tipo_convenio: "MIXTO",
	});
	expect(mockInvoke).toHaveBeenCalledWith("clasificar-visita", {
		body: { texto: "Se dejaron órdenes. Pidió precios." },
	});
});

// Una columna que la IA no devuelva no debe llegar como undefined a la visita.
test("las columnas que falten llegan vacías", async () => {
	mockInvoke.mockResolvedValue({ data: { desglose: { actividades: "Entrega" } }, error: null });
	const desglose = await clasificarConIa("Entrega");
	expect(desglose.comentarios_medico).toBe("");
	expect(desglose.tipo_convenio).toBe("");
});

test("un error de la función se propaga para poder caer al reparto local", async () => {
	mockInvoke.mockResolvedValue({ data: null, error: new Error("Function not found") });
	await expect(clasificarConIa("Algo")).rejects.toThrow("Function not found");
});

test("una respuesta sin desglose también se considera falla", async () => {
	mockInvoke.mockResolvedValue({ data: { error: "Clasificación por IA no configurada" }, error: null });
	await expect(clasificarConIa("Algo")).rejects.toThrow("Clasificación por IA no configurada");
});
