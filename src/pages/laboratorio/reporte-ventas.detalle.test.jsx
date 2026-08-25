import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";

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

jest.mock("../../context/auth-context", () => ({
	useAuth: () => ({ user: { id: "u1" } }),
}));
jest.mock("../../lib/supabase-client", () => ({ supabase: {} }));
jest.mock("../../utils/abono-venta", () => ({
	registrarAbonoVenta: jest.fn(() => Promise.resolve({ pagoRecibido: 1000, adeudo: 0 })),
}));

import { registrarAbonoVenta } from "../../utils/abono-venta";
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

describe("ReporteVentas: cobrar el adeudo desde el detalle", () => {
	beforeEach(() => jest.clearAllMocks());

	test("ofrece cobrar el adeudo con el saldo precargado", () => {
		const modal = abrirDetalle();

		expect(modal.getByText("Cobrar adeudo")).toBeInTheDocument();
		expect(modal.getByRole("spinbutton")).toHaveValue(400);
	});

	test("registra el cobro con la forma de pago elegida", async () => {
		const modal = abrirDetalle();

		fireEvent.change(modal.getByRole("spinbutton"), { target: { value: "150" } });
		await act(async () => {
			fireEvent.click(modal.getByRole("button", { name: /registrar cobro/i }));
		});

		expect(registrarAbonoVenta).toHaveBeenCalledTimes(1);
		expect(registrarAbonoVenta.mock.calls[0][1]).toMatchObject({
			monto: "150",
			formaPago: "Efectivo",
		});
	});

	test("pide los datos de la tarjeta cuando el cobro es con tarjeta", () => {
		const modal = abrirDetalle();

		fireEvent.change(modal.getByLabelText?.("Forma de pago") ?? modal.getAllByRole("combobox")[0], {
			target: { value: "tarjeta_debito" },
		});

		expect(modal.getByPlaceholderText("1234")).toBeInTheDocument();
		expect(modal.getByPlaceholderText("A1B2C3")).toBeInTheDocument();
	});

	test("el boton de liquidar deja el adeudo completo en el monto", () => {
		const modal = abrirDetalle();

		fireEvent.change(modal.getByRole("spinbutton"), { target: { value: "50" } });
		fireEvent.click(modal.getByRole("button", { name: /liquidar todo/i }));

		expect(modal.getByRole("spinbutton")).toHaveValue(400);
	});
});
