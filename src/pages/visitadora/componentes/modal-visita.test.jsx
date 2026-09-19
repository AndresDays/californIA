import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

jest.mock("../visitadora.css", () => ({}));
jest.mock("../../../hooks/use-visitas-medicas", () => ({
	useGuardarVisita: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

import ModalVisita from "./modal-visita";

const props = {
	isOpen: true,
	visita: null,
	semana: { desde: "2026-09-14", hasta: "2026-09-18" },
	idEmpleado: 4,
};

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
		fireEvent.change(screen.getByLabelText("Actividades"), {
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
		expect(screen.getByLabelText("Actividades")).toHaveValue("Se entregaron listas de precios");
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});
});
