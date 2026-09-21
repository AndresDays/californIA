import { buscarDuplicadas, contarDuplicadas } from "./duplicados-agenda";

const cita = (extra) => ({
	id_agenda: "x",
	id_doctor: 1,
	medico_nombre: "Ramón Pérez",
	fecha: "2026-09-21",
	hora: null,
	estatus: "programada",
	created_at: "2026-09-20T10:00:00Z",
	...extra,
});

test("dos visitas del mismo médico el mismo día son una duplicada", () => {
	const duplicados = buscarDuplicadas([
		cita({ id_agenda: "a1" }),
		cita({ id_agenda: "a2", created_at: "2026-09-20T12:00:00Z" }),
	]);
	expect(contarDuplicadas(duplicados)).toBe(1);
	expect(duplicados[0].conservar.id_agenda).toBe("a1");
	expect(duplicados[0].eliminar.map((fila) => fila.id_agenda)).toEqual(["a2"]);
});

// La que ya se registró trae el resultado y el renglón del informe: esa se
// queda aunque se haya capturado después.
test("se conserva la que ya está registrada", () => {
	const duplicados = buscarDuplicadas([
		cita({ id_agenda: "a1" }),
		cita({ id_agenda: "a2", estatus: "realizada", id_visita: "v1", created_at: "2026-09-21T09:00:00Z" }),
	]);
	expect(duplicados[0].conservar.id_agenda).toBe("a2");
});

test("entre dos iguales se conserva la que tiene hora", () => {
	const duplicados = buscarDuplicadas([
		cita({ id_agenda: "a1" }),
		cita({ id_agenda: "a2", hora: "18:00:00" }),
	]);
	expect(duplicados[0].conservar.id_agenda).toBe("a2");
});

test("el mismo médico en días distintos no es duplicado", () => {
	expect(buscarDuplicadas([cita({ id_agenda: "a1" }), cita({ id_agenda: "a2", fecha: "2026-09-22" })])).toEqual([]);
});

test("médicos distintos el mismo día tampoco", () => {
	expect(
		buscarDuplicadas([
			cita({ id_agenda: "a1" }),
			cita({ id_agenda: "a2", id_doctor: 2, medico_nombre: "Ana Ruiz" }),
		]),
	).toEqual([]);
});

// Sin id_doctor se compara el nombre sin acentos ni "Dr.", que es como se
// capturan los médicos que todavía no están en el directorio.
test("empareja por nombre a los médicos sin expediente", () => {
	const duplicados = buscarDuplicadas([
		cita({ id_agenda: "a1", id_doctor: null, medico_nombre: "Dr. Ramón Pérez" }),
		cita({ id_agenda: "a2", id_doctor: null, medico_nombre: "ramon perez" }),
	]);
	expect(contarDuplicadas(duplicados)).toBe(1);
});

// La cancelada puede ser el rastro de una visita que se movió de día.
test("las canceladas no cuentan", () => {
	expect(
		buscarDuplicadas([cita({ id_agenda: "a1" }), cita({ id_agenda: "a2", estatus: "cancelada" })]),
	).toEqual([]);
});

test("tres iguales dejan una y señalan dos", () => {
	const duplicados = buscarDuplicadas([
		cita({ id_agenda: "a1" }),
		cita({ id_agenda: "a2" }),
		cita({ id_agenda: "a3" }),
	]);
	expect(contarDuplicadas(duplicados)).toBe(2);
});

test("una agenda limpia no reporta nada", () => {
	expect(buscarDuplicadas([cita({ id_agenda: "a1" })])).toEqual([]);
	expect(contarDuplicadas([])).toBe(0);
});
