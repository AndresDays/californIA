jest.mock('jspdf', () => jest.fn());
jest.mock('jsbarcode', () => jest.fn());
jest.mock('qrcode', () => ({ toDataURL: jest.fn() }));

import { resolverRfcTicketEmpresa } from './generarTicketVenta';

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
