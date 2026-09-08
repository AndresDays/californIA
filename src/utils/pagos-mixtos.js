// Un cobro se puede repartir entre varias formas de pago: es común que el
// paciente pase la mayor parte con tarjeta y complete el resto en efectivo.
//
// La venta sigue guardando un solo `forma_pago` (los reportes viejos lo leen),
// pero cuando hay más de una forma se guarda "mixto" y el detalle viaja en
// `pagos_desglose`, además de un movimiento de pago por cada forma.

import {
	construirDatosTarjeta,
	esPagoConTarjeta,
	normalizarCodigoAprobacion,
	normalizarUltimos4,
	validarPagoTarjeta,
} from "./pago-tarjeta";

export const FORMA_PAGO_MIXTO = "mixto";

export const FORMAS_PAGO = [
	{ valor: "efectivo", etiqueta: "Efectivo" },
	{ valor: "tarjeta_debito", etiqueta: "Tarjeta Debito" },
	{ valor: "tarjeta_credito", etiqueta: "Tarjeta Credito" },
	{ valor: "transferencia", etiqueta: "Transferencia" },
	{ valor: "credito", etiqueta: "Crédito" },
];

export const etiquetaFormaPago = (formaPago) =>
	FORMAS_PAGO.find((forma) => forma.valor === formaPago)?.etiqueta ||
	String(formaPago || "");

const numero = (valor) => {
	const monto = Number.parseFloat(valor);
	return Number.isFinite(monto) && monto > 0 ? monto : 0;
};

export const crearPagoAdicional = (monto = "") => ({
	formaPago: "efectivo",
	monto,
	tarjetaUltimos4: "",
	codigoAprobacion: "",
});

// El pago principal y los adicionales se tratan igual a partir de aquí: una
// lista de formas con su monto, sin renglones vacíos.
export const construirDesglosePagos = (pagoPrincipal = {}, pagosAdicionales = []) =>
	[pagoPrincipal, ...pagosAdicionales]
		.map((pago) => ({
			formaPago: pago?.formaPago || "efectivo",
			monto: numero(pago?.monto),
			tarjetaUltimos4: normalizarUltimos4(pago?.tarjetaUltimos4),
			codigoAprobacion: normalizarCodigoAprobacion(pago?.codigoAprobacion),
		}))
		.filter((pago) => pago.monto > 0);

export const totalDesglosePagos = (desglose = []) =>
	desglose.reduce((suma, pago) => suma + numero(pago.monto), 0);

export const restantePorPagar = (granTotal, desglose = []) =>
	Math.max(numero(granTotal) - totalDesglosePagos(desglose), 0);

// Valida los datos de tarjeta de cada renglón. Devuelve el índice para que la
// pantalla pueda decir cuál de los pagos está incompleto.
export const validarDesglosePagos = (desglose = []) => {
	for (const [indice, pago] of desglose.entries()) {
		const resultado = validarPagoTarjeta({
			formaPago: pago.formaPago,
			ultimos4: pago.tarjetaUltimos4,
			codigoAprobacion: pago.codigoAprobacion,
		});
		if (!resultado.valido) {
			return {
				valido: false,
				indice,
				mensaje:
					desglose.length > 1
						? `${resultado.mensaje} (${etiquetaFormaPago(pago.formaPago)})`
						: resultado.mensaje,
			};
		}
	}
	return { valido: true, indice: -1, mensaje: "" };
};

// Forma de pago que se guarda en `ventas`: la única cuando hay una sola,
// "mixto" cuando el cobro se repartió.
export const resolverFormaPagoVenta = (desglose = [], formaPorDefecto = "efectivo") => {
	if (desglose.length === 0) return formaPorDefecto;
	if (desglose.length === 1) return desglose[0].formaPago;
	return FORMA_PAGO_MIXTO;
};

// Datos de tarjeta de la venta: sólo tienen sentido cuando hay un único pago
// con tarjeta; con dos tarjetas el detalle queda en los movimientos.
export const resolverDatosTarjetaVenta = (desglose = []) => {
	const conTarjeta = desglose.filter((pago) => esPagoConTarjeta(pago.formaPago));
	if (conTarjeta.length !== 1) return { tarjeta_ultimos4: null, codigo_aprobacion: null };
	return construirDatosTarjeta({
		formaPago: conTarjeta[0].formaPago,
		ultimos4: conTarjeta[0].tarjetaUltimos4,
		codigoAprobacion: conTarjeta[0].codigoAprobacion,
	});
};

// Detalle que se guarda en la venta para que el reporte pueda repartir el
// cobro entre las formas de pago sin volver a leer los movimientos.
export const serializarDesglosePagos = (desglose = []) =>
	desglose.map((pago) => ({
		forma_pago: pago.formaPago,
		monto: Number(pago.monto.toFixed(2)),
		...construirDatosTarjeta({
			formaPago: pago.formaPago,
			ultimos4: pago.tarjetaUltimos4,
			codigoAprobacion: pago.codigoAprobacion,
		}),
	}));

export const leerDesglosePagos = (valor) => {
	if (!valor) return [];
	let desglose = valor;
	if (typeof desglose === "string") {
		try {
			desglose = JSON.parse(desglose);
		} catch {
			return [];
		}
	}
	if (!Array.isArray(desglose)) return [];
	return desglose
		.map((pago) => ({
			forma_pago: pago?.forma_pago || pago?.formaPago || "",
			monto: numero(pago?.monto),
		}))
		.filter((pago) => pago.forma_pago && pago.monto > 0);
};

// Reparte un cobro entre varias formas cuando la venta se divide en partes
// (una orden que factura por dos series): se va llenando en orden hasta agotar
// el importe que le toca a la parte.
export const repartirDesglosePorMonto = (desglose = [], montoParte = 0) => {
	let restante = numero(montoParte);
	const repartido = [];
	for (const pago of desglose) {
		if (restante <= 0) break;
		const monto = Math.min(pago.monto, restante);
		repartido.push({ ...pago, monto });
		restante -= monto;
	}
	return repartido;
};

export const describirDesglosePagos = (desglose = []) =>
	desglose
		.map((pago) => `${etiquetaFormaPago(pago.formaPago)} $${pago.monto.toFixed(2)}`)
		.join(" + ");
