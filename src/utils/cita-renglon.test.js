import { interpretarRenglonCita, resumirRenglonCita } from "./cita-renglon";

const clientes = [
	{ id_cliente: 1, nombre: "IMSS" },
	{ id_cliente: 2, nombre: "IMSS Bienestar" },
	{ id_cliente: 3, nombre: "Particular" },
];

describe("interpretarRenglonCita", () => {
	test("estudio, nombre, teléfono y cliente de corrido", () => {
		expect(
			interpretarRenglonCita("biometria hematica, Laura Mendez Rios 4771234567 IMSS", { clientes }),
		).toEqual({
			estudios: "biometria hematica",
			nombre: "Laura Mendez Rios",
			telefono: "4771234567",
			cliente: "IMSS",
		});
	});

	test("el teléfono y el cliente son opcionales", () => {
		expect(interpretarRenglonCita("ultrasonido de abdomen, Juan Perez")).toEqual({
			estudios: "ultrasonido de abdomen",
			nombre: "Juan Perez",
			telefono: "",
			cliente: "",
		});
	});

	test.each([
		["coma", "ultrasonido de abdomen, Juan Perez"],
		["guion", "ultrasonido de abdomen - Juan Perez"],
		["diagonal", "ultrasonido de abdomen / Juan Perez"],
		["raya", "ultrasonido de abdomen — Juan Perez"],
	])("separa el estudio con %s", (_caso, renglon) => {
		expect(interpretarRenglonCita(renglon)).toMatchObject({
			estudios: "ultrasonido de abdomen",
			nombre: "Juan Perez",
		});
	});

	// Después del teléfono, lo que quede es el cliente aunque no esté en el
	// catálogo: así se le avisa a quien escribe en lugar de pegarlo al nombre.
	test("lo que sigue al teléfono es el cliente", () => {
		expect(interpretarRenglonCita("rayos x, Ana Lopez 3221220777 Seguros Monterrey")).toMatchObject({
			nombre: "Ana Lopez",
			telefono: "3221220777",
			cliente: "Seguros Monterrey",
		});
	});

	test("sin teléfono, otra coma separa al cliente", () => {
		expect(interpretarRenglonCita("rayos x, Ana Lopez, Seguros Monterrey")).toMatchObject({
			nombre: "Ana Lopez",
			telefono: "",
			cliente: "Seguros Monterrey",
		});
	});

	test("sin teléfono ni coma, reconoce al cliente del catálogo al final", () => {
		expect(interpretarRenglonCita("rayos x, Ana Lopez imss", { clientes })).toMatchObject({
			nombre: "Ana Lopez",
			cliente: "imss",
		});
	});

	test("del catálogo gana el nombre de cliente más largo", () => {
		expect(interpretarRenglonCita("rayos x, Ana Lopez IMSS Bienestar", { clientes })).toMatchObject({
			nombre: "Ana Lopez",
			cliente: "IMSS Bienestar",
		});
	});

	// Sin catálogo que lo confirme, las últimas palabras son apellido, no cliente.
	test("sin teléfono ni coma, un nombre que no es cliente se queda entero", () => {
		expect(interpretarRenglonCita("rayos x, Ana Lopez Garcia", { clientes })).toMatchObject({
			nombre: "Ana Lopez Garcia",
			cliente: "",
		});
	});

	test("el cliente del catálogo no se lleva al paciente completo", () => {
		expect(interpretarRenglonCita("rayos x, Particular", { clientes })).toMatchObject({
			nombre: "Particular",
			cliente: "",
		});
	});

	// El guion tiene que ir separado por espacios: hay apellidos y estudios que
	// lo llevan pegado y partirlos ahí seria peor que no partir nada.
	test("un guion pegado no parte el renglón", () => {
		expect(interpretarRenglonCita("rayos-x de torax, Ana Perez-Lopez")).toMatchObject({
			estudios: "rayos-x de torax",
			nombre: "Ana Perez-Lopez",
		});
	});

	// El telefono se dicta como sale, y quien escribe no lo va a limpiar.
	test.each([
		["seguido", "rayos x, Ana Lopez 3221220777"],
		["con espacios", "rayos x, Ana Lopez 322 122 0777"],
		["con guiones", "rayos x, Ana Lopez 322-122-0777"],
		["con parentesis", "rayos x, Ana Lopez (322) 122 0777"],
	])("reconoce el teléfono %s", (_caso, renglon) => {
		expect(interpretarRenglonCita(renglon)).toMatchObject({
			nombre: "Ana Lopez",
			telefono: "3221220777",
			cliente: "",
		});
	});

	test("el teléfono separado por coma no ensucia nombre ni cliente", () => {
		expect(interpretarRenglonCita("rayos x, Maria Lopez, 3221220777, IMSS")).toEqual({
			estudios: "rayos x",
			nombre: "Maria Lopez",
			telefono: "3221220777",
			cliente: "IMSS",
		});
	});

	// Un numero mas largo no es un telefono de diez digitos: mejor no tomarlo
	// que guardar diez digitos arrancados de en medio.
	test("no confunde un número más largo con un teléfono", () => {
		expect(interpretarRenglonCita("rayos x, Ana Lopez 123456789012").telefono).toBe("");
	});

	test("un número corto no es teléfono", () => {
		expect(interpretarRenglonCita("rayos x, Ana Lopez 12345").telefono).toBe("");
	});

	// Sin separador todo es nombre: guardar un nombre como estudio es peor que
	// dejar el estudio vacio, que se ve de inmediato.
	test("sin separador todo el renglón es el nombre", () => {
		expect(interpretarRenglonCita("De La Torre Flores Jennifer Xitlali")).toEqual({
			estudios: "",
			nombre: "De La Torre Flores Jennifer Xitlali",
			telefono: "",
			cliente: "",
		});
	});

	test("solo el estudio, sin nombre", () => {
		expect(interpretarRenglonCita("biometria hematica,")).toMatchObject({
			estudios: "biometria hematica",
			nombre: "",
		});
	});

	test("varios estudios se juntan con +", () => {
		expect(
			interpretarRenglonCita("biometria hematica + quimica sanguinea, Ana Lopez"),
		).toMatchObject({
			estudios: "biometria hematica + quimica sanguinea",
			nombre: "Ana Lopez",
		});
	});

	test("los espacios de sobra se recortan", () => {
		expect(interpretarRenglonCita("   rayos   x   ,   Ana   Lopez   ")).toEqual({
			estudios: "rayos x",
			nombre: "Ana Lopez",
			telefono: "",
			cliente: "",
		});
	});

	test.each([["vacío", ""], ["solo espacios", "   "], ["nulo", null], ["indefinido", undefined]])(
		"un renglón %s no inventa nada",
		(_caso, valor) => {
			expect(interpretarRenglonCita(valor)).toEqual({
				estudios: "",
				nombre: "",
				telefono: "",
				cliente: "",
			});
		},
	);
});

describe("resumirRenglonCita", () => {
	// Quien escribe tiene que ver qué entendió el renglón antes de guardar.
	test("muestra lo que se entendió, en el orden en que se escribe", () => {
		expect(resumirRenglonCita("rayos x, Ana Lopez 3221220777 imss", { clientes })).toBe(
			"Estudio: rayos x  ·  Paciente: Ana Lopez  ·  Tel: 3221220777  ·  Cliente: IMSS",
		);
	});

	test("avisa cuando el cliente no está en el catálogo", () => {
		expect(resumirRenglonCita("rayos x, Ana Lopez 3221220777 Patito", { clientes })).toContain(
			"Cliente: Patito (no está en el catálogo, no se guardará)",
		);
	});

	test("omite lo que no venía", () => {
		expect(resumirRenglonCita("Ana Lopez")).toBe("Paciente: Ana Lopez");
	});

	test("un renglón vacío no resume nada", () => {
		expect(resumirRenglonCita("")).toBe("");
	});
});
