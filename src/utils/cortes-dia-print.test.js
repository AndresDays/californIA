import { construirDocumentoCortes } from "./cortes-dia-print";

const ana = {
	empleadoKey: "ana",
	empleadoNombre: "Ana",
	efectivo: 100,
	tarjeta: 50,
	transferencia: 0,
	credito: 0,
	total: 150,
	transacciones: 2,
};

test("crea una hoja horizontal con el resumen e ingresos del empleado", () => {
	const html = construirDocumentoCortes({
		fecha: "2026-08-03",
		sucursal: "Ixtapa",
		cortes: [ana],
		transacciones: [
			{
				empleadoKey: "ana",
				folio: "B-10",
				paciente: "Paz",
				tipo: "venta",
				forma_pago: "efectivo",
				monto: 100,
				totalVenta: 100,
				pagoVenta: 100,
				adeudo: 0,
				estudios: [{ descripcion_estudio: "Biometría" }],
			},
			{
				empleadoKey: "ana",
				tipo: "egreso",
				forma_pago: "tarjeta",
				monto: -50,
				referencia: "Fondo de caja",
			},
		],
	});

	expect(html).toContain("@page { size: letter landscape;");
	expect(html).toContain("Corte de Caja");
	expect(html).toContain("<b>Usuario:</b> Ana");
	expect(html).toContain("B-10");
	expect(html).toContain("Fondo de caja");
});

test("desglosa efectivo, tarjetas y total por cobrar como el corte de caja", () => {
	const html = construirDocumentoCortes({
		fecha: "2026-08-03",
		sucursal: "Ixtapa",
		cortes: [{ ...ana, efectivo: 3972, total: 7242 }],
		transacciones: [
			{ empleadoKey: "ana", forma_pago: "efectivo", monto: 3972, id_venta: 1, adeudo: 0 },
			{ empleadoKey: "ana", forma_pago: "tarjeta_debito", monto: 2290, id_venta: 2, adeudo: 0 },
			{ empleadoKey: "ana", forma_pago: "tarjeta_credito", monto: 980, id_venta: 3, adeudo: 300 },
		],
	});

	expect(html).toContain("Efectivo neto a entregar");
	expect(html).toContain("Tarjeta de débito");
	expect(html).toContain("Tarjeta de crédito");
	expect(html).toContain("Total bancos");
	expect(html).toContain("Total por cobrar");
	expect(html).toContain("$3,270.00 MXN");
	expect(html).toContain("$300.00 MXN");
});

test("no incluye la apertura de caja en el corte impreso", () => {
	const html = construirDocumentoCortes({
		fecha: "2026-08-03",
		sucursal: "Ixtapa",
		cortes: [ana],
		transacciones: [
			{ empleadoKey: "ana", motivo: "apertura_caja", tipo: "apertura", forma_pago: "efectivo", monto: 500, referencia: "Apertura" },
			{ empleadoKey: "ana", folio: "B-11", tipo: "venta", forma_pago: "efectivo", monto: 100 },
		],
	});

	expect(html).toContain("Órdenes</td><td>1");
	expect(html).toContain("$100.00 MXN");
	expect(html).not.toContain("Apertura");
	expect(html).not.toContain("$500.00 MXN");
});

test("muestra el resumen de movimientos con pagos cancelados, cupones y cortesías", () => {
	const html = construirDocumentoCortes({
		fecha: "2026-08-03",
		sucursal: "Ixtapa",
		cortes: [ana],
		transacciones: [],
	});

	expect(html).toContain("Pagos cancelados");
	expect(html).toContain("Cupones");
	expect(html).toContain("Cortesías");
	expect(html).not.toContain("Vales de caja</td>");
});

test("separa en paginas el corte de cada empleado", () => {
	const html = construirDocumentoCortes({
		fecha: "2026-08-03",
		sucursal: "Todas",
		cortes: [ana, { ...ana, empleadoKey: "luis", empleadoNombre: "Luis" }],
		transacciones: [],
	});

	expect(html).toContain("<b>Usuario:</b> Ana");
	expect(html).toContain("<b>Usuario:</b> Luis");
	expect((html.match(/class=\"corte\"/g) || []).length).toBe(2);
	expect(html).toContain("break-after: page");
});
