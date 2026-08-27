import { abrirPdfEnPestana } from './abrir-pdf-en-pestana';

describe('abrirPdfEnPestana', () => {
	test('lleva la pestaña directo al PDF en lugar de una página intermedia', () => {
		const replace = jest.fn();
		const ventana = { location: { replace } };
		window.open = jest.fn(() => ventana);

		abrirPdfEnPestana({ url: 'blob:ticket', titulo: 'Ticket V-001' });

		expect(window.open).toHaveBeenCalledWith('blob:ticket', '_blank');
		expect(replace).toHaveBeenCalledWith('blob:ticket');
	});

	test('reutiliza la pestaña abierta antes de generar el PDF', () => {
		const replace = jest.fn();
		const ventana = { location: { replace } };
		window.open = jest.fn();

		abrirPdfEnPestana({ url: 'blob:reporte', titulo: 'Reporte', ventana });

		expect(window.open).not.toHaveBeenCalled();
		expect(replace).toHaveBeenCalledWith('blob:reporte');
	});
});

// Al guardar se abren varias pestañas de un solo clic y el navegador deja pasar
// nada más la primera: antes las demás se perdían sin decir nada y en caja sólo
// salía el ticket.
describe("cuando el navegador bloquea la pestaña", () => {
	const abrirOriginal = window.open;

	afterEach(() => {
		window.open = abrirOriginal;
		jest.restoreAllMocks();
	});

	test("descarga el PDF en lugar de perderlo en silencio", () => {
		window.open = jest.fn(() => null);
		const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

		expect(abrirPdfEnPestana({ url: "blob:etiqueta", titulo: "Etiqueta B0002" })).toBeNull();
		expect(click).toHaveBeenCalled();
	});

	test("el archivo descargado lleva el nombre del comprobante", () => {
		window.open = jest.fn(() => null);
		let descargado = null;
		jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () {
			descargado = this.getAttribute("download");
		});

		abrirPdfEnPestana({ url: "blob:etiqueta", titulo: "Etiqueta B0002" });

		expect(descargado).toBe("Etiqueta B0002.pdf");
	});
});
