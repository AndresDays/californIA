import {
	construirDesglosePagos,
	describirDesglosePagos,
	leerDesglosePagos,
	repartirDesglosePorMonto,
	repartirDesglosePorPartes,
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

// Una orden mixta se parte en varios folios y el paciente paga con varias
// formas: cada folio se lleva el pedazo de cada forma que alcanza a cubrirlo, y
// lo que ya se llevó no lo puede volver a cobrar el siguiente.
describe("repartirDesglosePorPartes", () => {
	const desglose = [
		{ formaPago: "efectivo", monto: 1200 },
		{ formaPago: "tarjeta", monto: 300 },
	];

	test("el cobro se consume: ninguna forma se cobra dos veces", () => {
		const reparto = repartirDesglosePorPartes(desglose, [
			{ clave: "C", monto: 1000 },
			{ clave: "A", monto: 500 },
		]);

		expect(reparto[0].desglose).toEqual([{ formaPago: "efectivo", monto: 1000 }]);
		// Al segundo folio ya sólo le quedan 200 de efectivo: el resto va con
		// tarjeta.
		expect(reparto[1].desglose).toEqual([
			{ formaPago: "efectivo", monto: 200 },
			{ formaPago: "tarjeta", monto: 300 },
		]);
	});

	test("lo repartido por forma de pago nunca excede lo que entro", () => {
		const reparto = repartirDesglosePorPartes(desglose, [
			{ clave: "C", monto: 900 },
			{ clave: "B", monto: 400 },
			{ clave: "A", monto: 200 },
		]);

		const porForma = reparto
			.flatMap((parte) => parte.desglose)
			.reduce((suma, pago) => ({ ...suma, [pago.formaPago]: (suma[pago.formaPago] || 0) + pago.monto }), {});

		expect(porForma.efectivo).toBeLessThanOrEqual(1200);
		expect(porForma.tarjeta).toBeLessThanOrEqual(300);
		expect(porForma.efectivo + porForma.tarjeta).toBe(1500);
	});

	test("cada folio recibe exactamente lo que le toca", () => {
		const reparto = repartirDesglosePorPartes(desglose, [
			{ clave: "C", monto: 1000 },
			{ clave: "A", monto: 500 },
		]);

		expect(reparto.map(({ clave, desglose: partes }) => [
			clave,
			partes.reduce((suma, pago) => suma + pago.monto, 0),
		])).toEqual([
			["C", 1000],
			["A", 500],
		]);
	});

	// Con tres formas de pago los residuos binarios dejaban diferencias de un
	// centavo entre lo cobrado y la suma de los tickets.
	test("los centavos cuadran con importes partidos", () => {
		const reparto = repartirDesglosePorPartes(
			[
				{ formaPago: "efectivo", monto: 33.33 },
				{ formaPago: "tarjeta", monto: 33.33 },
				{ formaPago: "transferencia", monto: 33.34 },
			],
			[
				{ clave: "C", monto: 50 },
				{ clave: "A", monto: 50 },
			],
		);

		const total = reparto
			.flatMap((parte) => parte.desglose)
			.reduce((suma, pago) => suma + pago.monto, 0);

		expect(Number(total.toFixed(2))).toBe(100);
	});

	test("un folio que no recibe cobro se queda sin desglose", () => {
		const reparto = repartirDesglosePorPartes(desglose, [
			{ clave: "C", monto: 1500 },
			{ clave: "A", monto: 0 },
		]);

		expect(reparto[1].desglose).toEqual([]);
	});

	test("sin cobro capturado no reparte nada", () => {
		expect(repartirDesglosePorPartes([], [{ clave: "C", monto: 500 }])).toEqual([
			{ clave: "C", desglose: [] },
		]);
		expect(repartirDesglosePorPartes(desglose, [])).toEqual([]);
	});
});
