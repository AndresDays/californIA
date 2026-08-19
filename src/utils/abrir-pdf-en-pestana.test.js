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
