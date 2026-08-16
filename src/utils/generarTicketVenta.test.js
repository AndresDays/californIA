const mockDoc = {
	addImage: jest.fn(),
	line: jest.fn(),
	output: jest.fn(() => new Blob()),
	setDrawColor: jest.fn(),
	setFont: jest.fn(),
	setFontSize: jest.fn(),
	setLineWidth: jest.fn(),
	setProperties: jest.fn(),
	splitTextToSize: jest.fn((texto) => [texto]),
	text: jest.fn(),
};

jest.mock('jspdf', () => jest.fn(() => mockDoc));
jest.mock('jsbarcode', () => jest.fn());
jest.mock('qrcode', () => ({ toDataURL: jest.fn().mockResolvedValue('qr') }));
jest.mock('../assets/logoCDC.jpg', () => {
	throw new Error('El logo no forma parte de esta prueba');
});

import {
	generarTicketVenta,
	resolverEmpresaTicketReimpresion,
	resolverRfcTicketEmpresa,
} from './generarTicketVenta';

describe('resolverRfcTicketEmpresa', () => {
	test.each([
		['CDC', 'CDC031217UMA'],
		['Centro Diagnostico California', 'CDC031217UMA'],
		['CDI', 'CDI200902A84'],
		['Centro de Diagnostico por Imagen PVR', 'CDI200902A84'],
	])('resuelve %s', (empresa, esperado) => {
		expect(resolverRfcTicketEmpresa(empresa)).toBe(esperado);
	});

	test.each(['', 'Empresa externa'])('rechaza empresa sin RFC: %s', (empresa) => {
		expect(() => resolverRfcTicketEmpresa(empresa)).toThrow(
			'No existe RFC configurado para la empresa seleccionada',
		);
	});
});

describe('resolverEmpresaTicketReimpresion', () => {
	test.each([
		['CENTRAL DIAGNOSTICA CALIFORNIA', 'CENTRAL DIAGNOSTICA CALIFORNIA'],
		['CENTRO DE DIAGNOSTICO POR IMAGEN PVR', 'CENTRO DE DIAGNOSTICO POR IMAGEN PVR'],
		[null, 'CDC'],
	])('conserva el emisor de una reimpresion o usa CDC para historicos', (empresa, esperado) => {
		expect(resolverEmpresaTicketReimpresion(empresa)).toBe(esperado);
	});
});

describe('generarTicketVenta', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'barcode');
		URL.createObjectURL = jest.fn(() => 'blob:ticket');
		window.open = jest.fn();
	});

	test('escribe el RFC de CDI en el encabezado', async () => {
		await generarTicketVenta({
			folio: 'V-001',
			fecha: new Date('2026-08-05T12:00:00'),
			paciente: 'Paciente',
			empresa: 'CDI',
			telefono: '3221234567',
			email: 'paciente@example.com',
			estudios: [],
		});

		expect(mockDoc.text).toHaveBeenCalledWith(
			'RFC: CDI200902A84',
			expect.any(Number),
			expect.any(Number),
			expect.objectContaining({ align: 'center' }),
		);
		expect(mockDoc.text).toHaveBeenCalledWith(
			'Email: paciente@example.com',
			expect.any(Number),
			expect.any(Number),
			expect.objectContaining({ align: 'center' }),
		);
		expect(mockDoc.text).toHaveBeenCalledWith(
			'Telefono: 3221234567',
			expect.any(Number),
			expect.any(Number),
			expect.objectContaining({ align: 'center' }),
		);
		expect(mockDoc.setProperties).toHaveBeenCalledWith({ title: 'Ticket V-001' });
		expect(window.open).toHaveBeenCalledWith('', '_blank');
	});
});
