import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

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
jest.mock("../../context/auth-context", () => ({
	useAuth: () => ({ user: { id: "u1" } }),
}));
jest.mock("../../lib/supabase-client", () => ({ supabase: {} }));
jest.mock("../../utils/abono-venta", () => ({ registrarAbonoVenta: jest.fn() }));

// Un día de caja con las cuatro vías de cobro y una orden a medio pagar, que es
// lo que alimenta el renglón de por cobrar.
const venta = (id, folio, forma, total, pagado, idSucursal) => ({
	id_venta: id,
	folio,
	fecha_venta: "2026-08-10T10:00:00.000Z",
	total,
	pago_recibido: pagado,
	forma_pago: forma,
	id_sucursal: idSucursal,
	pacientes: { nombre: `Paciente ${id}` },
	estudios_venta: [
		{ id_estudio_venta: id, descripcion_estudio: "Estudio", area: "Laboratorio", precio: total },
	],
});

const mockVentas = [
	venta(1, "C0001", "efectivo", 500, 500, 1),
	venta(2, "C0002", "efectivo", 300, 200, 1),
	venta(3, "C0003", "tarjeta_debito", 1000, 1000, 1),
	venta(4, "C0004", "Tarjeta Crédito", 1500, 1500, 2),
];

const mockCanceladas = [
	{ ...venta(5, "C0005", "efectivo", 400, 0, 1), estado: "cancelado" },
	{ ...venta(6, "C0006", "efectivo", 600, 0, 2), estado: "cancelado" },
];

jest.mock("../../hooks/use-reporte-ventas", () => ({
	useReporteVentas: () => ({
		data: mockVentas,
		isLoading: false,
		error: null,
		refetch: jest.fn(),
	}),
	useVentasCanceladas: () => ({ data: mockCanceladas }),
	usePagosCancelados: () => ({ data: 2 }),
	useCatalogosReporte: () => ({
		data: {
			sucursales: [
				{ id_sucursal: 1, nombre: "Matriz" },
				{ id_sucursal: 2, nombre: "Sucursal 2" },
			],
			vendedores: [],
			clientes: [],
			doctores: [],
			areas: [],
			empresas: [],
		},
	}),
}));

import ReporteVentas from "./reporte-ventas";

// El valor del renglón cuyo texto empieza con la etiqueta dada, dentro de las
// tarjetas del corte.
const renglon = (etiqueta) => {
	const fila = [...document.querySelectorAll(".rv-corte .rv-summary-row")].find((f) =>
		f.querySelector("span")?.textContent.trim() === etiqueta,
	);
	return fila?.querySelector("strong")?.textContent.trim();
};

// Lo que se reportó: el reporte de ventas tiene que traer los mismos datos que
// el corte de caja, que es lo que se revisa al cerrar el turno.
describe("ReporteVentas: el corte del período", () => {
	beforeEach(() => jest.clearAllMocks());

	test("separa el efectivo de los bancos", () => {
		render(<ReporteVentas />);

		expect(renglon("Efectivo")).toBe("$700.00");
		expect(renglon("Efectivo neto a entregar")).toBe("$700.00");
		expect(renglon("Tarjeta de débito")).toBe("$1,000.00");
		expect(renglon("Tarjeta de crédito")).toBe("$1,500.00");
		expect(renglon("Total bancos")).toBe("$2,500.00");
	});

	test("muestra lo que falta por cobrar y el gran total", () => {
		render(<ReporteVentas />);

		expect(renglon("Crédito")).toBe("$100.00");
		expect(renglon("Total por cobrar")).toBe("$100.00");
		expect(renglon("Gran total del corte")).toBe("$3,300.00");
	});

	test("cuenta órdenes, canceladas y pagos cancelados", () => {
		render(<ReporteVentas />);

		expect(renglon("Órdenes")).toBe("4");
		expect(renglon("Órdenes canceladas")).toBe("2");
		expect(renglon("Pagos cancelados")).toBe("2");
	});

	// Van a la vista para que el corte se lea igual que el de caja, pero con el
	// aviso de que no son un dato medido.
	test("cupones y cortesías salen en cero y avisan que no se manejan", () => {
		render(<ReporteVentas />);

		expect(renglon("Cupones")).toBe("0");
		expect(renglon("Cortesías")).toBe("0");
		expect(
			screen.getByText(/Cupones y cortesías no se manejan en el sistema/),
		).toBeInTheDocument();
	});

	// Si el corte no siguiera los filtros, el número no cuadraría con la tabla
	// que se está viendo. Las canceladas tienen que respetarlos igual.
	test("el corte sigue el filtro de sucursal, también en las canceladas", () => {
		render(<ReporteVentas />);

		fireEvent.change(screen.getByLabelText("Sucursal"), { target: { value: "2" } });

		expect(renglon("Efectivo")).toBe("$0.00");
		expect(renglon("Tarjeta de crédito")).toBe("$1,500.00");
		expect(renglon("Órdenes")).toBe("1");
		expect(renglon("Órdenes canceladas")).toBe("1");
	});

	// Las canceladas no pueden colarse a la tabla ni a los totales de ventas:
	// van en consulta aparte justo para eso.
	test("las canceladas no entran a la tabla ni inflan las ventas", () => {
		render(<ReporteVentas />);

		const folios = [...document.querySelectorAll(".rv-table tbody tr")].map(
			(fila) => fila.querySelector("td").textContent,
		);
		expect(folios).not.toContain("C0005");
		expect(folios).not.toContain("C0006");
		expect(renglon("Órdenes")).toBe("4");
	});
});
