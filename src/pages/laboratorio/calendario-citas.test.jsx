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

jest.mock("../../hooks/use-sucursales", () => ({ useSucursales: () => ({ data: [] }) }));

jest.mock("../../hooks/use-citas", () => ({
	useCalendarioCitas: jest.fn(),
}));

jest.mock("../../components/nueva-cita-modal", () => (props) =>
	props.isOpen ? <div data-testid="nueva-cita-modal">{`${props.fechaInicial} ${props.horaInicial}`}</div> : null,
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

	expect(screen.getByRole("columnheader", { name: /lab/i })).toBeInTheDocument();
	expect(screen.getByRole("columnheader", { name: /ultrasonido/i })).toBeInTheDocument();
	expect(screen.getByRole("columnheader", { name: /rayos x/i })).toBeInTheDocument();
	expect(screen.getByRole("columnheader", { name: /tac/i })).toBeInTheDocument();
	expect(screen.getByRole("columnheader", { name: /resonancia/i })).toBeInTheDocument();

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

// Filtrar la agenda no basta: entre 26 horarios y ocho columnas la cita sigue
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
