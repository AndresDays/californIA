import {
	agruparEstudiosPorRecipiente,
	generarEtiquetasEstudiosLaboratorio,
} from './generar-etiquetas-estudios-laboratorio';

const mockDoc = {
	addImage: jest.fn(),
	addPage: jest.fn(),
	output: jest.fn(() => new Blob()),
	setCharSpace: jest.fn(),
	setFont: jest.fn(),
	setFontSize: jest.fn(),
	text: jest.fn(),
};

jest.mock('jspdf', () => jest.fn(() => mockDoc));
jest.mock('jsbarcode', () => jest.fn());

import JsBarcode from 'jsbarcode';
import jsPDF from 'jspdf';

describe('agruparEstudiosPorRecipiente', () => {
	test('junta claves de laboratorio que usan el mismo recipiente', () => {
		expect(agruparEstudiosPorRecipiente([
			{
				modulo: 'laboratorio',
				clave: 'EGO',
				tipo_muestra: 'Orina',
				recipiente: 'Frasco estéril',
			},
			{
				modulo: 'laboratorio',
				clave: 'UROC',
				tipo_muestra: 'Orina',
				recipiente: 'Frasco estéril',
			},
			{
				modulo: 'laboratorio',
				clave: 'BHC',
				tipo_muestra: 'Sangre',
				recipiente: 'Tubo lila',
			},
		])).toEqual([
			{
				recipiente: 'Frasco estéril',
				tipoMuestra: 'Orina',
				claves: ['EGO', 'UROC'],
			},
			{
				recipiente: 'Tubo lila',
				tipoMuestra: 'Sangre',
				claves: ['BHC'],
			},
		]);
	});

	test('omite imagen, laboratorio sin recipiente y claves vacias', () => {
		expect(agruparEstudiosPorRecipiente([
			{ modulo: 'imagen', clave: 'RX', recipiente: 'N/A' },
			{ modulo: 'laboratorio', clave: 'QS6', recipiente: '' },
			{ modulo: 'laboratorio', clave: '', recipiente: 'Tubo amarillo' },
		])).toEqual([]);
	});
});

describe('generarEtiquetasEstudiosLaboratorio', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'barcode');
		URL.createObjectURL = jest.fn(() => 'blob:etiquetas');
		window.open = jest.fn();
	});

	test('genera un solo PDF con una pagina de 50 x 30 mm por recipiente', async () => {
		await generarEtiquetasEstudiosLaboratorio({
			folio: '0708260010',
			paciente: 'Alvarez Gonzalez Jose',
			sexo: 'Masculino',
			edad: '28 años',
			estudios: [
				{
					modulo: 'laboratorio',
					clave: 'EGO',
					tipo_muestra: 'Orina',
					recipiente: 'Frasco estéril',
				},
				{
					modulo: 'laboratorio',
					clave: 'BHC',
					tipo_muestra: 'Sangre',
					recipiente: 'Tubo lila',
				},
			],
		});

		expect(jsPDF).toHaveBeenCalledWith({
			unit: 'mm',
			format: [50, 30],
			orientation: 'landscape',
		});
		expect(mockDoc.addPage).toHaveBeenCalledWith([50, 30], 'landscape');
		expect(JsBarcode).toHaveBeenCalledWith(
			expect.any(HTMLCanvasElement),
			'0708260010',
			expect.objectContaining({
				format: 'CODE128',
				width: 4,
				height: 105,
				displayValue: false,
				margin: 0,
			}),
		);
		expect(mockDoc.addImage).toHaveBeenCalledWith('barcode', 'PNG', 4, 7.2, 42, 15);
		expect(mockDoc.setCharSpace).toHaveBeenCalledWith(1.2);
		expect(mockDoc.text).toHaveBeenCalledWith('0708260010', 25, 24.8, { align: 'center' });
		expect(mockDoc.text).toHaveBeenCalledWith(
			'ALVAREZ GONZALEZ JOSE',
			25,
			3,
			expect.any(Object),
		);
		expect(mockDoc.text).toHaveBeenCalledWith(
			'Masculino - 28 años - Frasco estéril',
			25,
			5.8,
			expect.any(Object),
		);
		expect(mockDoc.text).toHaveBeenCalledWith(
			'EGO',
			expect.any(Number),
			expect.any(Number),
			expect.any(Object),
		);
		expect(mockDoc.text).toHaveBeenCalledWith(
			'BHC',
			expect.any(Number),
			expect.any(Number),
			expect.any(Object),
		);
		expect(window.open).toHaveBeenCalledTimes(1);
	});

	test('carga el PDF en una pestaña reservada desde guardar e imprimir', () => {
		const ventana = { location: { href: '' } };
		generarEtiquetasEstudiosLaboratorio({
			folio: '0708260010', paciente: 'Paciente', ventana,
			estudios: [{ modulo: 'laboratorio', clave: 'EGO', recipiente: 'Frasco estéril' }],
		});
		expect(ventana.location.href).toBe('blob:etiquetas');
		expect(window.open).not.toHaveBeenCalled();
	});
});
