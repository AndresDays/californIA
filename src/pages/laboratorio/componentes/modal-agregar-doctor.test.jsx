import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ModalAgregarDoctor from "./modal-agregar-doctor";

jest.mock("./modal-agregar-doctor.css", () => ({}));
jest.mock("../../../components/admin-entity-modal.css", () => ({}));

describe("ModalAgregarDoctor", () => {
	test("requiere correo y contraseña al crear el acceso del doctor", () => {
		const onSave = jest.fn();
		const alertMock = jest.spyOn(window, "alert").mockImplementation(() => {});

		render(<ModalAgregarDoctor isOpen onClose={jest.fn()} onSave={onSave} />);
		fireEvent.change(screen.getByPlaceholderText("Ingresar Apellido Paterno"), {
			target: { value: "Perez" },
		});
		fireEvent.change(screen.getByPlaceholderText("Ingresar Nombre"), {
			target: { value: "Juan" },
		});
		fireEvent.change(screen.getByLabelText("Especialidad *"), {
			target: { value: "Cardiología" },
		});

		fireEvent.click(screen.getByText("Guardar Doctor"));

		expect(onSave).not.toHaveBeenCalled();
		expect(alertMock).toHaveBeenCalledWith(
			"El correo y la contraseña son requeridos para crear el acceso del doctor",
		);
		alertMock.mockRestore();
	});

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
		fireEvent.change(screen.getByLabelText("Especialidad *"), {
			target: { value: "Cardiología" },
		});
		fireEvent.change(screen.getByPlaceholderText("Ingresar email"), {
			target: { value: "juan@example.com" },
		});
		fireEvent.change(screen.getByPlaceholderText("Contraseña"), {
			target: { value: "secreta" },
		});
		fireEvent.click(screen.getByText("Guardar Doctor"));

		await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
		expect(onSave.mock.calls[0][0]).toMatchObject({
			tipo_doctor: "institucion",
			institucion: "IMSS",
			es_radiologo: false,
			especialidad: "Cardiología",
		});
		expect(onSave.mock.calls[0][0]).not.toHaveProperty("auth_uuid");
	});

	test("permite marcar doctor externo como radiologo", async () => {
		const onSave = jest.fn().mockResolvedValue(undefined);

		render(<ModalAgregarDoctor isOpen onClose={jest.fn()} onSave={onSave} />);

		fireEvent.change(screen.getByPlaceholderText("Ingresar Apellido Paterno"), {
			target: { value: "Lopez" },
		});
		fireEvent.change(screen.getByPlaceholderText("Ingresar Nombre"), {
			target: { value: "Ana" },
		});
		fireEvent.change(screen.getByLabelText("¿Es radiólogo?"), {
			target: { value: "si" },
		});
		fireEvent.change(screen.getByPlaceholderText("Ingresar email"), {
			target: { value: "ana@example.com" },
		});
		fireEvent.change(screen.getByPlaceholderText("Contraseña"), {
			target: { value: "secreta" },
		});
		fireEvent.click(screen.getByText("Guardar Doctor"));

		await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
		expect(screen.queryByLabelText("Especialidad *")).not.toBeInTheDocument();
		expect(onSave.mock.calls[0][0]).toMatchObject({
			es_radiologo: true,
		});
		expect(onSave.mock.calls[0][0]).not.toHaveProperty("especialidad");
	});
});
