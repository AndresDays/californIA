// Guardar deshabilita todo el formulario. Si la petición nunca contesta, el
// modal se quedaba muerto -sin poder escribir ni cerrar el campo- hasta
// recargar la página; ese es el estado que esta prueba no deja volver.
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";

jest.mock("./nueva-cita-modal.css", () => ({}), { virtual: true });
jest.mock("../assets/calendarioIcono.png", () => "calendario.png", { virtual: true });
jest.mock("@tanstack/react-query", () => ({
	useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock("../context/auth-context", () => ({
	useAuth: () => ({ empleadoData: { id_sucursal: 1 } }),
}));

jest.mock("../lib/supabase-client", () => {
	const nuncaContesta = () => new Promise(() => {});
	const consulta = {
		select: () => consulta,
		eq: () => consulta,
		ilike: () => consulta,
		order: () => Promise.resolve({ data: [], error: null }),
		range: () => Promise.resolve({ data: [], error: null }),
		maybeSingle: () => Promise.resolve({ data: null, error: null }),
		single: nuncaContesta,
		insert: () => consulta,
		then: (resolver) => Promise.resolve({ data: [], error: null }).then(resolver),
	};
	return { supabase: { from: () => consulta } };
});

import NuevaCitaModal from "./nueva-cita-modal";

test("una petición que nunca contesta no deja el formulario muerto", async () => {
	jest.useFakeTimers();
	jest.spyOn(console, "error").mockImplementation(() => {});
	render(<NuevaCitaModal isOpen onClose={jest.fn()} fechaInicial="2026-09-10" horaInicial="10:00" />);

	fireEvent.click(screen.getByRole("button", { name: "Un renglón" }));
	const campo = screen.getByLabelText("Paciente y estudio");
	fireEvent.change(campo, { target: { value: "Laura Mendez, biometria" } });

	await act(async () => {
		fireEvent.click(screen.getByRole("button", { name: /Crear Cita/i }));
	});
	expect(screen.getByLabelText("Paciente y estudio")).toBeDisabled();

	await act(async () => {
		jest.advanceTimersByTime(20000);
	});

	expect(screen.getByLabelText("Paciente y estudio")).not.toBeDisabled();
	expect(screen.getByText(/Error al crear la cita/i)).toBeInTheDocument();
	jest.useRealTimers();
});
