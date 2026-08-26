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

describe('estudios de imagen mal clasificados', () => {
	// El caso que dejaba sin etiquetas a editar solicitud: la orden marcaba el
	// estudio como laboratorio porque el catálogo de imagen no lo devolvió.
	test('la clave delata la imagen aunque venga marcada como laboratorio', () => {
		expect(
			agruparEstudiosImagen([
				{ modulo: 'laboratorio', clave_estudio: 'RM-CRANEO-SIMPLE', descripcion_estudio: 'RM CRANEO SIMPLE' },
				{ modulo: 'laboratorio', clave_estudio: 'BH', descripcion_estudio: 'BIOMETRIA HEMATICA', area: 'Hematologia' },
			]),
		).toEqual(['RM CRANEO SIMPLE']);
	});

	test('el área de imagen también la delata', () => {
		expect(
			agruparEstudiosImagen([
				{ modulo: 'laboratorio', clave_estudio: 'X1', descripcion_estudio: 'ESTUDIO', area: 'Ultrasonidos' },
			]),
		).toEqual(['ESTUDIO']);
	});
});

describe('fecha de la etiqueta', () => {
	beforeEach(() => jest.clearAllMocks());

	test('imprime la fecha de la orden junto al folio', () => {
		generarEtiquetasEstudiosImagen({
			folio: 'A9804',
			fecha: '2026-08-07T10:00:00',
			paciente: 'Ma de la Luz Macias Garcia',
			doctor: 'Barreto, Hector',
			estudios: [{ modulo: 'imagen', descripcion: 'RM CRANEO SIMPLE' }],
		});

		const textos = mockDoc.text.mock.calls.map(([texto]) => texto);
		expect(textos).toEqual(expect.arrayContaining(['Folio: A9804', '07/08/2026']));
	});

	test('sin fecha usa la del día y no truena', () => {
		expect(() =>
			generarEtiquetasEstudiosImagen({
				folio: 'A9804',
				paciente: 'Paciente',
				doctor: 'Doctor',
				estudios: [{ modulo: 'imagen', descripcion: 'RM CRANEO SIMPLE' }],
			}),
		).not.toThrow();
	});
});
