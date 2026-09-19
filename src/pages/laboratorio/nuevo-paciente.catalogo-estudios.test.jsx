import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";

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
			{ id: 30, clave: "BH", descripcion: "BIOMETRIA HEMATICA", area: "Hematologia", dias_proceso: 1 },
			{ id: 31, clave: "QS6", descripcion: "QUIMICA SANGUINEA 6", area: "Quimica", dias_proceso: 1 },
			{ id: 32, clave: "EGO", descripcion: "EXAMEN GENERAL DE ORINA", area: "Uroanalisis", dias_proceso: 1 },
		],
		estudios_imagen_catalogo: [],
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

const capturarEmpresaYCliente = async () => {
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
};

const opciones = () =>
	[...document.querySelectorAll(".search-results-estudios .search-result-item")].map(
		(opcion) => opcion.textContent,
	);

const botonCatalogo = () => screen.getByLabelText("Ver todos los estudios");

// Quien no se acuerda de cómo se llama el estudio no tiene qué teclear: el
// botón abre el catálogo completo sin escribir nada.
test("el botón abre todos los estudios sin escribir en el buscador", async () => {
	await capturarEmpresaYCliente();

	expect(document.querySelector(".search-results-estudios")).toBeNull();

	await act(async () => {
		fireEvent.click(botonCatalogo());
	});

	expect(opciones()).toHaveLength(3);
	expect(opciones().join(" ")).toContain("BIOMETRIA HEMATICA");
	expect(opciones().join(" ")).toContain("QUIMICA SANGUINEA 6");
	expect(opciones().join(" ")).toContain("EXAMEN GENERAL DE ORINA");
});

test("con el catálogo abierto, escribir lo va acotando", async () => {
	await capturarEmpresaYCliente();

	await act(async () => {
		fireEvent.click(botonCatalogo());
	});
	await act(async () => {
		fireEvent.change(screen.getByPlaceholderText(/Buscar Estudios/i), {
			target: { value: "orina" },
		});
	});

	expect(opciones()).toHaveLength(1);
	expect(opciones()[0]).toContain("EXAMEN GENERAL DE ORINA");
});

test("elegir del catálogo agrega el estudio y cierra la lista", async () => {
	await capturarEmpresaYCliente();

	await act(async () => {
		fireEvent.click(botonCatalogo());
	});
	await act(async () => {
		fireEvent.click(
			[...document.querySelectorAll(".search-results-estudios .search-result-item")].find(
				(opcion) => opcion.textContent.includes("QUIMICA SANGUINEA 6"),
			),
		);
	});

	expect(
		screen.getByRole("button", { name: /Ver detalle de QUIMICA SANGUINEA 6/i }),
	).toBeInTheDocument();
	expect(document.querySelector(".search-results-estudios")).toBeNull();
});

test("el mismo botón vuelve a cerrar el catálogo", async () => {
	await capturarEmpresaYCliente();

	await act(async () => {
		fireEvent.click(botonCatalogo());
	});
	expect(document.querySelector(".search-results-estudios")).not.toBeNull();

	await act(async () => {
		fireEvent.click(screen.getByLabelText("Cerrar el catálogo de estudios"));
	});
	expect(document.querySelector(".search-results-estudios")).toBeNull();
});

// Sin cliente no hay tarifario con qué cobrar, así que tampoco hay catálogo.
test("sin cliente el botón está deshabilitado", async () => {
	await act(async () => {
		render(conQueryClient(<NuevoPaciente />));
	});

	expect(botonCatalogo()).toBeDisabled();
});
