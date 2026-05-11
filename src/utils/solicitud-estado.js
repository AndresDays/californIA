import { tieneAdeudoVenta } from "./venta-payment-status";

export const SOLICITUD_ESTADOS = {
	recibido: {
		label: "Recibido",
		description: "Solicitud creada",
		className: "estado-solicitud-recibido",
	},
	captura: {
		label: "En captura",
		description: "Resultados de laboratorio en proceso",
		className: "estado-solicitud-captura",
	},
	guardado: {
		label: "Guardado",
		description: "Resultados guardados, falta validar",
		className: "estado-solicitud-guardado",
	},
	muestra_pendiente: {
		label: "Muestra pendiente",
		description: "Falta muestra antes de continuar",
		className: "estado-solicitud-muestra",
	},
	radiologia: {
		label: "En radiología",
		description: "Imagen o interpretación pendiente",
		className: "estado-solicitud-radiologia",
	},
	listo_entrega: {
		label: "Listo entrega",
		description: "Resultados listos para entregar",
		className: "estado-solicitud-listo",
	},
	entregado: {
		label: "Entregado",
		description: "Resultados entregados",
		className: "estado-solicitud-entregado",
	},
	adeudo: {
		label: "Adeudo",
		description: "Solicitud con saldo pendiente",
		className: "estado-solicitud-adeudo",
	},
	cancelado: {
		label: "Cancelado",
		description: "Solicitud cancelada",
		className: "estado-solicitud-cancelado",
	},
};

export const obtenerMetaEstadoSolicitud = (estado) =>
	SOLICITUD_ESTADOS[estado] || SOLICITUD_ESTADOS.recibido;

const estaCancelada = (venta = {}) =>
	["cancelada", "cancelado"].includes(String(venta.estado || "").toLowerCase());

export const obtenerEstadoSolicitud = (venta = {}) => {
	const estudiosVenta = venta.estudios_venta || [];
	const estudiosRadiologia = venta.estudios_radiologia || [];
	const hayLaboratorio = estudiosVenta.length > 0;
	const hayRadiologia = estudiosRadiologia.length > 0;

	if (estaCancelada(venta)) return "cancelado";
	if (tieneAdeudoVenta(venta)) return "adeudo";

	if (estudiosVenta.some((estudio) => estudio.muestra_pendiente)) {
		return "muestra_pendiente";
	}

	const laboratorioPendienteEntrega = estudiosVenta.some(
		(estudio) => estudio.estado_validacion === "validado" && !estudio.entregado,
	);
	const radiologiaPendienteEntrega = estudiosRadiologia.some(
		(estudio) => estudio.listo_entrega && !estudio.entregado,
	);
	if (laboratorioPendienteEntrega || radiologiaPendienteEntrega) {
		return "listo_entrega";
	}

	const radiologiaPendiente = estudiosRadiologia.some(
		(estudio) => !estudio.entregado && !estudio.listo_entrega,
	);
	if (radiologiaPendiente) return "radiologia";

	const laboratorioGuardado = estudiosVenta.some(
		(estudio) => estudio.estado_validacion === "guardado",
	);
	if (laboratorioGuardado) return "guardado";

	const laboratorioEnCaptura = estudiosVenta.some(
		(estudio) => estudio.estado_validacion !== "validado" && !estudio.entregado,
	);
	if (laboratorioEnCaptura) return "captura";

	const todoEntregado =
		(hayLaboratorio || hayRadiologia) &&
		estudiosVenta.every((estudio) => estudio.entregado) &&
		estudiosRadiologia.every((estudio) => estudio.entregado);
	if (todoEntregado) return "entregado";

	return hayLaboratorio || hayRadiologia ? "captura" : "recibido";
};

export const obtenerClaseEstadoSolicitud = (venta = {}) =>
	obtenerMetaEstadoSolicitud(obtenerEstadoSolicitud(venta)).className;

