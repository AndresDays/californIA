import {
	CANTIDAD_MAXIMA_ESTUDIO,
	aplicarDescuentoPorcentaje,
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

// La tabla de estudios muestra el precio ya con el descuento de mostrador
// (los clientes 10%, 20% y 30%) aplicado a cada renglón.
describe("aplicarDescuentoPorcentaje", () => {
	test("descuenta el porcentaje del renglón", () => {
		expect(aplicarDescuentoPorcentaje(1000, 10)).toBe(900);
		expect(aplicarDescuentoPorcentaje(150, 30)).toBe(105);
	});

	test("sin descuento el importe no cambia", () => {
		expect(aplicarDescuentoPorcentaje(1000, 0)).toBe(1000);
		expect(aplicarDescuentoPorcentaje(1000)).toBe(1000);
	});

	test("un porcentaje mayor a 100 no deja el renglón en negativo", () => {
		expect(aplicarDescuentoPorcentaje(1000, 150)).toBe(0);
	});

	test("un importe inválido cuenta como cero", () => {
		expect(aplicarDescuentoPorcentaje(undefined, 10)).toBe(0);
	});
});

// Lo que se cobra sale a pesos cerrados: de 1 a 60 centavos baja y de 61 a 99
// sube, renglón por renglón.
describe("el cobro se cierra a pesos", () => {
	test("un renglon con centavos se cobra cerrado", () => {
		expect(calcularTotalesNuevoPaciente([{ precio: 100.6, cantidad: 1 }])).toEqual({
			subtotal: 100,
			descuento: 0,
			total: 100,
		});
		expect(calcularTotalesNuevoPaciente([{ precio: 100.61, cantidad: 1 }])).toEqual({
			subtotal: 101,
			descuento: 0,
			total: 101,
		});
	});

	test("el descuento es la diferencia, asi los tres numeros cuadran", () => {
		const { subtotal, descuento, total } = calcularTotalesNuevoPaciente(
			[{ precio: 165, cantidad: 1 }, { precio: 2350, cantidad: 1 }],
			10,
		);

		expect(subtotal).toBe(2515);
		// 148.50 baja a 148 y 2115 se queda: 2263.
		expect(total).toBe(2263);
		expect(descuento).toBe(subtotal - total);
	});

	test("la cantidad multiplica antes de cerrar el renglon", () => {
		expect(calcularTotalesNuevoPaciente([{ precio: 33.4, cantidad: 3 }]).total).toBe(100);
	});
});
