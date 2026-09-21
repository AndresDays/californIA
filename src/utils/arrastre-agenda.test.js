import {
	franjaDeCita,
	horaDeFranja,
	HORAS_AGENDA,
	idDeCelda,
	movimientoDeArrastre,
	puedeArrastrarse,
} from "./arrastre-agenda";

const cita = { id_agenda: "a1", fecha: "2026-09-21", estatus: "programada" };
const evento = (citaArrastrada, fechaDestino, hora) => ({
	active: { data: { current: citaArrastrada ? { cita: citaArrastrada } : {} } },
	over: fechaDestino
		? { data: { current: { fecha: fechaDestino, ...(hora === undefined ? {} : { hora }) } } }
		: null,
});

test("mover a otro día devuelve el movimiento", () => {
	expect(movimientoDeArrastre(evento(cita, "2026-09-23"))).toEqual({
		cita,
		fecha: "2026-09-23",
	});
});

test("soltar fuera de un día no hace nada", () => {
	expect(movimientoDeArrastre(evento(cita, null))).toBeNull();
});

// Soltarla donde ya estaba es lo que pasa cuando se arrastra sin querer; si se
// procesara, la visita quedaría marcada como reprogramada sin haberse movido.
test("soltar en el mismo día no hace nada", () => {
	expect(movimientoDeArrastre(evento(cita, "2026-09-21"))).toBeNull();
});

test("la visita ya registrada no se mueve de día", () => {
	expect(puedeArrastrarse({ estatus: "realizada" })).toBe(false);
	expect(movimientoDeArrastre(evento({ ...cita, estatus: "realizada" }, "2026-09-23"))).toBeNull();
});

test("sólo la programada se arrastra", () => {
	expect(puedeArrastrarse(cita)).toBe(true);
	expect(puedeArrastrarse({ estatus: "cancelada" })).toBe(false);
	expect(puedeArrastrarse(null)).toBe(false);
});

test("un evento incompleto no revienta", () => {
	expect(movimientoDeArrastre(undefined)).toBeNull();
	expect(movimientoDeArrastre({})).toBeNull();
});

test("el identificador de la celda distingue día y hora", () => {
	expect(idDeCelda("2026-09-21", 9)).toBe("celda-2026-09-21-9");
	expect(idDeCelda("2026-09-21")).toBe("celda-2026-09-21-sinhora");
});

describe("franjas por hora", () => {
	test("la rejilla va de las 7 a las 20", () => {
		expect(HORAS_AGENDA[0]).toBe(7);
		expect(HORAS_AGENDA.at(-1)).toBe(20);
	});

	test("la visita cae en la franja de su hora", () => {
		expect(franjaDeCita({ hora: "16:30:00" })).toBe(16);
		expect(horaDeFranja(16)).toBe("16:00");
	});

	// Fuera del horario de la rejilla la visita no desaparece: se arrima al
	// extremo más cercano.
	test("lo que cae fuera del horario se arrima al extremo", () => {
		expect(franjaDeCita({ hora: "06:00:00" })).toBe(7);
		expect(franjaDeCita({ hora: "22:00:00" })).toBe(20);
	});

	test("sin hora no hay franja", () => {
		expect(franjaDeCita({ hora: null })).toBeNull();
		expect(franjaDeCita({})).toBeNull();
	});
});

describe("soltar en una hora", () => {
	test("mover a otra hora del mismo día devuelve la hora nueva", () => {
		expect(movimientoDeArrastre(evento(cita, "2026-09-21", 17))).toEqual({
			cita,
			fecha: "2026-09-21",
			hora: "17:00",
		});
	});

	test("soltar en la misma hora del mismo día no hace nada", () => {
		const conHora = { ...cita, hora: "17:00:00" };
		expect(movimientoDeArrastre(evento(conHora, "2026-09-21", 17))).toBeNull();
	});

	// La franja sin hora del día sirve para mover de día sin tocar el horario
	// que ya se acordó con el consultorio.
	test("soltar en la franja sin hora conserva la hora", () => {
		const conHora = { ...cita, hora: "17:00:00" };
		expect(movimientoDeArrastre(evento(conHora, "2026-09-23", null))).toEqual({
			cita: conHora,
			fecha: "2026-09-23",
		});
	});
});
