import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";

jest.mock("./pacientes.css", () => ({}));
jest.mock("./laboratorio/componentes/modal-agregar-paciente.css", () => ({}), { virtual: true });
jest.mock("../components/admin-entity-modal.css", () => ({}), { virtual: true });
jest.mock("@tanstack/react-query", () => ({
	useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock("../hooks/use-empleado-actual", () => ({
	useEmpleadoActual: () => ({
		empleadoData: { nombre: "Ana", rol: "recepcionista" },
		formatRol: () => "Recepcionista",
		getPrimerNombre: () => "Ana",
	}),
}));
jest.mock("../hooks/use-pacientes", () => ({
	usePacientes: () => ({ data: { data: [], count: 0 } }),
}));
jest.mock("../components/page-layout.jsx", () => ({ children }) => <div>{children}</div>);
jest.mock("../lib/supabase-client.js", () => ({
	supabase: {
		from: () => ({
			select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
		}),
	},
}));

import Pacientes from "./pacientes";

describe("Pacientes: el alta sobrevive a que el navegador descarte la página", () => {
	beforeEach(() => {
		sessionStorage.clear();
		globalThis.mostrarNotificacion = jest.fn();
	});

	// Al descartar la página el navegador no ejecuta ninguna limpieza de React,
	// así que se monta la pantalla de nuevo sin desmontar la anterior.
	const volverTrasDescartarLaPagina = () => within(render(<Pacientes />).container);

	test("el modal se reabre con lo capturado al volver a la pestaña", () => {
		render(<Pacientes />);
		fireEvent.click(screen.getByAltText("Agregar Paciente"));
		fireEvent.change(screen.getByPlaceholderText("Ingresar Primer Nombre"), {
			target: { value: "Maria Rosalia" },
		});

		const pantalla = volverTrasDescartarLaPagina();

		expect(pantalla.getByPlaceholderText("Ingresar Primer Nombre")).toHaveValue("Maria Rosalia");
	});

	test("el modal sigue abierto aunque todavía no se capture nada", () => {
		render(<Pacientes />);
		fireEvent.click(screen.getByAltText("Agregar Paciente"));

		const pantalla = volverTrasDescartarLaPagina();

		expect(pantalla.getByPlaceholderText("Ingresar Primer Nombre")).toBeInTheDocument();
	});

	test("salir de la pantalla con el modal abierto no lo deja marcado", () => {
		const { unmount } = render(<Pacientes />);
		fireEvent.click(screen.getByAltText("Agregar Paciente"));

		// Navegar dentro de la app sí ejecuta la limpieza de React.
		unmount();
		render(<Pacientes />);

		expect(screen.queryByPlaceholderText("Ingresar Primer Nombre")).not.toBeInTheDocument();
	});

	test("sin alta a medias la lista abre sin modal", () => {
		render(<Pacientes />);
		expect(screen.queryByPlaceholderText("Ingresar Primer Nombre")).not.toBeInTheDocument();
	});

	test("al salir del modal deja de reabrirse", () => {
		render(<Pacientes />);
		fireEvent.click(screen.getByAltText("Agregar Paciente"));
		fireEvent.change(screen.getByPlaceholderText("Ingresar Primer Nombre"), {
			target: { value: "Maria Rosalia" },
		});
		fireEvent.click(screen.getByText("Salir"));

		const pantalla = volverTrasDescartarLaPagina();

		expect(pantalla.queryByPlaceholderText("Ingresar Primer Nombre")).not.toBeInTheDocument();
	});
});
