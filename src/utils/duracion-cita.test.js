import {
	duracionDeCita,
	duracionSugerida,
	estudiosDesdeTexto,
	formatearDuracion,
	moverFechaEstudio,
	normalizarDuracion,
} from './duracion-cita';

describe('duracionDeCita', () => {
	test('la cita sin duración guardada es de media hora', () => {
		expect(duracionDeCita({})).toBe(30);
		expect(duracionDeCita({ duracion_minutos: null })).toBe(30);
	});

	test('conserva duraciones de varias horas', () => {
		expect(duracionDeCita({ duracion_minutos: 60 })).toBe(60);
		expect(duracionDeCita({ duracion_minutos: 180 })).toBe(180);
	});
});

test('normalizarDuracion redondea a bloques de media hora y no pasa de 12 horas', () => {
	expect(normalizarDuracion(45)).toBe(60);
	expect(normalizarDuracion(0)).toBe(30);
	expect(normalizarDuracion(2000)).toBe(720);
});

describe('duracionSugerida', () => {
	test('una hora por resonancia y media por cualquier otro estudio', () => {
		const estudios = [
			{ descripcion: 'RM CRANEO', modalidad: 'resonancia' },
			{ descripcion: 'RM COLUMNA LUMBAR', modalidad: 'resonancia' },
			{ descripcion: 'RM RODILLA', modalidad: 'resonancia' },
		];
		expect(duracionSugerida(estudios)).toBe(180);
		expect(duracionSugerida([{ descripcion: 'TAC ABDOMEN', modalidad: 'tomografia' }])).toBe(30);
		expect(
			duracionSugerida([
				{ descripcion: 'TAC TORAX', modalidad: 'tomografia' },
				{ descripcion: 'TAC ABDOMEN', modalidad: 'tomografia' },
				{ descripcion: 'BIOMETRIA HEMATICA', modalidad: 'laboratorio' },
			]),
		).toBe(90);
	});

	test('reconoce la resonancia escrita a mano', () => {
		expect(duracionSugerida(estudiosDesdeTexto('Resonancia de rodilla, USG abdominal'))).toBe(90);
		// Abierta desde la columna de Resonancia, el nombre no necesita decirlo.
		expect(duracionSugerida(estudiosDesdeTexto('craneo simple', 'Resonancia'))).toBe(60);
	});

	test('sin estudios es media hora', () => {
		expect(duracionSugerida([])).toBe(30);
	});
});

test('formatearDuracion', () => {
	expect(formatearDuracion(30)).toBe('30 min');
	expect(formatearDuracion(60)).toBe('1 h');
	expect(formatearDuracion(150)).toBe('2 h 30 min');
});

describe('moverFechaEstudio', () => {
	test('recorre la hora sin pasar por la zona del navegador', () => {
		expect(moverFechaEstudio('2026-06-23T10:00:00', -30)).toBe('2026-06-23T09:30:00');
		expect(moverFechaEstudio('2026-06-23T10:30:00', 30)).toBe('2026-06-23T11:00:00');
	});

	test('cruza la medianoche', () => {
		expect(moverFechaEstudio('2026-06-23T23:45:00', 30)).toBe('2026-06-24T00:15:00');
	});

	test('sin fecha no inventa una', () => {
		expect(moverFechaEstudio('', 30)).toBeNull();
	});
});
