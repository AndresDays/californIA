import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";

jest.mock("../visitadora.css", () => ({}));
const mockGuardarVisita = jest.fn().mockResolvedValue(undefined);
jest.mock("../../../hooks/use-visitas-medicas", () => ({
	useGuardarVisita: () => ({ mutateAsync: mockGuardarVisita, isPending: false }),
}));
const mockClasificar = jest.fn();
jest.mock("../../../hooks/use-clasificar-visita", () => ({
	useClasificarVisita: () => ({ mutateAsync: mockClasificar, isPending: false }),
}));

import ModalVisita from "./modal-visita";

const props = {
	isOpen: true,
	visita: null,
	semana: { desde: "2026-09-14", hasta: "2026-09-18" },
	idEmpleado: 4,
};

beforeEach(() => {
	mockGuardarVisita.mockClear();
	mockClasificar.mockReset();
});

describe("ModalVisita", () => {
	// Volver a la pestaña refresca los catálogos y vuelve a dibujar la pantalla.
	// Lo capturado vive en el modal, así que tiene que sobrevivir a esos
	// redibujados: antes se perdía todo lo escrito.
	test("conserva lo capturado cuando la pantalla se vuelve a dibujar", () => {
		const { rerender } = render(
			<ModalVisita {...props} doctores={[{ id_doctor: 3, nombre: "Saúl Ruiz" }]} />,
		);

		fireEvent.change(screen.getByLabelText("Médico / Empresa"), {
			target: { value: "CLINICA DEL VALLE" },
		});
		fireEvent.change(screen.getByLabelText("Lo que pasó en la visita"), {
			target: { value: "Se entregaron listas de precios" },
		});

		// Otra lista de doctores: la referencia nueva es lo que llega tras un
		// refetch al recuperar el foco.
		rerender(
			<ModalVisita
				{...props}
				doctores={[
					{ id_doctor: 3, nombre: "Saúl Ruiz" },
					{ id_doctor: 7, nombre: "Ana Lara" },
				]}
			/>,
		);

		expect(screen.getByLabelText("Médico / Empresa")).toHaveValue("CLINICA DEL VALLE");
		expect(screen.getByLabelText("Lo que pasó en la visita")).toHaveValue("Se entregaron listas de precios");
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});

	// Es la misma captura que la de registrar visita en la agenda: el espacio
	// abierto para escribir de corrido y «Acomodar con IA».
	test("captura de corrido y guarda lo que acomodó la IA", async () => {
		mockClasificar.mockResolvedValue({
			fuente: "ia",
			desglose: {
				actividades: "Se presentaron los servicios de imagen.",
				comentarios_medico: "",
				observaciones: "Pidió precios de resonancia.",
				seguimiento: "Llamar en 15 días.",
				tipo_convenio: "",
			},
		});
		render(<ModalVisita {...props} doctores={[]} />);

		fireEvent.change(screen.getByLabelText("Médico / Empresa"), { target: { value: "Dr. Ruiz" } });
		fireEvent.change(screen.getByLabelText("Lo que pasó en la visita"), {
			target: { value: "presente imagen, pidio precios de resonancia, llamarle en 15 dias" },
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Acomodar con IA" }));
		});
		expect(screen.getByText(/acomodado con IA/)).toBeInTheDocument();

		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
		});
		expect(mockGuardarVisita).toHaveBeenCalledWith(
			expect.objectContaining({
				fecha: "2026-09-14",
				medico_nombre: "Dr. Ruiz",
				actividades: "Se presentaron los servicios de imagen.",
				observaciones: "Pidió precios de resonancia.",
				seguimiento: "Llamar en 15 días.",
				captura_libre: "presente imagen, pidio precios de resonancia, llamarle en 15 dias",
				id_empleado: 4,
			}),
		);
	});

	test("campo por campo guarda cada columna y no deja captura libre", async () => {
		render(<ModalVisita {...props} doctores={[]} />);

		fireEvent.change(screen.getByLabelText("Médico / Empresa"), { target: { value: "Dr. Ruiz" } });
		fireEvent.click(screen.getByRole("tab", { name: "Campo por campo" }));
		fireEvent.change(screen.getByLabelText("Actividades"), { target: { value: "Entrega de órdenes" } });
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
		});
		expect(mockGuardarVisita).toHaveBeenCalledWith(
			expect.objectContaining({ actividades: "Entrega de órdenes", captura_libre: null }),
		);
	});

	test("al editar una visita del Excel arma el texto con sus columnas", () => {
		render(
			<ModalVisita
				{...props}
				doctores={[]}
				visita={{ id_visita: 9, fecha: "2026-09-15", medico_nombre: "Dr. Ruiz", actividades: "Entrega de órdenes" }}
			/>,
		);
		expect(screen.getByLabelText("Lo que pasó en la visita").value).toContain("Entrega de órdenes");
	});
});
