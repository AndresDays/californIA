import { abrirPdfEnPestana } from './abrir-pdf-en-pestana';

describe('abrirPdfEnPestana', () => {
	test('usa el titulo indicado en la pestana que contiene el PDF', () => {
		const asignarTitulo = jest.fn();
		const documento = { open: jest.fn(), write: jest.fn(), close: jest.fn() };
		Object.defineProperty(documento, 'title', { get: () => '', set: asignarTitulo });
		const ventana = {
			document: documento,
		};
		window.open = jest.fn(() => ventana);

		abrirPdfEnPestana({ url: 'blob:ticket', titulo: 'Ticket V-001' });

		expect(window.open).toHaveBeenCalledWith('', '_blank');
		expect(asignarTitulo).toHaveBeenLastCalledWith('Ticket V-001');
		expect(asignarTitulo.mock.invocationCallOrder.at(-1)).toBeGreaterThan(
			documento.close.mock.invocationCallOrder[0],
		);
		expect(ventana.document.write).toHaveBeenCalledWith(
			expect.stringContaining('src="blob:ticket"'),
		);
	});
});
