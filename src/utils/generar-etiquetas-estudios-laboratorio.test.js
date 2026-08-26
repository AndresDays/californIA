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
	setProperties: jest.fn(),
	splitTextToSize: jest.fn((texto, ancho) => {
		// Aproxima el salto de línea del PDF: un nombre largo ocupa dos renglones.
		const limite = Math.round(ancho / 2.2);
		const texto1 = String(texto);
		if (texto1.length <= limite) return [texto1];
		const corte = texto1.lastIndexOf(' ', limite) > 0 ? texto1.lastIndexOf(' ', limite) : limite;
		return [texto1.slice(0, corte), texto1.slice(corte).trim()];
	}),
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
		expect(mockDoc.setProperties).toHaveBeenCalledWith({ title: 'Etiqueta 0708260010' });
		expect(mockDoc.addPage).toHaveBeenCalledWith([50, 30], 'landscape');
		expect(JsBarcode).toHaveBeenCalledWith(
			expect.any(HTMLCanvasElement),
			'0708260010',
			expect.objectContaining({
				format: 'CODE128',
				width: 2,
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
			4,
			27.5,
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
		const replace = jest.fn();
		const ventana = { location: { replace } };
		generarEtiquetasEstudiosLaboratorio({
			folio: '0708260010', paciente: 'Paciente', ventana,
			estudios: [{ modulo: 'laboratorio', clave: 'EGO', recipiente: 'Frasco estéril' }],
		});
		expect(replace).toHaveBeenCalledWith('blob:etiquetas');
		expect(window.open).not.toHaveBeenCalled();
	});
});

describe('nombres largos en la etiqueta', () => {
	const estudios = [
		{ modulo: 'laboratorio', clave: 'COPROL', recipiente: 'Frasco', tipo_muestra: 'Heces' },
	];

	const posiciones = () =>
		mockDoc.text.mock.calls.map(([texto, , y]) => ({ texto: String(texto), y }));

	beforeEach(() => jest.clearAllMocks());

	// El caso de la etiqueta impresa: el segundo renglón del nombre se encimaba
	// con el sexo y el recipiente, que estaban en una altura fija.
	test('el sexo y el recipiente quedan debajo del nombre de dos renglones', () => {
		generarEtiquetasEstudiosLaboratorio({
			folio: '2508260006',
			paciente: 'Soto Estrada Lorenna Yanet',
			sexo: 'femenino',
			estudios,
		});

		const renglones = posiciones();
		const encabezado = renglones.find(({ texto }) => texto.includes('femenino'));
		const lineasNombre = renglones.filter(({ texto }) => /SOTO|YANET/.test(texto));

		expect(lineasNombre.length).toBeGreaterThan(1);
		lineasNombre.forEach(({ y }) => expect(encabezado.y).toBeGreaterThan(y));
	});

	test('el código de barras baja para no encimarse con el nombre', () => {
		generarEtiquetasEstudiosLaboratorio({
			folio: '2508260006',
			paciente: 'Soto Estrada Lorenna Yanet',
			sexo: 'femenino',
			estudios,
		});
		const [, , , yBarcodeLargo, , altoLargo] = mockDoc.addImage.mock.calls[0];

		jest.clearAllMocks();
		generarEtiquetasEstudiosLaboratorio({
			folio: '2508260006',
			paciente: 'Ana Ruiz',
			sexo: 'femenino',
			estudios,
		});
		const [, , , yBarcodeCorto, , altoCorto] = mockDoc.addImage.mock.calls[0];

		expect(yBarcodeLargo).toBeGreaterThan(yBarcodeCorto);
		// Y termina a la misma altura, para no invadir el folio ni las claves.
		expect(yBarcodeLargo + altoLargo).toBeCloseTo(yBarcodeCorto + altoCorto, 1);
	});
});
