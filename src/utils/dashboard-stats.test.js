import {
	calcularIngresosPorAreaVentasPagadas,
	calcularIngresosVentasPagadas,
} from "./dashboard-stats";

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

	test("separa ingresos pagados por laboratorio y radiologia usando estudios vendidos", () => {
		const ingresos = calcularIngresosPorAreaVentasPagadas([
			{
				estado: "activo",
				total: 900,
				pago_recibido: 900,
				estudios_venta: [
					{ descripcion_estudio: "BIOMETRIA HEMATICA", precio: 300 },
					{ descripcion_estudio: "RM CRANEO SIMPLE", area: "Imagen", precio: 600 },
				],
			},
			{
				estado: "activo",
				total: 1000,
				pago_recibido: 500,
				estudios_venta: [
					{ descripcion_estudio: "TAC DE CRANEO SIMPLE", precio: 1000 },
				],
			},
			{
				estado: "cancelado",
				total: 400,
				pago_recibido: 400,
				estudios_venta: [
					{ descripcion_estudio: "RX TORAX", precio: 400 },
				],
			},
		]);

		expect(ingresos).toEqual({
			laboratorio: 300,
			radiologia: 600,
			total: 900,
		});
	});

	test("prorratea descuentos entre laboratorio y radiologia", () => {
		const ingresos = calcularIngresosPorAreaVentasPagadas([
			{
				estado: "activo",
				total: 800,
				pago_recibido: 800,
				estudios_venta: [
					{ descripcion_estudio: "QUIMICA SANGUINEA", precio: 300 },
					{ descripcion_estudio: "TAC DE ABDOMEN SIMPLE", precio: 700 },
				],
			},
		]);

		expect(ingresos).toEqual({
			laboratorio: 240,
			radiologia: 560,
			total: 800,
		});
	});
});
