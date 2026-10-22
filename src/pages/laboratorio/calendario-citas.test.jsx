import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import CalendarioCitas from "./calendario-citas";
import { useCalendarioCitas } from "../../hooks/use-citas";

jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }));
jest.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: jest.fn() }) }));

jest.mock("../../components/page-layout.jsx", () => ({ children }) => (
	<div data-testid="page-layout">{children}</div>
));

jest.mock("../../context/auth-context", () => ({
	useAuth: () => ({
		user: { id: "user-1", email: "recepcion@test.com" },
		empleadoData: { nombre: "Recepcion Uno", rol: "recepcionista", id_sucursal: 2 },
		signOut: jest.fn(),
	}),
}));

const mockUpdateCita = jest.fn();
const mockDeleteCita = jest.fn();
jest.mock("../../lib/supabase-client", () => ({
	supabase: {
		from: () => ({
			update: (payload) => ({
				eq: (campo, valor) => {
					mockUpdateCita(payload, valor);
					return Promise.resolve({ error: null });
				},
			}),
			delete: () => ({
				eq: (campo, valor) => {
					mockDeleteCita(valor);
					return Promise.resolve({ error: null });
				},
			}),
		}),
	},
}));

jest.mock("../../hooks/use-sucursales", () => ({ useSucursales: () => ({ data: [] }) }));

jest.mock("../../hooks/use-citas", () => ({
	useCalendarioCitas: jest.fn(),
}));

jest.mock("../../components/nueva-cita-modal", () => (props) =>
	props.isOpen ? (
		<div data-testid="nueva-cita-modal">
			{`${props.fechaInicial} ${props.horaInicial} ${props.tipoEstudioInicial ?? ""}`}
		</div>
	) : null,
);

const citas = [
	{
		id_cita: 1,
		fecha_estudio: "2026-06-23T09:15:00",
		tipo_estudio: "TAC abdomen",
		nombre_paciente: "Lucia Root",
		estado: "pendiente",
	},
	{
		id_cita: 2,
		fecha_estudio: "2026-06-23T10:00:00",
		tipo_estudio: "USG mamario",
		nombre_paciente: "Imelda Orc",
		estado: "recepcion",
	},
	{
		id_cita: 3,
		fecha_estudio: "2026-06-23T11:30:00",
		tipo_estudio: "Resonancia rodilla",
		pacientes: { nombre: "Jacobo Andres" },
		estado: "pendiente",
	},
];

beforeEach(() => {
	jest.useFakeTimers();
	jest.setSystemTime(new Date("2026-07-15T09:00:00-06:00"));
	useCalendarioCitas.mockReturnValue({
		data: citas,
		isLoading: false,
		error: null,
	});
});

afterEach(() => {
	jest.useRealTimers();
});

test("muestra agenda diaria por horas y columnas de tipo de estudio", () => {
	render(<CalendarioCitas />);

	expect(screen.getByRole("heading", { name: /calendario de citas/i })).toBeInTheDocument();
	expect(screen.getByText("15 Julio, 2026")).toBeInTheDocument();
	expect(useCalendarioCitas).toHaveBeenCalledWith("2026-07-15", "2");
	expect(screen.getByRole("rowheader", { name: "7:00 AM" })).toBeInTheDocument();
	expect(screen.getByRole("rowheader", { name: "7:30 AM" })).toBeInTheDocument();
	expect(screen.getByRole("rowheader", { name: "7:30 PM" })).toBeInTheDocument();
	expect(screen.queryByRole("rowheader", { name: "8:00 PM" })).not.toBeInTheDocument();

	expect(screen.getByRole("columnheader", { name: /ultrasonido/i })).toBeInTheDocument();
	expect(screen.getByRole("columnheader", { name: /tac/i })).toBeInTheDocument();
	expect(screen.getByRole("columnheader", { name: /resonancia/i })).toBeInTheDocument();

	// Laboratorio y Rayos X no se agendan por horario: no llevan columna.
	expect(screen.queryByRole("columnheader", { name: /lab/i })).not.toBeInTheDocument();
	expect(screen.queryByRole("columnheader", { name: /rayos x/i })).not.toBeInTheDocument();

	expect(screen.getByText(/TAC abdomen/i)).toBeInTheDocument();
	expect(screen.getByText(/Lucia Root/i)).toBeInTheDocument();
	expect(screen.getByText(/USG mamario/i)).toBeInTheDocument();
	expect(screen.getByText(/Jacobo Andres/i)).toBeInTheDocument();
});

test("cambia la fecha consultada con los controles de dia", () => {
	render(<CalendarioCitas />);

	fireEvent.click(screen.getByRole("button", { name: /dia siguiente/i }));

	expect(useCalendarioCitas).toHaveBeenLastCalledWith("2026-07-16", "2");
});

test("el boton hoy regresa al dia local actual", () => {
	render(<CalendarioCitas />);

	fireEvent.click(screen.getByRole("button", { name: /dia siguiente/i }));
	fireEvent.click(screen.getByRole("button", { name: /^hoy$/i }));

	expect(useCalendarioCitas).toHaveBeenLastCalledWith("2026-07-15", "2");
});

// El perfil del empleado vive en la sesión: cuando el hook traía sólo nombre y
// rol, la agenda avisaba que no había sucursal asignada aunque sí la tuviera.
test("la recepcionista con sucursal asignada no ve el aviso de sucursal", () => {
	render(<CalendarioCitas />);

	expect(
		screen.queryByText("El usuario no tiene una sucursal asignada."),
	).not.toBeInTheDocument();
});

test("el buscador deja en la agenda solo las citas del paciente buscado", () => {
	const { container } = render(<CalendarioCitas />);

	fireEvent.change(screen.getByRole("searchbox", { name: /buscar cita por paciente/i }), {
		target: { value: "lucia" },
	});

	// El nombre también sale en el aviso de la búsqueda, así que se mira la rejilla.
	const tarjetas = [...container.querySelectorAll(".cal-card")];
	expect(tarjetas).toHaveLength(1);
	expect(tarjetas[0]).toHaveTextContent(/Lucia Root/i);
	expect(screen.queryByText(/Jacobo Andres/i)).not.toBeInTheDocument();
	expect(screen.queryByText(/USG mamario/i)).not.toBeInTheDocument();
});

// Sin acentos y con el nombre a media palabra: se busca como lo teclea la caja.
test("el buscador ignora acentos y avisa cuando no hay coincidencias", () => {
	render(<CalendarioCitas />);
	const buscador = screen.getByRole("searchbox", { name: /buscar cita por paciente/i });

	fireEvent.change(buscador, { target: { value: "andres" } });
	expect(screen.getByRole("status")).toHaveTextContent(/Jacobo Andres/i);

	fireEvent.change(buscador, { target: { value: "zzz" } });
	expect(
		screen.getByText("No hay citas de ese paciente en el dia seleccionado."),
	).toBeInTheDocument();
});

// Filtrar la agenda no basta: entre 26 horarios y seis columnas la cita sigue
// costando de encontrar, así que se dice a qué hora quedó.
test("el buscador dice a que hora es la cita encontrada", () => {
	render(<CalendarioCitas />);

	fireEvent.change(screen.getByRole("searchbox", { name: /buscar cita por paciente/i }), {
		target: { value: "lucia" },
	});

	const aviso = screen.getByRole("status");
	expect(aviso).toHaveTextContent(/Cita encontrada/i);
	expect(aviso).toHaveTextContent(/Lucia Root/i);
	expect(aviso).toHaveTextContent(/09:15/);
	expect(aviso).toHaveTextContent(/TAC/i);
});

test("resalta la tarjeta de la cita encontrada", () => {
	const { container } = render(<CalendarioCitas />);

	expect(container.querySelectorAll(".cal-card.encontrada")).toHaveLength(0);

	fireEvent.change(screen.getByRole("searchbox", { name: /buscar cita por paciente/i }), {
		target: { value: "lucia" },
	});

	const resaltadas = container.querySelectorAll(".cal-card.encontrada");
	expect(resaltadas).toHaveLength(1);
	expect(resaltadas[0]).toHaveTextContent(/Lucia Root/i);
});

test("sin busqueda no se anuncia ninguna cita", () => {
	render(<CalendarioCitas />);

	expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

// El hueco donde se hizo clic ya dice de que es la cita: el modal no tiene por
// que volver a preguntar el tipo de estudio.
test("el hueco vacio abre la cita con el tipo de estudio de su columna", () => {
	render(<CalendarioCitas />);

	fireEvent.click(
		screen.getByRole("button", { name: /Crear cita de Resonancia .* a las 10:00/i }),
	);

	expect(screen.getByTestId("nueva-cita-modal")).toHaveTextContent("10:00 Resonancia");
});

// La columna ya dice de qué tipo es la cita: en la tarjeta va el estudio
// concreto que el paciente viene a hacerse.
describe("la tarjeta dice el estudio, no el tipo", () => {
	const citaDeLab = {
		id_cita: 9,
		fecha_estudio: "2026-06-23T08:00:00",
		tipo_estudio: "BIOMETRIA HEMATICA",
		tipos_estudio: { nombre: "Laboratorio" },
		nombre_paciente: "Ana Ruiz",
		estado: "pendiente",
	};

	test("muestra el estudio capturado en lugar del tipo", () => {
		useCalendarioCitas.mockReturnValue({ data: [citaDeLab], isLoading: false, error: null });
		const { container } = render(<CalendarioCitas />);

		const tarjeta = container.querySelector(".cal-card");
		expect(tarjeta).toHaveTextContent("BIOMETRIA HEMATICA");
		expect(tarjeta.querySelector("strong").textContent).not.toBe("Laboratorio");
	});

	// El color de la tarjeta sale de la columna a la que pertenece. Laboratorio
	// ya no tiene columna, así que su cita no se pierde: cae en "Otros".
	test("la tarjeta lleva la clase de su columna", () => {
		useCalendarioCitas.mockReturnValue({ data: [citaDeLab], isLoading: false, error: null });
		const { container } = render(<CalendarioCitas />);

		expect(container.querySelector(".cal-card.tipo-otros")).toBeInTheDocument();
		expect(container.querySelector(".cal-card.tipo-lab")).not.toBeInTheDocument();
	});

	// El tipo del catálogo manda sobre el texto libre: una tomografía agendada
	// como "TAC DE CRANEO SIMPLE" va a su columna aunque el texto no se parezca
	// al alias de la columna.
	test("la columna la decide el tipo de estudio de la cita", () => {
		useCalendarioCitas.mockReturnValue({
			data: [
				{
					...citaDeLab,
					tipo_estudio: "CRANEO SIMPLE",
					tipos_estudio: { nombre: "TOMOGRAFIA" },
				},
			],
			isLoading: false,
			error: null,
		});
		const { container } = render(<CalendarioCitas />);

		const tarjeta = container.querySelector(".cal-card.tipo-tac");
		expect(tarjeta).toBeInTheDocument();
		expect(tarjeta).toHaveTextContent("CRANEO SIMPLE");
	});

	// Una cita agendada por teléfono no trae tipo del catálogo: ahí el texto
	// escrito es lo único que dice a qué columna va.
	test("sin tipo del catálogo, el estudio escrito decide la columna", () => {
		useCalendarioCitas.mockReturnValue({
			data: [{ ...citaDeLab, tipo_estudio: "USG renal", tipos_estudio: null }],
			isLoading: false,
			error: null,
		});
		const { container } = render(<CalendarioCitas />);

		expect(container.querySelector(".cal-card.tipo-ultrasonido")).toBeInTheDocument();
	});
});

describe("línea de la hora actual", () => {
	test("cruza la fila de la media hora en curso, a su altura", () => {
		jest.setSystemTime(new Date(2026, 6, 15, 10, 45));
		render(<CalendarioCitas />);

		const linea = screen.getByTestId("cal-ahora");
		expect(linea.closest("[role='rowheader']")).toHaveTextContent("10:30 AM");
		expect(linea.style.top).toBe("50%");
		// Una línea por columna de estudio más la de la hora.
		expect(document.querySelectorAll(".cal-ahora-linea")).toHaveLength(7);
	});

	test("sólo aparece al ver el día de hoy", () => {
		jest.setSystemTime(new Date(2026, 6, 15, 10, 45));
		render(<CalendarioCitas />);

		fireEvent.click(screen.getByLabelText("Dia siguiente"));
		expect(screen.queryByTestId("cal-ahora")).toBeNull();
	});

	test("fuera del horario de la agenda no se dibuja", () => {
		jest.setSystemTime(new Date(2026, 6, 15, 22, 0));
		render(<CalendarioCitas />);

		expect(screen.queryByTestId("cal-ahora")).toBeNull();
	});
});

describe("calendario del mes", () => {
	test("al elegir un día salta directo a la agenda de ese día", () => {
		render(<CalendarioCitas />);

		fireEvent.click(screen.getByLabelText("Elegir fecha en el calendario del mes"));
		expect(screen.getByRole("dialog", { name: "Elegir fecha" })).toHaveTextContent("Julio 2026");

		fireEvent.click(screen.getByLabelText("Mes siguiente"));
		fireEvent.click(screen.getByLabelText("2026-08-20"));

		expect(useCalendarioCitas).toHaveBeenLastCalledWith("2026-08-20", "2");
		expect(screen.getByText("20 Agosto, 2026")).toBeInTheDocument();
		expect(screen.queryByRole("dialog", { name: "Elegir fecha" })).toBeNull();
	});

	test("se cierra con Escape sin cambiar la fecha", () => {
		render(<CalendarioCitas />);

		fireEvent.click(screen.getByLabelText("Elegir fecha en el calendario del mes"));
		fireEvent.keyDown(document, { key: "Escape" });

		expect(screen.queryByRole("dialog", { name: "Elegir fecha" })).toBeNull();
		expect(screen.getByText("15 Julio, 2026")).toBeInTheDocument();
	});
});

describe("estado de la cita desde sus acciones", () => {
	const conEstados = (estados) =>
		useCalendarioCitas.mockReturnValue({
			data: citas.map((cita) => ({ ...cita, estado: estados[cita.id_cita] ?? cita.estado })),
			isLoading: false,
			error: null,
		});
	const abrirAcciones = (paciente) =>
		fireEvent.click(screen.getByLabelText(`Abrir acciones de cita de ${paciente}`));

	beforeEach(() => {
		mockUpdateCita.mockClear();
		mockDeleteCita.mockClear();
	});

	test("marcar como realizada guarda el estado", async () => {
		render(<CalendarioCitas />);
		abrirAcciones("Lucia Root");

		expect(screen.queryByRole("button", { name: "Eliminar" })).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "Realizada" }));

		expect(mockUpdateCita).toHaveBeenCalledWith(expect.objectContaining({ estado: "realizada" }), 1);
	});

	test("la cita realizada se distingue en la agenda", () => {
		conEstados({ 1: "realizada" });
		render(<CalendarioCitas />);

		const tarjeta = screen.getByLabelText("Abrir acciones de cita de Lucia Root");
		expect(tarjeta).toHaveClass("realizada");
		expect(tarjeta).toHaveTextContent("✓ Realizada");
	});

	test("cancelar deja la cita tachada en lugar de borrarla", async () => {
		render(<CalendarioCitas />);
		abrirAcciones("Lucia Root");
		fireEvent.click(screen.getByRole("button", { name: "Cancelar cita" }));
		fireEvent.click(screen.getByRole("button", { name: "Confirmar cancelación" }));

		expect(mockUpdateCita).toHaveBeenCalledWith(expect.objectContaining({ estado: "cancelada" }), 1);
		expect(mockDeleteCita).not.toHaveBeenCalled();
	});

	test("la cancelada se ve tachada, no cuenta y su horario sigue libre", () => {
		conEstados({ 1: "cancelada" });
		render(<CalendarioCitas />);

		expect(screen.getByLabelText("Abrir acciones de cita de Lucia Root")).toHaveClass("cancelada");
		expect(screen.getByText("2 citas programadas por hora y tipo de estudio")).toBeInTheDocument();
		expect(screen.getByLabelText("Crear cita de TAC el 2026-07-15 a las 09:00")).toBeInTheDocument();
	});

	test("sólo la cancelada ofrece eliminar, y pide confirmación", () => {
		conEstados({ 1: "cancelada" });
		render(<CalendarioCitas />);
		abrirAcciones("Lucia Root");

		expect(screen.queryByRole("button", { name: "Pasar a estudio" })).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
		expect(mockDeleteCita).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "Confirmar eliminación" }));

		expect(mockDeleteCita).toHaveBeenCalledWith(1);
	});
});
