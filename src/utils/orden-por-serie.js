import { agruparEstudiosPorSerie, empresaDeSerie } from "./folios";
import { calcularTotalesNuevoPaciente } from "./nuevo-paciente-totales";

const numero = (valor) => {
	const cantidad = Number.parseFloat(valor);
	return Number.isFinite(cantidad) ? cantidad : 0;
};

const redondear = (valor) => Math.round(numero(valor) * 100) / 100;

// Una orden se parte en tantas ventas como series le tocan (A, B, C), porque
// cada una factura por su empresa y lleva su propio folio. Cada parte trae sus
// totales para que el cobro y el ticket cuadren por separado.
export const dividirOrdenPorSerie = ({
	estudios = [],
	reglasConvenio = [],
	descuentoPercent = 0,
} = {}) =>
	agruparEstudiosPorSerie(estudios, reglasConvenio).map((grupo) => {
		const { subtotal, descuento, total } = calcularTotalesNuevoPaciente(
			grupo.estudios,
			descuentoPercent,
		);
		return {
			...grupo,
			subtotal: redondear(subtotal),
			descuento: redondear(descuento),
			total: redondear(total),
		};
	});

export const esOrdenMixta = (partes = []) => partes.length > 1;

// El cobro se captura por serie, pero arranca prorrateado a proporción del
// total de cada una: en el caso normal la recepcionista sólo confirma. Los
// centavos del redondeo se van a la última parte para que la suma cuadre exacta
// con lo que entregó el paciente.
export const prorratearPago = (partes = [], pagoRecibido = 0) => {
	const pago = numero(pagoRecibido);
	const totalOrden = partes.reduce((suma, parte) => suma + numero(parte.total), 0);

	if (pago <= 0 || totalOrden <= 0) {
		return Object.fromEntries(partes.map((parte) => [parte.serie, 0]));
	}

	const pagoRepartible = Math.min(pago, totalOrden);
	let acumulado = 0;

	return Object.fromEntries(
		partes.map((parte, indice) => {
			if (indice === partes.length - 1) {
				return [parte.serie, redondear(pagoRepartible - acumulado)];
			}
			const proporcion = numero(parte.total) / totalOrden;
			const monto = redondear(pagoRepartible * proporcion);
			acumulado = redondear(acumulado + monto);
			return [parte.serie, monto];
		}),
	);
};

export const validarPagosPorSerie = (partes = [], pagosPorSerie = {}) => {
	const excedida = partes.find(
		(parte) => numero(pagosPorSerie[parte.serie]) > numero(parte.total) + 0.001,
	);
	if (excedida) {
		return {
			valido: false,
			mensaje: `El pago de la serie ${excedida.serie} no puede ser mayor a su total`,
		};
	}
	if (partes.some((parte) => numero(pagosPorSerie[parte.serie]) < 0)) {
		return { valido: false, mensaje: "El pago no puede ser negativo" };
	}
	return { valido: true, mensaje: "" };
};

// El ticket es uno por empresa fiscal: si la orden trae imagen y laboratorio de
// CDC, los dos folios salen en el mismo ticket de California.
export const agruparPartesPorEmpresa = (partes = []) => {
	const empresas = new Map();
	partes.forEach((parte) => {
		const empresa = parte.empresa || empresaDeSerie(parte.serie);
		if (!empresas.has(empresa)) {
			empresas.set(empresa, {
				empresa,
				partes: [],
				subtotal: 0,
				descuento: 0,
				total: 0,
			});
		}
		const acumulado = empresas.get(empresa);
		acumulado.partes.push(parte);
		acumulado.subtotal = redondear(acumulado.subtotal + numero(parte.subtotal));
		acumulado.descuento = redondear(acumulado.descuento + numero(parte.descuento));
		acumulado.total = redondear(acumulado.total + numero(parte.total));
	});
	return [...empresas.values()];
};
