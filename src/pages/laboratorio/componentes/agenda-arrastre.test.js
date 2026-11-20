import { coordenadaY, renglonDestino } from './agenda-arrastre';

const base = { celdaTop: 0, celdaAlto: 40, tarjetaTop: 0, tarjetaAlto: 36, totalRenglones: 26 };

test('la cita de media hora empieza en el renglón donde se suelta', () => {
	expect(renglonDestino({ ...base, indiceCelda: 7, punteroY: 20, agarreY: 10 })).toBe(7);
});

test('en una celda combinada cuenta en cuál de sus renglones se soltó', () => {
	expect(
		renglonDestino({ ...base, indiceCelda: 4, renglonesCelda: 3, celdaAlto: 120, punteroY: 100, agarreY: 10 }),
	).toBe(6);
});

test('una cita larga tomada de abajo se acomoda para que el agarre quede bajo el puntero', () => {
	// Tres horas (seis renglones) agarrada en su último renglón y soltada en el 10.
	expect(
		renglonDestino({ ...base, indiceCelda: 10, punteroY: 20, agarreY: 230, tarjetaAlto: 240, renglonesCita: 6 }),
	).toBe(5);
});

test('no deja que la cita se salga de la rejilla', () => {
	expect(renglonDestino({ ...base, indiceCelda: 25, punteroY: 20, agarreY: 5, renglonesCita: 4 })).toBe(22);
	expect(
		renglonDestino({ ...base, indiceCelda: 0, punteroY: 5, agarreY: 230, tarjetaAlto: 240, renglonesCita: 6 }),
	).toBe(0);
});

test('coordenadaY lee ratón y dedo', () => {
	expect(coordenadaY({ clientY: 12 })).toBe(12);
	expect(coordenadaY({ touches: [{ clientY: 34 }] })).toBe(34);
});
