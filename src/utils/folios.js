import { resolverEmpresaOperativaCatalogo } from "./cita-nuevo-paciente";

// El folio dice de qué empresa es la orden sin tener que abrirla: una letra al
// frente del consecutivo de siempre (C2508260001 para CDC, I2508260001 para
// CDI). Los folios anteriores al cambio, de puros dígitos, siguen siendo
// válidos.
export const PREFIJOS_FOLIO = { CDC: "C", CDI: "I" };
export const PREFIJO_FOLIO_POR_DEFECTO = PREFIJOS_FOLIO.CDC;
export const LARGO_CONSECUTIVO = 4;

export const resolverPrefijoFolio = (empresaNombre = "") => {
	const operativa = resolverEmpresaOperativaCatalogo(empresaNombre);
	return PREFIJOS_FOLIO[operativa] || PREFIJO_FOLIO_POR_DEFECTO;
};

// El laboratorio siempre se factura por CDC; los estudios de imagen van con la
// empresa operativa de su catálogo.
export const resolverPrefijoFolioEstudio = (estudio = {}) => {
	if (estudio?.modulo === "laboratorio" || estudio?.requiere_imagen === false) {
		return PREFIJOS_FOLIO.CDC;
	}
	return PREFIJOS_FOLIO[estudio?.empresa_operativa] || PREFIJO_FOLIO_POR_DEFECTO;
};

export const fechaFolio = (fecha = new Date()) => {
	const dia = String(fecha.getDate()).padStart(2, "0");
	const mes = String(fecha.getMonth() + 1).padStart(2, "0");
	const ano = String(fecha.getFullYear()).slice(-2);
	return `${dia}${mes}${ano}`;
};

export const construirFolio = (prefijo, fecha, consecutivo) =>
	`${prefijo || ""}${fechaFolio(fecha)}${String(consecutivo).padStart(LARGO_CONSECUTIVO, "0")}`;

// El paciente teclea el folio del ticket en el portal: minúsculas, espacios o
// guiones no deben impedir que encuentre sus resultados.
export const normalizarFolio = (folio = "") =>
	String(folio ?? "")
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, "");

export const separarFolio = (folio = "") => {
	const limpio = normalizarFolio(folio);
	const match = limpio.match(/^([A-Z]*)(\d{6})(\d+)$/);
	if (!match) return { prefijo: "", fecha: "", consecutivo: null, folio: limpio };
	return {
		prefijo: match[1],
		fecha: match[2],
		consecutivo: Number.parseInt(match[3], 10),
		folio: limpio,
	};
};

export const empresaDeFolio = (folio = "") => {
	const { prefijo } = separarFolio(folio);
	const entrada = Object.entries(PREFIJOS_FOLIO).find(([, letra]) => letra === prefijo);
	return entrada?.[0] || "";
};

export const foliosCoinciden = (unFolio, otroFolio) =>
	Boolean(unFolio) &&
	Boolean(otroFolio) &&
	normalizarFolio(unFolio) === normalizarFolio(otroFolio);

// Para consultar (portal y visor del paciente) sólo se corrigen los errores de
// captura que sí pasan: minúsculas, espacios y guiones sobre un folio con la
// forma del ticket. Un folio con otro formato se manda tal cual, porque ahí el
// separador puede ser parte del folio.
export const PATRON_FOLIO_TICKET = /^[A-Z]?\d{10}$/;

export const normalizarFolioConsulta = (folio = "") => {
	const limpio = String(folio ?? "").trim().toUpperCase();
	const estricto = normalizarFolio(limpio);
	return PATRON_FOLIO_TICKET.test(estricto) ? estricto : limpio;
};
