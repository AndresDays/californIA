import {
	construirCortesEmpleados,
	construirTransaccionesCorte,
} from "./cortes-admin";

const ventas = [
	{
		id_venta: 1,
		folio: "A-1",
		total: 440,
		pago_recibido: 440,
		cambio: 60,
		id_empleado: 10,
		empleados: { nombre: "Ana Recepcion" },
		pacientes: { nombre: "Juan Perez" },
		estudios_venta: [{ descripcion_estudio: "Biometria", precio: 440 }],
	},
	{
		id_venta: 2,
		folio: "A-2",
		total: 200.75,
		pago_recibido: 200.75,
		id_empleado: 11,
		empleados: { nombre: "Luis Caja" },
		pacientes: { nombre: "Maria Lopez" },
		estudios_venta: [{ descripcion_estudio: "Ultrasonido", precio: 200.75 }],
	},
];

const movimientos = [
	{
		id_movimiento: 101,
		id_venta: 1,
		folio: "A-1",
		monto: 440,
		forma_pago: "efectivo",
		tipo_movimiento: "pago_inicial",
		actor_auth_uuid: "auth-ana",
		actor_nombre: "Ana Recepcion",
		created_at: "2026-06-27T15:00:00Z",
	},
	{
		id_movimiento: 102,
		id_venta: 2,
		folio: "A-2",
		monto: 200.75,
		forma_pago: "tarjeta",
		tipo_movimiento: "pago_inicial",
		actor_auth_uuid: "auth-luis",
		actor_nombre: "Luis Caja",
		created_at: "2026-06-27T16:00:00Z",
	},
	{
		id_movimiento: 103,
		monto: 50,
		forma_pago: "efectivo",
		tipo_movimiento: "ajuste",
		motivo: "movimiento_manual_egreso",
		actor_auth_uuid: "auth-ana",
		actor_nombre: "Ana Recepcion",
		created_at: "2026-06-27T17:00:00Z",
	},
];

describe("cortes admin helpers", () => {
	test("enlaza movimientos con ventas y datos del paciente", () => {
		const transacciones = construirTransaccionesCorte({ movimientos, ventas });

		expect(transacciones[0]).toMatchObject({
			id_venta: 1,
			folio: "A-1",
			empleadoNombre: "Ana Recepcion",
			paciente: "Juan Perez",
			monto: 440,
			tipo: "venta",
		});
		expect(transacciones[0].estudios).toEqual([
			{ descripcion_estudio: "Biometria", precio: 440 },
		]);
	});

	test("agrupa cortes por empleado con totales por forma de pago", () => {
		const cortes = construirCortesEmpleados({ movimientos, ventas });

		expect(cortes).toEqual([
			expect.objectContaining({
				empleadoNombre: "Ana Recepcion",
				total: 390,
				efectivo: 390,
				tarjeta: 0,
				transacciones: 2,
			}),
			expect.objectContaining({
				empleadoNombre: "Luis Caja",
				total: 200.75,
				efectivo: 0,
				tarjeta: 200.75,
				transacciones: 1,
			}),
		]);
	});
});
