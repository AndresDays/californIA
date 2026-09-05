import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";

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
	prepararComprobantesVenta: jest.fn(() => Promise.resolve({ comprobantes: [] })),
}));
jest.mock("../../utils/generarTicketVenta", () => ({
	TIPO_TICKET_IMAGEN: "imagen",
	TIPO_TICKET_LABORATORIO: "laboratorio",
	generarTicketVenta: jest.fn(),
	generarTicketsVenta: jest.fn(),
}));
jest.mock("../../utils/generar-etiquetas-estudios-laboratorio", () => ({
	generarEtiquetasEstudiosLaboratorio: jest.fn(),
}), { virtual: true });
jest.mock("react-router-dom", () => ({
	useNavigate: () => jest.fn(),
	useLocation: () => ({ state: null, search: "" }),
}));

jest.mock("../../lib/supabase-client", () => {
	const respuestaPorTabla = {
		clientes: [{ id_cliente: 1, nombre: "IMSS" }],
		empresas: [{ id_empresa: 2, nombre: "CDI" }],
		pacientes: [],
		doctores: [],
		empresa_tipos_estudio: [
			{
				id_empresa: 2,
				id_tipo_estudio: 7,
				tipos_estudio: { id_tipo_estudio: 7, nombre: "Laboratorio" },
			},
		],
		estudios_lab_catalogo: [
			{
				id: 30,
				clave: "BH",
				descripcion: "BIOMETRIA HEMATICA",
				area: "Hematologia",
				dias_proceso: 1,
				tipo_muestra: "Sangre total",
				recipiente: "Tubo lila",
				condiciones_paciente: "Ayuno de 8 horas",
			},
		],
		estudios_imagen_catalogo: [],
		// Sin tarifario: el estudio se cobra al precio por defecto de $150.
		precios_estudios: [],
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
import { conQueryClient } from "../../../__mocks__/con-query-client";


beforeEach(() => {
	sessionStorage.clear();
	globalThis.mostrarNotificacion = jest.fn();
});

// La descripción del renglón es el único lugar donde recepción puede consultar
// cómo se toma el estudio sin salirse de la captura.
const capturarBiometria = async () => {
	await act(async () => {
		render(conQueryClient(<NuevoPaciente />));
	});

	await act(async () => {
		fireEvent.change(screen.getByDisplayValue("Selecciona una Empresa"), {
			target: { value: "2" },
		});
	});
	await act(async () => {
		fireEvent.change(screen.getByDisplayValue("Selecciona un Cliente"), {
			target: { value: "1" },
		});
	});

	await act(async () => {
		fireEvent.change(screen.getByPlaceholderText(/Buscar Estudios/i), {
			target: { value: "bio" },
		});
	});
	await act(async () => {
		fireEvent.click(
			document.querySelector(".search-results-estudios .search-result-item"),
		);
	});
};

test("la descripción del estudio en la tabla abre su detalle", async () => {
	await capturarBiometria();

	const descripcion = screen.getByRole("button", {
		name: /Ver detalle de BIOMETRIA HEMATICA/i,
	});
	expect(descripcion).toHaveTextContent("BIOMETRIA HEMATICA");

	await act(async () => {
		fireEvent.click(descripcion);
	});

	const detalle = screen.getByRole("dialog");
	expect(within(detalle).getByText("Detalle del estudio")).toBeInTheDocument();
	expect(within(detalle).getByText("Sangre total")).toBeInTheDocument();
	expect(within(detalle).getByText("Tubo lila")).toBeInTheDocument();
	expect(within(detalle).getByText("Ayuno de 8 horas")).toBeInTheDocument();

	await act(async () => {
		fireEvent.click(
			screen.getByLabelText("Cerrar detalle del estudio"),
		);
	});
	expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
