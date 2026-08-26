// Hay clientes que son un descuento en sí mismos —10%, 20%, 30%—: al elegirlos
// en la orden, el porcentaje se aplica solo, en lugar de que recepción lo
// capture a mano y se equivoque.
const PATRON_DESCUENTO = /^(\d{1,2}(?:\.\d+)?)\s*%$/;

export const descuentoDeCliente = (nombreCliente = "") => {
	const coincidencia = String(nombreCliente ?? "").trim().match(PATRON_DESCUENTO);
	if (!coincidencia) return null;

	const porcentaje = Number.parseFloat(coincidencia[1]);
	if (!Number.isFinite(porcentaje) || porcentaje <= 0 || porcentaje > 100) return null;
	return porcentaje;
};

export const esClienteDeDescuento = (nombreCliente = "") =>
	descuentoDeCliente(nombreCliente) !== null;
