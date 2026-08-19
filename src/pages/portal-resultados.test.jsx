import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("./portal-resultados.css", () => ({}));
jest.mock("../assets/CalifornIA.png", () => "california.png");
jest.mock("./radiologia/pages/reporte-radiologia-template", () => ({ MEMBRETE_B64: "MEMBRETE" }));
jest.mock("../lib/supabase-client", () => ({
	supabase: { functions: { invoke: jest.fn() }, rpc: jest.fn() },
}));
jest.mock("../utils/reporte-pdf", () => ({
	generarResultadosCombinadosPdf: jest.fn(),
	generarReportePdf: jest.fn(),
	crearNombreArchivoReporte: () => "reporte.pdf",
}));
jest.mock("../utils/abrir-pdf-en-pestana", () => ({ abrirPdfEnPestana: jest.fn() }));
jest.mock("react-router-dom", () => ({ useSearchParams: () => [new URLSearchParams()] }));

import PortalResultados from "./portal-resultados";
import { supabase } from "../lib/supabase-client";
import { generarReportePdf, generarResultadosCombinadosPdf } from "../utils/reporte-pdf";

const resultadoSeguro = {
	encontrado: true,
	autorizado: true,
	venta: { paciente: "Ana Pérez", folio: "F-17", fecha_venta: "2026-08-06", cliente: "Particular" },
	estudios: [
		{
			id: 17,
			tipo: "laboratorio",
			descripcion: "Cultivo de orina",
			estado: "validado",
			analitos: [],
			archivo_cultivo_url: "https://storage.test/sign/17/cultivo.pdf",
		},
		{ id: 18, tipo: "laboratorio", descripcion: "BHC", estado: "validado", analitos: [] },
	],
};

describe("PortalResultados", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		supabase.functions.invoke.mockResolvedValue({ data: resultadoSeguro, error: null });
		generarResultadosCombinadosPdf.mockResolvedValue("blob:combinado");
		generarReportePdf.mockResolvedValue(undefined);
		window.open = jest.fn(() => ({ close: jest.fn() }));
	});

	test("consulta el Edge Function y muestra que el cultivo está adjunto sin exponer rutas", async () => {
		render(<PortalResultados />);
		fireEvent.change(screen.getByPlaceholderText("Ej. 1105260004"), { target: { value: "F-17" } });
		fireEvent.change(screen.getByPlaceholderText("10 digitos"), { target: { value: "3221234567" } });
		fireEvent.click(screen.getByRole("button", { name: "Consultar" }));

		await waitFor(() => expect(supabase.functions.invoke).toHaveBeenCalledWith("portal-resultados", {
			body: { p_folio: "F-17", p_telefono: "3221234567" },
		}));
		expect(supabase.rpc).not.toHaveBeenCalled();
		expect(screen.getByText("PDF de cultivo adjunto.")).toBeInTheDocument();
		expect(screen.queryByText("17/cultivo.pdf")).not.toBeInTheDocument();
	});

	test("genera un PDF combinado con BHC y la URL firmada de cultivo devuelta por el endpoint", async () => {
		render(<PortalResultados />);
		fireEvent.change(screen.getByPlaceholderText("Ej. 1105260004"), { target: { value: "F-17" } });
		fireEvent.change(screen.getByPlaceholderText("10 digitos"), { target: { value: "3221234567" } });
		fireEvent.click(screen.getByRole("button", { name: "Consultar" }));
		await screen.findByText("PDF de cultivo adjunto.");
		fireEvent.click(screen.getByRole("button", { name: "Ver PDF" }));

		await waitFor(() => expect(generarResultadosCombinadosPdf).toHaveBeenCalledWith(expect.objectContaining({
			venta: resultadoSeguro.venta,
			estudios: resultadoSeguro.estudios,
		})));
	});

	describe("estudios de imagen", () => {
		const conImagen = {
			...resultadoSeguro,
			estudios: [
				{
					id: 42,
					tipo: "imagen",
					descripcion: "R. M. de hombro",
					estado: "interpretado",
					reporte: "HALLAZGOS: sin alteraciones.",
					fecha_estudio: "2026-08-10",
				},
			],
		};

		const consultar = async () => {
			supabase.functions.invoke.mockResolvedValue({ data: conImagen, error: null });
			render(<PortalResultados />);
			fireEvent.change(screen.getByPlaceholderText("Ej. 1105260004"), { target: { value: "F-17" } });
			fireEvent.change(screen.getByPlaceholderText("10 digitos"), { target: { value: "3221234567" } });
			fireEvent.click(screen.getByRole("button", { name: "Consultar" }));
			await screen.findByText("R. M. de hombro");
		};

		test("abre el visor del estudio con el folio y teléfono consultados", async () => {
			await consultar();

			fireEvent.click(screen.getByRole("button", { name: "Ver estudio" }));

			expect(window.open).toHaveBeenCalledWith(
				"/visor-paciente/42?folio=F-17&telefono=3221234567",
				"_blank",
				"noopener,noreferrer",
			);
		});

		test("no repite los botones del estudio de imagen", async () => {
			await consultar();

			expect(screen.queryByText("Ver visor del paciente")).not.toBeInTheDocument();
			expect(screen.queryByText("Ver PDF de interpretación")).not.toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Ver estudio" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Ver PDF" })).toBeInTheDocument();
		});

		test("el PDF del portal lleva la firma del radiólogo del estudio", async () => {
			await consultar();
			supabase.functions.invoke.mockResolvedValue({
				data: { radiologo: { nombre: "Dra. Odile Desage", firmaUrl: "https://firmas.test/o.png" } },
				error: null,
			});

			fireEvent.click(screen.getByRole("button", { name: "Ver PDF" }));

			await waitFor(() => expect(generarReportePdf).toHaveBeenCalledWith(expect.objectContaining({
				firma: expect.objectContaining({ nombre: "Dra. Odile Desage" }),
			})));
			expect(supabase.functions.invoke).toHaveBeenCalledWith("portal-resultados", {
				body: { p_folio: "F-17", p_telefono: "3221234567", p_id_estudio: "42" },
			});
		});

		test("muestra el PDF del último reporte guardado", async () => {
			await consultar();

			fireEvent.click(screen.getByRole("button", { name: "Ver PDF" }));

			await waitFor(() => expect(generarReportePdf).toHaveBeenCalledWith(expect.objectContaining({
				reporteTexto: "HALLAZGOS: sin alteraciones.",
				imprimir: true,
			})));
			expect(generarResultadosCombinadosPdf).not.toHaveBeenCalled();
		});
	});
});
