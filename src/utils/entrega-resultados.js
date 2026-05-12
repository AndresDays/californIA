import { calcularSaldoVenta, tieneAdeudoVenta } from "./venta-payment-status";

export const estudioLaboratorioListoEntrega = (estudio = {}) =>
	estudio.estado_validacion === "validado" &&
	!estudio.entregado &&
	estudio.muestra_pendiente !== true;

const formatearFechaMexico = (fecha = new Date()) => {
	const partes = new Intl.DateTimeFormat("es-MX", {
		timeZone: "America/Mexico_City",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(fecha);
	const valores = Object.fromEntries(partes.map((parte) => [parte.type, parte.value]));
	return `${valores.year}-${valores.month}-${valores.day}`;
};

export const estaEnRangoEntrega = (
	estudio = {},
	fechaInicial = "",
	fechaFinal = "",
) => {
	const fechaLista = estudio.updated_at || estudio.fecha_entrega;
	if (!fechaLista) return false;

	const fechaEntrega = formatearFechaMexico(new Date(fechaLista));
	return (
		(!fechaInicial || fechaEntrega >= fechaInicial) &&
		(!fechaFinal || fechaEntrega <= fechaFinal)
	);
};

const fechaEnRangoEntrega = (fecha, fechaInicial = "", fechaFinal = "") => {
	if (!fecha) return false;
	const fechaMexico = formatearFechaMexico(new Date(fecha));
	return (
		(!fechaInicial || fechaMexico >= fechaInicial) &&
		(!fechaFinal || fechaMexico <= fechaFinal)
	);
};

export const ventaListaEnRangoEntrega = (
	venta = {},
	fechaInicial = "",
	fechaFinal = "",
) => {
	const ventaEnRango = fechaEnRangoEntrega(
		venta.fecha_venta,
		fechaInicial,
		fechaFinal,
	);
	const laboratorioEnRango = (venta.estudios_venta || []).some(
		(estudio) =>
			estudioLaboratorioListoEntrega(estudio) &&
			(ventaEnRango || estaEnRangoEntrega(estudio, fechaInicial, fechaFinal)),
	);
	const radiologiaEnRango = (venta.estudios_radiologia || []).some(
		(estudio) =>
			estudio.listo_entrega &&
			!estudio.entregado &&
			(ventaEnRango || estaEnRangoEntrega(estudio, fechaInicial, fechaFinal)),
	);

	return laboratorioEnRango || radiologiaEnRango;
};

export const calcularPendientesEntrega = (
	estudiosVenta = [],
	estudiosRadiologia = [],
) => {
	const pendientesLaboratorio = estudiosVenta.filter(
		(estudio) => estudioLaboratorioListoEntrega(estudio),
	).length;
	const pendientesRadiologia = estudiosRadiologia.filter(
		(estudio) => estudio.listo_entrega && !estudio.entregado,
	).length;

	return pendientesLaboratorio + pendientesRadiologia;
};

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
