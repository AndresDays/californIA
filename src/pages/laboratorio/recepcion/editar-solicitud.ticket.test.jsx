// Una orden de imagen (serie A o B) se reimprimía con el ticket del
// laboratorio: el formato tiene que salir el mismo que se entregó en caja.
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
				empresas: { id_empresa: 2, nombre: "CDI" },
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
			or: jest.fn(() => cadena),
			ilike: jest.fn(() => cadena),
			in: jest.fn(() => cadena),
			gte: jest.fn(() => cadena),
			lte: jest.fn(() => cadena),
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
	sessionStorage.clear();
	mockMovimiento.mockClear();
	mockGenerarTicket.mockClear();
	window.open = jest.fn(() => ({ close: jest.fn() }));
	globalThis.mostrarNotificacion = jest.fn();
});


const reimprimir = async () => {
	await act(async () => {
		render(<EditarSolicitud />);
	});
	const boton = [...document.querySelectorAll("button")].find((btn) =>
		btn.querySelector('img[alt="Ticket"]'),
	);
	await act(async () => {
		boton.click();
	});
	return mockGenerarTicket.mock.calls.at(-1)?.[0];
};

test("una orden de imagen se reimprime con el ticket de imagen", async () => {
	const datos = await reimprimir();

	expect(datos.tipo).toBe("imagen");
	expect(datos.folio).toBe("A0007");
	expect(datos.empresa).toBe("CDI");
});
