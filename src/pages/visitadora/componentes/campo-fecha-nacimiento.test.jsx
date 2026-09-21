import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";

jest.mock("../visitadora.css", () => ({}));

import CampoFechaNacimiento from "./campo-fecha-nacimiento";

const Anfitrion = ({ inicial = "" }) => {
	const [valor, setValor] = useState(inicial);
	return (
		<>
			<CampoFechaNacimiento id="cumple" valor={valor} onChange={setValor} />
			<output>{valor || "(vacío)"}</output>
		</>
	);
};

describe("Fecha de nacimiento con tres listas", () => {
	test("reparte la fecha guardada entre día, mes y año", () => {
		render(<Anfitrion inicial="1975-09-19" />);
		expect(screen.getByLabelText("Día")).toHaveValue("19");
		expect(screen.getByLabelText("Mes")).toHaveValue("09");
		expect(screen.getByLabelText("Año")).toHaveValue("1975");
	});

	test("al elegir las tres partes devuelve la fecha completa", () => {
		render(<Anfitrion />);
		fireEvent.change(screen.getByLabelText("Día"), { target: { value: "05" } });
		fireEvent.change(screen.getByLabelText("Mes"), { target: { value: "03" } });
		fireEvent.change(screen.getByLabelText("Año"), { target: { value: "1968" } });
		expect(screen.getByText("1968-03-05")).toBeInTheDocument();
	});

	// A medias no es una fecha: guardarla dejaría un cumpleaños inventado.
	test("con la fecha a medias no devuelve nada", () => {
		render(<Anfitrion />);
		fireEvent.change(screen.getByLabelText("Mes"), { target: { value: "03" } });
		expect(screen.getByText("(vacío)")).toBeInTheDocument();
	});

	test("febrero no ofrece 30 ni 31", () => {
		render(<Anfitrion inicial="1981-02-10" />);
		const dias = [...screen.getByLabelText("Día").options].map((opcion) => opcion.value);
		expect(dias).toContain("28");
		expect(dias).not.toContain("29");
		expect(dias).not.toContain("30");
	});

	// Pasar del 31 de marzo a febrero dejaría una fecha imposible.
	test("cambiar de mes recorta el día que ya no existe", () => {
		render(<Anfitrion inicial="1980-03-31" />);
		fireEvent.change(screen.getByLabelText("Mes"), { target: { value: "02" } });
		expect(screen.getByText("1980-02-29")).toBeInTheDocument();
	});

	test("no hay calendario del navegador, sólo listas", () => {
		const { container } = render(<Anfitrion inicial="1975-09-19" />);
		expect(container.querySelector('input[type="date"]')).toBeNull();
		expect(container.querySelectorAll("select")).toHaveLength(3);
	});
});
