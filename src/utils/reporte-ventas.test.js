import {
	agruparEstudiosVendidos,
	agruparVentasPorDia,
	agruparVentasPorVendedor,
	calcularMetricasVentas,
	filtrarVentasReporte,
} from "./reporte-ventas";

const ventas = [
	{
		id_venta: 1,
		fecha_venta: "2026-05-01T10:00:00",
		total: 1000,
		pago_recibido: 700,
		forma_pago: "efectivo",
		id_empleado: 11,
		id_cliente: 20,
		id_doctor: 30,
		citas: { id_sucursal: 2 },
		empleados: { nombre: "Ana" },
		estudios_venta: [
			{ descripcion_estudio: "Biometria", precio: 600, area: "laboratorio" },
			{ descripcion_estudio: "Rx Torax", precio: 400, area: "radiologia" },
		],
	},
	{
		id_venta: 2,
		fecha_venta: "2026-05-01T12:00:00",
		total: 500,
		pago_recibido: 500,
		forma_pago: "tarjeta",
		id_empleado: 12,
		id_cliente: 21,
		id_doctor: 31,
		citas: { id_sucursal: 3 },
		empleados: { nombre: "Luis" },
		estudios_venta: [
			{ descripcion_estudio: "Biometria", precio: 500, area: "laboratorio" },
		],
	},
];

describe("reporte ventas helpers", () => {
	test("calcula metricas del periodo", () => {
		expect(calcularMetricasVentas(ventas)).toEqual({
			totalVentas: 1500,
			ordenes: 2,
			ticketPromedio: 750,
			adeudosPendientes: 300,
			pacientesConSaldo: 1,
		});
	});

	test("filtra por sucursal, vendedor, forma de pago, area, cliente, doctor y estudio", () => {
		expect(filtrarVentasReporte(ventas, { sucursal: "2" })).toEqual([ventas[0]]);
		expect(filtrarVentasReporte(ventas, { vendedor: "12" })).toEqual([ventas[1]]);
		expect(filtrarVentasReporte(ventas, { formaPago: "efectivo" })).toEqual([
			ventas[0],
		]);
		expect(filtrarVentasReporte(ventas, { area: "radiologia" })).toEqual([ventas[0]]);
		expect(filtrarVentasReporte(ventas, { cliente: "21" })).toEqual([ventas[1]]);
		expect(filtrarVentasReporte(ventas, { doctor: "30" })).toEqual([ventas[0]]);
		expect(filtrarVentasReporte(ventas, { estudio: "rx" })).toEqual([ventas[0]]);
	});

	test("permite filtrar ventas que no tienen sucursal ligada", () => {
		const ventaSinSucursal = {
			...ventas[0],
			id_venta: 99,
			citas: null,
		};

		expect(
			filtrarVentasReporte([...ventas, ventaSinSucursal], {
				sucursal: "__sin_sucursal",
			}),
		).toEqual([ventaSinSucursal]);
	});

	test("filtra por sucursal guardada en los estudios de la venta", () => {
		const ventaConSucursalEnEstudio = {
			...ventas[0],
			id_venta: 100,
			citas: null,
			estudios_venta: [
				{ descripcion_estudio: "Biometria", precio: 600, area: "laboratorio", id_sucursal: 3 },
			],
		};

		expect(
			filtrarVentasReporte([ventaConSucursalEnEstudio], { sucursal: "3" }),
		).toEqual([ventaConSucursalEnEstudio]);
	});

	test("agrupa ventas por dia, estudios y vendedor", () => {
		expect(agruparVentasPorDia(ventas)).toEqual([
			{ label: "01/05", total: 1500 },
		]);
		expect(agruparEstudiosVendidos(ventas)[0]).toEqual({
			name: "Biometria",
			count: 2,
			total: 1100,
			pct: 100,
			color: "#53B9DB",
		});
		expect(agruparVentasPorVendedor(ventas)).toEqual([
			{ name: "Ana", amount: 1000, orders: 1 },
			{ name: "Luis", amount: 500, orders: 1 },
		]);
	});
});
