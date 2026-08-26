jest.mock("./generarTicketVenta", () => ({ generarTicketsVenta: jest.fn() }));
jest.mock("./generar-etiquetas-estudios-laboratorio", () => ({
	generarEtiquetasEstudiosLaboratorio: jest.fn(),
}));
jest.mock("./generar-etiquetas-estudios-imagen", () => ({
	generarEtiquetasEstudiosImagen: jest.fn(),
}));

import { imprimirComprobantesVenta } from "./imprimir-comprobantes-venta";
import { generarTicketsVenta } from "./generarTicketVenta";
import { generarEtiquetasEstudiosLaboratorio } from "./generar-etiquetas-estudios-laboratorio";
import { generarEtiquetasEstudiosImagen } from "./generar-etiquetas-estudios-imagen";

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
