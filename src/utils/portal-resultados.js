export const normalizarTelefonoPortal = (telefono = "") =>
	String(telefono).replace(/\D/g, "");

export const crearUrlPortalResultados = ({
	folio,
	telefono,
	origin = window.location.origin,
} = {}) => {
	const params = new URLSearchParams();
	if (folio) params.set("folio", folio);
	if (telefono) params.set("telefono", normalizarTelefonoPortal(telefono));
	const query = params.toString();
	return `${origin}/resultados${query ? `?${query}` : ""}`;
};

export const crearTextoCompartirResultados = ({ paciente, folio, url } = {}) => {
	const nombre = paciente ? ` de ${paciente}` : "";
	return `Resultados${nombre} disponibles para descarga. Folio ${folio || ""}: ${url || ""}`.trim();
};

export const normalizarTextoResultado = (valor = "") =>
	String(valor)
		.replace(/<\s*br\s*\/?\s*>/gi, "\n")
		.replace(/&nbsp;/gi, " ")
		.replace(/&amp;/gi, "&")
		.trim();
