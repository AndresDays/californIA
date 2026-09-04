import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

jest.mock("./modal-imprimir-comprobantes.css", () => ({}), { virtual: true });
jest.mock("../utils/abrir-pdf-en-pestana", () => ({
	abrirPdfEnPestana: jest.fn(),
}));

import { abrirPdfEnPestana } from "../utils/abrir-pdf-en-pestana";
import ModalImprimirComprobantes from "./modal-imprimir-comprobantes";

const COMPROBANTES = [
	{ id: "ticket", etiqueta: "Imprimir ticket", url: "blob:ticket", titulo: "Ticket B0002" },
	{
		id: "etiquetas-imagen",
		etiqueta: "Imprimir etiquetas de imagen",
		url: "blob:etiqueta",
		titulo: "Etiqueta B0002",
	},
];

const abrirModal = (props = {}) =>
	render(
		<ModalImprimirComprobantes
			folio="B0002"
			comprobantes={COMPROBANTES}
			onCerrar={jest.fn()}
			{...props}
		/>,
	);

describe("ModalImprimirComprobantes", () => {
	beforeEach(() => jest.clearAllMocks());

	test("ofrece un boton por comprobante y muestra el folio", () => {
		abrirModal();

		expect(screen.getByText("Folio: B0002")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Imprimir ticket" })).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Imprimir etiquetas de imagen" }),
		).toBeInTheDocument();
	});

	// Abrir desde el clic es justo lo que evita que el navegador bloquee la
	// pestaña, que era lo que dejaba a la caja sin etiquetas.
	test("cada boton abre su propio PDF", () => {
		abrirModal();

		fireEvent.click(screen.getByRole("button", { name: "Imprimir etiquetas de imagen" }));

		expect(abrirPdfEnPestana).toHaveBeenCalledTimes(1);
		expect(abrirPdfEnPestana).toHaveBeenCalledWith(COMPROBANTES[1]);
	});

	test("se puede repetir la impresion sin volver a capturar", () => {
		abrirModal();
		const boton = screen.getByRole("button", { name: "Imprimir ticket" });

		fireEvent.click(boton);
		fireEvent.click(boton);

		expect(abrirPdfEnPestana).toHaveBeenCalledTimes(2);
	});

	test("el titulo se puede cambiar para la reimpresion", () => {
		abrirModal({ titulo: "Reimprimir comprobantes" });

		expect(screen.getByText("Reimprimir comprobantes")).toBeInTheDocument();
	});

	test("terminar cierra el modal", () => {
		const onCerrar = jest.fn();
		abrirModal({ onCerrar });

		fireEvent.click(screen.getByRole("button", { name: "Terminar" }));

		expect(onCerrar).toHaveBeenCalled();
	});

	test("sin comprobantes no se muestra nada", () => {
		const { container } = abrirModal({ comprobantes: [] });

		expect(container).toBeEmptyDOMElement();
	});
});
