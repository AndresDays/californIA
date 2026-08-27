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
	prepararComprobantesVenta: jest.fn(),
}));
jest.mock("../../utils/abrir-pdf-en-pestana", () => ({ abrirPdfEnPestana: jest.fn() }));
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

const CLIENTES = [{ id_cliente: 1, nombre: "IMSS" }];
const EMPRESAS = [{ id_empresa: 2, nombre: "CDI" }];
const PACIENTES = [{ id_paciente: 9, nombre: "JUAN PEREZ", telefono: "6141234567", edad: 30, sexo: "M" }];

jest.mock("../../lib/supabase-client", () => {
	const respuestaPorTabla = {
		clientes: [
			{ id_cliente: 1, nombre: "IMSS" },
			{ id_cliente: 5, nombre: "20%" },
		],
		empresas: [{ id_empresa: 2, nombre: "CDI" }],
		pacientes: [{ id_paciente: 9, nombre: "JUAN PEREZ", telefono: "6141234567", edad: 30, sexo: "M" }],
		doctores: [{ id_doctor: 4, nombre: "ANA LOPEZ", especialidad: "General" }],
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
		estudios_imagen_catalogo: [
			{
				id: 60,
				clave: "US-RENAL",
				descripcion: "U.S. RENAL",
				id_empresa: 2,
				empresa_operativa: "CDI",
				modalidad: "ultrasonido",
				area: "Ultrasonidos",
				dias_proceso: 1,
			},
		],
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
import { prepararComprobantesVenta } from "../../utils/imprimir-comprobantes-venta";

const CLAVE = "california:borrador:nuevo-paciente:comprobantes";

const COMPROBANTES = [
	{ id: "ticket", etiqueta: "Imprimir ticket", url: "blob:t", titulo: "Ticket B0002" },
	{
		id: "etiquetas-imagen",
		etiqueta: "Imprimir etiquetas de imagen",
		url: "blob:e",
		titulo: "Etiqueta B0002",
	},
];

// Al ir a imprimir un comprobante el navegador puede descartar la pantalla, y
// al volver el modal ya no estaba: la venta quedaba registrada sin forma de
// sacar lo que faltaba. Volver equivale a montar la pantalla de nuevo.
describe("los comprobantes sobreviven a que el navegador descarte la pantalla", () => {
	beforeEach(() => {
		sessionStorage.clear();
		jest.clearAllMocks();
	});

	test("al volver se rehacen los PDF y el modal sigue ahi", async () => {
		const datos = { tickets: [{ folio: "B0002" }], etiquetasImagen: { grupos: [] } };
		sessionStorage.setItem(CLAVE, JSON.stringify({ folio: "B0002", datos }));
		prepararComprobantesVenta.mockResolvedValue({ comprobantes: COMPROBANTES, error: "" });

		await act(async () => {
			render(<NuevoPaciente />);
		});

		expect(prepararComprobantesVenta).toHaveBeenCalledWith(datos);
		expect(await screen.findByText("Folio: B0002")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Imprimir ticket" })).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Imprimir etiquetas de imagen" }),
		).toBeInTheDocument();
	});

	test("sin venta pendiente no se arma ningun comprobante", async () => {
		await act(async () => {
			render(<NuevoPaciente />);
		});

		expect(prepararComprobantesVenta).not.toHaveBeenCalled();
		expect(screen.queryByRole("button", { name: "Imprimir ticket" })).not.toBeInTheDocument();
	});

	// Si ya no se puede armar nada, el pendiente se descarta para no reabrir un
	// modal vacío en cada visita a la pantalla.
	test("un pendiente que ya no arma nada se descarta", async () => {
		sessionStorage.setItem(
			CLAVE,
			JSON.stringify({ folio: "B0002", datos: { tickets: [] } }),
		);
		prepararComprobantesVenta.mockResolvedValue({ comprobantes: [], error: "" });

		await act(async () => {
			render(<NuevoPaciente />);
		});

		await waitFor(() => expect(sessionStorage.getItem(CLAVE)).toBeNull());
		expect(screen.queryByText("Folio: B0002")).not.toBeInTheDocument();
	});
});
