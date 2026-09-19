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
jest.mock("../../hooks/use-agenda-visitas", () => ({
	useAgendaVisitas: () => ({ data: mockCitas.current, isLoading: false, error: null }),
	useCancelarVisitaAgenda: () => ({ mutateAsync: mockCancelar, isPending: false }),
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
			fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
		});
		expect(mockCancelar).toHaveBeenCalledWith("a1");
	});

	test("lo cancelado tampoco se exporta", async () => {
		await mostrar();
		fireEvent.click(screen.getByRole("button", { name: "Exportar Excel" }));
		const [citasExportadas] = mockExportar.mock.calls[0];
		expect(citasExportadas.map((cita) => cita.id_agenda)).toEqual(["a1"]);
	});

	test("el contador sólo cuenta lo que se ve", async () => {
		await mostrar();
		expect(screen.getByText("1 visitas")).toBeInTheDocument();
	});
});
