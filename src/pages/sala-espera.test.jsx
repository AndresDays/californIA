import { render, screen } from "@testing-library/react";
import SalaEspera from "./sala-espera";

const ahora = new Date().toISOString();

const turnosPublicos = [
	{
		id_turno: 1,
		codigo_turno: "A-010",
		nombre_paciente: "Maria Fernanda Lopez",
		destino: "Ultrasonido 1",
		estado: "llamado",
		fecha_programada: ahora,
		llamado_en: "2026-05-26T18:20:00.000Z",
		updated_at: "2026-05-26T18:20:00.000Z",
	},
	{
		id_turno: 2,
		codigo_turno: "A-009",
		nombre_paciente: "Juan Andres Diaz",
		destino: "Laboratorio",
		estado: "atendido",
		fecha_programada: ahora,
		llamado_en: "2026-05-26T18:00:00.000Z",
		updated_at: "2026-05-26T18:10:00.000Z",
	},
];

const mockBuilder = {
	select: jest.fn(() => mockBuilder),
	gte: jest.fn(() => mockBuilder),
	lte: jest.fn(() => mockBuilder),
	in: jest.fn(() => mockBuilder),
	order: jest.fn(() => mockBuilder),
	limit: jest.fn(() => Promise.resolve({ data: turnosPublicos, error: null })),
};

jest.mock("../lib/supabase-client", () => ({
	supabase: {
		from: jest.fn(() => mockBuilder),
		channel: jest.fn(() => ({
			on: jest.fn().mockReturnThis(),
			subscribe: jest.fn(),
		})),
		removeChannel: jest.fn(),
	},
}));

describe("SalaEspera", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("muestra el llamado activo y conserva atendidos en ultimos llamados", async () => {
		render(<SalaEspera />);

		expect(await screen.findByText("A-010")).toBeInTheDocument();
		expect(screen.getByText("Maria F.")).toBeInTheDocument();
		expect(screen.getByText(/Pase a Ultrasonido 1/i)).toBeInTheDocument();
		expect(screen.getByText("A-009")).toBeInTheDocument();
		expect(screen.getByText("Laboratorio")).toBeInTheDocument();
	});
});
