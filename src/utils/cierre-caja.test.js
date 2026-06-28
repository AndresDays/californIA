import {
	filtrarVentasCortePorRecepcionista,
	formatearMontoCaja,
	normalizarMontoCajaPorForma,
	redondearMontoCaja,
} from "./cierre-caja";

describe("cierre-caja helpers", () => {
	test("filtra ventas por el id_empleado del recepcionista seleccionado", () => {
		const ventas = [
			{ id_venta: 1, id_empleado: 10, pago_recibido: 200 },
			{ id_venta: 2, id_empleado: 11, pago_recibido: 300 },
			{ id_venta: 3, id_empleado: 10, pago_recibido: 150 },
		];
		const empleados = [
			{ id_empleado: 10, auth_uuid: "recepcion-uno" },
			{ id_empleado: 11, auth_uuid: "recepcion-dos" },
		];

		expect(
			filtrarVentasCortePorRecepcionista(ventas, empleados, "recepcion-uno"),
		).toEqual([
			{ id_venta: 1, id_empleado: 10, pago_recibido: 200 },
			{ id_venta: 3, id_empleado: 10, pago_recibido: 150 },
		]);
	});

	test("regresa todas las ventas cuando no hay recepcionista seleccionado", () => {
		const ventas = [{ id_venta: 1, id_empleado: 10 }];

		expect(filtrarVentasCortePorRecepcionista(ventas, [], "")).toBe(ventas);
	});

	test("redondea montos al multiplo de 0.50 mas cercano", () => {
		expect(redondearMontoCaja(440.24)).toBe(440);
		expect(redondearMontoCaja(440.25)).toBe(440.5);
		expect(redondearMontoCaja(440.74)).toBe(440.5);
		expect(redondearMontoCaja(440.75)).toBe(441);
	});

	test("formatea montos de caja con dos decimales", () => {
		expect(formatearMontoCaja(440)).toBe("440.00");
		expect(formatearMontoCaja(440.5)).toBe("440.50");
		expect(formatearMontoCaja(440.755)).toBe("441.00");
	});

	test("solo redondea a 0.50 los montos de efectivo", () => {
		expect(normalizarMontoCajaPorForma(440.74, "efectivo")).toBe(440.5);
		expect(normalizarMontoCajaPorForma(440.74, "tarjeta")).toBe(440.74);
		expect(normalizarMontoCajaPorForma(440.749, "transfer")).toBe(440.75);
		expect(normalizarMontoCajaPorForma(440.744, "credito")).toBe(440.74);
	});
});
