import {
	CANTIDAD_MAXIMA_ESTUDIO,
	calcularTotalesNuevoPaciente,
	expandirEstudiosPorCantidad,
	normalizarCantidadEstudio,
} from "./nuevo-paciente-totales";

describe("calcularTotalesNuevoPaciente", () => {
	test("aplica el descuento al subtotal sin agregar IVA", () => {
		expect(
			calcularTotalesNuevoPaciente(
				[
					{ precio: 500, cantidad: 1 },
					{ precio: 300, cantidad: 2 },
				],
				10,
			),
		).toEqual({ subtotal: 1100, descuento: 110, total: 990 });
	});

	// Los borradores y las cotizaciones guardadas antes del control de cantidad
	// no traen el campo: se cobran como una pieza, no como cero.
	test("un estudio sin cantidad se cobra como una pieza", () => {
		expect(calcularTotalesNuevoPaciente([{ precio: 150 }], 0)).toEqual({
			subtotal: 150,
			descuento: 0,
			total: 150,
		});
	});
});

describe("normalizarCantidadEstudio", () => {
	test.each([
		[undefined, 1],
		[null, 1],
		["", 1],
		["abc", 1],
		[0, 1],
		[-4, 1],
		[2.7, 2],
		["3", 3],
		[CANTIDAD_MAXIMA_ESTUDIO + 50, CANTIDAD_MAXIMA_ESTUDIO],
	])("%p queda en %p", (entrada, esperado) => {
		expect(normalizarCantidadEstudio(entrada)).toBe(esperado);
	});
});

describe("expandirEstudiosPorCantidad", () => {
	test("guarda un renglón por pieza, cada uno con su precio unitario", () => {
		expect(
			expandirEstudiosPorCantidad([
				{ clave: "BH", precio: 150, cantidad: 3 },
				{ clave: "QS", precio: 200 },
			]),
		).toEqual([
			{ clave: "BH", precio: 150, cantidad: 1 },
			{ clave: "BH", precio: 150, cantidad: 1 },
			{ clave: "BH", precio: 150, cantidad: 1 },
			{ clave: "QS", precio: 200, cantidad: 1 },
		]);
	});
});
