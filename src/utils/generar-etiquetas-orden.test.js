const mockDoc = {
	addImage: jest.fn(),
	addPage: jest.fn(),
	output: jest.fn(() => new Blob()),
	setCharSpace: jest.fn(),
	setFont: jest.fn(),
	setFontSize: jest.fn(),
	setProperties: jest.fn(),
	splitTextToSize: jest.fn((texto) => [String(texto)]),
	text: jest.fn(),
};

jest.mock('jspdf', () => jest.fn(() => mockDoc));
jest.mock('jsbarcode', () => jest.fn());
jest.mock('./abrir-pdf-en-pestana', () => ({ abrirPdfEnPestana: jest.fn() }));

import { abrirPdfEnPestana } from './abrir-pdf-en-pestana';
import {
	crearDocumentoEtiquetasOrden,
	generarEtiquetasOrden,
} from './generar-etiquetas-orden';

const laboratorio = {
	folio: 'C0001',
	paciente: 'Ana Ruiz',
	sexo: 'femenino',
	estudios: [{ modulo: 'laboratorio', clave: 'BH', recipiente: 'Tubo lila', tipo_muestra: 'Sangre' }],
};

const imagen = {
	folio: 'B0001',
	fecha: '2026-08-07T10:00:00',
	paciente: 'Ana Ruiz',
	doctor: 'Barreto, Hector',
	estudios: [{ modulo: 'imagen', descripcion: 'RM CRANEO SIMPLE' }],
};

beforeAll(() => {
	URL.createObjectURL = jest.fn(() => 'blob:etiquetas');
});

beforeEach(() => jest.clearAllMocks());

// El caso reportado: una orden de pura imagen abría una pestaña que se cerraba
// sola porque la primera la ocupaba el laboratorio, que no tenía nada.
test('una orden de pura imagen abre su etiqueta en la única pestaña', () => {
	const ventana = { close: jest.fn() };

	const resultado = generarEtiquetasOrden({ folio: 'B0001', imagen, ventana });

	expect(resultado).toMatchObject({ generado: true, imagen: true, laboratorio: false });
	expect(ventana.close).not.toHaveBeenCalled();
	expect(abrirPdfEnPestana).toHaveBeenCalledWith(expect.objectContaining({ ventana }));
});

test('una orden de puro laboratorio también sale', () => {
	expect(generarEtiquetasOrden({ folio: 'C0001', laboratorio })).toMatchObject({
		generado: true,
		laboratorio: true,
		imagen: false,
	});
});

test('una orden con las dos cosas sale en un solo PDF', () => {
	const resultado = generarEtiquetasOrden({ folio: 'C0001', laboratorio, imagen });

	expect(resultado).toMatchObject({ generado: true, laboratorio: true, imagen: true });
	expect(abrirPdfEnPestana).toHaveBeenCalledTimes(1);
	// La etiqueta de imagen abre página propia para no encimarse con la última
	// del laboratorio.
	expect(mockDoc.addPage).toHaveBeenCalled();
});

test('sin etiquetas que generar cierra la pestaña y avisa', () => {
	const ventana = { close: jest.fn() };

	const resultado = generarEtiquetasOrden({
		folio: 'C0002',
		laboratorio: { ...laboratorio, estudios: [] },
		imagen: { ...imagen, estudios: [] },
		ventana,
	});

	expect(resultado.generado).toBe(false);
	expect(ventana.close).toHaveBeenCalled();
	expect(abrirPdfEnPestana).not.toHaveBeenCalled();
});

// La reimpresión desde editar orden arma el documento y lo abre después, desde
// el clic: si aquí se abriera solo, el navegador ya no reconocería el clic,
// bloquearía la pestaña y el PDF terminaría descargado en lugar de impreso.
test('el documento se arma sin abrir ninguna pestaña', () => {
	const documento = crearDocumentoEtiquetasOrden({ folio: 'C0001', laboratorio, imagen });

	expect(documento).toMatchObject({
		url: 'blob:etiquetas',
		titulo: 'Etiqueta C0001',
		laboratorio: true,
		imagen: true,
	});
	expect(abrirPdfEnPestana).not.toHaveBeenCalled();
});

test('sin etiquetas que generar no hay documento que imprimir', () => {
	expect(
		crearDocumentoEtiquetasOrden({
			folio: 'C0002',
			laboratorio: { ...laboratorio, estudios: [] },
			imagen: { ...imagen, estudios: [] },
		}),
	).toBeNull();
});
