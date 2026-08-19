import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("./portal-resultados.css", () => ({}));
jest.mock("../assets/CalifornIA.png", () => "california.png");
jest.mock("./radiologia/pages/reporte-radiologia-template", () => ({ MEMBRETE_B64: "MEMBRETE" }));
jest.mock("../lib/supabase-client", () => ({
	supabase: { functions: { invoke: jest.fn() }, rpc: jest.fn() },
}));
jest.mock("../utils/reporte-pdf", () => ({ generarResultadosCombinadosPdf: jest.fn() }));
jest.mock("react-router-dom", () => ({ useSearchParams: () => [new URLSearchParams()] }));

import PortalResultados from "./portal-resultados";
import { supabase } from "../lib/supabase-client";
import { generarResultadosCombinadosPdf } from "../utils/reporte-pdf";

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
		window.open = jest.fn();
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

	test("muestra acciones por estudio de imagen sin exponer la interpretación HTML", async () => {
		const imagen = {
			id: 19,
			tipo: "imagen",
			descripcion: "RX de tórax",
			estado: "interpretado",
			reporte: "<p>Sin hallazgos agudos.</p>",
		};
		supabase.functions.invoke.mockResolvedValue({
			data: { ...resultadoSeguro, estudios: [imagen] },
			error: null,
		});
		render(<PortalResultados />);
		fireEvent.change(screen.getByPlaceholderText("Ej. 1105260004"), { target: { value: "F-17" } });
		fireEvent.change(screen.getByPlaceholderText("10 digitos"), { target: { value: "3221234567" } });
		fireEvent.click(screen.getByRole("button", { name: "Consultar" }));

		const visor = await screen.findByRole("link", { name: "Ver visor del paciente" });
		expect(visor).toHaveAttribute("href", "/visor-paciente/19");
		expect(visor).toHaveAttribute("target", "_blank");
		expect(visor).toHaveAttribute("rel", "noopener noreferrer");
		expect(screen.queryByText("<p>Sin hallazgos agudos.</p>")).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Ver PDF de interpretación" }));
		await waitFor(() => expect(generarResultadosCombinadosPdf).toHaveBeenCalledWith(expect.objectContaining({
			venta: resultadoSeguro.venta,
			estudios: [imagen],
		})));
		expect(window.open).toHaveBeenCalledWith("blob:combinado", "_blank", "noopener,noreferrer");
	});
});
