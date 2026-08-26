import JsPDF from 'jspdf';
import {
	agruparEstudiosImagen,
	generarEtiquetasEstudiosImagen,
} from './generar-etiquetas-estudios-imagen';

let tamanoActual = 8;

beforeAll(() => {
	if (!URL.createObjectURL) URL.createObjectURL = jest.fn(() => 'blob:etiquetas');
});

const mockDoc = {
	addPage: jest.fn(),
	output: jest.fn(() => new Blob()),
	setFont: jest.fn(),
	setFontSize: jest.fn((tamano) => {
		tamanoActual = tamano;
	}),
	setProperties: jest.fn(),
	splitTextToSize: jest.fn((texto, ancho) => {
		// Aproxima el ancho real del PDF: el texto se parte según el tamaño de
		// letra que se haya fijado.
		const porRenglon = Math.floor(ancho / (tamanoActual * 0.26));
		const cadena = String(texto);
		if (cadena.length <= porRenglon) return [cadena];
		return [cadena.slice(0, porRenglon), cadena.slice(porRenglon)];
	}),
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
		// El contenido va centrado, así que se verifica qué se imprime y no en qué
		// altura fija: eso lo cubren las pruebas de centrado.
		const textos = mockDoc.text.mock.calls.map(([texto]) => texto);
		expect(textos).toEqual(
			expect.arrayContaining([
				'CENTRAL DIAGNOSTICA CALIFORNIA',
				'Folio: A9804',
				'RM CRANEO SIMPLE',
				'BARRETO, HECTOR',
			]),
		);
		// El nombre largo se parte en renglones, pero sale completo.
		expect(textos.join(' ')).toContain('MA DE LA LUZ');
		expect(textos.join(' ')).toContain('MACIAS GARCIA');
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

describe("el contenido va centrado en la etiqueta", () => {
	beforeEach(() => jest.clearAllMocks());

	const alturas = () => mockDoc.text.mock.calls.map(([, , y]) => y);

	// Antes todo quedaba pegado arriba y sobraba espacio abajo.
	test("deja un margen parecido arriba y abajo", () => {
		generarEtiquetasEstudiosImagen({
			folio: "A0001",
			fecha: "2026-08-07T10:00:00",
			paciente: "Ana Ruiz",
			doctor: "Barreto, Hector",
			estudios: [{ modulo: "imagen", descripcion: "RM CRANEO SIMPLE" }],
		});

		const ys = alturas();
		const arriba = Math.min(...ys);
		const abajo = 30 - Math.max(...ys);

		expect(arriba).toBeGreaterThan(3);
		expect(Math.abs(arriba - abajo)).toBeLessThan(4);
	});

	test("una etiqueta con más texto sigue cabiendo", () => {
		generarEtiquetasEstudiosImagen({
			folio: "A0001",
			paciente: "Ma de la Luz Macias Garcia",
			doctor: "Barreto Gonzalez, Hector Manuel",
			estudios: [{ modulo: "imagen", descripcion: "RM DE COLUMNA LUMBAR CONTRASTADA" }],
		});

		expect(Math.max(...alturas())).toBeLessThan(30);
	});
});

test("el membrete se achica para caber en un solo renglón", () => {
	jest.clearAllMocks();
	generarEtiquetasEstudiosImagen({
		folio: "A0001",
		paciente: "Ana Ruiz",
		doctor: "Barreto, Hector",
		estudios: [{ modulo: "imagen", descripcion: "RM CRANEO SIMPLE" }],
	});

	const renglonesMembrete = mockDoc.text.mock.calls.filter(([texto]) =>
		String(texto).includes("CENTRAL DIAGNOSTICA"),
	);

	expect(renglonesMembrete).toHaveLength(1);
	expect(renglonesMembrete[0][0]).toBe("CENTRAL DIAGNOSTICA CALIFORNIA");
});
