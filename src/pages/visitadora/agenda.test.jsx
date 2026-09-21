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
jest.mock("./componentes/modal-cita", () => ({
	__esModule: true,
	default: ({ onGuardado }) => (
		<button type="button" onClick={() => onGuardado("Visita actualizada.", mockGuardada.current)}>
			simular guardado
		</button>
	),
}));
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
const mockError = { current: null };
const mockCancelar = jest.fn().mockResolvedValue(undefined);
const mockEliminar = jest.fn().mockResolvedValue(undefined);
const mockGuardada = { current: { fecha: "2026-09-25", zona: "Norte" } };
jest.mock("../../hooks/use-agenda-visitas", () => ({
	useAgendaVisitas: () => ({ data: mockCitas.current, isLoading: false, error: mockError.current }),
	useCancelarVisitaAgenda: () => ({ mutateAsync: mockCancelar, isPending: false }),
	useEliminarCitaAgenda: () => ({ mutateAsync: mockEliminar, isPending: false }),
	useReprogramarVisita: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

const mockExportar = jest.fn();
jest.mock("../../utils/exportar-agenda-excel", () => ({
	exportarAgendaExcel: (...args) => mockExportar(...args),
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
	mockError.current = null;
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
			hora: "10:00:00",
			tipo_visita: "seguimiento",
			estatus: "programada",
		},
		{
			id_agenda: "a3",
			id_doctor: null,
			medico_nombre: "Dr. Escrito a mano",
			zona: "Centro",
			fecha: "2026-09-18",
			hora: "10:00:00",
			tipo_visita: "seguimiento",
			estatus: "programada",
		},
		{
			id_agenda: "a2",
			id_doctor: 2,
			medico_nombre: "Ana Ruiz",
			zona: "Norte",
			fecha: "2026-09-18",
			hora: "10:00:00",
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
		expect(screen.getByRole("button", { name: "10:00 · Ramón Pérez" })).toBeInTheDocument();
		expect(screen.queryByText(/Ana Ruiz/)).not.toBeInTheDocument();
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
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Exportar Excel" }));
		});
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
		expect(screen.getByRole("button", { name: "10:00 · Ramón Pérez" })).toBeInTheDocument();
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
				hora: "10:00:00",
				tipo_visita: "seguimiento",
				estatus: "realizada",
				resultado: "Aceptó el convenio",
			},
		];
	});

	test("se enseña apagada y marcada como registrada", async () => {
		await mostrar();
		expect(screen.getByText("✓ Registrada")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "10:00 · Luis Salas" }).closest(".visitadora-cita"),
		).toHaveClass("realizada");
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
		expect(screen.getByText("10:00")).toBeInTheDocument();
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
		fireEvent.click(screen.getByRole("button", { name: /Sin hora/ }));
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

describe("Visita de tarde", () => {
	// Las seis de la tarde caen dentro del horario de la rejilla y deben verse
	// en su franja, no desaparecer.
	test("una visita de hoy lunes a las 18:00 se ve", async () => {
		jest.setSystemTime(new Date("2026-09-21T18:30:00Z"));
		mockCitas.current = [
			{
				id_agenda: "r1",
				id_doctor: 1,
				medico_nombre: "Ramón Pérez",
				zona: "Centro",
				fecha: "2026-09-21",
				hora: "18:00:00",
				tipo_visita: "seguimiento",
				estatus: "programada",
			},
		];
		await mostrar();
		expect(screen.getByRole("button", { name: "18:00 · Ramón Pérez" })).toBeInTheDocument();
	});
});

describe("La agenda sigue a la visita guardada", () => {
	const abrirEdicion = async () => {
		await mostrar();
		fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[0]);
	};

	// Cambiarle el día la mandaba a otra semana y parecía que se hubiera
	// borrado: la agenda se queda viendo donde quedó.
	test("al guardarla en otro día, la agenda se mueve a ese día", async () => {
		mockGuardada.current = { fecha: "2026-09-25", zona: "Centro" };
		await abrirEdicion();
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "simular guardado" }));
		});
		expect(screen.getByText("Viernes")).toBeInTheDocument();
		expect(document.body.textContent).toContain("25");
	});

	test("si el filtro de zona ya no la deja pasar, se limpia", async () => {
		mockGuardada.current = { fecha: "2026-09-18", zona: "Poniente" };
		await mostrar();
		fireEvent.change(screen.getByLabelText("Zona"), { target: { value: "Centro" } });
		expect(screen.getByLabelText("Zona")).toHaveValue("Centro");
		fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[0]);
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "simular guardado" }));
		});
		expect(screen.getByLabelText("Zona")).toHaveValue("");
	});
});

describe("Cuando la base todavía no tiene las tablas", () => {
	// Sin esto la agenda salía vacía y parecía que las visitas guardadas se
	// habían perdido.
	test("lo dice en lugar de enseñar una agenda vacía", async () => {
		mockError.current = { message: 'relation "public.agenda_visitas" does not exist' };
		await mostrar();
		expect(screen.getByText(/No se pudo cargar la agenda/)).toBeInTheDocument();
		expect(screen.getByText(/migraciones pendientes/)).toBeInTheDocument();
	});

	test("otro error se enseña tal cual, sin adivinar la causa", async () => {
		mockError.current = { message: "Failed to fetch" };
		await mostrar();
		expect(screen.getByText(/Failed to fetch/)).toBeInTheDocument();
		expect(screen.queryByText(/migraciones pendientes/)).not.toBeInTheDocument();
	});
});

describe("Franja de visitas sin hora", () => {
	beforeEach(() => {
		mockCitas.current = [
			{ id_agenda: "s1", id_doctor: 1, medico_nombre: "Ramón Pérez", fecha: "2026-09-18", hora: null, estatus: "programada", tipo_visita: "seguimiento" },
			{ id_agenda: "s2", id_doctor: 2, medico_nombre: "Ana Ruiz", fecha: "2026-09-18", hora: null, estatus: "programada", tipo_visita: "seguimiento" },
		];
	});

	// Abierta de arranque, con media ruta sin horario, empujaba las horas fuera
	// de la pantalla.
	test("empieza plegada y dice cuántas hay", async () => {
		await mostrar();
		expect(screen.getByRole("button", { name: /Sin hora \(2\)/ })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Ramón Pérez" })).not.toBeInTheDocument();
	});

	test("al abrirla se ven las visitas", async () => {
		await mostrar();
		fireEvent.click(screen.getByRole("button", { name: /Sin hora/ }));
		expect(screen.getByRole("button", { name: "Ramón Pérez" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Ana Ruiz" })).toBeInTheDocument();
	});

	test("las horas se siguen viendo con la franja plegada", async () => {
		await mostrar();
		expect(screen.getByText("10:00")).toBeInTheDocument();
		expect(screen.getByText("20:00")).toBeInTheDocument();
	});
});

describe("Buscar visitas repetidas", () => {
	const repetidas = [
		{ id_agenda: "r1", id_doctor: 1, medico_nombre: "Ramón Pérez", fecha: "2026-09-18", hora: "18:00:00", estatus: "programada", tipo_visita: "seguimiento", created_at: "2026-09-17T10:00:00Z" },
		{ id_agenda: "r2", id_doctor: 1, medico_nombre: "Ramón Pérez", fecha: "2026-09-18", hora: null, estatus: "programada", tipo_visita: "seguimiento", created_at: "2026-09-17T11:00:00Z" },
	];

	test("avisa cuando no hay ninguna", async () => {
		await mostrar();
		fireEvent.click(screen.getByRole("button", { name: "Buscar repetidas" }));
		expect(mockEliminar).not.toHaveBeenCalled();
	});

	// Borrar es definitivo, así que primero se enseña qué se va y qué se queda.
	test("enseña el detalle antes de borrar nada", async () => {
		mockCitas.current = repetidas;
		await mostrar();
		fireEvent.click(screen.getByRole("button", { name: "Buscar repetidas" }));
		expect(screen.getByText("Visitas repetidas")).toBeInTheDocument();
		expect(mockEliminar).not.toHaveBeenCalled();
	});

	test("al confirmar borra la sobrante y conserva la que tiene hora", async () => {
		mockCitas.current = repetidas;
		await mostrar();
		fireEvent.click(screen.getByRole("button", { name: "Buscar repetidas" }));
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Eliminar repetidas" }));
		});
		expect(mockEliminar).toHaveBeenCalledTimes(1);
		expect(mockEliminar).toHaveBeenCalledWith("r2");
	});
});

// El botón "Hoy" sólo volvía a la fecha actual, que es donde la agenda abre:
// ocupaba lugar en una barra que en el celular ya va apretada.
test("la barra no trae el botón de Hoy", async () => {
	await mostrar();
	expect(screen.queryByRole("button", { name: "Hoy" })).not.toBeInTheDocument();
	for (const vista of ["Día", "Semana", "Mes"]) {
		expect(screen.getByRole("button", { name: vista })).toBeInTheDocument();
	}
});
