import { duracionDeCita, moverFechaEstudio } from './duracion-cita';

describe('duracionDeCita', () => {
	test('la cita sin duración guardada es de media hora', () => {
		expect(duracionDeCita({})).toBe(30);
		expect(duracionDeCita({ duracion_minutos: null })).toBe(30);
	});

	test('la cita de una hora conserva su duración', () => {
		expect(duracionDeCita({ duracion_minutos: 60 })).toBe(60);
	});
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
