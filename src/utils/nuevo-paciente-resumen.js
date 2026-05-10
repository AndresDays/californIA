import { normalizarPagoRecibido } from "./venta-payment-status";

const formatoMoneda = (valor) => `$${valor.toFixed(2)}`;

export const obtenerResumenPagoNuevoPaciente = (total, pagoRecibido) => {
	const totalNormalizado = Number(total) || 0;
	const pagoNormalizado = normalizarPagoRecibido(pagoRecibido);
	const adeudo = Math.max(totalNormalizado - pagoNormalizado, 0);
	const cambio = Math.max(pagoNormalizado - totalNormalizado, 0);

	if (totalNormalizado <= 0) {
		return {
			estado: "pendiente",
			etiqueta: "Sin estudios",
			accion: "Guardar e imprimir",
			adeudo: 0,
			cambio,
		};
	}

	if (pagoNormalizado <= 0 && totalNormalizado > 0) {
		return {
			estado: "sin-pago",
			etiqueta: "Sin pago registrado",
			accion: "Guardar sin pago e imprimir",
			adeudo,
			cambio,
		};
	}

	if (adeudo > 0) {
		return {
			estado: "adeudo",
			etiqueta: `Adeudo ${formatoMoneda(adeudo)}`,
			accion: "Guardar con adeudo e imprimir",
			adeudo,
			cambio,
		};
	}

	return {
		estado: "pagado",
		etiqueta: "Pagado completo",
		accion: "Guardar e imprimir",
		adeudo,
		cambio,
	};
};
