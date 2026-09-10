// Compartir un estudio de imagen con el paciente o con quien lo pidió.
//
// El botón de compartir mandaba la dirección de la pantalla en la que está el
// radiólogo, que a quien la recibe no le sirve: es una pantalla con sesión. Lo
// que se comparte es el visor del paciente, que se autoriza con folio y
// teléfono, y se manda por el medio que se elija.
import { crearUrlVisorPaciente, normalizarTelefonoPortal } from "./portal-resultados";

// Sin folio ni teléfono no hay liga pública que armar -un estudio capturado a
// medias-, así que se comparte la de la pantalla, que al menos sirve entre
// personal de la clínica.
export const resolverUrlCompartirEstudio = ({
	idEstudio,
	folio = "",
	telefono = "",
	origin,
	urlActual = "",
} = {}) => {
	if (!idEstudio || !folio || !normalizarTelefonoPortal(telefono)) return urlActual;
	return crearUrlVisorPaciente({ idEstudio, folio, telefono, ...(origin ? { origin } : {}) });
};

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
