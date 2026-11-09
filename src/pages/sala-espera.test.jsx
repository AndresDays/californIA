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
let mockPromociones = [];
const mockAlCambiarPorTabla = {};
const mockAlCambiar = () => mockAlCambiarPorTabla.turnos_pacientes();
const mockBuilder = {
	select: jest.fn(() => mockBuilder),
	gte: jest.fn(() => mockBuilder),
	lte: jest.fn(() => mockBuilder),
	in: jest.fn(() => mockBuilder),
	order: jest.fn(() => mockBuilder),
	limit: jest.fn(() => Promise.resolve({ data: mockDatosTurnos, error: null })),
};
const mockBuilderPromociones = {
	select: jest.fn(() => mockBuilderPromociones),
	eq: jest.fn(() => mockBuilderPromociones),
	order: jest.fn(() => Promise.resolve({ data: mockPromociones, error: null })),
};

jest.mock("../lib/supabase-client", () => ({
	supabase: {
		from: jest.fn((tabla) => (tabla === "promociones_sala" ? mockBuilderPromociones : mockBuilder)),
		storage: {
			from: () => ({
				getPublicUrl: (ruta) => ({ data: { publicUrl: `https://cdn.test/${ruta}` } }),
			}),
		},
		channel: jest.fn(() => {
			const canal = {
				on: jest.fn((_evento, filtro, alCambiar) => {
					mockAlCambiarPorTabla[filtro.table] = alCambiar;
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
		mockPromociones = [];
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

	describe("promociones", () => {
		const promociones = [
			{ id_promocion: 1, titulo: "Mes del hombre", storage_path: "hombre.png", orden: 1, activa: true },
			{ id_promocion: 2, titulo: "Noviembre rosa", storage_path: "rosa.png", orden: 2, activa: true },
			{ id_promocion: 3, titulo: "Vencida", storage_path: "vieja.png", orden: 3, activa: true, vigente_hasta: "2020-01-31" },
		];
		const promocionActiva = () => document.querySelector(".sala-promocion.activa")?.getAttribute("alt");

		beforeEach(() => {
			jest.useFakeTimers();
			mockPromociones = promociones;
		});
		afterEach(() => jest.useRealTimers());

		it("sin llamados recientes pasa las promociones vigentes en ciclo", async () => {
			render(<SalaEspera />);
			expect(await screen.findByRole("main", { name: "Promociones" })).toBeInTheDocument();
			// El turno que ya estaba es de hace mucho: no tapa las promociones.
			expect(screen.queryByText("A-010")).not.toBeInTheDocument();
			expect(screen.queryByAltText("Vencida")).not.toBeInTheDocument();
			expect(promocionActiva()).toBe("Mes del hombre");

			await act(async () => {
				jest.advanceTimersByTime(10000);
			});
			expect(promocionActiva()).toBe("Noviembre rosa");

			await act(async () => {
				jest.advanceTimersByTime(10000);
			});
			expect(promocionActiva()).toBe("Mes del hombre");
		});

		it("un turno nuevo sale en pantalla y luego regresan las promociones", async () => {
			render(<SalaEspera />);
			expect(await screen.findByRole("main", { name: "Promociones" })).toBeInTheDocument();

			mockDatosTurnos = [
				{ ...turnosPublicos[0], id_turno: 3, codigo_turno: "A-011", llamado_en: new Date().toISOString() },
				...turnosPublicos,
			];
			await act(async () => {
				mockAlCambiar();
			});
			expect(await screen.findByText("A-011")).toBeInTheDocument();
			expect(screen.queryByRole("main", { name: "Promociones" })).not.toBeInTheDocument();
			expect(mockTonos).toHaveLength(1);

			await act(async () => {
				jest.advanceTimersByTime(46000);
			});
			expect(screen.getByRole("main", { name: "Promociones" })).toBeInTheDocument();
			expect(screen.queryByText("A-011")).not.toBeInTheDocument();
		});

		it("sin promociones vigentes se queda la pantalla de turnos", async () => {
			mockPromociones = [promociones[2]];
			render(<SalaEspera />);
			expect(await screen.findByText("A-010")).toBeInTheDocument();
			expect(screen.queryByRole("main", { name: "Promociones" })).not.toBeInTheDocument();
		});
	});
});
