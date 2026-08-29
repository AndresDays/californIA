import React from "react";
import { act, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

jest.mock("./visitadora.css", () => ({}));

jest.mock("../../components/page-layout.jsx", () => ({
	__esModule: true,
	default: ({ children }) => <div>{children}</div>,
}));

jest.mock("../../components/ModalNotificacion", () => ({
	__esModule: true,
	default: () => null,
}));

jest.mock("../../components/ModalConfirmarEliminacion", () => ({
	__esModule: true,
	default: ({ isOpen, mensaje }) => (isOpen ? <div>{mensaje}</div> : null),
}));

jest.mock("./componentes/modal-porcentaje-doctor", () => ({
	__esModule: true,
	default: () => null,
}));

jest.mock("../../utils/exportar-tabla", () => ({
	exportarExcel: jest.fn(),
	exportarPDF: jest.fn(),
}));

const empleado = { rol: "admin", id_empleado: 7 };
jest.mock("../../hooks/use-empleado-actual", () => ({
	useEmpleadoActual: () => ({
		empleadoData: empleado,
		formatRol: (rol) => rol,
		getPrimerNombre: () => "Ana",
	}),
}));

const datosConcentrado = { current: null };
jest.mock("../../hooks/use-comisiones-medicos", () => ({
	useConcentradoComisiones: () => ({
		data: datosConcentrado.current,
		isLoading: false,
		error: null,
	}),
	useCerrarMesComisiones: () => ({ mutateAsync: jest.fn(), isPending: false }),
	useMarcarComisionPagada: () => ({ mutateAsync: jest.fn(), isPending: false }),
	useDetalleIngresoDoctor: () => ({ data: [] }),
}));

import ConcentradoComisiones from "./concentrado-comisiones";

const mesAbierto = {
	cerrado: false,
	mensuales: [],
	doctores: [
		{ id_doctor: 1, nombre: "Juan Díaz" },
		{ id_doctor: 2, nombre: "María López" },
		{ id_doctor: 9, nombre: "Jorge Mendoza" },
	],
	comisiones: [
		{ id_doctor: 1, porcentaje: 10, vigente_desde: "2026-01-01" },
		{ id_doctor: 2, porcentaje: 20, vigente_desde: "2026-01-01" },
	],
	ventas: [
		{ id_doctor: 1, total: 50000, estado: "activo" },
		{ id_doctor: 2, total: 100000, estado: "activo" },
		{ id_doctor: 9, total: 12300, estado: "activo" },
	],
};

const mostrar = async (datos, rol = "admin") => {
	datosConcentrado.current = datos;
	empleado.rol = rol;
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	await act(async () => {
		render(
			<QueryClientProvider client={queryClient}>
				<ConcentradoComisiones />
			</QueryClientProvider>,
		);
	});
};

const renglonDe = (nombre) => screen.getByText(nombre).closest("tr");

describe("ConcentradoComisiones", () => {
	test("calcula la comision de cada medico a partir de su porcentaje", async () => {
		await mostrar(mesAbierto);

		expect(within(renglonDe("Juan Díaz")).getByText("10 %")).toBeInTheDocument();
		expect(within(renglonDe("Juan Díaz")).getByText("$5,000.00")).toBeInTheDocument();
		expect(within(renglonDe("María López")).getByText("$20,000.00")).toBeInTheDocument();
	});

	test("las tarjetas de resumen suman lo mismo que el pie de la tabla", async () => {
		await mostrar(mesAbierto);

		// 50,000 + 100,000 + 12,300 de ingreso; 5,000 + 20,000 de comisión, porque
		// Jorge Mendoza todavía no tiene porcentaje asignado.
		const tarjetas = screen.getAllByText(/\$/, { selector: ".visitadora-tarjeta-valor" });
		const enTarjetas = tarjetas.map((nodo) => nodo.textContent);
		expect(enTarjetas).toEqual(["$162,300.00", "$25,000.00"]);

		const pie = screen.getByText(/TOTAL/).closest("tr");
		expect(within(pie).getByText("$162,300.00")).toBeInTheDocument();
		expect(within(pie).getByText("$25,000.00")).toBeInTheDocument();
		expect(within(pie).getByText("TOTAL · 3 médicos")).toBeInTheDocument();
	});

	test("el medico sin porcentaje sale primero y marcado", async () => {
		await mostrar(mesAbierto);

		const nombres = screen
			.getAllByRole("row")
			.slice(1, 4)
			.map((fila) => fila.querySelector("td")?.textContent);
		expect(nombres[0]).toContain("Jorge Mendoza");
		expect(within(renglonDe("Jorge Mendoza")).getByText("Sin %")).toBeInTheDocument();
	});

	test("administracion ve el boton de cerrar mes", async () => {
		await mostrar(mesAbierto, "admin");
		expect(screen.getByRole("button", { name: "Cerrar mes" })).toBeInTheDocument();
	});

	test("el radiologo director tambien lo ve", async () => {
		await mostrar(mesAbierto, "radiologo");
		expect(screen.getByRole("button", { name: "Cerrar mes" })).toBeInTheDocument();
	});

	// Ella consulta el concentrado para poder contestarle al médico que pregunta
	// por sus comisiones, pero no fija porcentajes ni cierra el mes.
	test("la visitadora ve las cifras pero no puede cerrar el mes ni fijar porcentajes", async () => {
		await mostrar(mesAbierto, "visitadora");

		expect(screen.getByText("$20,000.00")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Cerrar mes" })).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Fijar %" })).not.toBeInTheDocument();
	});

	test("un mes cerrado muestra lo congelado y ya no ofrece cerrarlo", async () => {
		await mostrar({
			cerrado: true,
			ventas: [],
			doctores: [],
			comisiones: [],
			mensuales: [
				{
					id_mensual: "m1",
					id_doctor: 1,
					ordenes: 18,
					ingreso_generado: 50000,
					porcentaje: 10,
					comision: 5000,
					estado: "pagado",
					doctores: { id_doctor: 1, nombre: "Juan Díaz" },
				},
			],
		});

		expect(screen.getByText("CERRADO")).toBeInTheDocument();
		expect(within(renglonDe("Juan Díaz")).getByText("Pagado")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Cerrar mes" })).not.toBeInTheDocument();
	});

	test("sin ventas en el mes lo dice en vez de mostrar una tabla vacia", async () => {
		await mostrar({ cerrado: false, ventas: [], doctores: [], comisiones: [], mensuales: [] });
		expect(screen.getByText(/Ningún médico generó ingreso/)).toBeInTheDocument();
	});
});
