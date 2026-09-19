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
jest.mock("../../../utils/generarTicketVenta", () => ({
	generarTicketVenta: jest.fn(),
	resolverEmpresaTicketReimpresion: jest.fn(),
}));
jest.mock("../../../utils/generar-etiquetas-orden", () => ({
	generarEtiquetasOrden: jest.fn(),
}));

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
});

const abrirOrden = async () => {
	await act(async () => {
		render(<EditarSolicitud />);
	});
	await act(async () => {
		fireEvent.click(screen.getByText("C-001"));
	});
};

const opciones = () =>
	[...document.querySelectorAll(".dropdown-estudios .dropdown-estudio-item")].map(
		(opcion) => opcion.textContent,
	);

// Editar una orden ofrecía sólo laboratorio: a una orden de imagen no se le
// podía agregar el estudio que faltaba sin volver a capturarla.
test("el buscador ofrece laboratorio, paquetes e imagen", async () => {
	await abrirOrden();

	await act(async () => {
		fireEvent.change(screen.getByPlaceholderText("Buscar Estudios..."), {
			target: { value: "re" },
		});
	});

	expect(opciones().join(" ")).toContain("U.S. RENAL");
});

test("el botón abre el catálogo completo sin escribir nada", async () => {
	await abrirOrden();

	expect(document.querySelector(".dropdown-estudios")).toBeNull();

	await act(async () => {
		fireEvent.click(screen.getByLabelText("Ver todos los estudios"));
	});

	const texto = opciones().join(" ");
	expect(texto).toContain("BIOMETRIA HEMATICA");
	expect(texto).toContain("PERFIL TIROIDEO");
	expect(texto).toContain("U.S. RENAL");

	await act(async () => {
		fireEvent.click(screen.getByLabelText("Cerrar el catálogo de estudios"));
	});
	expect(document.querySelector(".dropdown-estudios")).toBeNull();
});

test("elegir del catálogo agrega el estudio y cierra la lista", async () => {
	await abrirOrden();

	await act(async () => {
		fireEvent.click(screen.getByLabelText("Ver todos los estudios"));
	});
	await act(async () => {
		fireEvent.click(
			[...document.querySelectorAll(".dropdown-estudios .dropdown-estudio-item")].find(
				(opcion) => opcion.textContent.includes("U.S. RENAL"),
			),
		);
	});

	expect(document.querySelector(".dropdown-estudios")).toBeNull();
	expect(screen.getByText("U.S. RENAL")).toBeInTheDocument();
});
