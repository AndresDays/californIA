import {
	TIPOS_MOVIMIENTO_PAGO,
	movimientoSumaCaja,
	puedeAutorizarEntregaConAdeudo,
	resumirMovimientosCaja,
} from "./pagos-ventas";

describe("pagos-ventas helpers", () => {
	test("resta devoluciones y cancelaciones del corte", () => {
		expect(
			movimientoSumaCaja({
				tipo_movimiento: TIPOS_MOVIMIENTO_PAGO.DEVOLUCION,
				monto: 120,
			}),
		).toBe(-120);
		expect(
			movimientoSumaCaja({
				tipo_movimiento: TIPOS_MOVIMIENTO_PAGO.ABONO,
				monto: 80,
			}),
		).toBe(80);
	});

	test("resume pagos por forma de pago", () => {
		const resumen = resumirMovimientosCaja([
			{ tipo_movimiento: TIPOS_MOVIMIENTO_PAGO.PAGO_INICIAL, monto: 500, forma_pago: "efectivo" },
			{ tipo_movimiento: TIPOS_MOVIMIENTO_PAGO.ABONO, monto: 300, forma_pago: "tarjeta_credito" },
			{ tipo_movimiento: TIPOS_MOVIMIENTO_PAGO.DEVOLUCION, monto: 100, forma_pago: "efectivo" },
			{ tipo_movimiento: TIPOS_MOVIMIENTO_PAGO.CANCELACION, monto: 50, forma_pago: "transferencia" },
		]);

		expect(resumen.efectivo).toBe(400);
		expect(resumen.tarjeta).toBe(300);
		expect(resumen.transferencia).toBe(-50);
		expect(resumen.cancelaciones).toBe(50);
		expect(resumen.total).toBe(650);
	});

	test("solo roles administrativos autorizan entrega con adeudo", () => {
		expect(puedeAutorizarEntregaConAdeudo({ rol: "admin" })).toBe(true);
		expect(puedeAutorizarEntregaConAdeudo({ rol: "desarrollador" })).toBe(true);
		expect(puedeAutorizarEntregaConAdeudo({ rol: "recepcionista" })).toBe(false);
	});
});
