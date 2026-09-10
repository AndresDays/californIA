import {
	construirObservacionDoctor,
	formatearFechaObservacion,
	validarObservacionDoctor,
} from "./observaciones-doctor";

describe("observaciones de doctor", () => {
	test("no se guarda una observacion vacia ni de dos letras", () => {
		expect(validarObservacionDoctor("")).toMatch(/Escribe la observación/);
		expect(validarObservacionDoctor("   ")).toMatch(/Escribe la observación/);
		expect(validarObservacionDoctor("ok")).toMatch(/al menos 5/);
		expect(validarObservacionDoctor("Cambió de consultorio")).toBe("");
	});

	// El nombre se copia además del id: el empleado puede darse de baja y la
	// observación tiene que seguir diciendo quién la anotó.
	test("la fila lleva el doctor y quien la anoto", () => {
		expect(
			construirObservacionDoctor({
				doctor: { id_doctor: 12, nombre: "Luis Vega" },
				texto: "  Pidió que le llamen antes de mandar resultados  ",
				empleado: { id_empleado: 3, nombre: "Ana Ruiz" },
			}),
		).toEqual({
			id_doctor: 12,
			observacion: "Pidió que le llamen antes de mandar resultados",
			id_empleado: 3,
			creado_por_nombre: "Ana Ruiz",
		});
	});

	test("sin empleado resuelto la observacion se guarda igual", () => {
		expect(
			construirObservacionDoctor({ doctor: { id: 4 }, texto: "Cambió de consultorio" }),
		).toEqual({
			id_doctor: 4,
			observacion: "Cambió de consultorio",
			id_empleado: null,
			creado_por_nombre: null,
		});
	});

	test("el texto se recorta al maximo que acepta la columna", () => {
		const larga = "a".repeat(600);
		expect(
			construirObservacionDoctor({ doctor: { id_doctor: 1 }, texto: larga }).observacion,
		).toHaveLength(500);
	});

	test("la fecha se lee en la zona de la clinica", () => {
		expect(formatearFechaObservacion("2026-09-10T02:00:00Z")).toMatch(/09\/09\/2026/);
		expect(formatearFechaObservacion("")).toBe("");
	});
});
