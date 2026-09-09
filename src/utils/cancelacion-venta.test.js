import { cancelarVenta, validarCancelacionVenta } from "./cancelacion-venta";

const venta = {
	id_venta: 7,
	folio: "F-7",
	total: 1000,
	pago_recibido: 400,
	forma_pago: "efectivo",
};

const crearSupabase = ({ errorPrimerUpdate = null } = {}) => {
	const registro = { updates: [], inserts: [] };
	return {
		registro,
		from: (tabla) => ({
			update: (cambios) => {
				registro.updates.push({ tabla, cambios });
				const error = registro.updates.length === 1 ? errorPrimerUpdate : null;
				return { eq: () => Promise.resolve({ error }) };
			},
			insert: (payload) => {
				registro.inserts.push({ tabla, payload });
				return Promise.resolve({ error: null });
			},
		}),
	};
};

describe("validarCancelacionVenta", () => {
	test("exige una orden seleccionada", () => {
		expect(validarCancelacionVenta({ motivo: "Error" }).mensaje).toMatch(/orden/i);
	});

	test("exige el motivo", () => {
		expect(validarCancelacionVenta({ venta, motivo: "   " }).mensaje).toMatch(/motivo/i);
	});

	test("acepta una cancelación con motivo", () => {
		expect(validarCancelacionVenta({ venta, motivo: "Duplicada" }).valido).toBe(true);
	});
});

describe("cancelarVenta", () => {
	test("deja la venta cancelada con movimiento de caja y auditoría", async () => {
		const supabase = crearSupabase();

		await cancelarVenta(supabase, {
			venta,
			motivo: "Solicitud duplicada",
			categoria: "duplicada",
			empleado: { nombre: "Recep" },
			user: { id: "u1" },
		});

		expect(supabase.registro.updates[0].cambios).toMatchObject({
			estado: "cancelado",
			motivo_cancelacion: "Solicitud duplicada",
		});
		const movimiento = supabase.registro.inserts.find(
			(i) => i.tabla === "movimientos_pago_venta",
		);
		expect(movimiento.payload).toMatchObject({
			tipo_movimiento: "cancelacion",
			monto: 400,
			folio: "F-7",
		});
		const auditoria = supabase.registro.inserts.find(
			(i) => i.tabla === "solicitudes_auditoria",
		);
		expect(auditoria.payload.evento).toBe("solicitud_cancelada");
		expect(auditoria.payload.detalles.motivo).toBe("Solicitud duplicada");
	});

	test("cancela aunque la base no tenga la columna del motivo", async () => {
		const supabase = crearSupabase({
			errorPrimerUpdate: {
				message: "Could not find the 'motivo_cancelacion' column in the schema cache",
			},
		});

		await cancelarVenta(supabase, { venta, motivo: "Error de captura" });

		expect(supabase.registro.updates).toHaveLength(2);
		expect(supabase.registro.updates[1].cambios).toEqual({
			estado: "cancelado",
			updated_at: expect.any(String),
		});
	});

	test("no registra movimiento cuando el folio no tiene pagos", async () => {
		const supabase = crearSupabase();

		await cancelarVenta(supabase, {
			venta: { ...venta, pago_recibido: 0 },
			motivo: "Paciente no se presentó",
		});

		expect(
			supabase.registro.inserts.some((i) => i.tabla === "movimientos_pago_venta"),
		).toBe(false);
	});

	test("no toca la venta cuando falta el motivo", async () => {
		const supabase = crearSupabase();
		await expect(cancelarVenta(supabase, { venta, motivo: "" })).rejects.toThrow(/motivo/i);
		expect(supabase.registro.updates).toHaveLength(0);
	});
});
