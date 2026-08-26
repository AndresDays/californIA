import { resolverEmpresaOperativaCatalogo } from "./cita-nuevo-paciente";

// Fiscalmente son dos empresas —CDC (California) y CDI (Imagen)— y el folio
// tiene que decir a cuál se factura sin abrir la orden. Como el laboratorio de
// CDC se controla aparte de su imagen, quedan tres series corridas:
//
//   A → CDI, imagen (convenios ISSSTE, SSA, Medisim)
//   B → CDC, imagen (convenios IMSS y Odile/Anamaya, y la resonancia particular)
//   C → CDC, laboratorio (todos los análisis)
export const SERIES_FOLIO = {
	A: { empresa: "CDI", tipo: "imagen" },
	B: { empresa: "CDC", tipo: "imagen" },
	C: { empresa: "CDC", tipo: "laboratorio" },
};

export const SERIE_LABORATORIO = "C";
export const SERIE_POR_DEFECTO = "A";
export const LARGO_CONSECUTIVO = 4;

const SERIE_IMAGEN_POR_EMPRESA = { CDC: "B", CDI: "A" };

export const esEstudioDeLaboratorio = (estudio = {}) =>
	estudio?.modulo === "laboratorio" ||
	(estudio?.requiere_imagen === false && !estudio?.modalidad) ||
	estudio?.modalidad === "laboratorio";

// La empresa que factura una imagen la manda el convenio del cliente: el mismo
// ultrasonido es de CDC con IMSS y de CDI con ISSSTE. Sin convenio (particular)
// mandan la resonancia y la veterinaria a CDC y el resto de la imagen a CDI,
// que es como está capturado el catálogo.
export const resolverEmpresaFacturaEstudio = (estudio = {}, empresaCliente = "") => {
	const delConvenio = String(empresaCliente || "").toUpperCase();
	if (SERIE_IMAGEN_POR_EMPRESA[delConvenio]) return delConvenio;
	return estudio?.empresa_operativa || "CDI";
};

export const resolverSerieFolio = (estudio = {}, empresaCliente = "") => {
	if (esEstudioDeLaboratorio(estudio)) return SERIE_LABORATORIO;
	const empresa = resolverEmpresaFacturaEstudio(estudio, empresaCliente);
	return SERIE_IMAGEN_POR_EMPRESA[empresa] || SERIE_POR_DEFECTO;
};

export const empresaDeSerie = (serie = "") =>
	SERIES_FOLIO[String(serie).toUpperCase()]?.empresa || "";

// Los estudios de una orden se reparten en las series que les tocan; cada una
// lleva su folio.
export const agruparEstudiosPorSerie = (estudios = [], empresaCliente = "") => {
	const grupos = new Map();
	estudios.forEach((estudio) => {
		const serie = resolverSerieFolio(estudio, empresaCliente);
		if (!grupos.has(serie)) grupos.set(serie, []);
		grupos.get(serie).push(estudio);
	});
	return [...grupos.entries()]
		.sort(([unaSerie], [otraSerie]) => unaSerie.localeCompare(otraSerie))
		.map(([serie, estudiosSerie]) => ({
			serie,
			empresa: empresaDeSerie(serie),
			estudios: estudiosSerie,
		}));
};

// El folio es corrido por serie, sin fecha: A0001, A0002, B0001…
export const construirFolio = (serie, consecutivo) =>
	`${String(serie || "").toUpperCase()}${String(consecutivo).padStart(LARGO_CONSECUTIVO, "0")}`;

export const normalizarFolio = (folio = "") =>
	String(folio ?? "")
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, "");

// Los folios anteriores al cambio son DDMMYY + consecutivo, sin letra, y siguen
// siendo válidos.
export const separarFolio = (folio = "") => {
	const limpio = normalizarFolio(folio);
	const conSerie = limpio.match(/^([A-Z])(\d+)$/);
	if (conSerie) {
		return {
			serie: conSerie[1],
			empresa: empresaDeSerie(conSerie[1]),
			consecutivo: Number.parseInt(conSerie[2], 10),
			folio: limpio,
		};
	}
	const anterior = limpio.match(/^(\d{6})(\d{4,})$/);
	if (anterior) {
		return {
			serie: "",
			empresa: "",
			fecha: anterior[1],
			consecutivo: Number.parseInt(anterior[2], 10),
			folio: limpio,
		};
	}
	return { serie: "", empresa: "", consecutivo: null, folio: limpio };
};

export const foliosCoinciden = (unFolio, otroFolio) =>
	Boolean(unFolio) &&
	Boolean(otroFolio) &&
	normalizarFolio(unFolio) === normalizarFolio(otroFolio);

// Para consultar (portal y visor del paciente) sólo se corrigen los errores de
// captura que sí pasan: minúsculas, espacios y guiones sobre un folio con la
// forma del ticket. Un folio con otro formato se manda tal cual, porque ahí el
// separador puede ser parte del folio.
export const PATRON_FOLIO_TICKET = /^([A-Z]\d{3,}|\d{10})$/;

export const normalizarFolioConsulta = (folio = "") => {
	const limpio = String(folio ?? "").trim().toUpperCase();
	const estricto = normalizarFolio(limpio);
	return PATRON_FOLIO_TICKET.test(estricto) ? estricto : limpio;
};
