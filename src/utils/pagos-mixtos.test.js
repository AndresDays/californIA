import {
	construirDesglosePagos,
	describirDesglosePagos,
	leerDesglosePagos,
	repartirDesglosePorMonto,
	resolverDatosTarjetaVenta,
	resolverFormaPagoVenta,
	restantePorPagar,
	serializarDesglosePagos,
	totalDesglosePagos,
	validarDesglosePagos,
} from "./pagos-mixtos";

const principal = {
	formaPago: "tarjeta_credito",
	monto: 1000,
	tarjetaUltimos4: "1234",
	codigoAprobacion: "a1b2c3",
};

describe("construirDesglosePagos", () => {
	test("junta el pago principal con los adicionales y descarta los vacíos", () => {
		const desglose = construirDesglosePagos(principal, [
			{ formaPago: "efectivo", monto: 40 },
			{ formaPago: "efectivo", monto: "" },
		]);

		expect(desglose).toEqual([
			{
				formaPago: "tarjeta_credito",
				monto: 1000,
				tarjetaUltimos4: "1234",
				codigoAprobacion: "A1B2C3",
			},
			{
				formaPago: "efectivo",
				monto: 40,
				tarjetaUltimos4: "",
				codigoAprobacion: "",
			},
		]);
		expect(totalDesglosePagos(desglose)).toBe(1040);
		expect(restantePorPagar(1040, desglose)).toBe(0);
	});

	test("un cobro incompleto deja el restante a la vista", () => {
		const desglose = construirDesglosePagos({ formaPago: "efectivo", monto: 400 }, []);
		expect(restantePorPagar(1040, desglose)).toBe(640);
	});
});

describe("validarDesglosePagos", () => {
	test("exige los datos de la tarjeta del renglón incompleto", () => {
		const desglose = construirDesglosePagos({ formaPago: "efectivo", monto: 40 }, [
			{ formaPago: "tarjeta_debito", monto: 1000 },
		]);
		const resultado = validarDesglosePagos(desglose);

		expect(resultado.valido).toBe(false);
		expect(resultado.indice).toBe(1);
		expect(resultado.mensaje).toContain("Tarjeta Debito");
	});

	test("acepta un cobro con los datos completos", () => {
		expect(validarDesglosePagos(construirDesglosePagos(principal, [])).valido).toBe(true);
	});
});

describe("datos que se guardan en la venta", () => {
	const desglose = construirDesglosePagos(principal, [
		{ formaPago: "efectivo", monto: 40 },
	]);

	test("la forma de pago es 'mixto' sólo cuando hay más de una", () => {
		expect(resolverFormaPagoVenta(desglose)).toBe("mixto");
		expect(resolverFormaPagoVenta(desglose.slice(0, 1))).toBe("tarjeta_credito");
		expect(resolverFormaPagoVenta([], "efectivo")).toBe("efectivo");
	});

	test("los datos de tarjeta se conservan si sólo hubo una tarjeta", () => {
		expect(resolverDatosTarjetaVenta(desglose)).toEqual({
			tarjeta_ultimos4: "1234",
			codigo_aprobacion: "A1B2C3",
		});
	});

	test("con dos tarjetas la venta no se queda con los datos de una sola", () => {
		const dosTarjetas = construirDesglosePagos(principal, [
			{
				formaPago: "tarjeta_debito",
				monto: 40,
				tarjetaUltimos4: "9999",
				codigoAprobacion: "ZZZ",
			},
		]);
		expect(resolverDatosTarjetaVenta(dosTarjetas)).toEqual({
			tarjeta_ultimos4: null,
			codigo_aprobacion: null,
		});
	});

	test("el desglose serializado se puede volver a leer", () => {
		const guardado = serializarDesglosePagos(desglose);
		expect(guardado[0]).toMatchObject({ forma_pago: "tarjeta_credito", monto: 1000 });
		expect(leerDesglosePagos(JSON.stringify(guardado))).toEqual([
			{ forma_pago: "tarjeta_credito", monto: 1000 },
			{ forma_pago: "efectivo", monto: 40 },
		]);
		expect(leerDesglosePagos(null)).toEqual([]);
		expect(leerDesglosePagos("no es json")).toEqual([]);
	});

	test("describe el cobro para el ticket", () => {
		expect(describirDesglosePagos(desglose)).toBe(
			"Tarjeta Credito $1000.00 + Efectivo $40.00",
		);
	});
});

describe("repartirDesglosePorMonto", () => {
	test("reparte el cobro entre los folios de una orden mixta", () => {
		const desglose = construirDesglosePagos(principal, [
			{ formaPago: "efectivo", monto: 40 },
		]);

		expect(repartirDesglosePorMonto(desglose, 600)).toEqual([
			expect.objectContaining({ formaPago: "tarjeta_credito", monto: 600 }),
		]);
		expect(repartirDesglosePorMonto(desglose, 1020)).toEqual([
			expect.objectContaining({ formaPago: "tarjeta_credito", monto: 1000 }),
			expect.objectContaining({ formaPago: "efectivo", monto: 20 }),
		]);
		expect(repartirDesglosePorMonto(desglose, 0)).toEqual([]);
	});
});
