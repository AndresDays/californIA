import { calcularResumenCorteVentas } from "./reporte-ventas";
import { clasificarFormaPago } from "./pagos-ventas";

const venta = (forma, total, pagado) => ({
	forma_pago: forma,
	total,
	pago_recibido: pagado,
});

describe("clasificarFormaPago", () => {
	// La forma se guarda como texto libre y ha cambiado de escritura con los
	// años: la clasificación no puede depender de acentos ni de mayúsculas.
	test.each([
		["efectivo", "efectivo"],
		["Efectivo", "efectivo"],
		["tarjeta_debito", "tarjeta_debito"],
		["Tarjeta Débito", "tarjeta_debito"],
		["tarjeta_credito", "tarjeta_credito"],
		["Tarjeta Crédito", "tarjeta_credito"],
		["transferencia", "transferencia"],
		["Transferencia bancaria", "transferencia"],
	])("%s cae en %s", (forma, esperado) => {
		expect(clasificarFormaPago(forma)).toBe(esperado);
	});

	// Una tarjeta que no dice de qué tipo es cuenta como débito: es la más común
	// en mostrador y el total de bancos no cambia de cualquier manera.
	test("una tarjeta sin tipo cuenta como débito", () => {
		expect(clasificarFormaPago("tarjeta")).toBe("tarjeta_debito");
	});

	test.each([["vacía", ""], ["nula", null], ["desconocida", "vale"]])(
		"una forma %s cae en otro",
		(_caso, forma) => {
			expect(clasificarFormaPago(forma)).toBe("otro");
		},
	);
});

describe("calcularResumenCorteVentas", () => {
	const ventas = [
		venta("efectivo", 500, 500),
		venta("efectivo", 300, 200),
		venta("tarjeta_debito", 1000, 1000),
		venta("Tarjeta Crédito", 1500, 1500),
		venta("transferencia", 800, 800),
	];
	const resumen = calcularResumenCorteVentas({ ventas });

	test("separa el efectivo de los bancos", () => {
		expect(resumen.efectivo).toBe(700);
		expect(resumen.tarjetaDebito).toBe(1000);
		expect(resumen.tarjetaCredito).toBe(1500);
		expect(resumen.transferencias).toBe(800);
		expect(resumen.totalBancos).toBe(3300);
	});

	// Sin vales ni retiros en el reporte, lo neto a entregar es lo que entró.
	test("el efectivo neto es el efectivo cobrado", () => {
		expect(resumen.efectivoNeto).toBe(resumen.efectivo);
	});

	// Lo que falta de cada orden, sin importar con qué forma se abrió.
	test("el por cobrar es la suma de los saldos", () => {
		expect(resumen.totalPorCobrar).toBe(100);
		expect(resumen.credito).toBe(resumen.totalPorCobrar);
	});

	test("el gran total suma lo cobrado y lo que falta", () => {
		expect(resumen.cobrado).toBe(4000);
		expect(resumen.granTotal).toBe(4100);
	});

	// Un pago mayor que el total no puede volver negativo el por cobrar.
	test("un sobrepago no resta del por cobrar", () => {
		const conSobrepago = calcularResumenCorteVentas({
			ventas: [venta("efectivo", 100, 250)],
		});
		expect(conSobrepago.totalPorCobrar).toBe(0);
	});

	test("cuenta las órdenes y las canceladas", () => {
		const conCanceladas = calcularResumenCorteVentas({
			ventas,
			canceladas: [venta("efectivo", 100, 0), venta("efectivo", 200, 0)],
			pagosCancelados: 3,
		});
		expect(conCanceladas.movimientos).toMatchObject({
			ordenes: 5,
			ordenesCanceladas: 2,
			pagosCancelados: 3,
		});
	});

	// El sistema no tiene cupones ni cortesias: van en cero y a la vista, para
	// que el corte se lea igual que el de caja.
	test("cupones y cortesías van en cero", () => {
		expect(resumen.movimientos.cupones).toBe(0);
		expect(resumen.movimientos.cortesias).toBe(0);
	});

	test("sin ventas todo queda en cero", () => {
		const vacio = calcularResumenCorteVentas();
		expect(vacio.granTotal).toBe(0);
		expect(vacio.efectivo).toBe(0);
		expect(vacio.movimientos.ordenes).toBe(0);
	});

	// Una forma que no encaja en ningun renglon igual entro a la caja: si no se
	// contara, el gran total no cuadraria con la tabla.
	test("una forma desconocida no se pierde del gran total", () => {
		const raro = calcularResumenCorteVentas({ ventas: [venta("vale", 400, 400)] });
		expect(raro.otrasFormas).toBe(400);
		expect(raro.cobrado).toBe(400);
		expect(raro.granTotal).toBe(400);
	});
});
