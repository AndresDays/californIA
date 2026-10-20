import React from "react";
import { render, screen, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

jest.mock("./reporte-ventas.css", () => ({}));
jest.mock("../../utils/exportar-tabla", () => ({
	exportarPDF: jest.fn(),
	exportarExcel: jest.fn(),
}));
jest.mock("../../components/page-layout.jsx", () => ({
	__esModule: true,
	default: ({ children }) => <div>{children}</div>,
}));
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }));
jest.mock("../../assets/calendarioIcono.png", () => "calendarioIcono.png");

// Recepción cuadra su turno con este reporte: sólo el día en curso.
jest.mock("../../context/auth-context", () => ({
	useAuth: () => ({
		user: { id: "user-recepcion", email: "recepcion@test.com" },
		empleadoData: { id_empleado: 7, nombre: "Ana Ruiz", rol: "recepcionista", id_sucursal: 1 },
	}),
}));

// El rango que se consulta se observa aquí: es lo que decide qué ventas se
// piden a la base.
const rangosConsultados = [];
// El turno de la mañana (Blanca, id 3) y el de la tarde (Ana, id 7) el mismo día.
const mockVentasDelDia = [
	{
		id_venta: 1,
		folio: "FOLIO-MANANA",
		fecha_venta: new Date().toISOString(),
		id_empleado: 3,
		empleados: { nombre: "Blanca Avila" },
		total: 2450,
		estudios_venta: [],
	},
	{
		id_venta: 2,
		folio: "FOLIO-TARDE",
		fecha_venta: new Date().toISOString(),
		id_empleado: 7,
		empleados: { nombre: "Ana Ruiz" },
		total: 1000,
		estudios_venta: [],
	},
];
jest.mock("../../hooks/use-reporte-ventas", () => ({
	useReporteVentas: (rango) => {
		rangosConsultados.push(rango);
		return { data: mockVentasDelDia, isLoading: false, error: null, refetch: jest.fn() };
	},
	useVentasCanceladas: () => ({ data: [] }),
	usePagosCancelados: () => ({ data: 0 }),
	useCatalogosReporte: () => ({ data: null }),
}));

jest.mock("../../lib/supabase-client", () => {
	const mockChain = {
		select: jest.fn().mockReturnThis(),
		eq: jest.fn().mockReturnThis(),
		gte: jest.fn().mockReturnThis(),
		lte: jest.fn().mockReturnThis(),
		order: jest.fn().mockResolvedValue({ data: [], error: null }),
		maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
		single: jest.fn().mockResolvedValue({ data: null, error: null }),
	};
	return { supabase: { from: jest.fn(() => mockChain) } };
});

import ReporteVentas from "./reporte-ventas";

const hoyMexico = () =>
	new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

const renderReporte = async () => {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	await act(async () => {
		render(
			<QueryClientProvider client={queryClient}>
				<ReporteVentas />
			</QueryClientProvider>,
		);
	});
};

describe("Reporte de ventas con rol de recepción", () => {
	beforeEach(() => {
		rangosConsultados.length = 0;
		localStorage.clear();
	});

	test("consulta únicamente el día en curso", async () => {
		await renderReporte();

		const hoy = hoyMexico();
		expect(rangosConsultados.length).toBeGreaterThan(0);
		expect(rangosConsultados.at(-1)).toEqual({ fechaInicial: hoy, fechaFinal: hoy });
	});

	test("las fechas quedan en hoy y no se pueden cambiar", async () => {
		await renderReporte();

		const hoy = hoyMexico();
		const inicial = screen.getByLabelText("Fecha inicial");
		const final = screen.getByLabelText("Fecha final");

		expect(inicial).toHaveValue(hoy);
		expect(final).toHaveValue(hoy);
		expect(inicial).toBeDisabled();
		expect(final).toBeDisabled();
	});

	test("se avisa por qué el periodo no se puede mover", async () => {
		await renderReporte();
		expect(screen.getByText(/sólo tus ventas de hoy/i)).toBeInTheDocument();
	});

	// Mañana y tarde entregan cada una su corte: la recepcionista sólo ve lo
	// que registró ella, no lo del turno anterior.
	test("sólo salen las ventas que registró quien tiene la sesión", async () => {
		await renderReporte();

		expect(screen.getAllByText("FOLIO-TARDE").length).toBeGreaterThan(0);
		expect(screen.queryByText("FOLIO-MANANA")).not.toBeInTheDocument();
	});

	test("el vendedor queda fijo en ella", async () => {
		await renderReporte();

		const vendedor = screen.getByLabelText("Vendedor");
		expect(vendedor).toBeDisabled();
		expect(vendedor).toHaveDisplayValue("Ana Ruiz");
	});
});
