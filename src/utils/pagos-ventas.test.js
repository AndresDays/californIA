import {
	TIPOS_MOVIMIENTO_PAGO,
	registrarMovimientoPagoVenta,
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

const supabaseFalso = (errores = []) => {
	const inserts = [];
	let intento = 0;
	return {
		inserts,
		from: () => ({
			insert: (payload) => {
				inserts.push(payload);
				const error = errores[intento] || null;
				intento += 1;
				return Promise.resolve({ error });
			},
		}),
	};
};

describe("registrarMovimientoPagoVenta con tarjeta", () => {
	test("guarda los ultimos 4 digitos, el codigo y la referencia", async () => {
		const supabase = supabaseFalso();

		await registrarMovimientoPagoVenta(supabase, {
			id_venta: 7,
			folio: "F-7",
			tipo_movimiento: TIPOS_MOVIMIENTO_PAGO.PAGO_INICIAL,
			monto: 250,
			forma_pago: "tarjeta_credito",
			ultimos4: "1234",
			codigoAprobacion: "ab12cd",
		});

		expect(supabase.inserts).toHaveLength(1);
		expect(supabase.inserts[0]).toMatchObject({
			tarjeta_ultimos4: "1234",
			codigo_aprobacion: "AB12CD",
			referencia: "****1234 · Aprob. AB12CD",
		});
	});

	test("no guarda datos de tarjeta cuando el pago es en efectivo", async () => {
		const supabase = supabaseFalso();

		await registrarMovimientoPagoVenta(supabase, {
			id_venta: 7,
			tipo_movimiento: TIPOS_MOVIMIENTO_PAGO.ABONO,
			monto: 100,
			forma_pago: "efectivo",
			ultimos4: "1234",
			codigoAprobacion: "AB12",
		});

		expect(supabase.inserts[0]).toMatchObject({
			tarjeta_ultimos4: null,
			codigo_aprobacion: null,
			referencia: "",
		});
	});

	test("reintenta sin las columnas nuevas si la base no tiene la migracion", async () => {
		const supabase = supabaseFalso([
			{ message: "Could not find the 'tarjeta_ultimos4' column of 'movimientos_pago_venta' in the schema cache" },
		]);

		const resultado = await registrarMovimientoPagoVenta(supabase, {
			id_venta: 7,
			tipo_movimiento: TIPOS_MOVIMIENTO_PAGO.PAGO_INICIAL,
			monto: 250,
			forma_pago: "tarjeta_debito",
			ultimos4: "1234",
			codigoAprobacion: "AB12",
		});

		expect(resultado).toBeNull();
		expect(supabase.inserts).toHaveLength(2);
		expect(supabase.inserts[1]).not.toHaveProperty("tarjeta_ultimos4");
		expect(supabase.inserts[1].referencia).toBe("****1234 · Aprob. AB12");
	});
});
