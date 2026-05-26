import {
	esTurnoActivo,
	generarCodigoTurno,
	obtenerRangoDiaLocalISO,
	obtenerNombrePrivado,
	ordenarTurnosPorCola,
	resolverDestinoTurnoDesdeEstudios,
	TURNO_ESTADOS,
} from "./turnos-pacientes";

describe("turnos-pacientes", () => {
	it("genera codigos de turno legibles", () => {
		expect(generarCodigoTurno(7)).toBe("A-007");
		expect(generarCodigoTurno(12, "r")).toBe("R-012");
	});

	it("privatiza nombres completos para pantalla publica", () => {
		expect(obtenerNombrePrivado("Maria Fernanda Lopez")).toBe("Maria F.");
		expect(obtenerNombrePrivado("Luis")).toBe("Luis");
		expect(obtenerNombrePrivado("")).toBe("Paciente");
	});

	it("ordena por prioridad y hora programada", () => {
		const turnos = ordenarTurnosPorCola([
			{ id_turno: 1, prioridad: 0, fecha_programada: "2026-05-26T11:00:00" },
			{ id_turno: 2, prioridad: 2, fecha_programada: "2026-05-26T12:00:00" },
			{ id_turno: 3, prioridad: 0, fecha_programada: "2026-05-26T10:00:00" },
		]);
		expect(turnos.map((turno) => turno.id_turno)).toEqual([2, 3, 1]);
	});

	it("detecta turnos activos", () => {
		expect(esTurnoActivo({ estado: TURNO_ESTADOS.ESPERANDO })).toBe(true);
		expect(esTurnoActivo({ estado: TURNO_ESTADOS.ATENDIDO })).toBe(false);
	});

	it("calcula un rango de dia local en ISO", () => {
		const rango = obtenerRangoDiaLocalISO("2026-05-26");
		expect(rango.inicio).toContain("T");
		expect(rango.fin).toContain("T");
		expect(new Date(rango.fin).getTime()).toBeGreaterThan(
			new Date(rango.inicio).getTime(),
		);
	});

	it("sugiere destino desde los estudios", () => {
		expect(
			resolverDestinoTurnoDesdeEstudios([{ descripcion_estudio: "Ultrasonido abdominal" }]),
		).toBe("Ultrasonido 1");
		expect(
			resolverDestinoTurnoDesdeEstudios([{ descripcion_estudio: "Biometria hematica" }]),
		).toBe("Laboratorio");
		expect(
			resolverDestinoTurnoDesdeEstudios([{ descripcion_estudio: "Tomografia simple" }]),
		).toBe("Tomografía 1");
		expect(resolverDestinoTurnoDesdeEstudios([])).toBe("Laboratorio");
	});
});
