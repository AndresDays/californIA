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
jest.mock("./componentes/modal-medico", () => ({ __esModule: true, default: () => <div>modal</div> }));

jest.mock("../../hooks/use-empleado-actual", () => ({
	useEmpleadoActual: () => ({
		empleadoData: { rol: "visitadora", id_empleado: 4 },
		formatRol: (rol) => rol,
		getPrimerNombre: () => "Ana",
	}),
}));

const medicos = [
	{
		id_doctor: 1,
		nombre_completo: "Ramón Pérez",
		especialidad: "Ginecología",
		hospital: "Hospital del Valle",
		zona: "Centro",
		telefono: "3221234567",
		estatus: "activo",
		tipo_convenio: "mixto",
		fecha_nacimiento: "1975-09-19",
	},
	{
		id_doctor: 2,
		nombre_completo: "Ana Ruiz",
		especialidad: "Pediatría",
		hospital: "Clínica Norte",
		zona: "Norte",
		estatus: "prospecto",
		tipo_convenio: "prospecto",
		fecha_nacimiento: "1980-02-11",
	},
];

jest.mock("../../hooks/use-directorio-medicos", () => ({
	useDirectorioMedicos: () => ({ medicos, isLoading: false, error: null }),
}));

import Directorio from "./directorio";

const mostrar = async () => {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	await act(async () => {
		render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter>
					<Directorio />
				</MemoryRouter>
			</QueryClientProvider>,
		);
	});
};

beforeEach(() => jest.useFakeTimers().setSystemTime(new Date("2026-09-19T18:00:00Z")));
afterEach(() => jest.useRealTimers());

describe("Directorio médico", () => {
	test("lista a todos los médicos con su especialidad y convenio", async () => {
		await mostrar();
		expect(screen.getByText("Ramón Pérez")).toBeInTheDocument();
		expect(screen.getByText("Ana Ruiz")).toBeInTheDocument();
		// "Mixto" sale también en el select de convenios, por eso se cuentan los dos.
		expect(screen.getAllByText("Mixto").length).toBeGreaterThan(1);
	});

	test("la búsqueda ignora acentos", async () => {
		await mostrar();
		fireEvent.change(screen.getByLabelText("Buscar médico"), { target: { value: "ramon" } });
		expect(screen.getByText("Ramón Pérez")).toBeInTheDocument();
		expect(screen.queryByText("Ana Ruiz")).not.toBeInTheDocument();
	});

	test("filtra por estatus", async () => {
		await mostrar();
		fireEvent.change(screen.getByLabelText("Estatus"), { target: { value: "prospecto" } });
		expect(screen.getByText("Ana Ruiz")).toBeInTheDocument();
		expect(screen.queryByText("Ramón Pérez")).not.toBeInTheDocument();
	});

	// El cumpleaños es el gancho que ella usa para volver a tocar la puerta, así
	// que tiene que verse sin abrir la ficha.
	test("señala a quien cumple años hoy y deja filtrarlo", async () => {
		await mostrar();
		expect(screen.getByText("🎂 Hoy cumple años")).toBeInTheDocument();
		fireEvent.change(screen.getByLabelText("Cumpleaños"), { target: { value: "hoy" } });
		expect(screen.getByText("Ramón Pérez")).toBeInTheDocument();
		expect(screen.queryByText("Ana Ruiz")).not.toBeInTheDocument();
	});

	test("avisa cuando ningún médico coincide", async () => {
		await mostrar();
		fireEvent.change(screen.getByLabelText("Buscar médico"), { target: { value: "cardiologo" } });
		expect(screen.getByText(/Ningún médico coincide/)).toBeInTheDocument();
	});
});
