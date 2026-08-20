import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ModalAgregarDoctor from "./modal-agregar-doctor";

jest.mock("./modal-agregar-doctor.css", () => ({}));
jest.mock("../../../components/admin-entity-modal.css", () => ({}));
jest.mock("../../../components/ModalNotificacion", () => ({ isOpen, mensaje }) =>
	isOpen ? <div role="alert">{mensaje}</div> : null,
);

describe("ModalAgregarDoctor: borrador de la captura", () => {
	beforeEach(() => {
		sessionStorage.clear();
	});

	const abrirModal = (props = {}) =>
		render(<ModalAgregarDoctor isOpen onClose={jest.fn()} onSave={jest.fn()} {...props} />);

	const capturarDoctor = () => {
		fireEvent.change(screen.getByPlaceholderText("Ingresar Apellido Paterno"), {
			target: { value: "Desage" },
		});
		fireEvent.change(screen.getByPlaceholderText("Ingresar Nombre"), {
			target: { value: "Odile" },
		});
	};

	test("conserva lo capturado cuando el navegador descarta la página", () => {
		const { unmount } = abrirModal();
		capturarDoctor();
		unmount();

		abrirModal();

		expect(screen.getByPlaceholderText("Ingresar Apellido Paterno")).toHaveValue("Desage");
		expect(screen.getByPlaceholderText("Ingresar Nombre")).toHaveValue("Odile");
	});

	test("un toque en el fondo no descarta lo capturado", () => {
		const onClose = jest.fn();
		abrirModal({ onClose });
		capturarDoctor();

		fireEvent.click(document.querySelector(".modal-overlay"));

		expect(onClose).not.toHaveBeenCalled();
		expect(screen.getByPlaceholderText("Ingresar Nombre")).toHaveValue("Odile");
	});

	test("el fondo sí cierra el modal vacío", () => {
		const onClose = jest.fn();
		abrirModal({ onClose });

		fireEvent.click(document.querySelector(".modal-overlay"));

		expect(onClose).toHaveBeenCalled();
	});

	test("descarta el borrador al cancelar", () => {
		const { unmount } = abrirModal();
		capturarDoctor();

		fireEvent.click(screen.getByText("Cancelar"));
		unmount();

		abrirModal();
		expect(screen.getByPlaceholderText("Ingresar Nombre")).toHaveValue("");
	});

	test("al editar no deja borrador que se arrastre a un alta nueva", () => {
		const { unmount } = abrirModal({
			doctorEditar: { id: 3, nombre: "Scarlett", apellidoPaterno: "Utrilla" },
		});
		fireEvent.change(screen.getByPlaceholderText("Ingresar Nombre"), {
			target: { value: "Scarlett Editada" },
		});
		unmount();

		abrirModal();
		expect(screen.getByPlaceholderText("Ingresar Nombre")).toHaveValue("");
	});

	test("la contraseña no se respalda en el navegador", () => {
		const { unmount } = abrirModal();
		capturarDoctor();
		unmount();

		expect(JSON.stringify(sessionStorage)).not.toMatch(/contrasena/i);
	});
});

describe("ModalAgregarDoctor", () => {
	beforeEach(() => {
		sessionStorage.clear();
	});

	test("muestra una notificación al faltar los datos obligatorios", async () => {
		render(<ModalAgregarDoctor isOpen onClose={jest.fn()} onSave={jest.fn()} />);

		fireEvent.click(screen.getByText("Guardar Doctor"));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Por favor completa al menos Apellido Paterno y Nombre",
		);
	});

	test("permite crear un doctor sin acceso a la plataforma", async () => {
		const onSave = jest.fn().mockResolvedValue(undefined);

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

		await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({
				email: null,
				usuario: null,
				contrasena: null,
			}),
			false,
		);
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
