// El ticket se arma con jsPDF: se sustituye para poder leer qué se imprimió.
const mockTextos = [];
const mockPdf = {
	setFont: jest.fn(),
	setFontSize: jest.fn(),
	setLineWidth: jest.fn(),
	setDrawColor: jest.fn(),
	line: jest.fn(),
	addImage: jest.fn(),
	text: jest.fn((texto) => mockTextos.push(String(texto))),
	splitTextToSize: jest.fn((texto) => String(texto).split("\n")),
	output: jest.fn(() => new Blob(["%PDF"], { type: "application/pdf" })),
};
jest.mock("jspdf", () => ({
	__esModule: true,
	default: jest.fn(() => mockPdf),
}));

import { crearNombreArchivoCotizacion, generarPDFCotizacion } from "./generar-pdf-cotizacion";

const DATOS = {
	numeroCotizacion: "COT-01",
	fecha: "12/09/2026",
	cliente: "Ana Ruiz",
	estudios: [{ descripcion: "Biometria hematica", precio: 500 }],
	subtotal: 500,
	descuento: 0,
	total: 500,
};

// En jsdom no se carga el logo: la imagen falla y el ticket sigue su camino,
// que es justo la rama que interesa aquí.
beforeAll(() => {
	globalThis.Image = class {
		set src(_valor) {
			setTimeout(() => this.onerror?.(new Error("sin imagen en jsdom")), 0);
		}
	};
});

beforeEach(() => {
	mockTextos.length = 0;
	jest.clearAllMocks();
});

test("las condiciones capturadas salen impresas en el ticket", async () => {
	await generarPDFCotizacion(
		{ ...DATOS, condiciones: "Paciente en ayunas de 8 horas" },
		{ salida: "blob" },
	);

	expect(mockTextos).toContain("Condiciones del paciente:");
	expect(mockTextos).toContain("Paciente en ayunas de 8 horas");
});

test("sin condiciones el ticket no imprime el encabezado", async () => {
	await generarPDFCotizacion({ ...DATOS, condiciones: "   " }, { salida: "blob" });
	expect(mockTextos).not.toContain("Condiciones del paciente:");

	await generarPDFCotizacion(DATOS, { salida: "blob" });
	expect(mockTextos).not.toContain("Condiciones del paciente:");
});

test("el archivo se nombra con el folio de la cotización", () => {
	expect(crearNombreArchivoCotizacion("COT-01")).toBe("Cotizacion COT-01.pdf");
	expect(crearNombreArchivoCotizacion("")).toBe("Cotizacion sin folio.pdf");
});
