import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

jest.mock("../visitadora.css", () => ({}));

const mockGuardarAgenda = jest.fn().mockResolvedValue(undefined);
const mockAgregarNota = jest.fn().mockResolvedValue(undefined);

jest.mock("../../../hooks/use-agenda-visitas", () => ({
	useGuardarAgenda: () => ({ mutateAsync: mockGuardarAgenda, isPending: false }),
}));
jest.mock("../../../hooks/use-directorio-medicos", () => ({
	useAgregarNotaMedico: () => ({ mutateAsync: mockAgregarNota, isPending: false }),
}));

import ModalCita from "./modal-cita";

const medico = { id_doctor: 7, nombre_completo: "Ramón Pérez", especialidad: "Ginecología", zona: "Centro" };

const mostrar = async (props = {}) => {
	const onGuardado = jest.fn();
	const onError = jest.fn();
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	await act(async () => {
		render(
			<QueryClientProvider client={queryClient}>
				<ModalCita
					isOpen
					medico={medico}
					fecha="2026-09-23"
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
	mockGuardarAgenda.mockClear();
	mockAgregarNota.mockClear();
});

describe("Programar visita", () => {
	test("guarda la cita con su día y su hora", async () => {
		const { onGuardado } = await mostrar();
		fireEvent.change(screen.getByLabelText("Hora"), { target: { value: "16:30" } });
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
		});
		expect(mockGuardarAgenda).toHaveBeenCalledWith(
			expect.objectContaining({ id_doctor: 7, fecha: "2026-09-23", hora: "16:30" }),
		);
		expect(onGuardado).toHaveBeenCalled();
	});

	// La nota es del médico, no de la cita: se guarda en su ficha para leerla
	// después en la pestaña de Datos del directorio.
	test("la nota se guarda en la ficha del médico", async () => {
		await mostrar();
		fireEvent.change(screen.getByLabelText("Notas del médico"), {
			target: { value: "Prefiere que le llamen antes de ir" },
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
		});
		expect(mockAgregarNota).toHaveBeenCalledWith({
			idDoctor: 7,
			nota: "Prefiere que le llamen antes de ir",
			fecha: "2026-09-23",
		});
	});

	test("sin nota no se toca la ficha", async () => {
		await mostrar();
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
		});
		expect(mockGuardarAgenda).toHaveBeenCalled();
		expect(mockAgregarNota).not.toHaveBeenCalled();
	});
});

describe("Editar la visita de una tarjeta", () => {
	const cita = {
		id_agenda: "a1",
		id_doctor: 7,
		medico_nombre: "Ramón Pérez",
		especialidad: "Ginecología",
		fecha: "2026-09-23",
		hora: "16:00:00",
		tipo_visita: "seguimiento",
		zona: "Centro",
	};

	// Se edita la visita de ese médico: volver a preguntar cuál era pedía un
	// dato que ya se sabía y dejaba cambiarlo sin querer.
	test("no pregunta de nuevo por el médico", async () => {
		await mostrar({ cita, medico: undefined });
		expect(screen.queryByLabelText("Médico")).not.toBeInTheDocument();
		expect(screen.getByText(/Ramón Pérez/)).toBeInTheDocument();
	});

	test("guarda sobre la misma visita, con su médico", async () => {
		await mostrar({ cita, medico: undefined, medicos: [] });
		fireEvent.change(screen.getByLabelText("Hora"), { target: { value: "18:00" } });
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
		});
		expect(mockGuardarAgenda).toHaveBeenCalledWith(
			expect.objectContaining({
				id_agenda: "a1",
				id_doctor: 7,
				medico_nombre: "Ramón Pérez",
				hora: "18:00",
			}),
		);
	});

	test("programar una visita nueva sí deja elegir médico", async () => {
		await mostrar({ medico: undefined, medicos: [{ id_doctor: 9, nombre_completo: "Ana Ruiz" }] });
		expect(screen.getByLabelText("Médico")).toBeInTheDocument();
	});
});
