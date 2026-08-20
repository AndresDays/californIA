import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import ModalAgregarPaciente from "./modal-agregar-paciente";
import { hayBorradorPersistente } from "../../../hooks/use-campo-persistente";

jest.mock("./modal-agregar-paciente.css", () => ({}));
jest.mock("../../../components/admin-entity-modal.css", () => ({}));
jest.mock("../../../lib/supabase-client", () => ({
	supabase: {
		from: () => ({
			select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
		}),
	},
}));

const abrirModal = (props = {}) =>
	render(<ModalAgregarPaciente isOpen onClose={jest.fn()} onGuardar={jest.fn()} {...props} />);

const capturarPaciente = () => {
	fireEvent.change(screen.getByPlaceholderText("Ingresar Apellido Paterno"), {
		target: { value: "Lopez" },
	});
	fireEvent.change(screen.getByPlaceholderText("Ingresar Nombre"), {
		target: { value: "Maria Rosalia" },
	});
	fireEvent.change(screen.getByPlaceholderText("Ingresar Teléfono (10 dígitos)"), {
		target: { value: "3221234567" },
	});
};

describe("ModalAgregarPaciente", () => {
	beforeEach(() => {
		sessionStorage.clear();
		globalThis.mostrarNotificacion = jest.fn();
	});

	test("los valores por defecto no dejan el alta como pendiente", () => {
		abrirModal();
		expect(hayBorradorPersistente("modal-paciente:")).toBe(false);
	});

	test("conserva lo capturado cuando el navegador descarta la página", () => {
		const { unmount } = abrirModal();
		capturarPaciente();
		unmount();

		abrirModal();

		expect(screen.getByPlaceholderText("Ingresar Apellido Paterno")).toHaveValue("Lopez");
		expect(screen.getByPlaceholderText("Ingresar Nombre")).toHaveValue("Maria Rosalia");
		expect(screen.getByPlaceholderText("Ingresar Teléfono (10 dígitos)")).toHaveValue("3221234567");
	});

	test("descarta el borrador al cerrar el modal", () => {
		const onClose = jest.fn();
		abrirModal({ onClose });
		capturarPaciente();

		fireEvent.click(screen.getByText("Salir"));

		expect(onClose).toHaveBeenCalled();
		expect(hayBorradorPersistente("modal-paciente:")).toBe(false);
	});

	test("al editar no deja borrador que se arrastre a un alta nueva", () => {
		const { unmount } = abrirModal({
			pacienteEditar: { id: 7, nombre: "Pedro", apellidoPaterno: "Monroy" },
		});
		fireEvent.change(screen.getByPlaceholderText("Ingresar Nombre"), {
			target: { value: "Pedro Editado" },
		});
		unmount();

		expect(hayBorradorPersistente("modal-paciente:")).toBe(false);

		abrirModal();
		expect(screen.getByPlaceholderText("Ingresar Nombre")).toHaveValue("");
	});

	test("un toque en el fondo no descarta lo capturado", () => {
		const onClose = jest.fn();
		abrirModal({ onClose });
		capturarPaciente();

		fireEvent.click(document.querySelector(".modal-overlay-paciente"));

		expect(onClose).not.toHaveBeenCalled();
		expect(screen.getByPlaceholderText("Ingresar Nombre")).toHaveValue("Maria Rosalia");
	});

	test("el fondo sí cierra el modal vacío", () => {
		const onClose = jest.fn();
		abrirModal({ onClose });

		fireEvent.click(document.querySelector(".modal-overlay-paciente"));

		expect(onClose).toHaveBeenCalled();
	});

	test("descarta el borrador al guardar el paciente", () => {
		const onGuardar = jest.fn();
		abrirModal({ onGuardar });
		capturarPaciente();

		fireEvent.submit(document.querySelector("form"));

		expect(onGuardar).toHaveBeenCalledWith(
			expect.objectContaining({ apellido_paterno: "Lopez", primer_nombre: "Maria Rosalia" }),
			false,
		);
		expect(hayBorradorPersistente("modal-paciente:")).toBe(false);
	});
});
