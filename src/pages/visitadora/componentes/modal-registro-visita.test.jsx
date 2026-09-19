import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

jest.mock("../visitadora.css", () => ({}));

const mockGuardarVisita = jest.fn().mockResolvedValue(undefined);
const mockGuardarTarea = jest.fn().mockResolvedValue(undefined);
const mockGuardarAgenda = jest.fn().mockResolvedValue(undefined);
const mockActualizarContacto = jest.fn().mockResolvedValue(undefined);

jest.mock("../../../hooks/use-visitas-medicas", () => ({
	useGuardarVisita: () => ({ mutateAsync: mockGuardarVisita, isPending: false }),
}));
jest.mock("../../../hooks/use-tareas-seguimiento", () => ({
	useGuardarTarea: () => ({ mutateAsync: mockGuardarTarea, isPending: false }),
}));
jest.mock("../../../hooks/use-agenda-visitas", () => ({
	useGuardarAgenda: () => ({ mutateAsync: mockGuardarAgenda, isPending: false }),
}));
jest.mock("../../../hooks/use-directorio-medicos", () => ({
	useActualizarContactoMedico: () => ({ mutateAsync: mockActualizarContacto, isPending: false }),
}));

import ModalRegistroVisita from "./modal-registro-visita";

const medico = {
	id_doctor: 7,
	nombre_completo: "Ramón Pérez",
	especialidad: "Ginecología",
	zona: "Centro",
	hospital: "Hospital del Valle",
	telefono: "3221234567",
	email: "ramon@ejemplo.mx",
	fecha_nacimiento: "1975-09-19",
};

const mostrar = async (props = {}) => {
	const onGuardado = jest.fn();
	const onError = jest.fn();
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	await act(async () => {
		render(
			<QueryClientProvider client={queryClient}>
				<ModalRegistroVisita
					isOpen
					medico={medico}
					idEmpleado={4}
					onClose={jest.fn()}
					onGuardado={onGuardado}
					onError={onError}
					{...props}
				/>
			</QueryClientProvider>,
		);
	});
	return { onGuardado, onError };
};

beforeEach(() => {
	jest.useFakeTimers().setSystemTime(new Date("2026-09-19T18:00:00Z"));
	mockGuardarVisita.mockClear();
	mockGuardarTarea.mockClear();
	mockGuardarAgenda.mockClear();
	mockActualizarContacto.mockClear();
});
afterEach(() => jest.useRealTimers());

describe("Registro rápido de visita", () => {
	test("nace con la fecha de hoy y el médico ya puesto", async () => {
		await mostrar();
		expect(screen.getByLabelText("Fecha")).toHaveValue("2026-09-19");
		expect(screen.getByText(/Ramón Pérez/)).toBeInTheDocument();
	});

	test("guarda la visita con lo capturado", async () => {
		const { onGuardado } = await mostrar();
		fireEvent.change(screen.getByLabelText("Resultado"), {
			target: { value: "Mostró interés en el convenio" },
		});
		fireEvent.change(screen.getByLabelText("Qué se entregó"), { target: { value: "25 órdenes" } });
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar visita" }));
		});
		expect(mockGuardarVisita).toHaveBeenCalledWith(
			expect.objectContaining({
				id_doctor: 7,
				medico_nombre: "Ramón Pérez",
				resultado: "Mostró interés en el convenio",
				que_se_entrego: "25 órdenes",
				id_empleado: 4,
			}),
		);
		expect(onGuardado).toHaveBeenCalled();
	});

	// El seguimiento que se le olvidaba apuntar: guardar la visita tiene que
	// dejarlo solo en la bandeja de pendientes.
	test("crea el pendiente de seguimiento junto con la visita", async () => {
		await mostrar();
		fireEvent.change(screen.getByLabelText("Resultado"), { target: { value: "Pidió cotización" } });
		fireEvent.change(screen.getByLabelText("Próxima acción"), {
			target: { value: "Llevarle la lista de precios" },
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar visita" }));
		});
		expect(mockGuardarTarea).toHaveBeenCalledWith(
			expect.objectContaining({
				id_doctor: 7,
				tipo: "seguimiento",
				descripcion: "Llevarle la lista de precios",
				fecha_objetivo: "2026-10-04",
			}),
		);
	});

	test("sin fecha de seguimiento no agenda pendiente", async () => {
		await mostrar();
		fireEvent.change(screen.getByLabelText("Resultado"), { target: { value: "No estaba" } });
		fireEvent.change(screen.getByLabelText("Fecha de seguimiento"), { target: { value: "" } });
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar visita" }));
		});
		expect(mockGuardarVisita).toHaveBeenCalled();
		expect(mockGuardarTarea).not.toHaveBeenCalled();
	});

	test("una visita que venía de la agenda queda marcada como realizada", async () => {
		await mostrar({ cita: { id_agenda: "a1", tipo_visita: "entrega_ordenes", objetivo: "Dejar órdenes" } });
		fireEvent.change(screen.getByLabelText("Resultado"), { target: { value: "Entregadas" } });
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar visita" }));
		});
		expect(mockGuardarAgenda).toHaveBeenCalledWith(
			expect.objectContaining({ id_agenda: "a1", estatus: "realizada", resultado: "Entregadas" }),
		);
	});

	test("no guarda una visita sin resultado", async () => {
		const { onError } = await mostrar();
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar visita" }));
		});
		expect(mockGuardarVisita).not.toHaveBeenCalled();
		expect(onError).toHaveBeenCalledWith("Escribe al menos el resultado de la visita.");
	});
});

describe("Datos de contacto del médico", () => {
	test("trae lo que ya está capturado en su ficha", async () => {
		await mostrar();
		expect(screen.getByLabelText("Teléfono")).toHaveValue("3221234567");
		expect(screen.getByLabelText("Correo electrónico")).toHaveValue("ramon@ejemplo.mx");
		expect(screen.getByLabelText("Fecha de nacimiento")).toHaveValue("1975-09-19");
	});

	// El dato que le sacó en el consultorio se guarda en el catálogo, para que
	// el cumpleaños y el WhatsApp funcionen desde el directorio.
	test("lo que se complete se guarda en la ficha del médico", async () => {
		await mostrar();
		fireEvent.change(screen.getByLabelText("Resultado"), { target: { value: "Aceptó" } });
		fireEvent.change(screen.getByLabelText("Correo electrónico"), {
			target: { value: "nuevo@ejemplo.mx" },
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar visita" }));
		});
		expect(mockActualizarContacto).toHaveBeenCalledWith({
			idDoctor: 7,
			telefono: "3221234567",
			email: "nuevo@ejemplo.mx",
			fechaNacimiento: "1975-09-19",
		});
	});

	test("si no se cambió nada no se toca la ficha", async () => {
		await mostrar();
		fireEvent.change(screen.getByLabelText("Resultado"), { target: { value: "Aceptó" } });
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar visita" }));
		});
		expect(mockGuardarVisita).toHaveBeenCalled();
		expect(mockActualizarContacto).not.toHaveBeenCalled();
	});
});
