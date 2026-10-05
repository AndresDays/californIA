import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

jest.mock("./cotizacion.css", () => ({}));
jest.mock("../../../assets/empresaIcono.png", () => "empresaIcono.png");
jest.mock("../../../assets/pacienteIcono.png", () => "pacienteIcono.png");
jest.mock("../../../components/page-layout.jsx", () => ({
	__esModule: true,
	default: ({ children }) => <div>{children}</div>,
}));
jest.mock("../../../components/ModalNotificacion", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("../../../context/auth-context", () => ({
	useAuth: () => ({ user: { id: "user-1" }, empleadoData: { nombre: "Ana", rol: "recepcionista" } }),
}));
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }));

const pdfFalso = new Blob(["%PDF"], { type: "application/pdf" });
jest.mock("../../../utils/generar-pdf-cotizacion", () => ({
	generarPDFCotizacion: jest.fn().mockResolvedValue(new Blob(["%PDF"], { type: "application/pdf" })),
	crearNombreArchivoCotizacion: (numero) => `Cotizacion ${numero}.pdf`,
}));

const COTIZACION = {
	id_cotizacion: 1,
	numero_cotizacion: "COT-01",
	nombre_paciente: "Ana Ruiz",
	fecha_cotizacion: "2026-09-12T18:00:00Z",
	total: 500,
	descuento: 0,
	descuento_porcentaje: 0,
	estudios: JSON.stringify([{ descripcion: "BIOMETRIA HEMATICA", precio: 500 }]),
};

jest.mock("../../../lib/supabase-client", () => {
	const cadena = {
		select: jest.fn().mockReturnThis(),
		eq: jest.fn().mockReturnThis(),
		gte: jest.fn().mockReturnThis(),
		lte: jest.fn().mockReturnThis(),
		insert: jest.fn().mockReturnThis(),
		maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
		single: jest.fn().mockResolvedValue({ data: {}, error: null }),
		order: jest.fn(),
	};
	const almacen = {
		upload: jest.fn().mockResolvedValue({ error: null }),
		createSignedUrl: jest.fn().mockResolvedValue({
			data: { signedUrl: "https://supabase.test/ticket-firmado.pdf" },
			error: null,
		}),
	};
	return {
		supabase: {
			from: jest.fn(() => cadena),
			storage: { from: jest.fn(() => almacen) },
			__cadena: cadena,
			__almacen: almacen,
		},
	};
});

import Cotizacion from "./cotizacion";
import { supabase } from "../../../lib/supabase-client";
import { generarPDFCotizacion } from "../../../utils/generar-pdf-cotizacion";

const renderCotizacion = async () => {
	// La tabla de cotizaciones guardadas es lo único que necesita datos.
	supabase.__cadena.order.mockResolvedValue({ data: [COTIZACION], error: null });
	await act(async () => {
		render(<Cotizacion />);
	});
};

describe("Enviar una cotización", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		generarPDFCotizacion.mockResolvedValue(pdfFalso);
		window.open = jest.fn(() => ({ location: { href: "" }, close: jest.fn() }));
	});

	afterEach(() => {
		delete navigator.share;
		delete navigator.canShare;
	});

	// Lo que se manda es el ticket, no un resumen escrito.
	test("por WhatsApp se comparte el PDF del ticket", async () => {
		const compartir = jest.fn().mockResolvedValue(undefined);
		navigator.canShare = () => true;
		navigator.share = compartir;

		await renderCotizacion();
		const [enviarWhatsApp] = await screen.findAllByRole("button", { name: "Enviar" });
		await act(async () => {
			fireEvent.click(enviarWhatsApp);
		});

		await waitFor(() => expect(compartir).toHaveBeenCalledTimes(1));
		const compartido = compartir.mock.calls[0][0];
		expect(compartido.files[0].name).toBe("Cotizacion COT-01.pdf");
		expect(compartido.files[0].type).toBe("application/pdf");
		expect(generarPDFCotizacion).toHaveBeenCalledWith(
			expect.objectContaining({ numeroCotizacion: "COT-01" }),
			{ salida: "blob" },
		);
		// Compartido el archivo, no se abre además la conversación.
		expect(window.open).not.toHaveBeenCalled();
	});

	// Sin menú de compartir -escritorio- el adjunto no se puede poner solo, pero
	// tampoco hace falta descargarlo: el ticket se sube y viaja como enlace.
	test("sin menu de compartir no se descarga nada: se manda el enlace", async () => {
		const clic = jest
			.spyOn(HTMLAnchorElement.prototype, "click")
			.mockImplementation(() => {});
		URL.createObjectURL = jest.fn(() => "blob:x");
		URL.revokeObjectURL = jest.fn();

		await renderCotizacion();
		const [enviarWhatsApp] = await screen.findAllByRole("button", { name: "Enviar" });
		await act(async () => {
			fireEvent.click(enviarWhatsApp);
		});

		await waitFor(() =>
			expect(window.open).toHaveBeenCalledWith(
				expect.stringContaining("https://wa.me/"),
				"_blank",
			),
		);
		expect(clic).not.toHaveBeenCalled();
		clic.mockRestore();
	});
});

	// En el mostrador no hay menú de compartir y `wa.me` sólo lleva texto: el
	// ticket se sube y el mensaje lleva su enlace, para que el paciente abra el
	// mismo PDF que se le habría adjuntado.
	describe("sin menu de compartir, el ticket viaja como enlace", () => {
		test("sube el PDF y manda su enlace por WhatsApp", async () => {
			await renderCotizacion();
			const [enviarWhatsApp] = await screen.findAllByRole("button", { name: "Enviar" });
			await act(async () => {
				fireEvent.click(enviarWhatsApp);
			});

			await waitFor(() => expect(supabase.__almacen.upload).toHaveBeenCalled());
			const [ruta, blob, opciones] = supabase.__almacen.upload.mock.calls[0];
			expect(ruta).toBe("COT-01.pdf");
			expect(blob).toBe(pdfFalso);
			expect(opciones).toMatchObject({ contentType: "application/pdf", upsert: true });

			await waitFor(() => expect(window.open).toHaveBeenCalled());
			const [url] = window.open.mock.calls.at(-1);
			expect(url).toContain("https://wa.me/");
			expect(decodeURIComponent(url)).toContain("https://supabase.test/ticket-firmado.pdf");
		});

		test("el correo también lleva el enlace del ticket", async () => {
			await renderCotizacion();
			const botones = await screen.findAllByRole("button", { name: "Enviar" });
			await act(async () => {
				fireEvent.click(botones[1]);
			});

			await waitFor(() => expect(window.open).toHaveBeenCalled());
			const [url] = window.open.mock.calls.at(-1);
			expect(url).toContain("mailto:");
			expect(decodeURIComponent(url)).toContain("https://supabase.test/ticket-firmado.pdf");
		});

		// Una base sin el bucket no deja a recepción sin mandar la cotización.
		test("si no se puede subir, se descarga el ticket como antes", async () => {
			supabase.__almacen.upload.mockResolvedValueOnce({ error: { message: "Bucket not found" } });
			const clic = jest
				.spyOn(HTMLAnchorElement.prototype, "click")
				.mockImplementation(() => {});
			URL.createObjectURL = jest.fn(() => "blob:x");
			URL.revokeObjectURL = jest.fn();

			await renderCotizacion();
			const [enviarWhatsApp] = await screen.findAllByRole("button", { name: "Enviar" });
			await act(async () => {
				fireEvent.click(enviarWhatsApp);
			});

			await waitFor(() => expect(clic).toHaveBeenCalled());
			expect(window.open).toHaveBeenCalledWith(
				expect.stringContaining("https://wa.me/"),
				"_blank",
			);
			clic.mockRestore();
		});
	});
