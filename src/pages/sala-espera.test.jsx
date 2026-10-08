import { act, render, screen } from "@testing-library/react";
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

let mockDatosTurnos = turnosPublicos;
let mockAlCambiar = null;
const mockBuilder = {
	select: jest.fn(() => mockBuilder),
	gte: jest.fn(() => mockBuilder),
	lte: jest.fn(() => mockBuilder),
	in: jest.fn(() => mockBuilder),
	order: jest.fn(() => mockBuilder),
	limit: jest.fn(() => Promise.resolve({ data: mockDatosTurnos, error: null })),
};

jest.mock("../lib/supabase-client", () => ({
	supabase: {
		from: jest.fn(() => mockBuilder),
		channel: jest.fn(() => {
			const canal = {
				on: jest.fn((_evento, _filtro, alCambiar) => {
					mockAlCambiar = alCambiar;
					return canal;
				}),
				subscribe: jest.fn(),
			};
			return canal;
		}),
		removeChannel: jest.fn(),
	},
}));

const mockTonos = [];
jest.mock("../utils/timbre-turno", () => ({
	activarSonido: jest.fn(() => Promise.resolve(true)),
	sonidoBloqueado: jest.fn(() => false),
	tocarTimbreTurno: jest.fn(() => mockTonos.push(Date.now())),
}));

describe("SalaEspera", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockDatosTurnos = turnosPublicos;
		mockTonos.length = 0;
	});

	// Cada turno que aparece en pantalla suena; el que ya estaba al abrir no.
	it("suena el timbre cuando aparece un turno nuevo en pantalla", async () => {
		render(<SalaEspera />);
		expect(await screen.findByText("A-010")).toBeInTheDocument();
		expect(mockTonos).toHaveLength(0);

		mockDatosTurnos = [
			{
				...turnosPublicos[0],
				id_turno: 3,
				codigo_turno: "A-011",
				llamado_en: "2026-05-26T18:30:00.000Z",
			},
			...turnosPublicos,
		];
		await act(async () => {
			mockAlCambiar();
		});

		expect(await screen.findByText("A-011")).toBeInTheDocument();
		expect(mockTonos).toHaveLength(1);
	});

	it("muestra el llamado activo y conserva atendidos en ultimos llamados", async () => {
		render(<SalaEspera />);

		expect(await screen.findByText("A-010")).toBeInTheDocument();
		expect(screen.getByText("Maria Fernanda Lopez")).toBeInTheDocument();
		expect(screen.getByText(/Pase a Ultrasonido 1/i)).toBeInTheDocument();
		expect(screen.getByText("A-009")).toBeInTheDocument();
		expect(screen.getByText("Laboratorio")).toBeInTheDocument();
	});
});
