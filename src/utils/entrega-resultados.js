import { calcularSaldoVenta, tieneAdeudoVenta } from "./venta-payment-status";

export const calcularPendientesEntrega = (estudiosVenta = []) =>
	estudiosVenta.filter(
		(estudio) => estudio.estado_validacion === "validado" && !estudio.entregado,
	).length;

export const calcularSaldoEntrega = calcularSaldoVenta;

export const tieneSaldoPendiente = tieneAdeudoVenta;

export const filtrarVentasEntrega = (ventas = [], busqueda = "") => {
	const termino = busqueda.trim().toLowerCase();
	if (!termino) return ventas;

	return ventas.filter((venta) => {
		const folio = venta.folio?.toLowerCase() || "";
		const paciente = venta.pacientes?.nombre?.toLowerCase() || "";
		const cliente = venta.clientes?.nombre?.toLowerCase() || "particular";
		return (
			folio.includes(termino) ||
			paciente.includes(termino) ||
			cliente.includes(termino)
		);
	});
};
