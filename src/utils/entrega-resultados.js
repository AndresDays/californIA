import { calcularSaldoVenta, tieneAdeudoVenta } from "./venta-payment-status";

const normalizarTexto = (valor = "") =>
	String(valor)
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase();

export const estudioImagenListoEntrega = (estudio = {}) =>
	estudio.listo_entrega === true && estudio.entregado !== true;

export const esEstudioImagenEntrega = (estudio = {}) => {
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

export const estudioLaboratorioListoEntrega = (estudio = {}) =>
	!esEstudioImagenEntrega(estudio) &&
	estudio.estado_validacion === "validado" &&
	!estudio.entregado &&
	estudio.muestra_pendiente !== true;

export const ventaCompletaListaEntrega = (venta = {}) => {
	const estudiosVenta = venta.estudios_venta || [];
	const estudiosLaboratorioPendientes = estudiosVenta.filter(
		(estudio) => !esEstudioImagenEntrega(estudio) && estudio.entregado !== true,
	);
	const estudiosRadiologiaPendientes = (
		venta.estudios_radiologia_todos ||
		venta.estudios_radiologia ||
		[]
	).filter((estudio) => estudio.entregado !== true);

	const hayPendientes =
		estudiosLaboratorioPendientes.length > 0 ||
		estudiosRadiologiaPendientes.length > 0;
	if (!hayPendientes) return false;

	const laboratorioListo = estudiosLaboratorioPendientes.every(
		estudioLaboratorioListoEntrega,
	);
	const radiologiaLista = estudiosRadiologiaPendientes.every(
		estudioImagenListoEntrega,
	);

	return laboratorioListo && radiologiaLista;
};

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
	if (!ventaCompletaListaEntrega(venta)) return false;

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
			estudioImagenListoEntrega(estudio) &&
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
		estudioImagenListoEntrega,
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
