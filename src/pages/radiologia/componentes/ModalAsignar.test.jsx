import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import ModalAsignar from "./ModalAsignar";

jest.mock("../pages/VisorDicom.css", () => ({}));

describe("ModalAsignar", () => {
	const config = {
		titulo: "Asignar estudio a doctor externo o radiólogo",
		items: [
			{
				__asignacion_id: "doctor:1",
				nombre: "Dra. Ana Lopez",
				especialidad: "Radiología",
			},
			{
				__asignacion_id: "doctor:2",
				nombre: "Dr. Juan Perez",
				especialidad: "Cardiología",
			},
		],
		idKey: "__asignacion_id",
		labelKey: "nombre",
		sublabelKey: "especialidad",
		actual: null,
		seleccionado: null,
		loading: false,
	};

	test("permite buscar doctores por nombre o especialidad", () => {
		render(
			<ModalAsignar
				config={config}
				onSeleccionar={jest.fn()}
				onConfirmar={jest.fn()}
				onCerrar={jest.fn()}
			/>,
		);

		expect(screen.getByText("Dra. Ana Lopez — Radiología")).toBeInTheDocument();
		expect(screen.getByText("Dr. Juan Perez — Cardiología")).toBeInTheDocument();

		fireEvent.change(screen.getByPlaceholderText("Buscar doctor..."), {
			target: { value: "radio" },
		});

		expect(screen.getByText("Dra. Ana Lopez — Radiología")).toBeInTheDocument();
		expect(screen.queryByText("Dr. Juan Perez — Cardiología")).not.toBeInTheDocument();
	});
});
