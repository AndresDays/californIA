// La lista trae las 50 órdenes más recientes del rango: buscar sólo entre esas
// dejaba fuera al paciente de hace dos semanas con "Este año" o "Todos". La
// búsqueda tiene que ir a la base.
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";

jest.mock("../../../components/page-layout.jsx", () => ({
	__esModule: true,
	default: ({ children }) => <div>{children}</div>,
}));
jest.mock("../../../components/ModalNotificacion", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("../../../components/modal-motivo-cancelacion", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("../componentes/modal-muestras-pendientes", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("../../../context/auth-context", () => ({
	useAuth: () => ({ user: { id: "u1", email: "a@b.c" } }),
}));
jest.mock("@tanstack/react-query", () => ({
	useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock("./editar-solicitud.css", () => ({}));
// El generador se espía; el resolutor del formato vive aparte y corre de
// verdad: lo que se comprueba es con qué formato se pide el ticket.
const mockGenerarTicket = jest.fn(() => Promise.resolve());
jest.mock("../../../utils/generarTicketVenta", () => ({
	generarTicketVenta: (...args) => mockGenerarTicket(...args),
	resolverEmpresaTicketReimpresion: (empresa) => empresa || "CDC",
}));
jest.mock("../../../utils/generar-etiquetas-orden", () => ({
	generarEtiquetasOrden: jest.fn(),
}));

const mockMovimiento = jest.fn(() => Promise.resolve());
jest.mock("../../../utils/pagos-ventas", () => ({
	TIPOS_MOVIMIENTO_PAGO: { DEVOLUCION: "devolucion", CANCELACION: "cancelacion", ABONO: "abono" },
	cargarHistorialPagosVenta: jest.fn(() => Promise.resolve([])),
	registrarMovimientoPagoVenta: (...args) => mockMovimiento(...args),
}));
jest.mock("../../../utils/solicitud-auditoria", () => ({
	EVENTOS_SOLICITUD: { ADEUDO_CAMBIADO: "adeudo_cambiado" },
	formatearEventoAuditoria: () => "",
	registrarEventoSolicitud: jest.fn(() => Promise.resolve()),
}));

const mockRango = [];
const mockBusqueda = [];
jest.mock("../../../lib/supabase-client", () => {
	const respuestaPorTabla = {
		ventas: [
			{
				id_venta: 77,
				folio: "A0007",
				fecha_venta: new Date().toISOString(),
				total: 150,
				pago_recibido: 150,
				subtotal: 150,
				iva: 0,
				descuento: 0,
				forma_pago: "efectivo",
				estado: "activa",
				id_cliente: 1,
				id_empresa: 2,
				id_empleado: 3,
				empresas: { id_empresa: 2, nombre: "CDI" },
				empleados: { id_empleado: 3, nombre: "Blanca Avila" },
				pacientes: { id_paciente: 9, nombre: "JUAN PEREZ" },
				estudios_venta: [
					{
						id_estudio_venta: 5,
						clave_estudio: "BH",
						descripcion_estudio: "BIOMETRIA HEMATICA",
						precio: 150,
						area: "Hematologia",
					},
				],
			},
		],
		empleados: [{ nombre: "Recep", rol: "recepcionista", auth_uuid: "u1" }],
		pacientes: [{ id_paciente: 9 }, { id_paciente: 31 }],
		clientes: [{ id_cliente: 1, nombre: "IMSS" }],
		estudios_lab_catalogo: [
			{ id: 30, clave: "BH", descripcion: "BIOMETRIA HEMATICA", area: "Hematologia", dias_proceso: 1 },
		],
		paquetes: [
			{ id: 12, clave: "PTIR", descripcion: "PERFIL TIROIDEO", dias_proceso: 1 },
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
		convenios_facturacion: [],
	};
	const crearCadena = (tabla) => {
		const datos = respuestaPorTabla[tabla] || [];
		const cadena = {
			select: jest.fn(() => cadena),
			eq: jest.fn(() => cadena),
			or: jest.fn((condiciones) => {
				mockBusqueda.push([tabla, "or", condiciones]);
				return cadena;
			}),
			ilike: jest.fn((campo, valor) => {
				mockBusqueda.push([tabla, "ilike", campo, valor]);
				return cadena;
			}),
			in: jest.fn(() => cadena),
			gte: jest.fn((campo, valor) => {
				mockRango.push(["gte", campo, valor]);
				return cadena;
			}),
			lte: jest.fn((campo, valor) => {
				mockRango.push(["lte", campo, valor]);
				return cadena;
			}),
			range: jest.fn(() => cadena),
			limit: jest.fn(() => cadena),
			order: jest.fn(() => cadena),
			update: jest.fn(() => cadena),
			insert: jest.fn(() => Promise.resolve({ error: null })),
			delete: jest.fn(() => cadena),
			single: jest.fn(() => Promise.resolve({ data: datos[0] ?? null, error: null })),
			maybeSingle: jest.fn(() => Promise.resolve({ data: datos[0] ?? null, error: null })),
			then: (resolve) => Promise.resolve({ data: datos, error: null }).then(resolve),
		};
		return cadena;
	};
	return { supabase: { from: jest.fn((tabla) => crearCadena(tabla)) } };
});

jest.mock("../../../utils/clientes-seleccionables", () => ({
	consultarClientesSeleccionables: jest.fn(() =>
		Promise.resolve({ data: [{ id_cliente: 1, nombre: "IMSS" }], error: null }),
	),
}));

import EditarSolicitud from "./editar-solicitud";

beforeEach(() => {
	mockBusqueda.length = 0;
	jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

test("con Todos, buscar un paciente consulta la base y no sólo las órdenes cargadas", async () => {
	await act(async () => {
		render(<EditarSolicitud />);
	});
	await act(async () => {
		fireEvent.change(screen.getByRole("combobox", { name: "Rango de fechas" }), { target: { value: "todos" } });
	});
	mockBusqueda.length = 0;

	await act(async () => {
		fireEvent.change(screen.getByPlaceholderText("Buscar por Paciente o Folio..."), { target: { value: "juan" } });
	});
	// Mientras se teclea no se consulta.
	expect(mockBusqueda).toEqual([]);
	await act(async () => {
		jest.advanceTimersByTime(400);
	});

	expect(mockBusqueda).toContainEqual(["pacientes", "ilike", "nombre", "%juan%"]);
	expect(mockBusqueda).toContainEqual(["ventas", "or", "folio.ilike.%JUAN%,id_paciente.in.(9,31)"]);
});

test("buscar por folio también va a la base", async () => {
	await act(async () => {
		render(<EditarSolicitud />);
	});
	await act(async () => {
		fireEvent.change(screen.getByPlaceholderText("Buscar por Paciente o Folio..."), { target: { value: "a-0007" } });
		jest.advanceTimersByTime(400);
	});

	expect(mockBusqueda).toContainEqual(["ventas", "or", expect.stringContaining("folio.ilike.%A0007%")]);
});
