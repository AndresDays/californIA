import { idDeDia, movimientoDeArrastre, puedeArrastrarse } from "./arrastre-agenda";

const cita = { id_agenda: "a1", fecha: "2026-09-21", estatus: "programada" };
const evento = (citaArrastrada, fechaDestino) => ({
	active: { data: { current: citaArrastrada ? { cita: citaArrastrada } : {} } },
	over: fechaDestino ? { data: { current: { fecha: fechaDestino } } } : null,
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

test("el identificador del día es estable", () => {
	expect(idDeDia("2026-09-21")).toBe("dia-2026-09-21");
});
