// Compartir un estudio de imagen con el paciente o con quien lo pidió.
//
// El botón de compartir mandaba la dirección de la pantalla en la que está el
// radiólogo, que a quien la recibe no le sirve: es una pantalla con sesión. Lo
// que se comparte es el visor del paciente, que se autoriza con folio y
// teléfono, y se manda por el medio que se elija.
import { crearUrlVisorPaciente, normalizarTelefonoPortal } from "./portal-resultados";

// Lo que se comparte es siempre el visor del paciente. La dirección de la
// pantalla del radiólogo -/visor-dicom/…- pide sesión: a quien la recibe le
// aparece la pantalla de acceso, así que nunca se manda. Sin estudio al que
// apuntar no se comparte nada y devuelve cadena vacía, que es lo que la
// pantalla usa para avisar en vez de mandar una liga inútil.
export const resolverUrlCompartirEstudio = ({
	idEstudio,
	folio = "",
	telefono = "",
	origin,
} = {}) => {
	const id = String(idEstudio ?? "").trim();
	if (!id) return "";
	return crearUrlVisorPaciente({ idEstudio: id, folio, telefono, ...(origin ? { origin } : {}) });
};

// El visor del paciente se autoriza con folio y teléfono: sin ellos la liga
// abre pero no deja ver el estudio, y quien comparte tiene que enterarse antes
// de mandarla.
export const faltanDatosParaCompartir = ({ folio = "", telefono = "" } = {}) =>
	!String(folio || "").trim() || !normalizarTelefonoPortal(telefono);

export const crearTextoCompartirEstudio = ({ paciente = "", estudio = "", url = "" } = {}) => {
	const de = paciente ? ` de ${paciente}` : "";
	const cual = estudio && estudio !== "—" ? ` (${estudio})` : "";
	return `Estudio de imagen${de}${cual} disponible para consulta: ${url}`.trim();
};

export const crearAsuntoCompartirEstudio = ({ paciente = "", folio = "" } = {}) =>
	`Estudio de imagen${paciente ? ` — ${paciente}` : ""}${folio ? ` (folio ${folio})` : ""}`;

export const crearEnlaceCorreoEstudio = ({ email = "", asunto = "", texto = "" } = {}) =>
	`mailto:${String(email || "").trim()}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(texto)}`;

// Los teléfonos se capturan a diez dígitos: WhatsApp necesita la lada del país,
// y sin teléfono se abre igual para elegir el contacto a mano.
export const LADA_MEXICO = "52";

export const crearEnlaceWhatsappEstudio = ({ telefono = "", texto = "" } = {}) => {
	const digitos = normalizarTelefonoPortal(telefono);
	const destino = digitos ? `${digitos.length === 10 ? LADA_MEXICO : ""}${digitos}` : "";
	return `https://wa.me/${destino}?text=${encodeURIComponent(texto)}`;
};
