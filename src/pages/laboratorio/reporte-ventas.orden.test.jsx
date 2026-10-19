import React from "react";
import { render } from "@testing-library/react";

jest.mock("./reporte-ventas.css", () => ({}));
jest.mock("../../assets/calendarioIcono.png", () => "calendarioIcono.png");
jest.mock("../../assets/metricasIcono.png", () => "metricasIcono.png");
jest.mock("../../components/page-layout.jsx", () => ({
	__esModule: true,
	default: ({ children }) => <div>{children}</div>,
}));
jest.mock("../../hooks/use-empleado-actual", () => ({
	useEmpleadoActual: () => ({
		empleadoData: { nombre: "Ana" },
		formatRol: () => "Recepcionista",
		getPrimerNombre: () => "Ana",
	}),
}));
jest.mock("../../utils/exportar-tabla", () => ({
	exportarPDF: jest.fn(),
	exportarExcel: jest.fn(),
}));


jest.mock("../../hooks/use-reporte-ventas", () => ({
	// El corte del periodo cuenta las canceladas y los pagos cancelados
	// aparte; estas pruebas no los ejercitan, asi que van vacios.
	useVentasCanceladas: () => ({ data: [] }),
	usePagosCancelados: () => ({ data: 0 }),
	useReporteVentas: () => ({
		data: (() => {
			// La consulta las trae de la más nueva a la más vieja.
			const { VENTA_MOCK } = jest.requireActual("./reporte-ventas.detalle.fixture");
			return [
				{ ...VENTA_MOCK, id_venta: 3, folio: "FOLIO-NUEVA", fecha_venta: "2026-08-19T18:00:00.000Z" },
				{ ...VENTA_MOCK, id_venta: 2, folio: "FOLIO-MEDIA", fecha_venta: "2026-08-18T18:00:00.000Z" },
				{ ...VENTA_MOCK, id_venta: 1, folio: "FOLIO-VIEJA", fecha_venta: "2026-08-17T18:00:00.000Z" },
			];
		})(),
		isLoading: false,
		error: null,
		refetch: jest.fn(),
	}),
	useCatalogosReporte: () => ({
		data: {
			sucursales: [],
			vendedores: [],
			clientes: [],
			doctores: [{ id_doctor: 9, nombre: "Dra. Odile Desage" }],
			areas: [],
		},
	}),
}));

jest.mock("../../context/auth-context", () => ({
	useAuth: () => ({ user: { id: "u1" } }),
}));
jest.mock("../../lib/supabase-client", () => ({ supabase: {} }));

import ReporteVentas from "./reporte-ventas";
import { conQueryClient } from "../../../__mocks__/con-query-client";

// La tabla se lee como bitácora: la venta más vieja arriba y las nuevas abajo.
test("la tabla de ventas va de la más vieja a la más nueva", () => {
	render(conQueryClient(<ReporteVentas />));

	const folios = [...document.querySelectorAll("tbody tr")]
		.map((fila) => fila.textContent.match(/FOLIO-(VIEJA|MEDIA|NUEVA)/)?.[0])
		.filter(Boolean);

	expect(folios).toEqual(["FOLIO-VIEJA", "FOLIO-MEDIA", "FOLIO-NUEVA"]);
});
