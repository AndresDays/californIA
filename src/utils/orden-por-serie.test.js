import {
	agruparPartesPorEmpresa,
	dividirOrdenPorSerie,
	esOrdenMixta,
	prorratearPago,
	validarPagosPorSerie,
} from "./orden-por-serie";

const estudio = (extra) => ({ cantidad: 1, modulo: "imagen", ...extra });
const usg = estudio({ clave: "US-RENAL", modalidad: "ultrasonido", empresa_operativa: "CDI", precio: 700 });
const resonancia = estudio({ clave: "RM-CRANEO", modalidad: "resonancia", empresa_operativa: "CDC", precio: 500 });
const laboratorio = estudio({ clave: "BH", modulo: "laboratorio", modalidad: "laboratorio", precio: 300 });

describe("dividirOrdenPorSerie", () => {
	test("una orden de una sola serie queda en una parte", () => {
		const partes = dividirOrdenPorSerie({ estudios: [laboratorio] });

		expect(partes).toHaveLength(1);
		expect(partes[0]).toMatchObject({ serie: "C", empresa: "CDC", total: 300 });
		expect(esOrdenMixta(partes)).toBe(false);
	});

	test("reparte la orden mixta con los totales de cada serie", () => {
		const partes = dividirOrdenPorSerie({ estudios: [usg, resonancia, laboratorio] });

		expect(partes.map((p) => [p.serie, p.total])).toEqual([
			["A", 700],
			["B", 500],
			["C", 300],
		]);
		expect(esOrdenMixta(partes)).toBe(true);
	});

	test("el descuento se aplica dentro de cada serie", () => {
		const partes = dividirOrdenPorSerie({
			estudios: [usg, laboratorio],
			descuentoPercent: 10,
		});

		expect(partes[0]).toMatchObject({ subtotal: 700, descuento: 70, total: 630 });
		expect(partes[1]).toMatchObject({ subtotal: 300, descuento: 30, total: 270 });
	});
});

describe("prorratearPago", () => {
	const partes = [
		{ serie: "A", total: 700 },
		{ serie: "C", total: 300 },
	];

	test("reparte el pago a proporción del total de cada serie", () => {
		expect(prorratearPago(partes, 1000)).toEqual({ A: 700, C: 300 });
		expect(prorratearPago(partes, 500)).toEqual({ A: 350, C: 150 });
	});

	test("sin pago no reparte nada", () => {
		expect(prorratearPago(partes, 0)).toEqual({ A: 0, C: 0 });
	});

	// Lo que entregó el paciente tiene que cuadrar exacto con la suma de los
	// tickets, así que los centavos del redondeo se van a la última parte.
	test("los centavos del redondeo cuadran con lo recibido", () => {
		const repartido = prorratearPago(
			[
				{ serie: "A", total: 333.33 },
				{ serie: "B", total: 333.33 },
				{ serie: "C", total: 333.34 },
			],
			100,
		);
		const suma = Object.values(repartido).reduce((total, monto) => total + monto, 0);

		expect(Math.round(suma * 100) / 100).toBe(100);
	});

	test("un pago mayor al total sólo reparte el total: el resto es cambio", () => {
		expect(prorratearPago(partes, 1500)).toEqual({ A: 700, C: 300 });
	});
});

describe("validarPagosPorSerie", () => {
	const partes = [
		{ serie: "A", total: 700 },
		{ serie: "C", total: 300 },
	];

	test("acepta un cobro dentro del total de cada serie", () => {
		expect(validarPagosPorSerie(partes, { A: 700, C: 0 }).valido).toBe(true);
	});

	test("rechaza cobrar más que el total de una serie", () => {
		const resultado = validarPagosPorSerie(partes, { A: 800, C: 0 });
		expect(resultado.valido).toBe(false);
		expect(resultado.mensaje).toMatch(/serie A/);
	});

	test("rechaza montos negativos", () => {
		expect(validarPagosPorSerie(partes, { A: -1, C: 0 }).valido).toBe(false);
	});
});

describe("agruparPartesPorEmpresa", () => {
	test("junta las series de la misma empresa en un ticket", () => {
		const partes = dividirOrdenPorSerie({ estudios: [usg, resonancia, laboratorio] });
		const porEmpresa = agruparPartesPorEmpresa(partes);

		expect(porEmpresa).toHaveLength(2);
		const cdc = porEmpresa.find((e) => e.empresa === "CDC");
		expect(cdc.partes.map((p) => p.serie)).toEqual(["B", "C"]);
		expect(cdc.total).toBe(800);
		const cdi = porEmpresa.find((e) => e.empresa === "CDI");
		expect(cdi.partes.map((p) => p.serie)).toEqual(["A"]);
		expect(cdi.total).toBe(700);
	});
});
