import { construirDocumentoReporteVentas } from "./reporte-ventas-print";
import { ESTILOS_IMPRESION } from "./cortes-dia-print";

const DOCUMENTO = () =>
	construirDocumentoReporteVentas({
		fechaInicial: "2026-08-01",
		fechaFinal: "2026-08-27",
		usuario: "Aylin Santana",
		columnas: ["Folio", "Paciente", "Precio"],
		filas: [
			["B0002", "MUNOZ LOMELI MARIA", "$2,450.00"],
			["C0003", "PEREZ JUAN", "$480.00"],
		],
		metricas: {
			totalVentas: 2930,
			ticketPromedio: 1465,
			adeudosPendientes: 0,
			pacientesConSaldo: 0,
		},
		filtros: { Sucursal: "Matriz", Cliente: "", Empresa: "CDC" },
	});

describe("construirDocumentoReporteVentas", () => {
	// Es el mismo formato del corte de caja: hoja apaisada, blanco y negro y
	// tablas cuadriculadas.
	test("usa la misma hoja de estilos que el corte de caja", () => {
		expect(DOCUMENTO()).toContain(ESTILOS_IMPRESION);
		expect(DOCUMENTO()).toContain("size: letter landscape");
	});

	test("lleva encabezado con periodo, usuario y fecha de impresion", () => {
		const html = DOCUMENTO();

		expect(html).toContain("Reporte de Ventas");
		expect(html).toContain("01/08/2026 a 27/08/2026");
		expect(html).toContain("Aylin Santana");
		expect(html).toContain("Impreso el:");
	});

	test("pinta la tabla con sus columnas y un renglon por venta", () => {
		const html = DOCUMENTO();

		expect(html).toContain("<th>Folio</th>");
		expect(html).toContain("<td>B0002</td>");
		expect(html).toContain("<td>C0003</td>");
		expect(html.match(/<tbody>[\s\S]*?<\/tbody>/g).at(-1).match(/<tr>/g)).toHaveLength(2);
	});

	// Sólo los filtros con algo, para que el encabezado no se llene de renglones
	// vacíos.
	test("lista nada mas los filtros aplicados", () => {
		const html = DOCUMENTO();

		expect(html).toContain("<b>Sucursal:</b> Matriz");
		expect(html).toContain("<b>Empresa:</b> CDC");
		expect(html).not.toContain("<b>Cliente:</b>");
	});

	test("resume el total, el ticket promedio y los adeudos", () => {
		const html = DOCUMENTO();

		expect(html).toContain("$2,930.00 MXN");
		expect(html).toContain("$1,465.00 MXN");
		expect(html).toContain("Adeudos pendientes");
	});

	test("sin ventas lo dice en lugar de una tabla vacia", () => {
		const html = construirDocumentoReporteVentas({ columnas: ["Folio"], filas: [] });

		expect(html).toContain("No hay ventas para los filtros seleccionados.");
		expect(html).not.toContain("<th>Folio</th>");
	});

	// Lo que se imprime son datos capturados en caja: no deben poder inyectar
	// etiquetas en el documento.
	test("escapa el contenido de las celdas", () => {
		const html = construirDocumentoReporteVentas({
			columnas: ["Paciente"],
			filas: [["<script>alert(1)</script>"]],
		});

		expect(html).not.toContain("<script>alert(1)</script>");
		expect(html).toContain("&lt;script&gt;");
	});
});
