import { redondearPrecioFinal, sumarPreciosFinales } from "./precio-final";

describe("redondeo de lo que se cobra", () => {
	// De 1 a 60 centavos se baja; de 61 a 99 se sube.
	test.each([
		[100, 100],
		[100.01, 100],
		[100.5, 100],
		[100.6, 100],
		[100.61, 101],
		[100.99, 101],
		[0.6, 0],
		[0.61, 1],
	])("%s se cobra como %s", (importe, esperado) => {
		expect(redondearPrecioFinal(importe)).toBe(esperado);
	});

	// 0.61 en binario es 0.6099999…: sin cerrar los centavos antes de comparar
	// se iría para abajo.
	test("los centavos se comparan cerrados a dos decimales", () => {
		expect(redondearPrecioFinal(2350 * 1.00026)).toBe(2351);
		expect(redondearPrecioFinal(0.1 + 0.51)).toBe(1);
	});

	test("un importe negativo -un ajuste- se redondea igual hacia su lado", () => {
		expect(redondearPrecioFinal(-100.61)).toBe(-101);
		expect(redondearPrecioFinal(-100.6)).toBe(-100);
	});

	test("lo que no es un numero no rompe el cobro", () => {
		expect(redondearPrecioFinal(null)).toBe(0);
		expect(redondearPrecioFinal("abc")).toBe(0);
		expect(redondearPrecioFinal("100.75")).toBe(101);
	});

	// Se suman importes ya redondeados: redondear la suma dejaría folios que no
	// cuadran con sus renglones.
	test("la suma es la de los importes ya redondeados", () => {
		expect(sumarPreciosFinales([100.7, 100.7])).toBe(202);
		expect(sumarPreciosFinales([])).toBe(0);
	});
});
