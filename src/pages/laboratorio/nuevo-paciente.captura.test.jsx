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
import { conQueryClient } from "../../../__mocks__/con-query-client";

beforeEach(() => sessionStorage.clear());

test("seleccionar un paciente limpia empresa, cliente y el cobro de la orden anterior", async () => {
	await act(async () => {
		render(conQueryClient(<NuevoPaciente />));
	});

	// captura previa: empresa, cliente y forma de pago
	const selects = screen.getAllByRole("combobox");

	// empresa y cliente
	const selectEmpresa = screen.getByDisplayValue("Selecciona una Empresa");
	await act(async () => {
		fireEvent.change(selectEmpresa, { target: { value: "2" } });
	});
	const selectCliente = screen.getByDisplayValue("Selecciona un Cliente");
	await act(async () => {
		fireEvent.change(selectCliente, { target: { value: "1" } });
	});
	// pago recibido
	const pago = screen.getByPlaceholderText(/Paga con/i);
	await act(async () => {
		fireEvent.change(pago, { target: { value: "500" } });
	});

	const formaPago = screen.getByDisplayValue("Efectivo");
	await act(async () => {
		fireEvent.change(formaPago, { target: { value: "tarjeta_debito" } });
	});
	expect(screen.getByLabelText(/últimos 4/i)).toBeInTheDocument();

	// seleccionar paciente por el autocomplete
	const input = screen.getByPlaceholderText(/Buscar por nombre o teléfono/i);
	await act(async () => {
		fireEvent.change(input, { target: { value: "juan" } });
	});
	await waitFor(() => screen.getByText("JUAN PEREZ"));
	await act(async () => {
		fireEvent.click(screen.getByText("JUAN PEREZ"));
	});

	expect(screen.getAllByDisplayValue("JUAN PEREZ").length).toBeGreaterThan(0);
	// La orden arranca en blanco para el paciente recién elegido.
	expect(selectEmpresa.value).toBe("");
	expect(selectCliente.value).toBe("");
	expect(pago.value).toBe("");
	expect(document.querySelector(".pago-grid select")?.value).toBe("efectivo");
});

test("al remontar la pantalla el borrador restaura la captura", async () => {
	const { unmount } = render(conQueryClient(<NuevoPaciente />));
	await act(async () => {});

	const selectEmpresa = screen.getByDisplayValue("Selecciona una Empresa");
	await act(async () => {
		fireEvent.change(selectEmpresa, { target: { value: "2" } });
	});
	const selectCliente = screen.getByDisplayValue("Selecciona un Cliente");
	await act(async () => {
		fireEvent.change(selectCliente, { target: { value: "1" } });
	});
	const pago = screen.getByPlaceholderText(/Paga con/i);
	await act(async () => {
		fireEvent.change(pago, { target: { value: "500" } });
	});
	const formaPago = screen.getByDisplayValue("Efectivo");
	await act(async () => {
		fireEvent.change(formaPago, { target: { value: "transferencia" } });
	});

	unmount();

	await act(async () => {
		render(conQueryClient(<NuevoPaciente />));
	});

	const empresa2 = document.querySelectorAll(".form-group-inline select")[0];
	const cliente2 = document.querySelectorAll(".form-group-inline select")[1];
	const pago2 = screen.getByPlaceholderText(/Paga con/i);
	const formaPago2 = document.querySelector(".pago-grid select");
	expect(empresa2.value).toBe("2");
	expect(cliente2.value).toBe("1");
	expect(pago2.value).toBe("500");
	expect(formaPago2.value).toBe("transferencia");
});

test("seleccionar un paciente limpia tipo de estudio, doctor y los estudios agregados", async () => {
	await act(async () => {
		render(conQueryClient(<NuevoPaciente />));
	});

	// empresa → cliente → tipo de estudio
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
	await act(async () => {
		fireEvent.change(screen.getByDisplayValue("Selecciona Tipo de Estudio"), {
			target: { value: "7" },
		});
	});

	// estudio agregado desde el buscador
	const buscarEstudio = screen.getByPlaceholderText(/Buscar Estudios/i);
	await act(async () => {
		fireEvent.change(buscarEstudio, { target: { value: "bio" } });
	});
	await act(async () => {
		fireEvent.click(screen.getByText(/BIOMETRIA HEMATICA/i));
	});

	// doctor
	const inputDoctor = screen.getByPlaceholderText(/Buscar doctor/i);
	await act(async () => {
		fireEvent.change(inputDoctor, { target: { value: "ana" } });
	});
	await waitFor(() => screen.getByText("Dr. ANA LOPEZ"));
	await act(async () => {
		fireEvent.click(screen.getByText("Dr. ANA LOPEZ"));
	});

	expect(document.querySelectorAll(".form-group-inline select")[2].value).toBe("7");
	expect(document.querySelectorAll(".estudios-table tbody tr").length).toBeGreaterThan(0);

	// seleccionar paciente
	const input = screen.getByPlaceholderText(/Buscar por nombre o teléfono/i);
	await act(async () => {
		fireEvent.change(input, { target: { value: "juan" } });
	});
	await waitFor(() => screen.getByText("JUAN PEREZ"));
	await act(async () => {
		fireEvent.click(screen.getByText("JUAN PEREZ"));
	});

	expect(document.querySelectorAll(".form-group-inline select")[2].value).toBe("");
	expect(document.querySelectorAll(".estudios-table tbody tr").length).toBe(1);
	expect(screen.queryByText("Dr. ANA LOPEZ")).not.toBeInTheDocument();
});

test("una orden con laboratorio e imagen ofrece cobrar por serie", async () => {
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

	const buscarEstudio = screen.getByPlaceholderText(/Buscar Estudios/i);
	await act(async () => {
		fireEvent.change(buscarEstudio, { target: { value: "bio" } });
	});
	await act(async () => {
		fireEvent.click(screen.getByText(/BIOMETRIA HEMATICA/i));
	});
	await act(async () => {
		fireEvent.change(buscarEstudio, { target: { value: "renal" } });
	});
	await act(async () => {
		fireEvent.click(screen.getByText(/U\.S\. RENAL/i));
	});

	// El laboratorio factura por CDC (serie C) y el ultrasonido por CDI (serie A).
	expect(screen.getByText(/Serie C · CDC/)).toBeInTheDocument();
	expect(screen.getByText(/Serie A · CDI/)).toBeInTheDocument();
	expect(screen.getByLabelText(/Pago de la serie C/i)).toBeInTheDocument();
});

test("un cliente de porcentaje aplica su descuento solo", async () => {
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
			target: { value: "5" },
		});
	});

	const descuento = document.querySelector('.pago-grid input[type="number"]');
	expect(descuento.value).toBe("20");

	// Al cambiar a un cliente sin descuento vuelve a cero.
	await act(async () => {
		fireEvent.change(document.querySelectorAll(".form-group-inline select")[1], {
			target: { value: "1" },
		});
	});
	expect(document.querySelector('.pago-grid input[type="number"]').value).toBe("0");
});

test("el botón de limpiar deja la captura lista para una orden nueva", async () => {
	await act(async () => {
		render(conQueryClient(<NuevoPaciente />));
	});

	await act(async () => {
		fireEvent.change(screen.getByDisplayValue("Selecciona una Empresa"), {
			target: { value: "2" },
		});
	});
	const pago = screen.getByPlaceholderText(/Paga con/i);
	await act(async () => {
		fireEvent.change(pago, { target: { value: "500" } });
	});

	await act(async () => {
		fireEvent.click(screen.getByRole("button", { name: /limpiar y empezar de nuevo/i }));
	});

	expect(document.querySelectorAll(".form-group-inline select")[0].value).toBe("");
	expect(screen.getByPlaceholderText(/Paga con/i).value).toBe("");
});
