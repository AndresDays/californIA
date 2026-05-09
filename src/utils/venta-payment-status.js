export const normalizarPagoRecibido = (pago) => {
	const monto = parseFloat(pago);
	return Number.isFinite(monto) && monto > 0 ? monto : 0;
};

export const calcularSaldoVenta = (venta = {}) => {
	const total = parseFloat(venta.total) || 0;
	const pagoRecibido = normalizarPagoRecibido(venta.pago_recibido);
	const saldo = total - pagoRecibido;
	return saldo > 0 ? saldo : 0;
};

export const tieneAdeudoVenta = (venta = {}) => calcularSaldoVenta(venta) > 0;

export const obtenerClaseAdeudoVenta = (venta = {}) =>
	tieneAdeudoVenta(venta) ? "row-adeudo" : "";
