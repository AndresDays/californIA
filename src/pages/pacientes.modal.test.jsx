import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

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

	test("el modal se reabre con lo capturado al volver a la pestaña", () => {
		const { unmount } = render(<Pacientes />);
		fireEvent.click(screen.getByAltText("Agregar Paciente"));
		fireEvent.change(screen.getByPlaceholderText("Ingresar Nombre"), {
			target: { value: "Maria Rosalia" },
		});

		// El navegador descarta la página y al volver se monta de nuevo.
		unmount();
		render(<Pacientes />);

		expect(screen.getByPlaceholderText("Ingresar Nombre")).toHaveValue("Maria Rosalia");
	});

	test("el modal sigue abierto aunque todavía no se capture nada", () => {
		const { unmount } = render(<Pacientes />);
		fireEvent.click(screen.getByAltText("Agregar Paciente"));

		unmount();
		render(<Pacientes />);

		expect(screen.getByPlaceholderText("Ingresar Nombre")).toBeInTheDocument();
	});

	test("sin alta a medias la lista abre sin modal", () => {
		render(<Pacientes />);
		expect(screen.queryByPlaceholderText("Ingresar Nombre")).not.toBeInTheDocument();
	});

	test("al salir del modal deja de reabrirse", () => {
		const { unmount } = render(<Pacientes />);
		fireEvent.click(screen.getByAltText("Agregar Paciente"));
		fireEvent.change(screen.getByPlaceholderText("Ingresar Nombre"), {
			target: { value: "Maria Rosalia" },
		});
		fireEvent.click(screen.getByText("Salir"));

		unmount();
		render(<Pacientes />);

		expect(screen.queryByPlaceholderText("Ingresar Nombre")).not.toBeInTheDocument();
	});
});
