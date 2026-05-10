export const obtenerMensajeErrorFuncion = async (error) => {
	const fallback = error?.message || "Error desconocido";
	const response = error?.context;
	if (!response) return fallback;

	try {
		const body = await response.clone().json();
		return body?.error || body?.message || fallback;
	} catch {
		try {
			const text = await response.clone().text();
			return text || fallback;
		} catch {
			return fallback;
		}
	}
};
