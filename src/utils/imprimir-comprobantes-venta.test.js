jest.mock("./generarTicketVenta", () => ({
	generarTicketsVenta: jest.fn(),
	crearDocumentoTicketsVenta: jest.fn(),
}));
jest.mock("./generar-etiquetas-estudios-laboratorio", () => ({
	generarEtiquetasEstudiosLaboratorio: jest.fn(),
	crearDocumentoEtiquetasLaboratorio: jest.fn(),
}));
jest.mock("./generar-etiquetas-estudios-imagen", () => ({
	generarEtiquetasEstudiosImagen: jest.fn(),
	crearDocumentoEtiquetasImagen: jest.fn(),
}));

import {
	imprimirComprobantesVenta,
	prepararComprobantesVenta,
} from "./imprimir-comprobantes-venta";
import { crearDocumentoTicketsVenta, generarTicketsVenta } from "./generarTicketVenta";
import {
	crearDocumentoEtiquetasLaboratorio,
	generarEtiquetasEstudiosLaboratorio,
} from "./generar-etiquetas-estudios-laboratorio";
import {
	crearDocumentoEtiquetasImagen,
	generarEtiquetasEstudiosImagen,
} from "./generar-etiquetas-estudios-imagen";

const crearVentana = () => ({ close: jest.fn() });

describe("imprimirComprobantesVenta", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	test("imprime ticket y etiquetas cuando todo sale bien", async () => {
		const resultado = await imprimirComprobantesVenta({
			ticket: { folio: "F-1", ventana: crearVentana() },
			etiquetasLaboratorio: { folio: "F-1", ventana: crearVentana() },
			etiquetasImagen: { folio: "F-1", ventana: crearVentana() },
		});

		expect(generarTicketsVenta).toHaveBeenCalled();
		expect(generarEtiquetasEstudiosLaboratorio).toHaveBeenCalled();
		expect(generarEtiquetasEstudiosImagen).toHaveBeenCalled();
		expect(resultado.error).toBe("");
	});

	test("un ticket que falla no impide las etiquetas ni tira la venta", async () => {
		generarTicketsVenta.mockRejectedValueOnce(
			new Error("No existe RFC configurado para la empresa seleccionada"),
		);
		const ventanaTicket = crearVentana();
		const ventanaEtiquetas = crearVentana();

		const resultado = await imprimirComprobantesVenta({
			ticket: { folio: "F-1", ventana: ventanaTicket },
			etiquetasLaboratorio: { folio: "F-1", ventana: ventanaEtiquetas },
		});

		expect(generarEtiquetasEstudiosLaboratorio).toHaveBeenCalled();
		expect(ventanaTicket.close).toHaveBeenCalled();
		expect(ventanaEtiquetas.close).not.toHaveBeenCalled();
		expect(resultado.error).toBe(
			"No fue posible abrir el ticket: No existe RFC configurado para la empresa seleccionada",
		);
	});

	test("un comprobante colgado no deja la venta a medias", async () => {
		jest.useFakeTimers();
		// Una promesa que nunca resuelve: es lo que pasaba cuando el logo del
		// ticket no cargaba, y ningún catch lo atrapaba.
		generarTicketsVenta.mockImplementationOnce(() => new Promise(() => {}));
		const ventanaTicket = crearVentana();

		const promesa = imprimirComprobantesVenta({
			ticket: { folio: "F-1", ventana: ventanaTicket },
		});
		await jest.advanceTimersByTimeAsync(15000);
		const resultado = await promesa;

		expect(ventanaTicket.close).toHaveBeenCalled();
		expect(resultado.error).toContain("tardó demasiado en generarse");
		jest.useRealTimers();
	});

	test("reporta todo lo que no se pudo abrir", async () => {
		generarTicketsVenta.mockRejectedValueOnce(new Error("falla"));
		generarEtiquetasEstudiosImagen.mockImplementationOnce(() => {
			throw new Error("falla");
		});

		const resultado = await imprimirComprobantesVenta({
			ticket: { folio: "F-1", ventana: crearVentana() },
			etiquetasLaboratorio: { folio: "F-1", ventana: crearVentana() },
			etiquetasImagen: { folio: "F-1", ventana: crearVentana() },
		});

		expect(resultado.error).toBe("No fue posible abrir el ticket ni las etiquetas de imagen: falla");
	});
});

test("una orden que factura por dos empresas manda los dos tickets en un solo PDF", async () => {
	jest.clearAllMocks();
	const ventana = { close: jest.fn() };
	const resultado = await imprimirComprobantesVenta({
		tickets: [
			{ folio: "B0001", empresa: "CDC", ventana },
			{ folio: "A0001", empresa: "CDI" },
		],
	});

	expect(resultado.error).toBe("");
	expect(generarTicketsVenta).toHaveBeenCalledTimes(1);
	const [{ tickets, ventana: ventanaUsada }] = generarTicketsVenta.mock.calls[0];
	expect(tickets.map((t) => t.folio)).toEqual(["B0001", "A0001"]);
	expect(ventanaUsada).toBe(ventana);
});

// Un generador devuelve false cuando no halló nada que etiquetar. Antes eso
// cerraba la pestaña sin decir nada: en caja salía el ticket, las etiquetas no,
// y no quedaba rastro del motivo.
test("avisa cuando no hubo estudios que etiquetar", async () => {
	generarEtiquetasEstudiosImagen.mockReturnValue(false);

	const resultado = await imprimirComprobantesVenta({
		etiquetasImagen: { grupos: [], ventana: { close: jest.fn() } },
	});

	expect(resultado.error).toContain("las etiquetas de imagen");
	expect(resultado.error).toContain("no trae estudios que etiquetar");
});

// Los comprobantes se arman al guardar pero se abren desde el clic de quien
// cobra: abrir tres pestañas de golpe hacía que el navegador dejara pasar nada
// más la primera.
describe("prepararComprobantesVenta", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => jest.restoreAllMocks());

	test("devuelve un comprobante por documento, sin abrir nada", async () => {
		crearDocumentoTicketsVenta.mockResolvedValue({ url: "blob:t", titulo: "Ticket F-1" });
		crearDocumentoEtiquetasLaboratorio.mockReturnValue({ url: "blob:l", titulo: "Etiqueta F-1" });
		crearDocumentoEtiquetasImagen.mockReturnValue({ url: "blob:i", titulo: "Etiqueta F-2" });

		const resultado = await prepararComprobantesVenta({
			tickets: [{ folio: "F-1" }],
			etiquetasLaboratorio: { folio: "F-1" },
			etiquetasImagen: { grupos: [{ folio: "F-2" }] },
		});

		expect(resultado.error).toBe("");
		expect(resultado.comprobantes.map((c) => c.id)).toEqual([
			"ticket",
			"etiquetas-laboratorio",
			"etiquetas-imagen",
		]);
		expect(resultado.comprobantes[0]).toMatchObject({ url: "blob:t", etiqueta: "Imprimir ticket" });
		expect(generarTicketsVenta).not.toHaveBeenCalled();
		expect(generarEtiquetasEstudiosLaboratorio).not.toHaveBeenCalled();
		expect(generarEtiquetasEstudiosImagen).not.toHaveBeenCalled();
	});

	test("lo que no se pudo armar se reporta y no bloquea lo demás", async () => {
		crearDocumentoTicketsVenta.mockResolvedValue({ url: "blob:t", titulo: "Ticket F-1" });
		crearDocumentoEtiquetasImagen.mockReturnValue(null);

		const resultado = await prepararComprobantesVenta({
			tickets: [{ folio: "F-1" }],
			etiquetasImagen: { grupos: [] },
		});

		expect(resultado.comprobantes.map((c) => c.id)).toEqual(["ticket"]);
		expect(resultado.error).toContain("las etiquetas de imagen");
		expect(resultado.error).toContain("no trae estudios que etiquetar");
	});

	test("un documento que truena no tira los otros", async () => {
		crearDocumentoTicketsVenta.mockRejectedValue(new Error("sin logo"));
		crearDocumentoEtiquetasLaboratorio.mockReturnValue({ url: "blob:l", titulo: "Etiqueta F-1" });

		const resultado = await prepararComprobantesVenta({
			tickets: [{ folio: "F-1" }],
			etiquetasLaboratorio: { folio: "F-1" },
		});

		expect(resultado.comprobantes.map((c) => c.id)).toEqual(["etiquetas-laboratorio"]);
		expect(resultado.error).toContain("sin logo");
	});
});
