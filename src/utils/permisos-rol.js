import { esEstudioImagenCaptura } from "./captura-row-status";

// El químico trabaja el laboratorio: en captura y en entrega de resultados no
// tiene por qué ver —ni tocar— los estudios de imagen de la orden.
const ROLES_SOLO_LABORATORIO = ["quimico", "químico"];

export const esRolSoloLaboratorio = (rol = "") =>
	ROLES_SOLO_LABORATORIO.includes(String(rol || "").trim().toLowerCase());

export const esEstudioLaboratorio = (estudio = {}) => !esEstudioImagenCaptura(estudio);

// Las órdenes conservan su folio y sus datos; lo que se recorta son sus
// partidas. Una orden que sólo trae imagen deja de aparecer, porque para el
// químico no hay nada que capturar ni entregar ahí.
export const filtrarVentasSoloLaboratorio = (ventas = [], rol = "") => {
	if (!esRolSoloLaboratorio(rol)) return ventas;

	return ventas
		.map((venta) => ({
			...venta,
			estudios_venta: (venta?.estudios_venta || []).filter(esEstudioLaboratorio),
		}))
		.filter((venta) => venta.estudios_venta.length > 0);
};

export const filtrarEstudiosSoloLaboratorio = (estudios = [], rol = "") =>
	esRolSoloLaboratorio(rol) ? estudios.filter(esEstudioLaboratorio) : estudios;

// Recepción consulta el reporte de ventas para cuadrar su turno, no para
// revisar el histórico: ve el movimiento del día y nada más. El rango se
// resuelve aquí -y no en la pantalla- porque de él dependen las consultas, la
// impresión y el nombre del archivo exportado, y bastaba olvidar uno para que
// se colara un periodo entero.
const ROLES_REPORTE_SOLO_HOY = ["recepcionista", "recepcion", "recepción"];

export const esRolReporteSoloHoy = (rol = "") =>
	ROLES_REPORTE_SOLO_HOY.includes(
		String(rol || "")
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.trim()
			.toLowerCase(),
	);

export const resolverRangoReporteVentas = ({
	rol = "",
	fechaInicial = "",
	fechaFinal = "",
	hoy = "",
} = {}) => {
	if (esRolReporteSoloHoy(rol) && hoy) {
		return { fechaInicial: hoy, fechaFinal: hoy, fijo: true };
	}
	return { fechaInicial, fechaFinal, fijo: false };
};
