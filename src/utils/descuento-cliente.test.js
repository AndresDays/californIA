import {
	clienteParaPrecios,
	descuentoDeCliente,
	esClienteDeDescuento,
} from "./descuento-cliente";

describe("descuentoDeCliente", () => {
	test.each([
		["10%", 10],
		["20%", 20],
		["30%", 30],
		[" 15 % ", 15],
		["7.5%", 7.5],
	])("%s aplica %s por ciento", (nombre, esperado) => {
		expect(descuentoDeCliente(nombre)).toBe(esperado);
	});

	test.each(["IMSS", "CENTRO MEDICO ANAMAYA", "Particular", "", null, undefined])(
		"%s no es un cliente de descuento",
		(nombre) => {
			expect(descuentoDeCliente(nombre)).toBeNull();
			expect(esClienteDeDescuento(nombre)).toBe(false);
		},
	);

	// Un nombre que trae un porcentaje pero no es sólo el porcentaje no cuenta:
	// "Convenio 10% empleados" es un cliente con su propio tarifario.
	test("no confunde un convenio que menciona un porcentaje", () => {
		expect(descuentoDeCliente("Convenio 10% empleados")).toBeNull();
	});

	test("descarta porcentajes fuera de rango", () => {
		expect(descuentoDeCliente("0%")).toBeNull();
		expect(descuentoDeCliente("120%")).toBeNull();
	});
});

describe("clienteParaPrecios", () => {
	// El descuento se aplica sobre el precio de particular, no sobre el precio
	// por defecto: un cliente de porcentaje no tiene tarifario propio.
	test.each(["10%", "20%", "30%"])("%s cobra la lista de particular", (nombre) => {
		expect(clienteParaPrecios(nombre)).toBe("Particular");
	});

	test.each(["IMSS", "CENTRO MEDICO ANAMAYA", "Particular"])(
		"%s conserva su propio tarifario",
		(nombre) => {
			expect(clienteParaPrecios(nombre)).toBe(nombre);
		},
	);
});
