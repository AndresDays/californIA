export const CAPTURA_FILTROS_ESTADO = [
	{ id: "todos", label: "Todos" },
	{ id: "pendientes", label: "Pendientes" },
	{ id: "guardados", label: "Guardados" },
	{ id: "validados", label: "Validados" },
];

export const tieneMuestrasPendientes = (estudiosVenta = []) =>
	estudiosVenta.some((estudio) => estudio.muestra_pendiente === true);

export const obtenerEstadoCapturaVenta = (estudiosVenta = []) => {
	if (!estudiosVenta.length) return "pendiente";
	if (tieneMuestrasPendientes(estudiosVenta)) return "pendiente";

	const todosValidados = estudiosVenta.every(
		(estudio) => estudio.estado_validacion === "validado",
	);
	if (todosValidados) return "validado";

	const todosGuardados = estudiosVenta.every(
		(estudio) =>
			estudio.estado_validacion === "guardado" ||
			estudio.estado_validacion === "validado",
	);
	if (todosGuardados) return "guardado";

	return "pendiente";
};

export const obtenerClaseEstadoCapturaVenta = (estudiosVenta = []) => {
	const estado = obtenerEstadoCapturaVenta(estudiosVenta);
	const clases = {
		pendiente: "row-pendiente",
		guardado: "row-guardado",
		validado: "row-validado",
	};

	return clases[estado] || clases.pendiente;
};

export const filtrarVentasPorEstadoCaptura = (ventas = [], filtro = "todos") => {
	if (filtro === "todos") return ventas;

	const estadosPorFiltro = {
		pendientes: "pendiente",
		guardados: "guardado",
		validados: "validado",
	};
	const estadoFiltro = estadosPorFiltro[filtro];

	if (!estadoFiltro) return ventas;

	return ventas.filter(
		(venta) => obtenerEstadoCapturaVenta(venta.estudios_venta) === estadoFiltro,
	);
};

export const contarVentasPorEstadoCaptura = (ventas = []) =>
	ventas.reduce(
		(conteos, venta) => {
			const estado = obtenerEstadoCapturaVenta(venta.estudios_venta);
			return {
				...conteos,
				todos: conteos.todos + 1,
				pendientes:
					estado === "pendiente" ? conteos.pendientes + 1 : conteos.pendientes,
				guardados:
					estado === "guardado" ? conteos.guardados + 1 : conteos.guardados,
				validados:
					estado === "validado" ? conteos.validados + 1 : conteos.validados,
			};
		},
		{ todos: 0, pendientes: 0, guardados: 0, validados: 0 },
	);
