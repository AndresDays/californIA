import {
	CITA_ESTADOS_DASHBOARD,
	obtenerEstadoCitaPorCaptura,
	obtenerEstadoCitaPorEntrega,
} from "./cita-lifecycle";

describe("cita-lifecycle helpers", () => {
	test("dashboard solo mantiene citas pendientes o en recepcion", () => {
		expect(CITA_ESTADOS_DASHBOARD).toEqual([
			"pendiente",
			"confirmada",
			"en_recepcion",
		]);
	});

	test("captura deja la cita en lista_entrega cuando todos los estudios estan completados", () => {
		expect(
			obtenerEstadoCitaPorCaptura([
				{ estado_captura: "completado" },
				{ estado_captura: "completado" },
			]),
		).toBe("lista_entrega");
	});

	test("captura conserva en_proceso cuando todavia hay estudios pendientes", () => {
		expect(
			obtenerEstadoCitaPorCaptura([
				{ estado_captura: "completado" },
				{ estado_captura: "pendiente" },
			]),
		).toBe("en_proceso");
	});

	test("entrega marca entregada solo cuando todos los estudios fueron entregados", () => {
		expect(
			obtenerEstadoCitaPorEntrega([
				{ entregado: true },
				{ entregado: true },
			]),
		).toBe("entregada");

		expect(
			obtenerEstadoCitaPorEntrega([
				{ entregado: true },
				{ entregado: false },
			]),
		).toBe("lista_entrega");
	});
});
