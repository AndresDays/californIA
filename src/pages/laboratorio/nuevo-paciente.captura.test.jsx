import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("../../components/page-layout.jsx", () => ({
	__esModule: true,
	default: ({ children }) => <div>{children}</div>,
}));
jest.mock("../../components/ModalNotificacion", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("../../context/auth-context", () => ({
	useAuth: () => ({ user: { id: "u1", email: "a@b.c" }, signOut: jest.fn() }),
}));
jest.mock("../../hooks/use-empleado-actual", () => ({
	useEmpleadoActual: () => ({
		empleadoData: { id_empleado: 1, nombre: "Recep", rol: "recepcionista" },
		formatRol: (r) => r,
		getPrimerNombre: () => "Recep",
	}),
}));
jest.mock("../../utils/imprimir-comprobantes-venta", () => ({
	imprimirComprobantesVenta: jest.fn(),
}));
jest.mock("../../utils/generar-etiquetas-estudios-laboratorio", () => ({
	generarEtiquetasEstudiosLaboratorio: jest.fn(),
}), { virtual: true });
jest.mock("react-router-dom", () => ({
	useNavigate: () => jest.fn(),
	useLocation: () => ({ state: null, search: "" }),
}));

const CLIENTES = [{ id_cliente: 1, nombre: "IMSS" }];
const EMPRESAS = [{ id_empresa: 2, nombre: "CDI" }];
const PACIENTES = [{ id_paciente: 9, nombre: "JUAN PEREZ", telefono: "6141234567", edad: 30, sexo: "M" }];

jest.mock("../../lib/supabase-client", () => {
	const respuestaPorTabla = {
		clientes: [{ id_cliente: 1, nombre: "IMSS" }],
		empresas: [{ id_empresa: 2, nombre: "CDI" }],
		pacientes: [{ id_paciente: 9, nombre: "JUAN PEREZ", telefono: "6141234567", edad: 30, sexo: "M" }],
	};
	const crearCadena = (tabla) => {
		const datos = respuestaPorTabla[tabla] || [];
		const cadena = {
			select: jest.fn(() => cadena),
			eq: jest.fn(() => cadena),
			or: jest.fn(() => cadena),
			ilike: jest.fn(() => cadena),
			in: jest.fn(() => cadena),
			gte: jest.fn(() => cadena),
			lte: jest.fn(() => cadena),
			range: jest.fn(() => cadena),
			limit: jest.fn(() => cadena),
			order: jest.fn(() => cadena),
			single: jest.fn(() => Promise.resolve({ data: null, error: null })),
			maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
			then: (resolve) => Promise.resolve({ data: datos, error: null }).then(resolve),
		};
		return cadena;
	};
	return { supabase: { from: jest.fn((tabla) => crearCadena(tabla)) } };
});

import NuevoPaciente from "./nuevo-paciente";

beforeEach(() => sessionStorage.clear());

test("seleccionar un paciente conserva doctor, empresa, cliente y el cobro", async () => {
	await act(async () => {
		render(<NuevoPaciente />);
	});

	// captura previa: empresa, cliente y forma de pago
	const selects = screen.getAllByRole("combobox");

	// empresa y cliente
	const selectEmpresa = screen.getByDisplayValue("Selecciona una Empresa");
	await act(async () => {
		fireEvent.change(selectEmpresa, { target: { value: "2" } });
	});
	const selectCliente = screen.getByDisplayValue("Selecciona un Cliente");
	await act(async () => {
		fireEvent.change(selectCliente, { target: { value: "1" } });
	});
	// pago recibido
	const pago = screen.getByPlaceholderText(/Paga con/i);
	await act(async () => {
		fireEvent.change(pago, { target: { value: "500" } });
	});

	const formaPago = screen.getByDisplayValue("Efectivo");
	await act(async () => {
		fireEvent.change(formaPago, { target: { value: "tarjeta_debito" } });
	});
	expect(screen.getByLabelText(/últimos 4/i)).toBeInTheDocument();

	// seleccionar paciente por el autocomplete
	const input = screen.getByPlaceholderText(/Buscar por nombre o teléfono/i);
	await act(async () => {
		fireEvent.change(input, { target: { value: "juan" } });
	});
	await waitFor(() => screen.getByText("JUAN PEREZ"));
	await act(async () => {
		fireEvent.click(screen.getByText("JUAN PEREZ"));
	});

	expect(screen.getAllByDisplayValue("JUAN PEREZ").length).toBeGreaterThan(0);
	expect(selectEmpresa.value).toBe("2");
	expect(selectCliente.value).toBe("1");
	expect(pago.value).toBe("500");
	expect(document.querySelector(".pago-grid select")?.value).toBe("tarjeta_debito");
});

test("al remontar la pantalla el borrador restaura la captura", async () => {
	const { unmount } = render(<NuevoPaciente />);
	await act(async () => {});

	const selectEmpresa = screen.getByDisplayValue("Selecciona una Empresa");
	await act(async () => {
		fireEvent.change(selectEmpresa, { target: { value: "2" } });
	});
	const selectCliente = screen.getByDisplayValue("Selecciona un Cliente");
	await act(async () => {
		fireEvent.change(selectCliente, { target: { value: "1" } });
	});
	const pago = screen.getByPlaceholderText(/Paga con/i);
	await act(async () => {
		fireEvent.change(pago, { target: { value: "500" } });
	});
	const formaPago = screen.getByDisplayValue("Efectivo");
	await act(async () => {
		fireEvent.change(formaPago, { target: { value: "transferencia" } });
	});

	unmount();

	await act(async () => {
		render(<NuevoPaciente />);
	});

	const empresa2 = document.querySelectorAll(".form-group-inline select")[0];
	const cliente2 = document.querySelectorAll(".form-group-inline select")[1];
	const pago2 = screen.getByPlaceholderText(/Paga con/i);
	const formaPago2 = document.querySelector(".pago-grid select");
	expect(empresa2.value).toBe("2");
	expect(cliente2.value).toBe("1");
	expect(pago2.value).toBe("500");
	expect(formaPago2.value).toBe("transferencia");
});
