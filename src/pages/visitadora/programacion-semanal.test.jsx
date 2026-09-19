import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

jest.mock("./visitadora.css", () => ({}));
jest.mock("../../components/page-layout.jsx", () => ({
	__esModule: true,
	default: ({ children }) => <div>{children}</div>,
}));
jest.mock("../../components/ModalNotificacion", () => ({ __esModule: true, default: () => null }));
jest.mock("../../utils/exportar-informe-visitas", () => ({
	exportarProgramacionSemanal: jest.fn(),
}));

jest.mock("../../hooks/use-empleado-actual", () => ({
	useEmpleadoActual: () => ({
		empleadoData: { rol: "visitadora", id_empleado: 4 },
		formatRol: (rol) => rol,
		getPrimerNombre: () => "Ana",
	}),
}));

const mockGuardar = jest.fn().mockResolvedValue(undefined);
const dias = { current: [] };
jest.mock("../../hooks/use-programacion-visitas", () => ({
	useProgramacionSemanal: () => ({ data: dias.current, isLoading: false, error: null }),
	useGuardarDiaProgramacion: () => ({ mutateAsync: mockGuardar, isPending: false }),
	useImportarProgramacion: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock("../../hooks/use-doctores", () => ({
	useDoctores: () => ({
		data: { data: [{ id_doctor: 42, nombre: "Camila Ross" }], count: 1 },
	}),
}));

import * as XLSX from "xlsx";
import { ENCABEZADOS_PROGRAMACION } from "../../utils/importar-informe-visitas";
import ProgramacionSemanal from "./programacion-semanal";

const mostrar = async () => {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	await act(async () => {
		render(
			<QueryClientProvider client={queryClient}>
				<ProgramacionSemanal />
			</QueryClientProvider>,
		);
	});
};

beforeEach(() => {
	jest.useFakeTimers().setSystemTime(new Date("2026-08-19T12:00:00Z"));
	mockGuardar.mockClear();
	dias.current = [
		{
			id_programacion: "p1",
			dia_semana: 1,
			zona: "Torre coralia",
			objetivos: "Seguimiento y entrega de órdenes.",
			medicos_programados: [
				{ nombre: "Camila Ross", id_doctor: 42 },
				{ nombre: "Mona Khalaf", id_doctor: null },
			],
		},
	];
});

afterEach(() => jest.useRealTimers());

describe("ProgramacionSemanal", () => {
	test("muestra la semana completa de lunes a viernes aunque solo un dia este capturado", async () => {
		await mostrar();
		for (const dia of ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]) {
			expect(screen.getByText(dia)).toBeInTheDocument();
		}
	});

	test("llena el dia guardado y deja vacios los demas", async () => {
		await mostrar();
		expect(screen.getByLabelText("Zona del Lunes")).toHaveValue("Torre coralia");
		expect(screen.getByLabelText("Zona del Martes")).toHaveValue("");
		expect(screen.getByLabelText("Médicos del Lunes")).toHaveValue("Camila Ross, Mona Khalaf");
	});

	// La ficha verde marca al médico que ya existe en el catálogo; el gris
	// todavía no cuenta para comisiones.
	test("distingue al medico que existe en el catalogo del que no", async () => {
		await mostrar();
		const renglon = screen.getByText("Lunes").closest("tr");
		expect(within(renglon).getByText("Camila Ross")).toHaveClass("ligada");
		expect(within(renglon).getByText("Mona Khalaf")).not.toHaveClass("ligada");
	});

	test("guarda el dia con los medicos separados por comas", async () => {
		await mostrar();
		await act(async () => {
			fireEvent.change(screen.getByLabelText("Zona del Martes"), {
				target: { value: "Neomédica" },
			});
			fireEvent.change(screen.getByLabelText("Médicos del Martes"), {
				target: { value: "Camila Ross, Nadia Fierro" },
			});
		});
		const renglonMartes = screen.getByText("Martes").closest("tr");
		await act(async () => {
			fireEvent.click(within(renglonMartes).getByRole("button", { name: "Guardar" }));
		});

		expect(mockGuardar).toHaveBeenCalledWith({
			id_empleado: 4,
			semana_inicio: "2026-08-17",
			dia_semana: 2,
			zona: "Neomédica",
			objetivos: "",
			medicos_programados: [
				{ nombre: "Camila Ross", id_doctor: 42 },
				{ nombre: "Nadia Fierro", id_doctor: null },
			],
		});
	});

	// Si lo escrito se arrastrara al cambiar de semana, se guardaría la ruta de
	// una semana encima de la de al lado.
	test("al cambiar de semana descarta lo capturado sin guardar", async () => {
		await mostrar();
		await act(async () => {
			fireEvent.change(screen.getByLabelText("Zona del Martes"), {
				target: { value: "Escrito sin guardar" },
			});
		});
		expect(screen.getByLabelText("Zona del Martes")).toHaveValue("Escrito sin guardar");

		await act(async () => {
			fireEvent.click(screen.getByLabelText("Semana siguiente"));
		});
		expect(screen.getByText("Del 24 al 28 de agosto")).toBeInTheDocument();
		expect(screen.getByLabelText("Zona del Martes")).toHaveValue("");
	});

	// El navegador suelta el archivo en cuanto se vacía el campo, y la lectura se
	// quedaba a medias: la importación entraba una de cada tantas veces.
	describe("importar Excel", () => {
		const libroDePrueba = () => {
			const hoja = XLSX.utils.aoa_to_sheet([
				ENCABEZADOS_PROGRAMACION,
				["Lunes", "Centro", "Camila Ross", "Entregar listas"],
			]);
			const libro = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(libro, hoja, "Programacion");
			return XLSX.write(libro, { type: "array", bookType: "xlsx" });
		};

		// El campo se vacía para poder volver a elegir el mismo archivo; el archivo
		// sólo se deja leer mientras el campo aún lo tiene tomado.
		const archivoSoltadoAlVaciar = (campo, bytes) => ({
			name: "programacion.xlsx",
			arrayBuffer: async () => {
				if (campo.value === "") {
					throw new Error("The requested file could not be read");
				}
				return bytes;
			},
		});

		const elegirArchivo = async (campo, archivo) => {
			Object.defineProperty(campo, "files", { value: [archivo], configurable: true });
			Object.defineProperty(campo, "value", {
				value: "C:\\fakepath\\programacion.xlsx",
				writable: true,
				configurable: true,
			});
			await act(async () => {
				fireEvent.change(campo);
			});
		};

		test("lee el archivo elegido y enseña la revisión previa", async () => {
			await mostrar();
			const campo = document.querySelector('input[type="file"]');

			await elegirArchivo(campo, archivoSoltadoAlVaciar(campo, libroDePrueba()));

			expect(screen.getByText("Revisar antes de importar")).toBeInTheDocument();
		});

		test("el campo queda vacío para poder reintentar con el mismo archivo", async () => {
			await mostrar();
			const campo = document.querySelector('input[type="file"]');

			await elegirArchivo(campo, archivoSoltadoAlVaciar(campo, libroDePrueba()));

			expect(campo.value).toBe("");
		});
	});
});
