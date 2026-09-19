import React from "react";
import { act, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

jest.mock("./visitadora.css", () => ({}));
jest.mock("../../components/page-layout.jsx", () => ({
	__esModule: true,
	default: ({ children }) => <div>{children}</div>,
}));

const mockEmpleado = { current: { rol: "visitadora", id_empleado: 4, nombre: "Ana María Ruiz" } };
jest.mock("../../hooks/use-empleado-actual", () => ({
	useEmpleadoActual: () => ({
		empleadoData: mockEmpleado.current,
		formatRol: (rol) => rol,
		// La firma real: recibe el nombre, no el empleado.
		getPrimerNombre: (nombreCompleto) => nombreCompleto || "Usuario",
	}),
}));

jest.mock("../../hooks/use-directorio-medicos", () => ({
	useDirectorioMedicos: () => ({ medicos: [] }),
}));
jest.mock("../../hooks/use-agenda-visitas", () => ({
	useAgendaVisitas: () => ({ data: [] }),
}));
jest.mock("../../hooks/use-tareas-seguimiento", () => ({
	useTareasSeguimiento: () => ({ data: [] }),
}));
jest.mock("../../hooks/use-visitas-medicas", () => ({
	useVisitasMedicas: () => ({ data: [] }),
}));

import Panel from "./panel";

const mostrar = async () => {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	await act(async () => {
		render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter>
					<Panel />
				</MemoryRouter>
			</QueryClientProvider>,
		);
	});
};

beforeEach(() => {
	jest.useFakeTimers().setSystemTime(new Date("2026-09-19T18:00:00Z"));
	mockEmpleado.current = { rol: "visitadora", id_empleado: 4, nombre: "Ana María Ruiz" };
});
afterEach(() => jest.useRealTimers());

describe("Panel de la visitadora", () => {
	// Se le pasaba el empleado completo a getPrimerNombre y el saludo salía
	// como "Hola, [object Object]".
	test("saluda por el primer nombre", async () => {
		await mostrar();
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hola, Ana · 2026-09-19");
		expect(document.body.textContent).not.toContain("[object Object]");
	});

	test("sin nombre capturado no rompe el saludo", async () => {
		mockEmpleado.current = { rol: "visitadora", id_empleado: 4 };
		await mostrar();
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hola, Usuario");
	});
});
