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
