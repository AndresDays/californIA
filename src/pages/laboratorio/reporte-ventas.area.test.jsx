import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";

jest.mock("./reporte-ventas.css", () => ({}));
jest.mock("../../assets/calendarioIcono.png", () => "calendarioIcono.png");
jest.mock("../../assets/metricasIcono.png", () => "metricasIcono.png");
jest.mock("../../components/page-layout.jsx", () => ({
	__esModule: true,
	default: ({ children }) => <div>{children}</div>,
}));
jest.mock("../../hooks/use-empleado-actual", () => ({
	useEmpleadoActual: () => ({
		empleadoData: { nombre: "Ana" },
		formatRol: () => "Recepcionista",
		getPrimerNombre: () => "Ana",
	}),
}));
jest.mock("../../utils/exportar-tabla", () => ({
	exportarPDF: jest.fn(),
	exportarExcel: jest.fn(),
}));

// Tres ventas que cubren los casos que se cruzan en el encabezado: una de puro
// laboratorio, una de pura imagen y una cuyos estudios no traen área, que es la
// que el reparto por grupo descarta.
const mockVentas = [
	{
		id_venta: 1,
		folio: "C0001",
		fecha_venta: "2026-08-10T10:00:00.000Z",
		total: 500,
		pago_recibido: 500,
		forma_pago: "efectivo",
		pacientes: { nombre: "Paciente Lab" },
		estudios_venta: [
			{ id_estudio_venta: 1, descripcion_estudio: "Biometría Hemática", area: "Laboratorio", precio: 500 },
		],
	},
	{
		id_venta: 2,
		folio: "B0002",
		fecha_venta: "2026-08-11T10:00:00.000Z",
		total: 800,
		pago_recibido: 800,
		forma_pago: "efectivo",
		pacientes: { nombre: "Paciente Imagen" },
		estudios_venta: [
			{ id_estudio_venta: 2, descripcion_estudio: "Rx Tórax", area: "Radiología", precio: 800 },
		],
	},
	{
		id_venta: 3,
		folio: "2608260003",
		fecha_venta: "2026-08-12T10:00:00.000Z",
		total: 200,
		pago_recibido: 200,
		forma_pago: "efectivo",
		pacientes: { nombre: "Paciente Sin Área" },
		estudios_venta: [{ id_estudio_venta: 3, descripcion_estudio: "Paquete especial", precio: 200 }],
	},
];

jest.mock("../../hooks/use-reporte-ventas", () => ({
	useReporteVentas: () => ({
		data: mockVentas,
		isLoading: false,
		error: null,
		refetch: jest.fn(),
	}),
	useCatalogosReporte: () => ({
		data: { sucursales: [], vendedores: [], clientes: [], doctores: [], areas: [], empresas: [] },
	}),
}));

jest.mock("../../context/auth-context", () => ({
	useAuth: () => ({ user: { id: "u1" } }),
}));
jest.mock("../../lib/supabase-client", () => ({ supabase: {} }));
jest.mock("../../utils/abono-venta", () => ({
	registrarAbonoVenta: jest.fn(),
}));

import { exportarExcel } from "../../utils/exportar-tabla";
import ReporteVentas from "./reporte-ventas";

// El total del período es la primera tarjeta de métricas; el mismo importe sale
// en la columna Precio de la tabla, así que se lee de la tarjeta y no por texto.
const totalDelPeriodo = () => document.querySelectorAll(".rv-metric-value")[0].textContent;

const foliosEnTabla = () =>
	[...document.querySelectorAll(".rv-table tbody tr")].map(
		(fila) => fila.querySelector("td").textContent,
	);

const elegirGrupo = (nombre) =>
	fireEvent.change(screen.getByLabelText("Grupo de área"), {
		target: { value: nombre },
	});

// Los rankings arrancan plegados, así que hay que abrirlos para leerlos.
const abrirRankings = () =>
	fireEvent.click(screen.getByRole("button", { name: /Estudios y vendedores/ }));

// El renglón "Ventas filtradas" del resumen dice cuántas quedaron de cuántas.
const ventasFiltradas = () =>
	[...document.querySelectorAll(".rv-summary-row")]
		.find((fila) => fila.textContent.includes("Ventas filtradas"))
		?.querySelector("strong").textContent;

describe("ReporteVentas: el grupo de área filtra todo el reporte", () => {
	beforeEach(() => jest.clearAllMocks());

	test("arranca en Todas las áreas y no pierde ninguna venta", () => {
		render(<ReporteVentas />);

		expect(screen.getByLabelText("Grupo de área")).toHaveValue("");
		expect(totalDelPeriodo()).toBe("$1,500.00");
		expect(foliosEnTabla()).toEqual(["C0001", "B0002", "2608260003"]);
		expect(ventasFiltradas()).toBe("3 de 3 cargadas");
	});

	test("al elegir un grupo recorta métricas, tabla y estudios más vendidos", () => {
		render(<ReporteVentas />);

		elegirGrupo("laboratorio");

		expect(totalDelPeriodo()).toBe("$500.00");
		expect(foliosEnTabla()).toEqual(["C0001"]);
		expect(ventasFiltradas()).toBe("1 de 3 cargadas");

		abrirRankings();
		const estudios = within(document.querySelectorAll(".rv-side-card")[0]);
		expect(estudios.getByText("Biometría Hemática")).toBeInTheDocument();
		expect(estudios.queryByText("Rx Tórax")).not.toBeInTheDocument();
	});

	// La pantalla abre en el resumen y la tabla, que es lo que se consulta a
	// diario; la grafica y los rankings quedan detras de su control.
	test("la grafica y los rankings arrancan plegados y se abren con un clic", () => {
		render(<ReporteVentas />);

		expect(document.querySelector(".rv-chart-body")).toBeNull();
		expect(document.querySelectorAll(".rv-side-card")).toHaveLength(0);

		fireEvent.click(screen.getByRole("button", { name: /Ventas por día/ }));
		expect(document.querySelector(".rv-chart-body")).not.toBeNull();

		abrirRankings();
		expect(document.querySelectorAll(".rv-side-card")).toHaveLength(2);
	});

	test("un grupo sin ventas deja el reporte vacío", () => {
		render(<ReporteVentas />);

		elegirGrupo("resonancias_veterinaria");

		expect(totalDelPeriodo()).toBe("$0.00");
		expect(screen.getByText("No hay ventas para los filtros seleccionados.")).toBeInTheDocument();
	});
});

describe("ReporteVentas: descarga de Excel", () => {
	beforeEach(() => jest.clearAllMocks());

	test("con Todas las áreas exporta las mismas ventas que se ven", () => {
		render(<ReporteVentas />);

		fireEvent.click(screen.getByText("Excel"));

		expect(exportarExcel).toHaveBeenCalledTimes(1);
		const [, filas, nombreArchivo] = exportarExcel.mock.calls[0];
		expect(filas).toHaveLength(3);
		expect(filas.map((fila) => fila[0])).toEqual(["C0001", "B0002", "2608260003"]);
		expect(nombreArchivo).toContain("todas-las-areas");
	});

	test("con un grupo elegido exporta sólo ese grupo", () => {
		render(<ReporteVentas />);

		elegirGrupo("laboratorio");
		fireEvent.click(screen.getByText("Excel"));

		const [, filas, nombreArchivo] = exportarExcel.mock.calls[0];
		expect(filas.map((fila) => fila[0])).toEqual(["C0001"]);
		expect(nombreArchivo).toContain("laboratorio");
	});

	test("avisa en vez de quedarse callado cuando no hay filas que exportar", () => {
		render(<ReporteVentas />);

		elegirGrupo("resonancias_veterinaria");
		fireEvent.click(screen.getByText("Excel"));

		expect(exportarExcel).not.toHaveBeenCalled();
		expect(
			screen.getByText("No hay ventas que exportar con los filtros seleccionados"),
		).toBeInTheDocument();
	});

	test("avisa si la generación del archivo truena", () => {
		jest.spyOn(console, "error").mockImplementation(() => {});
		exportarExcel.mockImplementationOnce(() => {
			throw new Error("No se pudo escribir el archivo");
		});
		render(<ReporteVentas />);

		fireEvent.click(screen.getByText("Excel"));

		expect(screen.getByText("No se pudo escribir el archivo")).toBeInTheDocument();
	});
});
