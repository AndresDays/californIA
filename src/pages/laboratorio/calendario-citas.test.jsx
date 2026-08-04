import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import CalendarioCitas from "./calendario-citas";
import { useCalendarioCitas } from "../../hooks/use-citas";

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
