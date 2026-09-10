import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

jest.mock("./modal-observacion-doctor.css", () => ({}), { virtual: true });

const insertadas = [];
const historial = [
	{
		id: 9,
		observacion: "Pidió que le llamen antes de mandar resultados",
		creado_por_nombre: "Vero Visitadora",
		created_at: "2026-09-01T18:00:00Z",
	},
];

jest.mock("../lib/supabase-client", () => ({
	supabase: {
		auth: { getUser: () => Promise.resolve({ data: { user: { id: "auth-1" } } }) },
		from: (tabla) => {
			if (tabla === "empleados") {
				return {
					select: () => ({
						eq: () => ({
							maybeSingle: () =>
								Promise.resolve({ data: { id_empleado: 3, nombre: "Ana Ruiz" }, error: null }),
						}),
					}),
				};
			}
			const consulta = {
				select: () => consulta,
				eq: () => consulta,
				order: () => consulta,
				limit: () => Promise.resolve({ data: historial, error: null }),
				insert: (filas) => {
					insertadas.push(filas[0]);
					return {
						select: () => ({
							single: () =>
								Promise.resolve({
									data: { id: 10, ...filas[0], created_at: "2026-09-10T18:00:00Z" },
									error: null,
								}),
						}),
					};
				},
			};
			return consulta;
		},
	},
}));

import ModalObservacionDoctor from "./modal-observacion-doctor";

const abrir = (props = {}) =>
	render(
		<ModalObservacionDoctor
			isOpen
			doctor={{ id_doctor: 12, nombre: "Luis Vega" }}
			empleado={{ nombre: "Ana Ruiz" }}
			onClose={jest.fn()}
			{...props}
		/>,
	);

describe("Observaciones del doctor", () => {
	beforeEach(() => {
		insertadas.length = 0;
	});

	test("muestra lo ya anotado del doctor", async () => {
		abrir();
		expect(
			await screen.findByText(/Pidió que le llamen antes de mandar resultados/),
		).toBeInTheDocument();
		expect(screen.getByText(/Vero Visitadora/)).toBeInTheDocument();
	});

	test("no guarda una observacion vacia", async () => {
		abrir();
		fireEvent.click(screen.getByRole("button", { name: /guardar observación/i }));

		expect(await screen.findByText(/Escribe la observación/)).toBeInTheDocument();
		expect(insertadas).toHaveLength(0);
	});

	// El aviso a visitadora y dirección lo dispara la base al insertar: aquí se
	// comprueba que la fila llega con el doctor y con quién la anotó.
	test("guarda la observacion con el doctor y su autor", async () => {
		const onGuardada = jest.fn();
		abrir({ onGuardada });

		fireEvent.change(screen.getByLabelText(/Nueva observación/i), {
			target: { value: "Cambió de consultorio, ahora está en Plaza Marina" },
		});
		fireEvent.click(screen.getByRole("button", { name: /guardar observación/i }));

		await waitFor(() => expect(insertadas).toHaveLength(1));
		expect(insertadas[0]).toEqual({
			id_doctor: 12,
			observacion: "Cambió de consultorio, ahora está en Plaza Marina",
			id_empleado: 3,
			creado_por_nombre: "Ana Ruiz",
		});
		expect(onGuardada).toHaveBeenCalled();
	});

	test("se avisa a quien le llega la observacion", () => {
		abrir();
		expect(screen.getByText(/visitadora/i)).toBeInTheDocument();
		expect(screen.getByText(/radiólogo director/i)).toBeInTheDocument();
	});

	test("cerrado no renderiza nada", () => {
		const { container } = render(
			<ModalObservacionDoctor isOpen={false} doctor={{ id_doctor: 1 }} onClose={jest.fn()} />,
		);
		expect(container).toBeEmptyDOMElement();
	});
});
