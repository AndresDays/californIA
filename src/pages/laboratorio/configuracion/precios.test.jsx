import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("./precios.css", () => ({}));
jest.mock("../../../assets/editarIconoV2.png", () => "editarIconoV2.png");
jest.mock("../../../assets/eliminarIconoV2.png", () => "eliminarIconoV2.png");
jest.mock("../../../components/page-layout.jsx", () => ({
	__esModule: true,
	default: ({ children }) => <div>{children}</div>,
}));
jest.mock("../../../context/auth-context", () => ({
	useAuth: () => ({ user: { id: "usuario-prueba", email: "prueba@example.com" } }),
}));
jest.mock("../../../utils/exportar-tabla", () => ({
	exportarExcel: jest.fn(),
	exportarPDF: jest.fn(),
}));
jest.mock("../componentes/modal-agregar-precio", () => () => null);

const filtrosOr = [];

jest.mock("../../../lib/supabase-client", () => {
	const crearConsulta = (resultado = { data: [], error: null, count: 0 }) => {
		const consulta = {
			select: jest.fn().mockReturnThis(),
			or: jest.fn((filtro) => {
				filtrosOr.push(filtro);
				return consulta;
			}),
			eq: jest.fn().mockReturnThis(),
			range: jest.fn().mockReturnThis(),
			order: jest.fn().mockResolvedValue(resultado),
			maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
		};
		return consulta;
	};

	return {
		supabase: {
			from: jest.fn((tabla) =>
				tabla === "empleados" ? crearConsulta() : crearConsulta(),
			),
		},
	};
});

import Precios from "./precios";

describe("Precios", () => {
	beforeEach(() => {
		filtrosOr.length = 0;
		sessionStorage.clear();
	});

	test("restaura la búsqueda al volver a la pantalla", async () => {
		sessionStorage.setItem("california:busqueda:precios:termino", "rei");
		render(<Precios />);

		await waitFor(() => {
			expect(filtrosOr).toContain(
				"clave.ilike.%rei%,descripcion.ilike.%rei%,cliente.ilike.%rei%",
			);
		});
	});

	test("busca por clave, descripción y cliente sin consultar una columna inexistente", async () => {
		render(<Precios />);

		fireEvent.change(screen.getByPlaceholderText("Busca Precios Aqui..."), {
			target: { value: "rei" },
		});

		await waitFor(() => {
			expect(filtrosOr).toContain(
				"clave.ilike.%rei%,descripcion.ilike.%rei%,cliente.ilike.%rei%",
			);
		});
	});
});
