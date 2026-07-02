import React from "react";
import { render, screen } from "@testing-library/react";
import CortesDia from "./cortes-dia";

jest.mock("./cortes-dia.css", () => ({}));
jest.mock("../../assets/calendarioIcono.png", () => "calendarioIcono.png");
jest.mock("../../components/page-layout.jsx", () => ({
	__esModule: true,
	default: ({ children }) => <div>{children}</div>,
}));

let mockAuth;

jest.mock("../../context/auth-context", () => ({
	useAuth: () => mockAuth,
}));

jest.mock("../../hooks/use-reporte-ventas", () => ({
	useReporteVentas: () => ({ data: [], isLoading: false }),
	useCatalogosReporte: () => ({
		data: {
			sucursales: [],
			doctores: [],
		},
	}),
}));

const crearQueryVacia = () => {
	const resolved = Promise.resolve({ data: [], error: null });
	const chain = {
		select: jest.fn().mockReturnThis(),
		gte: jest.fn().mockReturnThis(),
		lte: jest.fn().mockReturnThis(),
		order: jest.fn().mockReturnThis(),
		eq: jest.fn().mockReturnThis(),
		ilike: jest.fn().mockReturnThis(),
		then: resolved.then.bind(resolved),
		catch: resolved.catch.bind(resolved),
	};
	return chain;
};

jest.mock("../../lib/supabase-client", () => ({
	supabase: {
		from: jest.fn(() => crearQueryVacia()),
	},
}));

describe("CortesDia", () => {
	beforeEach(() => {
		mockAuth = {
			user: { id: "admin-user", email: "admin@test.com" },
			empleadoData: { rol: "admin", nombre: "Admin" },
			loading: false,
			empleadoLoading: false,
		};
	});

	test("muestra carga mientras se resuelve el empleado autenticado", () => {
		mockAuth = {
			user: { id: "admin-user", email: "admin@test.com" },
			empleadoData: null,
			loading: false,
			empleadoLoading: true,
		};

		render(<CortesDia />);

		expect(screen.getByText("Cargando cortes...")).toBeInTheDocument();
		expect(screen.queryByText("Esta vista está disponible solo para administradores.")).not.toBeInTheDocument();
	});

	test("muestra la vista completa en cero cuando admin no tiene cortes del dia", async () => {
		render(<CortesDia />);

		expect(await screen.findByText("No hay cortes registrados para esta fecha.")).toBeInTheDocument();
		expect(screen.getByText("Supervisión de transacciones por empleado")).toBeInTheDocument();
		expect(screen.getByText("Sin movimientos")).toBeInTheDocument();
		expect(screen.getAllByText("$0.00").length).toBeGreaterThan(0);
	});
});
