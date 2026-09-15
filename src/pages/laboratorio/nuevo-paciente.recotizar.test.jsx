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

// Los dos convenios tienen pactada la misma biometría a distinto precio: es lo
// que tiene que cambiar en el renglón al cambiar el select de cliente.
jest.mock("../../lib/supabase-client", () => {
	const PRECIOS = [
		{ cliente: "IMSS", clave: "BH", descripcion: "BIOMETRIA HEMATICA", precio: 80 },
		{ cliente: "ISSSTE", clave: "BH", descripcion: "BIOMETRIA HEMATICA", precio: 200 },
	];
	const respuestaPorTabla = {
		clientes: [
			{ id_cliente: 1, nombre: "IMSS" },
			{ id_cliente: 2, nombre: "ISSSTE" },
		],
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
		],
		estudios_imagen_catalogo: [],
		precios_estudios: PRECIOS,
	};

	const crearCadena = (tabla) => {
		const filtros = [];
		const resolver = () => {
			let datos = respuestaPorTabla[tabla] || [];
			if (tabla === "precios_estudios") {
				filtros.forEach(([columna, valor]) => {
					datos = datos.filter(
						(fila) =>
							String(fila[columna] ?? "").toLowerCase() === String(valor).toLowerCase(),
					);
				});
			}
			return Promise.resolve({ data: datos, error: null });
		};
		const cadena = {
			select: jest.fn(() => cadena),
			eq: jest.fn(() => cadena),
			or: jest.fn(() => cadena),
			ilike: jest.fn((columna, valor) => {
				filtros.push([columna, valor]);
				return cadena;
			}),
			in: jest.fn(() => cadena),
			gte: jest.fn(() => cadena),
			lte: jest.fn(() => cadena),
			range: jest.fn(() => cadena),
			limit: jest.fn(() => cadena),
			order: jest.fn(() => cadena),
			single: jest.fn(() => Promise.resolve({ data: null, error: null })),
			maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
			then: (resolve) => resolver().then(resolve),
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

const elegir = async (displayValue, value) => {
	await act(async () => {
		fireEvent.change(screen.getByDisplayValue(displayValue), { target: { value } });
	});
};

const renglonEstudio = (clave) =>
	screen.getByRole("group", { name: `Cantidad de ${clave}` }).closest("tr");

const totalMostrado = () => document.querySelectorAll(".total-input")[0]?.value;

// Empresa, cliente, tipo de estudio y una biometría capturada: el punto de
// partida desde el que se cambia de cliente.
const capturarOrdenConIMSS = async () => {
	await act(async () => {
		render(conQueryClient(<NuevoPaciente />));
	});

	await elegir("Selecciona una Empresa", "2");
	await elegir("Selecciona un Cliente", "1");
	await elegir("Selecciona Tipo de Estudio", "7");

	await act(async () => {
		fireEvent.change(screen.getByPlaceholderText(/Buscar Estudios/i), {
			target: { value: "bio" },
		});
	});
	await act(async () => {
		fireEvent.click(document.querySelector(".search-results-estudios .search-result-item"));
	});
};

test("cambiar de cliente recotiza los estudios ya capturados", async () => {
	await capturarOrdenConIMSS();

	expect(within(renglonEstudio("BH")).getByText("$80.00")).toBeInTheDocument();
	expect(totalMostrado()).toBe("$80.00");

	await elegir("IMSS", "2");

	expect(within(renglonEstudio("BH")).getByText("$200.00")).toBeInTheDocument();
	expect(totalMostrado()).toBe("$200.00");
	// El renglón queda a nombre del cliente nuevo, que es con el que se factura.
	expect(within(renglonEstudio("BH")).getByText("ISSSTE")).toBeInTheDocument();
	expect(globalThis.mostrarNotificacion).toHaveBeenCalledWith(
		expect.stringContaining("ISSSTE"),
	);
});

test("volver al cliente anterior devuelve su precio", async () => {
	await capturarOrdenConIMSS();

	await elegir("IMSS", "2");
	expect(totalMostrado()).toBe("$200.00");

	await elegir("ISSSTE", "1");
	expect(within(renglonEstudio("BH")).getByText("$80.00")).toBeInTheDocument();
	expect(totalMostrado()).toBe("$80.00");
});

test("un borrador retomado no se recotiza solo al cargar la pantalla", async () => {
	sessionStorage.setItem(
		"california:nuevo-paciente:borrador",
		JSON.stringify({
			clienteSeleccionado: "1",
			empresaSeleccionada: "2",
			tipoEstudioSeleccionado: "7",
			estudiosSeleccionados: [
				{
					id: 30,
					clave: "BH",
					descripcion: "BIOMETRIA HEMATICA",
					precio: 80,
					cantidad: 1,
					cliente: "IMSS",
				},
			],
		}),
	);

	await act(async () => {
		render(conQueryClient(<NuevoPaciente />));
	});

	expect(within(renglonEstudio("BH")).getByText("$80.00")).toBeInTheDocument();
	expect(globalThis.mostrarNotificacion).not.toHaveBeenCalled();
});
