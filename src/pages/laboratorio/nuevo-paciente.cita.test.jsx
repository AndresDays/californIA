import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";

jest.mock("../../components/page-layout.jsx", () => ({
	__esModule: true,
	default: ({ children }) => <div>{children}</div>,
}));
// La precarga avisa con el modal de la pantalla, no con la notificacion
// global, asi que el mensaje se captura desde sus props.
const avisos = [];
jest.mock("../../components/ModalNotificacion", () => ({
	__esModule: true,
	default: ({ isOpen, mensaje, tipo }) => {
		if (isOpen && mensaje) avisos.push({ mensaje, tipo });
		return null;
	},
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

// Es como llega desde el calendario: "Pasar a estudio" navega con el id en la
// ruta y en el estado.
jest.mock("react-router-dom", () => ({
	useNavigate: () => jest.fn(),
	useLocation: () => ({ state: { citaId: 10 }, search: "?citaId=10" }),
}));

// La cita viene de una llamada: se capturo el nombre y el telefono a mano y no
// se eligio ni empresa ni cliente ni tipo, asi que sus ids van vacios. Uno de
// los estudios que pidio el paciente esta en el catalogo y el otro no.
const CITA = {
	id_cita: 10,
	id_paciente: null,
	id_cliente: null,
	id_empresa: null,
	id_tipo_estudio: null,
	nombre_paciente: "Laura Mendez Rios",
	telefono_paciente: "4771234567",
	tipo_estudio: "BIOMETRIA HEMATICA, Ultrasonido de abdomen",
	monto: 0,
	pacientes: null,
	clientes: null,
	empresas: null,
	tipos_estudio: null,
};

jest.mock("../../lib/supabase-client", () => {
	const respuestaPorTabla = {
		clientes: [{ id_cliente: 1, nombre: "IMSS" }],
		empresas: [{ id_empresa: 2, nombre: "CDI" }],
		pacientes: [],
		doctores: [],
		empresa_tipos_estudio: [],
		estudios_lab_catalogo: [
			{ id: 30, clave: "BH", descripcion: "BIOMETRIA HEMATICA", area: "Hematologia", dias_proceso: 1 },
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
			single: jest.fn(() =>
				Promise.resolve(
					tabla === "citas"
						? { data: globalThis.__citaDePrueba, error: null }
						: { data: null, error: null },
				),
			),
			maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
			then: (resolve) => Promise.resolve({ data: datos, error: null }).then(resolve),
		};
		return cadena;
	};
	return { supabase: { from: jest.fn((tabla) => crearCadena(tabla)) } };
});

import NuevoPaciente from "./nuevo-paciente";

beforeEach(() => {
	sessionStorage.clear();
	globalThis.mostrarNotificacion = jest.fn();
	globalThis.__citaDePrueba = CITA;
	avisos.length = 0;
});

const abrir = async () => {
	await act(async () => {
		render(<NuevoPaciente />);
	});
};

// Desde el calendario se abre una cita y se le da "Pasar a estudio". Ahora que
// la cita se agenda escribiendo, sus ids de empresa, cliente y tipo pueden
// venir vacios, asi que hay que comprobar que el paso a nuevo paciente sigue
// funcionando con la cita a medio llenar.
describe("Nuevo paciente: la cita del calendario se precarga", () => {
	test("con los ids vacios se precargan el nombre y el telefono", async () => {
		await abrir();

		await waitFor(() => {
			expect(document.querySelector('input[value="Laura Mendez Rios"]')).not.toBeNull();
		});
		expect(document.querySelector('input[value="4771234567"]')).not.toBeNull();
	});

	test("el estudio que si esta en el catalogo se agrega a la solicitud", async () => {
		await abrir();

		await waitFor(() => {
			expect(screen.getAllByText(/BIOMETRIA HEMATICA/).length).toBeGreaterThan(0);
		});
	});

	// Lo que el paciente pidio por telefono no siempre esta en el catalogo. La
	// cita no se descarta: se carga lo que si existe y se avisa del resto, para
	// que recepcion lo busque a mano.
	test("avisa de los estudios que no encontro en lugar de perderlos", async () => {
		await abrir();

		await waitFor(() => {
			expect(
				avisos.some(
					(aviso) =>
						aviso.mensaje.includes("Ultrasonido de abdomen") &&
						aviso.tipo === "advertencia",
				),
			).toBe(true);
		});
	});
});
