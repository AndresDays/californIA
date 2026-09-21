import { franjaDeCita, horaDeFranja, HORAS_AGENDA } from "./agenda-horas";

describe("franjas por hora", () => {
	test("la rejilla va de las 10 a las 20", () => {
		expect(HORAS_AGENDA[0]).toBe(10);
		expect(HORAS_AGENDA.at(-1)).toBe(20);
	});

	test("la visita cae en la franja de su hora", () => {
		expect(franjaDeCita({ hora: "16:30:00" })).toBe(16);
		expect(horaDeFranja(16)).toBe("16:00");
	});

	// Fuera del horario de la rejilla la visita no desaparece: se arrima al
	// extremo más cercano.
	test("lo que cae fuera del horario se arrima al extremo", () => {
		expect(franjaDeCita({ hora: "08:00:00" })).toBe(10);
		expect(franjaDeCita({ hora: "22:00:00" })).toBe(20);
	});

	test("sin hora no hay franja", () => {
		expect(franjaDeCita({ hora: null })).toBeNull();
		expect(franjaDeCita({})).toBeNull();
	});
});
