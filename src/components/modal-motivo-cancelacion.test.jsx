import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ModalMotivoCancelacion from "./modal-motivo-cancelacion";

const abrirModal = (props = {}) =>
	render(
		<ModalMotivoCancelacion
			isOpen
			onClose={jest.fn()}
			onConfirmar={jest.fn()}
			folio="F-100"
			paciente="Juan Pérez"
			{...props}
		/>,
	);

test("no renderiza nada cuando está cerrado", () => {
	const { container } = render(
		<ModalMotivoCancelacion isOpen={false} onClose={jest.fn()} onConfirmar={jest.fn()} />,
	);
	expect(container).toBeEmptyDOMElement();
});

test("muestra el folio y el paciente de la orden", () => {
	abrirModal();
	expect(screen.getByText(/Folio F-100/)).toBeInTheDocument();
	expect(screen.getByText(/Juan Pérez/)).toBeInTheDocument();
});

test("no cancela si no se eligió un motivo", () => {
	const onConfirmar = jest.fn();
	abrirModal({ onConfirmar });

	fireEvent.click(screen.getByRole("button", { name: /cancelar solicitud/i }));

	expect(onConfirmar).not.toHaveBeenCalled();
	expect(screen.getByText(/Selecciona el motivo/i)).toBeInTheDocument();
});

test("exige descripción cuando el motivo es Otro", () => {
	const onConfirmar = jest.fn();
	abrirModal({ onConfirmar });

	fireEvent.change(screen.getByLabelText(/motivo de cancelación/i), {
		target: { value: "Otro" },
	});
	fireEvent.click(screen.getByRole("button", { name: /cancelar solicitud/i }));

	expect(onConfirmar).not.toHaveBeenCalled();
	expect(screen.getByText(/al menos 5 caracteres/i)).toBeInTheDocument();
});

test("envía el motivo elegido junto con el comentario", async () => {
	const onConfirmar = jest.fn().mockResolvedValue(undefined);
	abrirModal({ onConfirmar });

	fireEvent.change(screen.getByLabelText(/motivo de cancelación/i), {
		target: { value: "Solicitud duplicada" },
	});
	fireEvent.change(screen.getByLabelText(/detalle de la cancelación/i), {
		target: { value: "se capturó dos veces" },
	});
	fireEvent.click(screen.getByRole("button", { name: /cancelar solicitud/i }));

	await waitFor(() => expect(onConfirmar).toHaveBeenCalledTimes(1));
	expect(onConfirmar).toHaveBeenCalledWith({
		motivo: "Solicitud duplicada: se capturó dos veces",
		categoria: "Solicitud duplicada",
		detalle: "se capturó dos veces",
	});
});

test("usa la descripción como motivo cuando se elige Otro", async () => {
	const onConfirmar = jest.fn().mockResolvedValue(undefined);
	abrirModal({ onConfirmar });

	fireEvent.change(screen.getByLabelText(/motivo de cancelación/i), {
		target: { value: "Otro" },
	});
	fireEvent.change(screen.getByLabelText(/detalle de la cancelación/i), {
		target: { value: "equipo en mantenimiento" },
	});
	fireEvent.click(screen.getByRole("button", { name: /cancelar solicitud/i }));

	await waitFor(() => expect(onConfirmar).toHaveBeenCalledTimes(1));
	expect(onConfirmar).toHaveBeenCalledWith({
		motivo: "equipo en mantenimiento",
		categoria: "Otro",
		detalle: "equipo en mantenimiento",
	});
});

test("deja el modal usable si la cancelación falla", async () => {
	const onConfirmar = jest.fn().mockRejectedValue(new Error("falló"));
	jest.spyOn(console, "error").mockImplementation(() => {});
	abrirModal({ onConfirmar });

	fireEvent.change(screen.getByLabelText(/motivo de cancelación/i), {
		target: { value: "Error de captura" },
	});
	fireEvent.click(screen.getByRole("button", { name: /cancelar solicitud/i }));

	await waitFor(() =>
		expect(screen.getByRole("button", { name: /cancelar solicitud/i })).toBeEnabled(),
	);
	console.error.mockRestore();
});

// A petición del paciente sin decir por qué la pidió no le sirve a nadie: quien
// recibe el aviso necesita saber si reagendó, si se fue a otro lado o si fue el
// precio.
test("exige el motivo del paciente cuando se cancela a su petición", () => {
	const onConfirmar = jest.fn();
	abrirModal({ onConfirmar });

	fireEvent.change(screen.getByLabelText(/motivo de cancelación/i), {
		target: { value: "Cancelación a petición del paciente" },
	});

	expect(screen.getByText(/Motivo del paciente/i)).toBeInTheDocument();

	fireEvent.click(screen.getByRole("button", { name: /cancelar solicitud/i }));

	expect(onConfirmar).not.toHaveBeenCalled();
	expect(screen.getByText(/al menos 5 caracteres/i)).toBeInTheDocument();
});

// El detalle viaja pegado al motivo: es lo que se guarda en la orden y lo que
// el aviso de cancelación le muestra a dirección y administración.
test("el motivo a petición del paciente lleva el detalle capturado", async () => {
	const onConfirmar = jest.fn().mockResolvedValue(undefined);
	abrirModal({ onConfirmar });

	fireEvent.change(screen.getByLabelText(/motivo de cancelación/i), {
		target: { value: "Cancelación a petición del paciente" },
	});
	fireEvent.change(screen.getByLabelText(/detalle de la cancelación/i), {
		target: { value: "reagendó para la próxima semana" },
	});
	fireEvent.click(screen.getByRole("button", { name: /cancelar solicitud/i }));

	await waitFor(() => expect(onConfirmar).toHaveBeenCalledTimes(1));
	expect(onConfirmar).toHaveBeenCalledWith({
		motivo: "Cancelación a petición del paciente: reagendó para la próxima semana",
		categoria: "Cancelación a petición del paciente",
		detalle: "reagendó para la próxima semana",
	});
});
