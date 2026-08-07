import { crearRangoFechaMexico } from './fecha-mexico';

describe('crearRangoFechaMexico', () => {
	it('incluye toda la jornada local aunque termine en el siguiente día UTC', () => {
		expect(crearRangoFechaMexico('2026-08-06', '2026-08-06')).toEqual({
			inicio: '2026-08-06T00:00:00-06:00',
			fin: '2026-08-07T00:00:00-06:00',
		});
	});
});
