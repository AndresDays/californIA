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

export function esArchivoCultivoPathValido(archivoCultivoPath) {
	return /^[0-9]+\/cultivo\.pdf$/.test(String(archivoCultivoPath || ""));
}

// Used by authenticated internal screens only. The public portal must receive
// archivo_cultivo_url from its server-side, rate-limited delivery endpoint.
export async function hidratarArchivoCultivoUrl(estudio, supabaseOrStorage) {
	const storage = supabaseOrStorage?.storage || supabaseOrStorage;
	if (estudio?.archivo_cultivo_url || !esArchivoCultivoPathValido(estudio?.archivo_cultivo_path) || !storage?.from) return estudio;
	const { data, error } = await storage
		.from("resultados-cultivo-adjuntos")
		.createSignedUrl(estudio.archivo_cultivo_path, 60);
	return error || !data?.signedUrl ? estudio : { ...estudio, archivo_cultivo_url: data.signedUrl };
}

export function separarEstudiosConCultivo(studies = []) {
	const estudios = Array.isArray(studies) ? studies : [];

	return estudios.reduce(
		(resultado, estudio) => {
			const tieneAdjunto = typeof estudio?.archivo_cultivo_url === "string"
				&& estudio.archivo_cultivo_url.length > 0;
			if (esEstudioCultivo(estudio) && tieneAdjunto) {
				resultado.adjuntosCultivo.push(estudio);
			} else {
				resultado.generados.push(estudio);
			}

			return resultado;
		},
		{ generados: [], adjuntosCultivo: [] },
	);
}
