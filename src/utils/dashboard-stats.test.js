import { calcularIngresosVentasPagadas } from "./dashboard-stats";

describe("dashboard-stats helpers", () => {
	test("suma solo ventas activas pagadas del mes usando el total de la venta", () => {
		const ingresos = calcularIngresosVentasPagadas(
			[
				{
					fecha_venta: "2026-05-09T07:18:52+00:00",
					estado: "activo",
					total: 450,
					pago_recibido: 500,
				},
				{
					fecha_venta: "2026-05-10T07:18:52+00:00",
					estado: "activo",
					total: "250.50",
					pago_recibido: "250.50",
				},
				{
					fecha_venta: "2026-05-11T07:18:52+00:00",
					estado: "activo",
					total: 300,
					pago_recibido: 100,
				},
				{
					fecha_venta: "2026-04-30T07:18:52+00:00",
					estado: "activo",
					total: 800,
					pago_recibido: 800,
				},
				{
					fecha_venta: "2026-05-12T07:18:52+00:00",
					estado: "cancelado",
					total: 600,
					pago_recibido: 600,
				},
			],
			"2026-05-01T00:00:00",
			"2026-06-01T00:00:00",
		);

		expect(ingresos).toBe(700.5);
	});
});
