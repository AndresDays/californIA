import {
	calcularSaldoVenta,
	normalizarPagoRecibido,
	obtenerClaseAdeudoVenta,
	tieneAdeudoVenta,
} from "./venta-payment-status";

describe("venta-payment-status helpers", () => {
	test("permite ventas sin pago inicial guardando pago recibido en cero", () => {
		expect(normalizarPagoRecibido("")).toBe(0);
		expect(normalizarPagoRecibido(null)).toBe(0);
		expect(normalizarPagoRecibido("120.50")).toBe(120.5);
	});

	test("marca como adeudo cuando el pago recibido no cubre el total", () => {
		const ventaSinPago = { total: 900, pago_recibido: 0 };
		const ventaParcial = { total: "900", pago_recibido: "400" };
		const ventaPagada = { total: 900, pago_recibido: 900 };

		expect(calcularSaldoVenta(ventaSinPago)).toBe(900);
		expect(calcularSaldoVenta(ventaParcial)).toBe(500);
		expect(calcularSaldoVenta(ventaPagada)).toBe(0);
		expect(tieneAdeudoVenta(ventaSinPago)).toBe(true);
		expect(tieneAdeudoVenta(ventaParcial)).toBe(true);
		expect(tieneAdeudoVenta(ventaPagada)).toBe(false);
	});

	test("devuelve clase roja para resaltar ventas con adeudo", () => {
		expect(obtenerClaseAdeudoVenta({ total: 700, pago_recibido: 100 })).toBe(
			"row-adeudo",
		);
		expect(obtenerClaseAdeudoVenta({ total: 700, pago_recibido: 700 })).toBe("");
	});
});
