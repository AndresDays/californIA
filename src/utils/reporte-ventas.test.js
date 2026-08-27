import {
	agruparEstudiosVendidos,
	agruparVentasPorDia,
	agruparVentasPorVendedor,
	calcularMetricasVentas,
	empresaFacturaVenta,
	filtrarVentasReporte,
	partirVentasPorArea,
	serieDeFolio,
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

	test("divide una venta mixta por area y prorratea total, pago y saldo", () => {
		const ventaMixta = {
			id_venta: 3,
			total: 500,
			pago_recibido: 400,
			estudios_venta: [
				{ descripcion_estudio: "Glucosa", precio: 200, area: "Laboratorio" },
				{ descripcion_estudio: "RM Cerebro", precio: 100, area: "Resonancia magnetica" },
				{ descripcion_estudio: "Consulta mascota", precio: 50, area: "Veterinaria" },
				{ descripcion_estudio: "Rx Torax", precio: 150, area: "Radiologia" },
			],
		};

		expect(partirVentasPorArea([ventaMixta])).toMatchObject({
			laboratorio: [expect.objectContaining({
				total: 200,
				pago_recibido: 160,
				saldo_reporte: 40,
				estudios_venta: [expect.objectContaining({ descripcion_estudio: "Glucosa" })],
			})],
			resonancias_veterinaria: [expect.objectContaining({
				total: 150,
				pago_recibido: 120,
				saldo_reporte: 30,
				estudios_venta: [
					expect.objectContaining({ descripcion_estudio: "RM Cerebro" }),
					expect.objectContaining({ descripcion_estudio: "Consulta mascota" }),
				],
			})],
			radiologia_imagen: [expect.objectContaining({
				total: 150,
				pago_recibido: 120,
				saldo_reporte: 30,
				estudios_venta: [expect.objectContaining({ descripcion_estudio: "Rx Torax" })],
			})],
		});
	});
});

// El folio dice a qué empresa se factura la orden sin abrirla: A es la imagen de
// CDI, B la de CDC y C el laboratorio de CDC.
describe("serieDeFolio", () => {
	test.each([
		["A0001", "A"],
		["b0002", "B"],
		["C0123", "C"],
		["  A0004 ", "A"],
	])("resuelve la serie de %s", (folio, esperado) => {
		expect(serieDeFolio(folio)).toBe(esperado);
	});

	// Los folios anteriores al cambio son DDMMYY + consecutivo, de puros dígitos.
	test.each(["2608260001", "", null, undefined, "AB0001"])(
		"un folio sin serie no inventa una: %s",
		(folio) => {
			expect(serieDeFolio(folio)).toBe("");
		},
	);
});

describe("empresaFacturaVenta", () => {
	test.each([
		["A0001", "CDI"],
		["B0002", "CDC"],
		["C0003", "CDC"],
	])("la serie %s factura por %s", (folio, esperado) => {
		expect(empresaFacturaVenta({ folio })).toBe(esperado);
	});

	// Una orden vieja, sin serie, se resuelve con la empresa del catálogo.
	test("sin serie usa la empresa de la venta", () => {
		expect(empresaFacturaVenta({ folio: "2608260001" }, "CENTRO DE DIAGNOSTICO POR IMAGEN PVR")).toBe("CDI");
		expect(empresaFacturaVenta({ folio: "2608260001" }, "CENTRAL DIAGNOSTICA CALIFORNIA")).toBe("CDC");
		expect(empresaFacturaVenta({ folio: "2608260001" }, "Veterinaria")).toBe("");
	});
});

describe("filtrarVentasReporte: empresa y serie", () => {
	const VENTAS = [
		{ id_venta: 1, folio: "A0001" },
		{ id_venta: 2, folio: "B0002" },
		{ id_venta: 3, folio: "C0003" },
		{ id_venta: 4, folio: "2608260001", empresas: { nombre: "CENTRAL DIAGNOSTICA CALIFORNIA" } },
	];

	test("filtra por la empresa que factura", () => {
		expect(filtrarVentasReporte(VENTAS, { empresaFactura: "CDI" }).map((v) => v.id_venta)).toEqual([1]);
		// CDC factura tanto su imagen (B) como su laboratorio (C), y las órdenes
		// viejas suyas también cuentan.
		expect(filtrarVentasReporte(VENTAS, { empresaFactura: "CDC" }).map((v) => v.id_venta)).toEqual([
			2, 3, 4,
		]);
	});

	test("filtra por la serie del folio", () => {
		expect(filtrarVentasReporte(VENTAS, { serie: "C" }).map((v) => v.id_venta)).toEqual([3]);
	});

	test("los dos filtros juntos se acumulan", () => {
		expect(
			filtrarVentasReporte(VENTAS, { empresaFactura: "CDC", serie: "B" }).map((v) => v.id_venta),
		).toEqual([2]);
		expect(filtrarVentasReporte(VENTAS, { empresaFactura: "CDI", serie: "C" })).toEqual([]);
	});

	test("sin filtros no se descarta nada", () => {
		expect(filtrarVentasReporte(VENTAS, {})).toHaveLength(4);
	});
});
