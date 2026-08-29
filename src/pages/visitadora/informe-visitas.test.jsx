import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

jest.mock("./visitadora.css", () => ({}));
jest.mock("../../components/page-layout.jsx", () => ({
	__esModule: true,
	default: ({ children }) => <div>{children}</div>,
}));
jest.mock("../../components/ModalNotificacion", () => ({ __esModule: true, default: () => null }));
jest.mock("../../components/ModalConfirmarEliminacion", () => ({
	__esModule: true,
	default: ({ isOpen, nombreElemento }) => (isOpen ? <div>Eliminar {nombreElemento}</div> : null),
}));
jest.mock("./componentes/modal-visita", () => ({
	__esModule: true,
	default: ({ isOpen }) => (isOpen ? <div>Formulario de visita</div> : null),
}));

// El prefijo `mock` es el único que jest permite referenciar desde la fábrica.
const mockExportar = jest.fn();
jest.mock("../../utils/exportar-informe-visitas", () => ({
	exportarInformeVisitas: (...args) => mockExportar(...args),
}));

jest.mock("../../hooks/use-empleado-actual", () => ({
	useEmpleadoActual: () => ({
		empleadoData: { rol: "visitadora", id_empleado: 4 },
		formatRol: (rol) => rol,
		getPrimerNombre: () => "Ana",
	}),
}));

const rangoConsultado = { current: null };
const visitas = { current: [] };
jest.mock("../../hooks/use-visitas-medicas", () => ({
	useVisitasMedicas: (rango) => {
		rangoConsultado.current = rango;
		return { data: visitas.current, isLoading: false, error: null };
	},
	useEliminarVisita: () => ({ mutateAsync: jest.fn(), isPending: false }),
	useImportarVisitas: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock("../../hooks/use-doctores", () => ({
	useDoctores: () => ({ data: { data: [{ id_doctor: 3, nombre: "Saúl Ruiz" }], count: 1 } }),
}));

import InformeVisitas from "./informe-visitas";

const mostrar = async () => {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	await act(async () => {
		render(
			<QueryClientProvider client={queryClient}>
				<InformeVisitas />
			</QueryClientProvider>,
		);
	});
};

beforeEach(() => {
	jest.useFakeTimers().setSystemTime(new Date("2026-08-19T12:00:00Z"));
	visitas.current = [
		{
			id_visita: "v1",
			fecha: "2026-08-17",
			medico_nombre: "Dr. Saúl Ruiz",
			id_doctor: 3,
			especialidad: "Ginecólogo",
			ubicacion: "Núcleo Médico Joya",
			actividades: "Visita de seguimiento",
			tipo_convenio: "MIXTO",
		},
		{
			id_visita: "v2",
			fecha: "2026-08-18",
			medico_nombre: "Tere Palomera",
			id_doctor: null,
			especialidad: "Coordinadora",
			ubicacion: "Coapinole",
			actividades: "Entrega de órdenes",
			tipo_convenio: "N/A",
		},
	];
});

afterEach(() => jest.useRealTimers());

describe("InformeVisitas", () => {
	test("consulta la semana laboral de la fecha actual, de lunes a viernes", async () => {
		await mostrar();
		expect(rangoConsultado.current).toEqual({ desde: "2026-08-17", hasta: "2026-08-21" });
		expect(screen.getByText("Del 17 al 21 de agosto")).toBeInTheDocument();
	});

	test("al pasar de semana consulta el rango nuevo", async () => {
		await mostrar();
		await act(async () => {
			fireEvent.click(screen.getByLabelText("Semana anterior"));
		});
		expect(rangoConsultado.current).toEqual({ desde: "2026-08-10", hasta: "2026-08-14" });
		expect(screen.getByText("Del 10 al 14 de agosto")).toBeInTheDocument();
	});

	test("lista las visitas y distingue las que estan ligadas al catalogo", async () => {
		await mostrar();
		const conLiga = screen.getByText(/Dr. Saúl Ruiz/).closest("tr");
		const sinLiga = screen.getByText(/Tere Palomera/).closest("tr");
		expect(within(conLiga).getByText("ligado")).toBeInTheDocument();
		expect(within(sinLiga).getByText("sin ligar")).toBeInTheDocument();
	});

	test("el resumen cuenta visitas, ligadas y convenios", async () => {
		await mostrar();
		const valores = screen
			.getAllByText(/^\d+$/, { selector: ".visitadora-tarjeta-valor" })
			.map((nodo) => nodo.textContent);
		// 2 visitas, 1 ligada, 1 con convenio (MIXTO; N/A no cuenta), 0 pendientes.
		expect(valores).toEqual(["2", "1", "1", "0"]);
	});

	test("exporta las visitas de la semana que se esta viendo", async () => {
		await mostrar();
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Exportar" }));
		});
		const [[semanas, archivo]] = mockExportar.mock.calls;
		expect(semanas[0].visitas).toHaveLength(2);
		expect(semanas[0].semana).toBe("Del 17 al 21 de agosto");
		expect(archivo).toBe("Reporte_visitas_2026-08-17");
	});

	test("muestra las nueve columnas del Excel mas la de acciones", async () => {
		await mostrar();
		const encabezados = screen.getAllByRole("columnheader").map((celda) => celda.textContent);
		expect(encabezados).toEqual([
			"Fecha",
			"Médico / Empresa",
			"Especialidad",
			"Ubicación",
			"Actividades",
			"Comentarios del médico",
			"Observaciones",
			"Seguimiento",
			"Convenio",
			"Acción",
		]);
	});

	test("lista los cuatro campos largos en su columna", async () => {
		visitas.current = [
			{
				...visitas.current[0],
				actividades: "Visita de seguimiento",
				comentarios_medico: "Comento que tiene comisiones pendientes",
				observaciones: "Se mostro reservado al principio",
				seguimiento: "Dar seguimiento al pago de comisiones",
			},
		];
		await mostrar();
		const renglon = screen.getByText(/Dr. Saúl Ruiz/).closest("tr");
		for (const texto of [
			"Visita de seguimiento",
			"Comento que tiene comisiones pendientes",
			"Se mostro reservado al principio",
			"Dar seguimiento al pago de comisiones",
		]) {
			expect(within(renglon).getByText(texto)).toBeInTheDocument();
		}
	});

	// El recorte a dos renglones tiene que vivir en un div interno: aplicarle
	// display al <td> lo saca del modelo de tabla y las lineas de separacion
	// del renglon dejan de alinearse con las demas columnas.
	test("el recorte va en un div y no en la celda", async () => {
		await mostrar();
		const renglon = screen.getByText(/Dr. Saúl Ruiz/).closest("tr");
		const celdas = renglon.querySelectorAll("td.visitadora-celda-larga");
		expect(celdas).toHaveLength(4);
		for (const celda of celdas) {
			expect(celda.classList.contains("visitadora-recorte")).toBe(false);
			expect(celda.querySelector(":scope > .visitadora-recorte")).not.toBeNull();
		}
	});

	test("una semana sin visitas lo dice", async () => {
		visitas.current = [];
		await mostrar();
		expect(screen.getByText("No hay visitas capturadas en esta semana.")).toBeInTheDocument();
	});
});
