import {
	esEmailValido,
	esTelefono10Digitos,
	normalizarPorcentaje,
	normalizarTelefono10,
} from "./form-validations";

describe("form-validations", () => {
	test("normaliza telefonos a maximo 10 digitos", () => {
		expect(normalizarTelefono10("+52 664-123-4567")).toBe("6641234567");
		expect(normalizarTelefono10("664abc1234567")).toBe("6641234567");
	});

	test("valida telefonos de exactamente 10 digitos", () => {
		expect(esTelefono10Digitos("6641234567")).toBe(true);
		expect(esTelefono10Digitos("664123456")).toBe(false);
		expect(esTelefono10Digitos("664123456a")).toBe(false);
	});

	test("valida correos con formato correcto", () => {
		expect(esEmailValido("paciente@example.com")).toBe(true);
		expect(esEmailValido("paciente@")).toBe(false);
		expect(esEmailValido("paciente example.com")).toBe(false);
	});

	test("limita porcentajes al rango permitido", () => {
		expect(normalizarPorcentaje("125")).toBe(100);
		expect(normalizarPorcentaje("-5")).toBe(0);
		expect(normalizarPorcentaje("15.5")).toBe(15.5);
		expect(normalizarPorcentaje("")).toBe("");
	});
});
