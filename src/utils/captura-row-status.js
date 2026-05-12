export const CAPTURA_FILTROS_ESTADO = [
	{ id: "todos", label: "Todos" },
	{ id: "pendientes", label: "Pendientes" },
	{ id: "guardados", label: "Guardados" },
	{ id: "validados", label: "Validados" },
];

export const tieneMuestrasPendientes = (estudiosVenta = []) =>
	estudiosVenta.some((estudio) => estudio.muestra_pendiente === true);

const normalizarTexto = (valor = "") =>
	String(valor)
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase();

const compactarTexto = (valor = "") =>
	normalizarTexto(valor).replace(/[^a-z0-9]/g, "");

const obtenerTextoEstudioVenta = (estudio = {}) =>
	`${estudio.clave_estudio || estudio.clave || ""} ${estudio.descripcion_estudio || estudio.descripcion || ""}`;

const obtenerTextoRadiologia = (estudio = {}) =>
	`${estudio.tipo_estudio || ""} ${estudio.descripcion || estudio.descripcion_estudio || ""}`;

export const esEstudioImagenCaptura = (estudio = {}) => {
	const texto = normalizarTexto(
		`${estudio.clave_estudio || estudio.clave || ""} ${estudio.area || ""} ${estudio.descripcion_estudio || estudio.descripcion || ""}`,
	);
	return (
		/^(rm|rx|tac|us|ec|uo|vet)-/.test(texto) ||
		/radiologia|imagen|rayos|ultrasonido|ultrasonografia|tomografia|resonancia|mastografia|contrastados|veterinaria/.test(
			texto,
		)
	);
};

export const estudioRadiologiaListoCaptura = (estudio = {}) =>
	estudio.listo_entrega === true ||
	estudio.estado === "COMPLETADO" ||
	Boolean(String(estudio.reporte || "").trim());

const encontrarRadiologiaParaEstudio = (
	estudioVenta = {},
	estudiosRadiologia = [],
) => {
	const idEstudioVenta = estudioVenta.id_estudio_venta;
	if (idEstudioVenta) {
		const porId = estudiosRadiologia.find(
			(estudio) =>
				String(estudio.id_estudio_venta || "") === String(idEstudioVenta),
		);
		if (porId) return porId;
	}

	const textoVenta = compactarTexto(obtenerTextoEstudioVenta(estudioVenta));
	const descripcionVenta = compactarTexto(
		estudioVenta.descripcion_estudio || estudioVenta.descripcion || "",
	);
	if (!textoVenta && !descripcionVenta) return null;

	return (
		estudiosRadiologia.find((estudio) => {
			const textoRadiologia = compactarTexto(obtenerTextoRadiologia(estudio));
			if (!textoRadiologia) return false;
			return (
				textoRadiologia === descripcionVenta ||
				textoRadiologia === textoVenta ||
				textoRadiologia.includes(descripcionVenta) ||
				textoVenta.includes(textoRadiologia)
			);
		}) || null
	);
};

export const aplicarEstadoRadiologiaACaptura = (
	estudiosVenta = [],
	estudiosRadiologia = [],
) => {
	const estudiosRadiologiaListos = (estudiosRadiologia || []).filter(
		estudioRadiologiaListoCaptura,
	);

	return (estudiosVenta || []).map((estudio) => {
		if (!esEstudioImagenCaptura(estudio)) return estudio;

		const estudioRadiologia = encontrarRadiologiaParaEstudio(
			estudio,
			estudiosRadiologiaListos,
		);
		if (!estudioRadiologia) return estudio;

		return {
			...estudio,
			estado_captura: "completado",
			estado_validacion:
				estudioRadiologia.listo_entrega === true ? "validado" : "guardado",
			radiologia_id_estudio: estudioRadiologia.id_estudio,
			radiologia_estado: estudioRadiologia.estado,
			radiologia_listo_entrega: estudioRadiologia.listo_entrega,
		};
	});
};

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
