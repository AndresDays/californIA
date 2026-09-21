import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

jest.mock("./visitadora.css", () => ({}));
jest.mock("../../components/page-layout.jsx", () => ({
	__esModule: true,
	default: ({ children }) => <div>{children}</div>,
}));
jest.mock("../../components/ModalNotificacion", () => ({ __esModule: true, default: () => null }));
jest.mock("./componentes/modal-cita", () => ({ __esModule: true, default: () => <div>modal cita</div> }));
jest.mock("./componentes/modal-registro-visita", () => ({
	__esModule: true,
	default: () => <div>modal registro</div>,
}));

jest.mock("../../hooks/use-empleado-actual", () => ({
	useEmpleadoActual: () => ({
		empleadoData: { rol: "visitadora", id_empleado: 4 },
		formatRol: (rol) => rol,
		getPrimerNombre: (nombre) => nombre || "Ana",
	}),
}));

jest.mock("../../hooks/use-directorio-medicos", () => ({
	useDirectorioMedicos: () => ({ medicos: [] }),
}));

const mockCitas = { current: [] };
const mockCancelar = jest.fn().mockResolvedValue(undefined);
const mockEliminar = jest.fn().mockResolvedValue(undefined);
jest.mock("../../hooks/use-agenda-visitas", () => ({
	useAgendaVisitas: () => ({ data: mockCitas.current, isLoading: false, error: null }),
	useCancelarVisitaAgenda: () => ({ mutateAsync: mockCancelar, isPending: false }),
	useEliminarCitaAgenda: () => ({ mutateAsync: mockEliminar, isPending: false }),
	useReprogramarVisita: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

const mockExportar = jest.fn();
jest.mock("../../utils/exportar-informe-visitas", () => ({
	exportarAgenda: (...args) => mockExportar(...args),
}));

import Agenda from "./agenda";

const mostrar = async () => {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	await act(async () => {
		render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter>
					<Agenda />
				</MemoryRouter>
			</QueryClientProvider>,
		);
	});
};

beforeEach(() => {
	jest.useFakeTimers().setSystemTime(new Date("2026-09-19T18:00:00Z"));
	mockCancelar.mockClear();
	mockEliminar.mockClear();
	mockExportar.mockClear();
	mockCitas.current = [
		{
			id_agenda: "a1",
			id_doctor: 1,
			medico_nombre: "Ramón Pérez",
			zona: "Centro",
			fecha: "2026-09-18",
			tipo_visita: "seguimiento",
			estatus: "programada",
		},
		{
			id_agenda: "a3",
			id_doctor: null,
			medico_nombre: "Dr. Escrito a mano",
			zona: "Centro",
			fecha: "2026-09-18",
			tipo_visita: "seguimiento",
			estatus: "programada",
		},
		{
			id_agenda: "a2",
			id_doctor: 2,
			medico_nombre: "Ana Ruiz",
			zona: "Norte",
			fecha: "2026-09-18",
			tipo_visita: "seguimiento",
			estatus: "cancelada",
		},
	];
});
afterEach(() => jest.useRealTimers());

describe("Agenda de visitas", () => {
	// Tachada seguía ocupando lugar en la columna del día; ahora desaparece.
	test("una visita cancelada no se dibuja", async () => {
		await mostrar();
		expect(screen.getByText("Ramón Pérez")).toBeInTheDocument();
		expect(screen.queryByText("Ana Ruiz")).not.toBeInTheDocument();
	});

	test("la zona cuyas visitas se cancelaron no aparece en el filtro", async () => {
		await mostrar();
		const opciones = [...screen.getByLabelText("Zona").options].map((opcion) => opcion.textContent);
		expect(opciones).toContain("Centro");
		expect(opciones).not.toContain("Norte");
	});

	test("al cancelar se avisa a la base y la tarjeta se va al recargar", async () => {
		await mostrar();
		await act(async () => {
			// Hay una visita programada más en el día; se cancela la primera.
			fireEvent.click(screen.getAllByRole("button", { name: "Cancelar" })[0]);
		});
		expect(mockCancelar).toHaveBeenCalledWith("a1");
	});

	test("lo cancelado tampoco se exporta", async () => {
		await mostrar();
		fireEvent.click(screen.getByRole("button", { name: "Exportar Excel" }));
		const [citasExportadas] = mockExportar.mock.calls[0];
		expect(citasExportadas.map((cita) => cita.id_agenda)).toEqual(["a1", "a3"]);
	});

	test("el contador sólo cuenta lo que se ve", async () => {
		await mostrar();
		expect(screen.getByText("2 visitas")).toBeInTheDocument();
	});
});

describe("Visitas sin médico del catálogo", () => {
	// Llevaban a /visitadora/medico/undefined, una pantalla que sólo sabía decir
	// que el médico no estaba en el directorio.
	test("el nombre no es un enlace cuando la visita no está ligada", async () => {
		await mostrar();
		expect(screen.queryByRole("button", { name: "Dr. Escrito a mano" })).not.toBeInTheDocument();
		expect(screen.getByText(/Dr\. Escrito a mano/)).toBeInTheDocument();
	});

	test("se marca como sin expediente", async () => {
		await mostrar();
		expect(screen.getByText("sin expediente")).toBeInTheDocument();
	});

	test("la visita ligada sí lleva al expediente", async () => {
		await mostrar();
		expect(screen.getByRole("button", { name: "Ramón Pérez" })).toBeInTheDocument();
	});
});

describe("Visita ya registrada", () => {
	beforeEach(() => {
		mockCitas.current = [
			{
				id_agenda: "a9",
				id_doctor: 3,
				medico_nombre: "Luis Salas",
				zona: "Centro",
				fecha: "2026-09-18",
				tipo_visita: "seguimiento",
				estatus: "realizada",
				resultado: "Aceptó el convenio",
			},
		];
	});

	test("se enseña apagada y marcada como registrada", async () => {
		await mostrar();
		expect(screen.getByText("✓ Registrada")).toBeInTheDocument();
		expect(screen.getByText("Luis Salas").closest(".visitadora-cita")).toHaveClass("realizada");
	});

	// Ya no se puede volver a registrar ni mover, pero sí corregirla o quitarla
	// si quedó duplicada o en el médico equivocado.
	test("deja editarla y eliminarla, no registrarla otra vez", async () => {
		await mostrar();
		expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Eliminar" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Registrar" })).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Mover" })).not.toBeInTheDocument();
	});

	test("eliminar pide confirmación antes de borrar", async () => {
		await mostrar();
		fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
		expect(mockEliminar).not.toHaveBeenCalled();
		await act(async () => {
			fireEvent.click(screen.getAllByRole("button", { name: /Eliminar/ }).at(-1));
		});
		expect(mockEliminar).toHaveBeenCalledWith("a9");
	});
});

// El velo del modal era blanco sólido y borraba la pantalla de atrás.
describe("Velo de los modales", () => {
	const fs = require("fs");
	const path = require("path");
	const css = fs.readFileSync(path.join(process.cwd(), "src/pages/visitadora/visitadora.css"), "utf8");

	test("el fondo del modal es translúcido, no una pared blanca", () => {
		const bloque = css.slice(css.indexOf(".visitadora-modal-fondo"));
		expect(bloque).toMatch(/background:\s*var\(--velo-modal\)/);
		expect(bloque.slice(0, bloque.indexOf("}"))).not.toMatch(/--superficie-2/);
	});

	test("el token del velo lleva transparencia", () => {
		const tema = fs.readFileSync(path.join(process.cwd(), "src/styles/tema.css"), "utf8");
		expect(tema).toMatch(/--velo-modal:\s*rgba\([^)]*0?\.\d+\)/);
	});
});

describe("Arrastrar visitas entre días", () => {
	test("la visita programada tiene asa para arrastrarla", async () => {
		await mostrar();
		expect(
			screen.getByRole("button", { name: "Mover la visita de Ramón Pérez" }),
		).toBeInTheDocument();
	});

	// La registrada ya quedó con su resultado en el informe: moverla de día
	// falsearía cuándo se hizo.
	test("la visita ya registrada no trae asa", async () => {
		mockCitas.current = [
			{
				id_agenda: "a9",
				id_doctor: 3,
				medico_nombre: "Luis Salas",
				zona: "Centro",
				fecha: "2026-09-18",
				tipo_visita: "seguimiento",
				estatus: "realizada",
			},
		];
		await mostrar();
		expect(
			screen.queryByRole("button", { name: "Mover la visita de Luis Salas" }),
		).not.toBeInTheDocument();
	});

	test("el botón de teclear la fecha sigue disponible", async () => {
		await mostrar();
		expect(screen.getAllByRole("button", { name: "Mover" }).length).toBeGreaterThan(0);
	});
});

describe("Calendario por horas", () => {
	beforeEach(() => {
		mockCitas.current = [
			{
				id_agenda: "h1",
				id_doctor: 1,
				medico_nombre: "Ramón Pérez",
				zona: "Centro",
				fecha: "2026-09-18",
				hora: "16:00:00",
				tipo_visita: "seguimiento",
				estatus: "programada",
			},
			{
				id_agenda: "h2",
				id_doctor: 2,
				medico_nombre: "Ana Ruiz",
				zona: "Centro",
				fecha: "2026-09-18",
				hora: null,
				tipo_visita: "seguimiento",
				estatus: "programada",
			},
		];
	});

	test("dibuja la franja de cada hora de consulta", async () => {
		await mostrar();
		expect(screen.getByText("07:00")).toBeInTheDocument();
		expect(screen.getByText("20:00")).toBeInTheDocument();
	});

	// Antes todas las visitas del día caían revueltas en una lista.
	test("la visita se acomoda en la franja de su hora", async () => {
		await mostrar();
		// El nombre va junto a la hora dentro del mismo botón de la tarjeta.
		const fila = screen
			.getByRole("button", { name: "16:00 · Ramón Pérez" })
			.closest(".visitadora-calendario-fila");
		expect(fila).toHaveTextContent("16:00");
		expect(fila).not.toHaveTextContent("07:00");
	});

	test("la visita sin hora va a la franja 'Sin hora'", async () => {
		await mostrar();
		const fila = screen
			.getByRole("button", { name: "Ana Ruiz" })
			.closest(".visitadora-calendario-fila");
		expect(fila).toHaveClass("sinhora");
	});

	test("cada día de la semana tiene su columna", async () => {
		await mostrar();
		for (const dia of ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]) {
			expect(screen.getByText(dia)).toBeInTheDocument();
		}
	});
});
