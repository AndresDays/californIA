import { registrarAbonoVenta, validarAbonoVenta } from "./abono-venta";

const venta = {
	id_venta: 5,
	folio: "F-5",
	total: 1000,
	pago_recibido: 400,
	sucursal: "Centro",
	id_sucursal: 1,
};

const crearSupabase = () => {
	const registro = { updates: [], inserts: [] };
	return {
		registro,
		from: (tabla) => ({
			update: (cambios) => {
				registro.updates.push({ tabla, cambios });
				return { eq: () => Promise.resolve({ error: null }) };
			},
			insert: (payload) => {
				registro.inserts.push({ tabla, payload });
				return Promise.resolve({ error: null });
			},
		}),
	};
};

describe("validarAbonoVenta", () => {
	test("rechaza folios sin adeudo", () => {
		expect(
			validarAbonoVenta({ venta: { total: 500, pago_recibido: 500 }, monto: 10 }),
		).toEqual({ valido: false, mensaje: "Este folio no tiene adeudo" });
	});

	test("rechaza monto vacío o cero", () => {
		expect(validarAbonoVenta({ venta, monto: 0 }).mensaje).toMatch(/capture el monto/i);
	});

	test("rechaza cobrar más que el adeudo", () => {
		expect(validarAbonoVenta({ venta, monto: 700 }).mensaje).toMatch(/mayor al adeudo/i);
	});

	test("exige los datos de la tarjeta", () => {
		expect(
			validarAbonoVenta({ venta, monto: 100, formaPago: "tarjeta_credito" }).mensaje,
		).toMatch(/últimos 4/i);
	});

	test("acepta un abono válido", () => {
		expect(validarAbonoVenta({ venta, monto: 600 }).valido).toBe(true);
	});
});

describe("registrarAbonoVenta", () => {
	test("acumula el pago y deja movimiento y auditoría", async () => {
		const supabase = crearSupabase();

		const resultado = await registrarAbonoVenta(supabase, {
			venta,
			monto: 200,
			formaPago: "efectivo",
			empleado: { nombre: "Recep", rol: "recepcionista" },
			user: { id: "u1" },
		});

		expect(resultado).toEqual({ pagoRecibido: 600, adeudo: 400 });
		expect(supabase.registro.updates[0].cambios).toMatchObject({
			pago_recibido: 600,
			forma_pago: "efectivo",
		});
		const movimiento = supabase.registro.inserts.find(
			(i) => i.tabla === "movimientos_pago_venta",
		);
		expect(movimiento.payload).toMatchObject({
			tipo_movimiento: "abono",
			monto: 200,
			folio: "F-5",
			sucursal: "Centro",
		});
		const auditoria = supabase.registro.inserts.find(
			(i) => i.tabla === "solicitudes_auditoria",
		);
		expect(auditoria.payload.evento).toBe("adeudo_cambiado");
		expect(auditoria.payload.detalles.adeudo_nuevo).toBe(400);
	});

	test("liquidar el adeudo registra el evento de cobro", async () => {
		const supabase = crearSupabase();

		const resultado = await registrarAbonoVenta(supabase, {
			venta,
			monto: 600,
			formaPago: "tarjeta_debito",
			ultimos4: "1234",
			codigoAprobacion: "ab12",
		});

		expect(resultado).toEqual({ pagoRecibido: 1000, adeudo: 0 });
		expect(supabase.registro.updates[0].cambios).toMatchObject({
			tarjeta_ultimos4: "1234",
			codigo_aprobacion: "AB12",
		});
		const auditoria = supabase.registro.inserts.find(
			(i) => i.tabla === "solicitudes_auditoria",
		);
		expect(auditoria.payload.evento).toBe("pago_registrado");
	});

	test("no cobra cuando la validación falla", async () => {
		const supabase = crearSupabase();
		await expect(
			registrarAbonoVenta(supabase, { venta, monto: 5000 }),
		).rejects.toThrow(/mayor al adeudo/i);
		expect(supabase.registro.updates).toHaveLength(0);
	});
});
