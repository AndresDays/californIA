import {
	crearRangoFechaMexico,
	formatearFechaHoraMexicoLocal,
} from './fecha-mexico';

describe('crearRangoFechaMexico', () => {
	it('incluye toda la jornada local aunque termine en el siguiente día UTC', () => {
		expect(crearRangoFechaMexico('2026-08-06', '2026-08-06')).toEqual({
			inicio: '2026-08-06T00:00:00-06:00',
			fin: '2026-08-07T00:00:00-06:00',
		});
	});
});

describe('formatearFechaHoraMexicoLocal', () => {
	it('convierte un instante UTC nocturno a fecha y hora civil de México sin zona', () => {
		expect(formatearFechaHoraMexicoLocal(new Date('2026-08-18T00:27:00.000Z')))
			.toBe('2026-08-17T18:27:00');
	});
});
