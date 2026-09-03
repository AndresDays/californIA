import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

// El aviso que la campana tiene a la vista. Se guardó antes de que existiera la
// entidad `venta_cancelada`, así que viene con `venta`: es exactamente lo que
// hay en las bandejas hoy, y lo que hacía que el clic llevara a Editar
// solicitud en vez de abrir el detalle.
const mockAviso = {
	id: 1,
	titulo: "Solicitud cancelada · B0009",
	mensaje: "GARCIA BALDERAS EDGAR FABIAN — Otro: reagendó (canceló Recep Uno)",
	tipo: "advertencia",
	canal_destino: "usuario",
	rol_destino: null,
	usuario_destino: "uuid-admin",
	entidad_tipo: "venta",
	entidad_id: 44,
	id_venta: 44,
	action_path: "/editar-solicitud",
	read_at: null,
	created_at: new Date().toISOString(),
};

const mockVenta = {
	id_venta: 44,
	folio: "B0009",
	fecha_venta: "2026-09-02T18:41:00.000Z",
	estado: "cancelado",
	subtotal: 165,
	descuento: 0,
	total: 165,
	pago_recibido: 0,
	forma_pago: "efectivo",
	observaciones: "",
	motivo_cancelacion: "Otro: el paciente reagendó",
	cancelada_en: "2026-09-02T19:10:00.000Z",
	empresas: { nombre: "CENTRAL DIAGNOSTICA CALIFORNIA" },
	clientes: null,
	pacientes: { nombre: "GARCIA BALDERAS EDGAR FABIAN", telefono: "3221220777" },
	estudios_venta: [
		{
			id_estudio_venta: 1,
			clave_estudio: "BHC",
			descripcion_estudio: "BIOMETRIA HEMATICA COMPLETA",
			precio: 165,
			area: "Hematologia",
		},
	],
};

const mockActualizaciones = [];

jest.mock("../lib/supabase-client", () => {
	const respuesta = (tabla) => {
		if (tabla === "notificaciones") return { data: [mockAviso], error: null };
		if (tabla === "solicitudes_auditoria") {
			return {
				data: [{ evento: "solicitud_cancelada", actor_nombre: "Recep Uno", actor_rol: "recepcionista" }],
				error: null,
			};
		}
		return { data: [], error: null };
	};

	const crearCadena = (tabla) => {
		const cadena = {
			select: jest.fn(() => cadena),
			update: jest.fn((cambios) => {
				mockActualizaciones.push({ tabla, cambios });
				return cadena;
			}),
			eq: jest.fn(() => cadena),
			in: jest.fn(() => cadena),
			order: jest.fn(() => cadena),
			limit: jest.fn(() => Promise.resolve(respuesta(tabla))),
			maybeSingle: jest.fn(() => Promise.resolve({ data: mockVenta, error: null })),
			then: (resolver) => Promise.resolve(respuesta(tabla)).then(resolver),
		};
		return cadena;
	};

	const canal = { on: jest.fn(() => canal), subscribe: jest.fn(() => canal) };
	return {
		supabase: {
			from: jest.fn((tabla) => crearCadena(tabla)),
			channel: jest.fn(() => canal),
			removeChannel: jest.fn(),
		},
	};
});

// El empleado tiene que ser el mismo objeto en cada render: la campana lo mete
// en un `useMemo` del que depende el efecto que carga los avisos, asi que un
// literal nuevo cada vez deja el componente cargando en bucle.
jest.mock("../store/session-store", () => {
	const estado = { empleadoData: { id_empleado: 1, nombre: "Admin", rol: "admin" } };
	return { useSessionStore: (selector) => selector(estado) };
});

import NotificationBell from "./notification-bell";

const USUARIO = { id: "uuid-admin" };

// El clic va envuelto en `act` porque abre el menu y dispara la carga del
// detalle: sin eso React avisa de actualizaciones fuera de act y la asercion
// corre antes de que el modal exista.
const clic = async (elemento) => {
	await act(async () => {
		fireEvent.click(elemento);
	});
};

beforeEach(() => {
	mockActualizaciones.length = 0;
});

const abrirCampana = async (navigate) => {
	await act(async () => {
		render(<NotificationBell user={USUARIO} navigate={navigate} />);
	});
	await clic(screen.getByRole("button", { name: "Notificaciones" }));
	return screen.getByText("Solicitud cancelada · B0009");
};

// Lo que se reportó: al picarle al aviso seguía mandando a Editar solicitud,
// que es la pantalla donde una orden cancelada no aparece porque sólo lista las
// activas.
describe("el aviso de cancelación abre el detalle de la orden", () => {
	test("abre el modal en vez de navegar", async () => {
		const navigate = jest.fn();
		const aviso = await abrirCampana(navigate);

		await clic(aviso);

		await waitFor(() => {
			expect(screen.getByRole("dialog")).toBeInTheDocument();
		});
		expect(navigate).not.toHaveBeenCalled();
	});

	test("el modal trae el motivo, quién canceló y los estudios", async () => {
		const aviso = await abrirCampana(jest.fn());

		await clic(aviso);

		const modal = await screen.findByRole("dialog");
		expect(modal).toHaveTextContent("Otro: el paciente reagendó");
		expect(modal).toHaveTextContent("Recep Uno");
		expect(modal).toHaveTextContent("BIOMETRIA HEMATICA COMPLETA");
		expect(modal).toHaveTextContent("B0009");
	});

	test("el aviso queda marcado como leído", async () => {
		const aviso = await abrirCampana(jest.fn());

		await clic(aviso);

		await waitFor(() => {
			expect(
				mockActualizaciones.some(
					(u) => u.tabla === "notificaciones" && u.cambios.read_at,
				),
			).toBe(true);
		});
	});

	// Un aviso que no es de cancelación tiene que seguir navegando: la campana
	// no puede quedarse con todos los clics.
	test("otro aviso sigue navegando a su ruta", async () => {
		const navigate = jest.fn();
		mockAviso.titulo = "Resultados capturados · B0010";
		mockAviso.entidad_tipo = "venta";

		await act(async () => {
			render(<NotificationBell user={USUARIO} navigate={navigate} />);
		});
		await clic(screen.getByRole("button", { name: "Notificaciones" }));
		await clic(screen.getByText("Resultados capturados · B0010"));

		await waitFor(() => expect(navigate).toHaveBeenCalledWith("/editar-solicitud"));
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

		mockAviso.titulo = "Solicitud cancelada · B0009";
	});
});
