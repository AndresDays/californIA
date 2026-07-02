import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ModalAgregarDoctor from "./modal-agregar-doctor";

jest.mock("./modal-agregar-doctor.css", () => ({}));
jest.mock("../../../components/admin-entity-modal.css", () => ({}));

describe("ModalAgregarDoctor", () => {
	test("solo permite doctores externos y no pide auth uuid", async () => {
		const onSave = jest.fn().mockResolvedValue(undefined);

		render(
			<ModalAgregarDoctor
				isOpen
				onClose={jest.fn()}
				onSave={onSave}
			/>,
		);

		expect(screen.queryByText("Interno / clínica")).not.toBeInTheDocument();
		expect(screen.queryByLabelText(/Auth UUID/i)).not.toBeInTheDocument();
		expect(screen.getByLabelText("Tipo de doctor")).toHaveValue("particular");

		fireEvent.change(screen.getByPlaceholderText("Ingresar Apellido Paterno"), {
			target: { value: "Perez" },
		});
		fireEvent.change(screen.getByPlaceholderText("Ingresar Nombre"), {
			target: { value: "Juan" },
		});
		fireEvent.change(screen.getByLabelText("Tipo de doctor"), {
			target: { value: "institucion" },
		});
		fireEvent.change(screen.getByLabelText("Institución"), {
			target: { value: "IMSS" },
		});
		fireEvent.click(screen.getByText("Guardar Doctor"));

		await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
		expect(onSave.mock.calls[0][0]).toMatchObject({
			tipo_doctor: "institucion",
			institucion: "IMSS",
		});
		expect(onSave.mock.calls[0][0]).not.toHaveProperty("auth_uuid");
	});
});
