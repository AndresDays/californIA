import {
	PAIS_POR_DEFECTO,
	ladaDePais,
	normalizarTelefonoConLada,
	paisDeLada,
	separarLada,
	unirLada,
} from "./telefono-lada";

describe("separarLada", () => {
	test("reconoce la lada de México y la de Estados Unidos y Canadá", () => {
		expect(separarLada("+52 3221234567")).toEqual({ lada: "+52", numero: "3221234567" });
		expect(separarLada("+1 2135551234")).toEqual({ lada: "+1", numero: "2135551234" });
	});

	test("un número sin lada se queda a diez dígitos", () => {
		expect(separarLada("3221234567")).toEqual({ lada: "", numero: "3221234567" });
		expect(separarLada("(322) 123-4567")).toEqual({ lada: "", numero: "3221234567" });
		expect(separarLada(null)).toEqual({ lada: "", numero: "" });
	});
});

describe("unirLada", () => {
	test("Estados Unidos y Canadá guardan +1 y México +52", () => {
		expect(unirLada("Estados Unidos", "2135551234")).toBe("+1 2135551234");
		expect(unirLada("Canadá", "4165551234")).toBe("+1 4165551234");
		expect(unirLada(PAIS_POR_DEFECTO, "3221234567")).toBe("+52 3221234567");
	});

	test("sin número no se guarda una lada sola", () => {
		expect(unirLada("Estados Unidos", "")).toBe("");
	});

	test("Otro deja el número tal cual", () => {
		expect(unirLada("Otro", "3221234567")).toBe("3221234567");
		expect(ladaDePais("Otro")).toBe("");
	});
});

test("paisDeLada muestra +1 como Estados Unidos", () => {
	expect(paisDeLada("+1")).toBe("Estados Unidos");
	expect(paisDeLada("+52")).toBe("México");
	expect(paisDeLada("")).toBe("Otro");
});

test("normalizarTelefonoConLada no recorta la lada", () => {
	expect(normalizarTelefonoConLada("+1 2135551234")).toBe("+1 2135551234");
	expect(normalizarTelefonoConLada("3221234567")).toBe("3221234567");
	expect(normalizarTelefonoConLada("")).toBe("");
});
