jest.mock("./generarTicketVenta", () => ({ generarTicketVenta: jest.fn() }));
jest.mock("./generar-etiquetas-estudios-laboratorio", () => ({
	generarEtiquetasEstudiosLaboratorio: jest.fn(),
}));
jest.mock("./generar-etiquetas-estudios-imagen", () => ({
	generarEtiquetasEstudiosImagen: jest.fn(),
}));

import { imprimirComprobantesVenta } from "./imprimir-comprobantes-venta";
import { generarTicketVenta } from "./generarTicketVenta";
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

		expect(generarTicketVenta).toHaveBeenCalled();
		expect(generarEtiquetasEstudiosLaboratorio).toHaveBeenCalled();
		expect(generarEtiquetasEstudiosImagen).toHaveBeenCalled();
		expect(resultado.error).toBe("");
	});

	test("un ticket que falla no impide las etiquetas ni tira la venta", async () => {
		generarTicketVenta.mockRejectedValueOnce(
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

	test("reporta todo lo que no se pudo abrir", async () => {
		generarTicketVenta.mockRejectedValueOnce(new Error("falla"));
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
