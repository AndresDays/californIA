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


jest.mock("../../hooks/use-reporte-ventas", () => ({
	useReporteVentas: () => ({
		data: [jest.requireActual("./reporte-ventas.detalle.fixture").VENTA_MOCK],
		isLoading: false,
		error: null,
		refetch: jest.fn(),
	}),
	useCatalogosReporte: () => ({
		data: {
			sucursales: [],
			vendedores: [],
			clientes: [],
			doctores: [{ id_doctor: 9, nombre: "Dra. Odile Desage" }],
			areas: [],
		},
	}),
}));

import ReporteVentas from "./reporte-ventas";

// El folio y el paciente también salen en la tabla, así que las aserciones se
// hacen dentro del modal.
const abrirDetalle = () => {
	render(<ReporteVentas />);
	fireEvent.click(screen.getByTitle("Ver detalle del folio"));
	return within(document.querySelector(".rv-modal"));
};

describe("ReporteVentas: detalle del folio", () => {
	test("el folio de cada venta abre el detalle", () => {
		const modal = abrirDetalle();

		expect(modal.getByText("Detalle del folio")).toBeInTheDocument();
		expect(modal.getByText("1708260004")).toBeInTheDocument();
	});

	test("muestra los datos del paciente, la empresa y el doctor", () => {
		const modal = abrirDetalle();

		expect(modal.getByText("Maria Rosalia Lopez")).toBeInTheDocument();
		expect(modal.getByText("3221234567")).toBeInTheDocument();
		expect(modal.getByText("maria@example.com")).toBeInTheDocument();
		expect(modal.getByText("42 años")).toBeInTheDocument();
		expect(modal.getByText("Centro Diagnóstico por Imagen")).toBeInTheDocument();
		expect(modal.getByText("Seguros del Pacífico")).toBeInTheDocument();
		expect(modal.getByText("Ana Torres")).toBeInTheDocument();
		expect(modal.getByText("Paciente en ayuno")).toBeInTheDocument();
	});

	test("resuelve el doctor con el catálogo cuando la venta sólo trae el id", () => {
		const modal = abrirDetalle();

		expect(modal.getByText("Dra. Odile Desage")).toBeInTheDocument();
	});

	test("lista los estudios del folio con su precio", () => {
		const modal = abrirDetalle();

		expect(modal.getByText("U.S. Hepato Vesicular")).toBeInTheDocument();
		expect(modal.getByText("Biometría Hemática")).toBeInTheDocument();
		expect(modal.getByText("US-HEP")).toBeInTheDocument();
	});

	test("se cierra con la ✕", () => {
		abrirDetalle();

		fireEvent.click(screen.getByLabelText("Cerrar"));

		expect(screen.queryByText("Detalle del folio")).not.toBeInTheDocument();
	});
});
