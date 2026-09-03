import { interpretarRenglonCita, resumirRenglonCita } from "./cita-renglon";

describe("interpretarRenglonCita", () => {
	test("nombre, teléfono y estudio de corrido", () => {
		expect(interpretarRenglonCita("Laura Mendez Rios 4771234567, biometria hematica")).toEqual({
			nombre: "Laura Mendez Rios",
			telefono: "4771234567",
			estudios: "biometria hematica",
		});
	});

	test.each([
		["coma", "Juan Perez, ultrasonido de abdomen"],
		["guion", "Juan Perez - ultrasonido de abdomen"],
		["diagonal", "Juan Perez / ultrasonido de abdomen"],
		["raya", "Juan Perez — ultrasonido de abdomen"],
	])("separa con %s", (_caso, renglon) => {
		expect(interpretarRenglonCita(renglon)).toMatchObject({
			nombre: "Juan Perez",
			estudios: "ultrasonido de abdomen",
		});
	});

	// El guion tiene que ir separado por espacios: hay apellidos y estudios que
	// lo llevan pegado y partirlos ahí seria peor que no partir nada.
	test("un guion pegado no parte el renglón", () => {
		expect(interpretarRenglonCita("Ana Perez-Lopez")).toMatchObject({
			nombre: "Ana Perez-Lopez",
			estudios: "",
		});
		expect(interpretarRenglonCita("Juan Perez, rayos-x de torax")).toMatchObject({
			estudios: "rayos-x de torax",
		});
	});

	// El telefono se dicta como sale, y quien escribe no lo va a limpiar.
	test.each([
		["seguido", "Ana Lopez 3221220777"],
		["con espacios", "Ana Lopez 322 122 0777"],
		["con guiones", "Ana Lopez 322-122-0777"],
		["con parentesis", "Ana Lopez (322) 122 0777"],
	])("reconoce el teléfono %s", (_caso, renglon) => {
		expect(interpretarRenglonCita(renglon)).toMatchObject({
			nombre: "Ana Lopez",
			telefono: "3221220777",
		});
	});

	test("el teléfono puede ir al principio", () => {
		expect(interpretarRenglonCita("3221220777 Maria Lopez / rayos x de torax")).toEqual({
			nombre: "Maria Lopez",
			telefono: "3221220777",
			estudios: "rayos x de torax",
		});
	});

	// Dicho en medio, entre el nombre y el estudio: no puede quedarse pegado a
	// ninguno de los dos.
	test("el teléfono en medio no ensucia el nombre ni el estudio", () => {
		expect(interpretarRenglonCita("Maria Lopez 3221220777 - rayos x")).toEqual({
			nombre: "Maria Lopez",
			telefono: "3221220777",
			estudios: "rayos x",
		});
	});

	// Un numero mas largo no es un telefono de diez digitos: mejor no tomarlo
	// que guardar diez digitos arrancados de en medio.
	test("no confunde un número más largo con un teléfono", () => {
		expect(interpretarRenglonCita("Ana Lopez 123456789012").telefono).toBe("");
	});

	test("un número corto no es teléfono", () => {
		expect(interpretarRenglonCita("Ana Lopez 12345").telefono).toBe("");
	});

	// Sin separador todo es nombre: partir un nombre largo a la mitad y guardar
	// la segunda parte como estudio es peor que dejar el estudio vacio, que se
	// ve de inmediato.
	test("sin separador todo el renglón es el nombre", () => {
		expect(interpretarRenglonCita("De La Torre Flores Jennifer Xitlali")).toEqual({
			nombre: "De La Torre Flores Jennifer Xitlali",
			telefono: "",
			estudios: "",
		});
	});

	test("solo el estudio, sin nombre", () => {
		expect(interpretarRenglonCita(", biometria hematica")).toMatchObject({
			nombre: "",
			estudios: "biometria hematica",
		});
	});

	test("varios estudios se conservan tal cual", () => {
		expect(
			interpretarRenglonCita("Ana Lopez, biometria hematica, quimica sanguinea"),
		).toMatchObject({
			nombre: "Ana Lopez",
			estudios: "biometria hematica, quimica sanguinea",
		});
	});

	test("los espacios de sobra se recortan", () => {
		expect(interpretarRenglonCita("   Ana   Lopez   ,   rayos x   ")).toEqual({
			nombre: "Ana Lopez",
			telefono: "",
			estudios: "rayos x",
		});
	});

	test.each([["vacío", ""], ["solo espacios", "   "], ["nulo", null], ["indefinido", undefined]])(
		"un renglón %s no inventa nada",
		(_caso, valor) => {
			expect(interpretarRenglonCita(valor)).toEqual({
				nombre: "",
				telefono: "",
				estudios: "",
			});
		},
	);
});

describe("resumirRenglonCita", () => {
	// Quien escribe tiene que ver qué entendió el renglón antes de guardar.
	test("muestra lo que se entendió", () => {
		expect(resumirRenglonCita("Ana Lopez 3221220777, rayos x")).toBe(
			"Paciente: Ana Lopez  ·  Tel: 3221220777  ·  Estudio: rayos x",
		);
	});

	test("omite lo que no venía", () => {
		expect(resumirRenglonCita("Ana Lopez")).toBe("Paciente: Ana Lopez");
	});

	test("un renglón vacío no resume nada", () => {
		expect(resumirRenglonCita("")).toBe("");
	});
});
