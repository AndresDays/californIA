import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Turnos from "./turnos";

const hoy = new Date();
const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;

let turnosData = [];
let insertPayloads = [];
let citasData = [];

jest.mock("../../components/page-layout", () => ({
	__esModule: true,
	default: ({ children }) => <div>{children}</div>,
}));

jest.mock("../../context/auth-context", () => ({
	useAuth: () => ({
		user: { id: "user-1", email: "recepcion@test.com" },
		signOut: jest.fn(),
	}),
}));

const createBuilder = (table) => {
	const builder = {
		select: jest.fn(() => builder),
		eq: jest.fn(() => builder),
		gte: jest.fn(() => builder),
		lte: jest.fn(() => builder),
		not: jest.fn(() => builder),
		ilike: jest.fn(() => builder),
		or: jest.fn(() => builder),
		limit: jest.fn(() => builder),
		maybeSingle: jest.fn(() =>
			Promise.resolve({ data: { nombre: "Recepcion", rol: "recepcionista" }, error: null }),
		),
		insert: jest.fn((payload) => {
			insertPayloads.push(payload);
			turnosData = [
				...turnosData,
				{
					id_turno: 99,
					estado: "esperando",
					created_at: payload.fecha_programada,
					updated_at: payload.fecha_programada,
					...payload,
				},
			];
			return Promise.resolve({ error: null });
		}),
		update: jest.fn((payload) => {
			builder.updatePayload = payload;
			return builder;
		}),
		order: jest.fn(() => {
			if (table === "turnos_pacientes") {
				return Promise.resolve({ data: turnosData, error: null });
			}
			if (table === "citas") {
				return Promise.resolve({ data: citasData, error: null });
			}
			return Promise.resolve({ data: [], error: null });
		}),
	};

	builder.eq.mockImplementation(() => {
		if (table === "turnos_pacientes" && builder.updatePayload) {
			turnosData = turnosData.map((turno) =>
				turno.id_turno === 99 ? { ...turno, ...builder.updatePayload } : turno,
			);
			return Promise.resolve({ error: null });
		}
		return builder;
	});

	return builder;
};

jest.mock("../../lib/supabase-client", () => ({
	supabase: {
		from: jest.fn((table) => createBuilder(table)),
		channel: jest.fn(() => ({
			on: jest.fn().mockReturnThis(),
			subscribe: jest.fn(),
		})),
		removeChannel: jest.fn(),
	},
}));

describe("Turnos", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		insertPayloads = [];
		turnosData = [];
		citasData = [
			{
				id_cita: 10,
				fecha_estudio: `${fechaHoy}T18:00:00`,
				tipo_estudio: "QUIMICA SANGUINEA DE 3 ELEMENTOS",
				nombre_paciente: "Juan Andres Diaz Rodriguez",
				pacientes: { id_paciente: 7, nombre: "Juan Andres Diaz Rodriguez" },
			},
		];
	});

	const renderTurnos = () => {
		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		return render(<QueryClientProvider client={queryClient}><Turnos /></QueryClientProvider>);
	};

	it("crea un turno desde una cita con destino seleccionable", async () => {
		renderTurnos();

		expect(await screen.findByText("Juan Andres Diaz Rodriguez")).toBeInTheDocument();

		const destinoCita = screen.getByLabelText(/Destino para Juan Andres/i);
		fireEvent.change(destinoCita, { target: { value: "Tomografía 1" } });
		fireEvent.click(screen.getByRole("button", { name: "Agregar" }));

		await waitFor(() => {
			expect(insertPayloads).toHaveLength(1);
		});

		expect(insertPayloads[0]).toEqual(
			expect.objectContaining({
				id_paciente: 7,
				id_cita: 10,
				nombre_paciente: "Juan Andres Diaz Rodriguez",
				area: "Tomografía 1",
				destino: "Tomografía 1",
			}),
		);
		expect(insertPayloads[0].fecha_programada).not.toBe(`${fechaHoy}T18:00:00`);
		expect(await screen.findByText("A-001")).toBeInTheDocument();
		expect(screen.getByText(/Tomografía 1 - 06:00 p\.m\./)).toBeInTheDocument();
	});

	it("llama un turno en espera y actualiza su estado", async () => {
		turnosData = [
			{
				id_turno: 99,
				codigo_turno: "A-001",
				nombre_paciente: "Maria Lopez",
				area: "Laboratorio",
				destino: "Laboratorio",
				estado: "esperando",
				fecha_programada: new Date().toISOString(),
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			},
		];
		citasData = [];

		renderTurnos();

		expect(await screen.findByText("Maria L.")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Llamar" }));

		await waitFor(() => {
			expect(screen.getByText(/Sin llamados activos|Maria L\./)).toBeInTheDocument();
		});
		expect(turnosData[0].estado).toBe("llamado");
		expect(turnosData[0].llamado_en).toBeTruthy();
	});
});
