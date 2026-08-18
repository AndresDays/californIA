import JsPDF from 'jspdf';
import {
	agruparEstudiosImagen,
	generarEtiquetasEstudiosImagen,
} from './generar-etiquetas-estudios-imagen';

const mockDoc = {
	addPage: jest.fn(),
	output: jest.fn(() => new Blob()),
	setFont: jest.fn(),
	setFontSize: jest.fn(),
	setProperties: jest.fn(),
	text: jest.fn(),
};

jest.mock('jspdf', () => jest.fn(() => mockDoc));

describe('agruparEstudiosImagen', () => {
	test('conserva un renglón para cada estudio de imagen', () => {
		expect(agruparEstudiosImagen([
			{ modulo: 'imagen', descripcion: 'RM CRANEO SIMPLE' },
			{ modulo: 'laboratorio', descripcion: 'BHC' },
			{ modulo: 'imagen', descripcion_estudio: 'USG ABDOMEN' },
		])).toEqual(['RM CRANEO SIMPLE', 'USG ABDOMEN']);
	});
});

describe('generarEtiquetasEstudiosImagen', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		URL.createObjectURL = jest.fn(() => 'blob:etiquetas-imagen');
		window.open = jest.fn();
	});

	test('genera un PDF de 50 x 30 mm con una etiqueta por estudio de imagen', () => {
		generarEtiquetasEstudiosImagen({
			folio: 'A9804',
			paciente: 'Ma de la Luz Macias Garcia',
			doctor: 'Barreto, Hector',
			estudios: [
				{ modulo: 'imagen', descripcion: 'RM CRANEO SIMPLE' },
				{ modulo: 'imagen', descripcion: 'USG ABDOMEN' },
			],
		});

		expect(JsPDF).toHaveBeenCalledWith({
			unit: 'mm',
			format: [50, 30],
			orientation: 'landscape',
		});
		expect(mockDoc.setProperties).toHaveBeenCalledWith({ title: 'Etiqueta A9804' });
		expect(mockDoc.addPage).toHaveBeenCalledWith([50, 30], 'landscape');
		expect(mockDoc.text).toHaveBeenCalledWith(
			'CENTRAL DIAGNOSTICA CALIFORNIA',
			2,
			3.5,
		);
		expect(mockDoc.text).toHaveBeenCalledWith('Folio: A9804', 2, 8.2);
		expect(mockDoc.text).toHaveBeenCalledWith(
			'Paciente: MA DE LA LUZ MACIAS GARCIA',
			2,
			12.2,
			expect.any(Object),
		);
		expect(mockDoc.text).toHaveBeenCalledWith(
			'RM CRANEO SIMPLE',
			2,
			18.2,
			expect.any(Object),
		);
		expect(mockDoc.text).toHaveBeenCalledWith(
			'BARRETO, HECTOR',
			2,
			25.7,
			expect.any(Object),
		);
		expect(window.open).toHaveBeenCalledTimes(1);
	});
});
