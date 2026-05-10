import { obtenerResumenPagoNuevoPaciente } from "./nuevo-paciente-resumen";

describe("obtenerResumenPagoNuevoPaciente", () => {
	test("marca pendiente cuando aun no hay estudios", () => {
		expect(obtenerResumenPagoNuevoPaciente(0, "")).toEqual({
			estado: "pendiente",
			etiqueta: "Sin estudios",
			accion: "Guardar e imprimir",
			adeudo: 0,
			cambio: 0,
		});
	});

	test("marca sin pago cuando no hay pago recibido", () => {
		expect(obtenerResumenPagoNuevoPaciente(850, "")).toEqual({
			estado: "sin-pago",
			etiqueta: "Sin pago registrado",
			accion: "Guardar sin pago e imprimir",
			adeudo: 850,
			cambio: 0,
		});
	});

	test("marca adeudo cuando el pago es parcial", () => {
		expect(obtenerResumenPagoNuevoPaciente(850, 300)).toEqual({
			estado: "adeudo",
			etiqueta: "Adeudo $550.00",
			accion: "Guardar con adeudo e imprimir",
			adeudo: 550,
			cambio: 0,
		});
	});

	test("marca pagado y calcula cambio cuando cubre el total", () => {
		expect(obtenerResumenPagoNuevoPaciente(850, 900)).toEqual({
			estado: "pagado",
			etiqueta: "Pagado completo",
			accion: "Guardar e imprimir",
			adeudo: 0,
			cambio: 50,
		});
	});
});
