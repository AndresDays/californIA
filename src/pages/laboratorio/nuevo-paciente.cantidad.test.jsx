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
			{ id: 30, clave: "BH", descripcion: "BIOMETRIA HEMATICA", area: "Hematologia", dias_proceso: 1 },
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

const CLAVE_BORRADOR = "california:nuevo-paciente:borrador";

beforeEach(() => {
	sessionStorage.clear();
	globalThis.mostrarNotificacion = jest.fn();
});

const controlCantidad = (clave) =>
	screen.getByRole("group", { name: `Cantidad de ${clave}` });

const renglonEstudio = (clave) =>
	controlCantidad(clave).closest("tr");

const totalMostrado = () => document.querySelectorAll(".total-input")[0]?.value;

// El resultado se toma de la lista del buscador: una vez capturado, el mismo
// texto aparece también en la tabla de estudios.
const buscarYAgregar = async (buscarEstudio) => {
	await act(async () => {
		fireEvent.change(buscarEstudio, { target: { value: "bio" } });
	});
	const resultado = document.querySelector(
		".search-results-estudios .search-result-item",
	);
	await act(async () => {
		fireEvent.click(resultado);
	});
};

// Deja la pantalla con una biometría capturada, que es el punto de partida de
// todo lo que se prueba aquí.
const capturarBiometria = async () => {
	await act(async () => {
		render(<NuevoPaciente />);
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

	const buscarEstudio = screen.getByPlaceholderText(/Buscar Estudios/i);
	await buscarYAgregar(buscarEstudio);

	return buscarEstudio;
};

test("subir la cantidad cobra el estudio tantas veces como piezas", async () => {
	await capturarBiometria();

	expect(controlCantidad("BH")).toHaveTextContent("1");
	expect(within(renglonEstudio("BH")).getByText("$150.00")).toBeInTheDocument();
	expect(totalMostrado()).toBe("$150.00");

	await act(async () => {
		fireEvent.click(screen.getByLabelText("Aumentar cantidad de BH"));
	});
	await act(async () => {
		fireEvent.click(screen.getByLabelText("Aumentar cantidad de BH"));
	});

	expect(controlCantidad("BH")).toHaveTextContent("3");
	// El renglón muestra el importe de las tres piezas y el precio unitario.
	expect(within(renglonEstudio("BH")).getByText("$450.00")).toBeInTheDocument();
	expect(within(renglonEstudio("BH")).getByText("$150.00 c/u")).toBeInTheDocument();
	expect(totalMostrado()).toBe("$450.00");
});

test("bajar la cantidad devuelve el cobro y el − queda inerte en una pieza", async () => {
	await capturarBiometria();

	await act(async () => {
		fireEvent.click(screen.getByLabelText("Aumentar cantidad de BH"));
	});
	expect(totalMostrado()).toBe("$300.00");

	const disminuir = screen.getByLabelText("Disminuir cantidad de BH");
	expect(disminuir).not.toBeDisabled();

	await act(async () => {
		fireEvent.click(disminuir);
	});

	expect(controlCantidad("BH")).toHaveTextContent("1");
	expect(totalMostrado()).toBe("$150.00");
	// En una pieza se quita el estudio con el botón de borrar, no bajando a 0.
	expect(screen.getByLabelText("Disminuir cantidad de BH")).toBeDisabled();
	expect(document.querySelectorAll(".estudios-table tbody tr").length).toBe(1);
});

test("volver a agregar un estudio ya capturado sube su cantidad", async () => {
	const buscarEstudio = await capturarBiometria();

	await buscarYAgregar(buscarEstudio);

	expect(controlCantidad("BH")).toHaveTextContent("2");
	expect(totalMostrado()).toBe("$300.00");
	expect(globalThis.mostrarNotificacion).toHaveBeenCalledWith(
		expect.stringContaining("ya fue agregado"),
		"advertencia",
	);
	// Sigue siendo un solo renglón: no se duplica la fila.
	expect(document.querySelectorAll(".estudios-table tbody tr").length).toBe(1);
});

test("un borrador guardado sin cantidad se retoma como una pieza", async () => {
	sessionStorage.setItem(
		CLAVE_BORRADOR,
		JSON.stringify({
			clienteSeleccionado: "1",
			empresaSeleccionada: "2",
			tipoEstudioSeleccionado: "",
			// Así quedaron los borradores anteriores al control de cantidad.
			estudiosSeleccionados: [
				{
					id: 30,
					clave: "BH",
					descripcion: "BIOMETRIA HEMATICA",
					precio: 150,
					cliente: "IMSS",
				},
			],
		}),
	);

	await act(async () => {
		render(<NuevoPaciente />);
	});

	expect(controlCantidad("BH")).toHaveTextContent("1");
	expect(totalMostrado()).toBe("$150.00");
	expect(screen.getByLabelText("Disminuir cantidad de BH")).toBeDisabled();
});
