import { obtenerEstadoSolicitud, obtenerMetaEstadoSolicitud } from "./solicitud-estado";

describe("solicitud-estado", () => {
	test("prioriza adeudo cuando la solicitud no esta liquidada", () => {
		const estado = obtenerEstadoSolicitud({
			total: 900,
			pago_recibido: 300,
			estudios_venta: [{ estado_validacion: "validado", entregado: false }],
		});

		expect(estado).toBe("adeudo");
		expect(obtenerMetaEstadoSolicitud(estado).label).toBe("Adeudo");
	});

	test("marca muestra pendiente antes de captura normal", () => {
		expect(
			obtenerEstadoSolicitud({
				total: 500,
				pago_recibido: 500,
				estudios_venta: [{ muestra_pendiente: true, estado_validacion: "captura" }],
			}),
		).toBe("muestra_pendiente");
	});

	test("detecta resultados listos para entrega mezclando laboratorio y radiologia", () => {
		expect(
			obtenerEstadoSolicitud({
				total: 500,
				pago_recibido: 500,
				estudios_venta: [{ estado_validacion: "validado", entregado: false }],
				estudios_radiologia: [{ listo_entrega: true, entregado: false }],
			}),
		).toBe("listo_entrega");
	});

	test("detecta radiologia pendiente de interpretacion", () => {
		expect(
			obtenerEstadoSolicitud({
				total: 500,
				pago_recibido: 500,
				estudios_venta: [{ estado_validacion: "validado", entregado: true }],
				estudios_radiologia: [{ listo_entrega: false, entregado: false }],
			}),
		).toBe("radiologia");
	});

	test("marca entregado cuando todo esta entregado", () => {
		expect(
			obtenerEstadoSolicitud({
				total: 500,
				pago_recibido: 500,
				estudios_venta: [{ estado_validacion: "validado", entregado: true }],
				estudios_radiologia: [{ listo_entrega: true, entregado: true }],
			}),
		).toBe("entregado");
	});
});
