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
	fireEvent.change(screen.getByPlaceholderText("Ingresar Primer Nombre"), {
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
		expect(screen.getByPlaceholderText("Ingresar Primer Nombre")).toHaveValue("Maria Rosalia");
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
		fireEvent.change(screen.getByPlaceholderText("Ingresar Primer Nombre"), {
			target: { value: "Pedro Editado" },
		});
		unmount();

		expect(hayBorradorPersistente("modal-paciente:")).toBe(false);

		abrirModal();
		expect(screen.getByPlaceholderText("Ingresar Primer Nombre")).toHaveValue("");
	});

	test("un toque en el fondo no descarta lo capturado", () => {
		const onClose = jest.fn();
		abrirModal({ onClose });
		capturarPaciente();

		fireEvent.click(document.querySelector(".modal-overlay-paciente"));

		expect(onClose).not.toHaveBeenCalled();
		expect(screen.getByPlaceholderText("Ingresar Primer Nombre")).toHaveValue("Maria Rosalia");
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

describe("ModalAgregarPaciente: nombres y fecha de nacimiento", () => {
	beforeEach(() => {
		sessionStorage.clear();
		globalThis.mostrarNotificacion = jest.fn();
	});

	test("los campos van en orden de primer nombre a apellido materno", () => {
		const { container } = abrirModal();
		const placeholders = [...container.querySelectorAll("input[placeholder]")].map(
			(campo) => campo.getAttribute("placeholder"),
		);

		expect(placeholders.slice(0, 4)).toEqual([
			"Ingresar Primer Nombre",
			"Ingresar Segundo Nombre",
			"Ingresar Apellido Paterno",
			"Ingresar Apellido Materno",
		]);
	});

	// El nombre completo conserva el orden con el que se busca y se imprime.
	test("guarda el segundo nombre aparte y lo suma al nombre completo", () => {
		const onGuardar = jest.fn();
		abrirModal({ onGuardar });

		fireEvent.change(screen.getByPlaceholderText("Ingresar Primer Nombre"), {
			target: { value: "Maria" },
		});
		fireEvent.change(screen.getByPlaceholderText("Ingresar Segundo Nombre"), {
			target: { value: "Guadalupe" },
		});
		fireEvent.change(screen.getByPlaceholderText("Ingresar Apellido Paterno"), {
			target: { value: "Munoz" },
		});
		fireEvent.change(screen.getByPlaceholderText("Ingresar Apellido Materno"), {
			target: { value: "Lomeli" },
		});
		fireEvent.click(screen.getByText("Guardar cliente"));

		expect(onGuardar).toHaveBeenCalledWith(
			expect.objectContaining({
				nombre: "Munoz Lomeli Maria Guadalupe",
				primer_nombre: "Maria",
				segundo_nombre: "Guadalupe",
			}),
			false,
		);
	});

	// Un solo campo que acepta tecleo y abre el calendario, en vez de tres listas.
	test("la fecha se captura en un campo de calendario y calcula la edad", () => {
		// La edad sale de la fecha de hoy, así que se fija para que la prueba no
		// cambie de resultado con el paso del tiempo.
		jest.useFakeTimers().setSystemTime(new Date("2026-08-27T12:00:00"));
		const onGuardar = jest.fn();
		abrirModal({ onGuardar });

		const campoFecha = screen.getByLabelText("Fecha de nacimiento");
		expect(campoFecha).toHaveAttribute("type", "date");

		fireEvent.change(campoFecha, { target: { value: "1990-05-12" } });
		fireEvent.change(screen.getByPlaceholderText("Ingresar Primer Nombre"), {
			target: { value: "Maria" },
		});
		fireEvent.change(screen.getByPlaceholderText("Ingresar Apellido Paterno"), {
			target: { value: "Munoz" },
		});
		fireEvent.click(screen.getByText("Guardar cliente"));

		expect(onGuardar).toHaveBeenCalledWith(
			expect.objectContaining({ fecha_nacimiento: "1990-05-12", edad: 36 }),
			false,
		);
		jest.useRealTimers();
	});

	test("al editar, la fecha guardada llega al campo", () => {
		abrirModal({
			pacienteEditar: {
				id: 5,
				nombre: "Maria",
				segundoNombre: "Guadalupe",
				apellidoPaterno: "Munoz",
				fechaNacimiento: "1990-05-12",
			},
		});

		expect(screen.getByLabelText("Fecha de nacimiento")).toHaveValue("1990-05-12");
		expect(screen.getByPlaceholderText("Ingresar Segundo Nombre")).toHaveValue("Guadalupe");
	});
});
