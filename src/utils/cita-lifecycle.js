export const CITA_ESTADOS = {
	PENDIENTE: "pendiente",
	CONFIRMADA: "confirmada",
	EN_RECEPCION: "en_recepcion",
	EN_PROCESO: "en_proceso",
	LISTA_ENTREGA: "lista_entrega",
	ENTREGADA: "entregada",
	CANCELADA: "cancelada",
};

export const CITA_ESTADOS_DASHBOARD = [
	CITA_ESTADOS.PENDIENTE,
	CITA_ESTADOS.CONFIRMADA,
	CITA_ESTADOS.EN_RECEPCION,
];

export const obtenerEstadoCitaPorCaptura = (estudiosVenta = []) => {
	const hayEstudios = estudiosVenta.length > 0;
	const todosCompletados =
		hayEstudios &&
		estudiosVenta.every((estudio) => estudio.estado_captura === "completado");

	return todosCompletados ? CITA_ESTADOS.LISTA_ENTREGA : CITA_ESTADOS.EN_PROCESO;
};

export const obtenerEstadoCitaPorEntrega = (estudiosVenta = []) => {
	const hayEstudios = estudiosVenta.length > 0;
	const todosEntregados =
		hayEstudios && estudiosVenta.every((estudio) => estudio.entregado === true);

	return todosEntregados ? CITA_ESTADOS.ENTREGADA : CITA_ESTADOS.LISTA_ENTREGA;
};
