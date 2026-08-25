import {
	construirDatosTarjeta,
	describirPagoTarjeta,
	esPagoConTarjeta,
	normalizarCodigoAprobacion,
	normalizarUltimos4,
	validarPagoTarjeta,
} from "./pago-tarjeta";

describe("esPagoConTarjeta", () => {
	test.each(["tarjeta", "tarjeta_debito", "tarjeta_credito", "Tarjeta Crédito"])(
		"reconoce %s como pago con tarjeta",
		(forma) => expect(esPagoConTarjeta(forma)).toBe(true),
	);

	test.each(["efectivo", "transferencia", "credito", "", null, undefined])(
		"no marca %s como pago con tarjeta",
		(forma) => expect(esPagoConTarjeta(forma)).toBe(false),
	);
});

describe("normalización de los datos de la tarjeta", () => {
	test("los últimos 4 dígitos se quedan sólo con números", () => {
		expect(normalizarUltimos4("12-34")).toBe("1234");
		expect(normalizarUltimos4("4111111111111234")).toBe("4111");
		expect(normalizarUltimos4("")).toBe("");
	});

	test("el código de aprobación queda alfanumérico y en mayúsculas", () => {
		expect(normalizarCodigoAprobacion("ab-12 34")).toBe("AB1234");
		expect(normalizarCodigoAprobacion("123456789012345")).toHaveLength(12);
	});
});

describe("validarPagoTarjeta", () => {
	test("con efectivo no pide nada", () => {
		expect(validarPagoTarjeta({ formaPago: "efectivo" })).toEqual({
			valido: true,
			mensaje: "",
		});
	});

	test("exige los 4 dígitos completos", () => {
		const resultado = validarPagoTarjeta({
			formaPago: "tarjeta_debito",
			ultimos4: "12",
			codigoAprobacion: "A1",
		});
		expect(resultado.valido).toBe(false);
		expect(resultado.mensaje).toMatch(/últimos 4/i);
	});

	test("exige el código de aprobación", () => {
		const resultado = validarPagoTarjeta({
			formaPago: "tarjeta_credito",
			ultimos4: "1234",
			codigoAprobacion: "  ",
		});
		expect(resultado.valido).toBe(false);
		expect(resultado.mensaje).toMatch(/código de aprobación/i);
	});

	test("acepta la captura completa", () => {
		expect(
			validarPagoTarjeta({
				formaPago: "tarjeta_credito",
				ultimos4: "1234",
				codigoAprobacion: "a1b2c3",
			}).valido,
		).toBe(true);
	});
});

describe("describirPagoTarjeta", () => {
	test("arma el texto del ticket y del historial", () => {
		expect(
			describirPagoTarjeta({ ultimos4: "1234", codigoAprobacion: "a1b2" }),
		).toBe("****1234 · Aprob. A1B2");
	});

	test("sin datos regresa vacío", () => {
		expect(describirPagoTarjeta({})).toBe("");
	});
});

describe("construirDatosTarjeta", () => {
	test("guarda los datos normalizados cuando es tarjeta", () => {
		expect(
			construirDatosTarjeta({
				formaPago: "tarjeta_debito",
				ultimos4: "9-999",
				codigoAprobacion: "zz11",
			}),
		).toEqual({ tarjeta_ultimos4: "9999", codigo_aprobacion: "ZZ11" });
	});

	test("limpia los datos si la forma de pago dejó de ser tarjeta", () => {
		expect(
			construirDatosTarjeta({
				formaPago: "efectivo",
				ultimos4: "1234",
				codigoAprobacion: "A1",
			}),
		).toEqual({ tarjeta_ultimos4: null, codigo_aprobacion: null });
	});
});
