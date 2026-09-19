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

jest.mock("../../hooks/use-empleado-actual", () => ({
	useEmpleadoActual: () => ({
		empleadoData: { rol: "visitadora", id_empleado: 4 },
		formatRol: (rol) => rol,
		getPrimerNombre: () => "Ana",
	}),
}));

jest.mock("../../hooks/use-directorio-medicos", () => ({
	useDirectorioMedicos: () => ({
		medicos: [
			{ id_doctor: 1, nombre_completo: "Ramón Pérez", especialidad: "Ginecología", zona: "Centro", tipo_convenio: "mixto" },
			{ id_doctor: 2, nombre_completo: "Ana Ruiz", especialidad: "Pediatría", zona: "Norte", tipo_convenio: "puntos" },
		],
	}),
}));

const mockRango = { current: null };
jest.mock("../../hooks/use-pacientes-referidos", () => ({
	usePacientesReferidos: (rango) => {
		mockRango.current = rango;
		return {
			data: [
				{ id_venta: 1, id_doctor: 1, id_paciente: 10, total: 1000, estado: "activo" },
				{ id_venta: 2, id_doctor: 1, id_paciente: 10, total: 500, estado: "activo" },
				{ id_venta: 3, id_doctor: 2, id_paciente: 12, total: 800, estado: "activo" },
			],
			isLoading: false,
			error: null,
		};
	},
}));

const mockExportar = jest.fn();
jest.mock("../../utils/pacientes-referidos", () => ({
	...jest.requireActual("../../utils/pacientes-referidos"),
	exportarReferidosExcel: (...args) => mockExportar(...args),
}));

import Referidos from "./referidos";

const mostrar = async () => {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	await act(async () => {
		render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter>
					<Referidos />
				</MemoryRouter>
			</QueryClientProvider>,
		);
	});
};

beforeEach(() => {
	jest.useFakeTimers().setSystemTime(new Date("2026-09-19T18:00:00Z"));
	mockExportar.mockClear();
});
afterEach(() => jest.useRealTimers());

describe("Pacientes referidos", () => {
	test("arranca en el mes en curso", async () => {
		await mostrar();
		expect(screen.getByLabelText("Desde")).toHaveValue("2026-09-01");
		expect(screen.getByLabelText("Hasta")).toHaveValue("2026-09-19");
		expect(mockRango.current).toEqual({ desde: "2026-09-01", hasta: "2026-09-19" });
	});

	// Las dos órdenes del mismo paciente son un paciente: es justo la cuenta que
	// se hacía mal contando renglones del reporte de ventas.
	test("muestra pacientes distintos por médico", async () => {
		await mostrar();
		const renglon = screen.getByText("Ramón Pérez").closest("tr");
		const celdas = renglon.querySelectorAll("td");
		expect(celdas[4]).toHaveTextContent("1");
		expect(celdas[5]).toHaveTextContent("2");
	});

	test("cambiar las fechas vuelve a pedir el periodo", async () => {
		await mostrar();
		fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-08-01" } });
		expect(mockRango.current.desde).toBe("2026-08-01");
	});

	test("el atajo de la semana mueve el rango al lunes", async () => {
		await mostrar();
		fireEvent.click(screen.getByRole("button", { name: "Esta semana" }));
		expect(screen.getByLabelText("Desde")).toHaveValue("2026-09-14");
	});

	test("la búsqueda filtra por especialidad", async () => {
		await mostrar();
		fireEvent.change(screen.getByLabelText("Buscar médico"), { target: { value: "pediatria" } });
		expect(screen.getByText("Ana Ruiz")).toBeInTheDocument();
		expect(screen.queryByText("Ramón Pérez")).not.toBeInTheDocument();
	});

	test("exporta lo que se está viendo", async () => {
		await mostrar();
		fireEvent.click(screen.getByRole("button", { name: "Exportar Excel" }));
		expect(mockExportar).toHaveBeenCalledWith(
			expect.arrayContaining([expect.objectContaining({ nombre: "Ramón Pérez", pacientes: 1 })]),
			{ desde: "2026-09-01", hasta: "2026-09-19" },
			"Pacientes_referidos_2026-09-01_a_2026-09-19",
		);
	});
});
