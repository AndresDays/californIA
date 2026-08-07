const LIMITE_PDF_CULTIVO_BYTES = 25 * 1024 * 1024;

export function esEstudioCultivo(estudio) {
	return [estudio?.descripcion_estudio, estudio?.descripcion].some((descripcion) =>
		String(descripcion || "").toLowerCase().includes("cultivo"),
	);
}

export function validarPdfCultivo(file) {
	if (!file || file.type !== "application/pdf") {
		return "Solo se permiten archivos PDF.";
	}

	if (file.size > LIMITE_PDF_CULTIVO_BYTES) {
		return "El archivo PDF no debe superar los 25 MiB.";
	}

	return "";
}

/**
 * `archivo_cultivo_url` must be a non-empty, fetchable public HTTP(S) URL.
 * Authorization and release status are verified by the portal RPC before use.
 */
function tieneArchivoCultivoUrl(archivoCultivoUrl) {
	try {
		const url = new URL(archivoCultivoUrl);
		return url.protocol === "https:" || url.protocol === "http:";
	} catch {
		return false;
	}
}

export function separarEstudiosConCultivo(studies = []) {
	const estudios = Array.isArray(studies) ? studies : [];

	return estudios.reduce(
		(resultado, estudio) => {
			if (esEstudioCultivo(estudio) && tieneArchivoCultivoUrl(estudio.archivo_cultivo_url)) {
				resultado.adjuntosCultivo.push(estudio);
			} else {
				resultado.generados.push(estudio);
			}

			return resultado;
		},
		{ generados: [], adjuntosCultivo: [] },
	);
}
