import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";

jest.mock("../../../components/page-layout.jsx", () => ({
	__esModule: true,
	default: ({ children }) => <div>{children}</div>,
}));
jest.mock("../../../components/ModalNotificacion", () => ({
	__esModule: true,
	default: ({ isOpen, mensaje }) => (isOpen ? <div role="alert">{mensaje}</div> : null),
}));
jest.mock("../../../components/modal-motivo-cancelacion", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("../componentes/modal-muestras-pendientes", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("../componentes/modal-agregar-doctor", () => ({
	__esModule: true,
	default: ({ isOpen, onSave, onClose }) =>
		isOpen ? (
			<button
				type="button"
				onClick={async () => {
					await onSave({ nombre: "PEREZ LOPEZ ANA", apellido_paterno: "PEREZ", primer_nombre: "ANA" });
					onClose();
				}}>
				Guardar doctor de prueba
			</button>
		) : null,
}));
jest.mock("../../../context/auth-context", () => ({
	useAuth: () => ({ user: { id: "u1", email: "a@b.c" } }),
}));
jest.mock("@tanstack/react-query", () => ({
	useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock("./editar-solicitud.css", () => ({}));
jest.mock("../../../utils/generarTicketVenta", () => ({
	generarTicketVenta: jest.fn(),
	resolverEmpresaTicketReimpresion: jest.fn(),
	resolverTipoTicketVenta: jest.fn(() => "laboratorio"),
}));
jest.mock("../../../utils/generar-etiquetas-orden", () => ({
	generarEtiquetasOrden: jest.fn(),
}));
jest.mock("../../../utils/pagos-ventas", () => ({
	TIPOS_MOVIMIENTO_PAGO: { DEVOLUCION: "devolucion", CANCELACION: "cancelacion", ABONO: "abono" },
	cargarHistorialPagosVenta: jest.fn(() => Promise.resolve([])),
	registrarMovimientoPagoVenta: jest.fn(() => Promise.resolve()),
}));
jest.mock("../../../utils/solicitud-auditoria", () => ({
	EVENTOS_SOLICITUD: { ADEUDO_CAMBIADO: "adeudo_cambiado" },
	formatearEventoAuditoria: () => "",
	registrarEventoSolicitud: jest.fn(() => Promise.resolve()),
}));

const mockCrearDoctor = jest.fn();
jest.mock("../../../utils/doctores-auth", () => ({
	crearDoctorConAuthentication: (...args) => mockCrearDoctor(...args),
}));
jest.mock("../../../utils/duplicados-registro.js", () => ({
	buscarDuplicadoRegistro: jest.fn(() => Promise.resolve(null)),
	crearMensajeRegistroDuplicado: jest.fn(() => ""),
}));

const mockUpdateVentas = jest.fn();
jest.mock("../../../lib/supabase-client", () => {
	const respuestaPorTabla = {
		ventas: [
			{
				id_venta: 77,
				folio: "C-001",
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
				id_doctor: 3,
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
		doctores: [
			{ id_doctor: 3, nombre: "DR EQUIVOCADO" },
			{ id_doctor: 4, nombre: "DR CORRECTO" },
		],
		empleados: [{ nombre: "Recep", rol: "recepcionista", auth_uuid: "u1" }],
		clientes: [{ id_cliente: 1, nombre: "IMSS" }],
		estudios_lab_catalogo: [],
		paquetes: [],
		estudios_imagen_catalogo: [],
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
			update: jest.fn((payload) => {
				if (tabla === "ventas") mockUpdateVentas(payload);
				return cadena;
			}),
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
	mockUpdateVentas.mockClear();
	mockCrearDoctor.mockReset();
	globalThis.mostrarNotificacion = jest.fn();
});

const abrirOrden = async () => {
	await act(async () => {
		render(<EditarSolicitud />);
	});
	await act(async () => {
		fireEvent.click(screen.getByText("C-001"));
	});
};

const inputMedico = () => screen.getByPlaceholderText("Buscar Médico...");

const guardarConMotivo = async () => {
	await act(async () => {
		fireEvent.change(screen.getByPlaceholderText("Motivo de Modificación de la Orden"), {
			target: { value: "Médico mal capturado" },
		});
	});
	await act(async () => {
		fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
	});
};

// Una orden capturada con el médico equivocado, o sin médico, se corrige desde
// la edición sin volver a capturarla.
test("cambia el médico por otro del catálogo", async () => {
	await abrirOrden();
	expect(inputMedico()).toHaveValue("DR EQUIVOCADO");

	await act(async () => {
		fireEvent.change(inputMedico(), { target: { value: "DR" } });
	});
	await act(async () => {
		fireEvent.click(screen.getByText("DR CORRECTO"));
	});
	await guardarConMotivo();

	expect(mockUpdateVentas).toHaveBeenCalledWith(expect.objectContaining({ id_doctor: 4 }));
});

test("quita el médico de la orden", async () => {
	await abrirOrden();

	await act(async () => {
		fireEvent.click(screen.getByLabelText("Quitar médico"));
	});
	expect(inputMedico()).toHaveValue("");
	await guardarConMotivo();

	expect(mockUpdateVentas).toHaveBeenCalledWith(expect.objectContaining({ id_doctor: null }));
});

test("agrega un médico nuevo y lo deja asignado", async () => {
	mockCrearDoctor.mockResolvedValue({ doctor: { id_doctor: 9, nombre: "PEREZ LOPEZ ANA" } });
	await abrirOrden();

	await act(async () => {
		fireEvent.click(screen.getByLabelText("Agregar nuevo médico"));
	});
	await act(async () => {
		fireEvent.click(screen.getByText("Guardar doctor de prueba"));
	});
	expect(inputMedico()).toHaveValue("PEREZ LOPEZ ANA");
	await guardarConMotivo();

	expect(mockUpdateVentas).toHaveBeenCalledWith(expect.objectContaining({ id_doctor: 9 }));
});

// Sin este freno, escribir un nombre y no elegirlo guardaba la orden sin médico.
test("no guarda con un nombre escrito que no se eligió de la lista", async () => {
	await abrirOrden();

	await act(async () => {
		fireEvent.change(inputMedico(), { target: { value: "DR QUE NO EXISTE" } });
	});
	await guardarConMotivo();

	expect(mockUpdateVentas).not.toHaveBeenCalled();
	expect(screen.getByRole("alert")).toHaveTextContent("Seleccione el médico de la lista");
});
