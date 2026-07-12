const ORIGENES_LOCALES = new Set(["http://localhost:5173", "http://127.0.0.1:5173"]);

export const esOrigenAdminPermitido = (origen, origenesConfigurados = "") => {
	if (!origen) return true;
	const permitidos = origenesConfigurados
		.split(",")
		.map((valor) => valor.trim())
		.filter(Boolean);
	return permitidos.length > 0 ? permitidos.includes(origen) : ORIGENES_LOCALES.has(origen);
};

export const headersCorsAdmin = (origen, origenesConfigurados = "") =>
	esOrigenAdminPermitido(origen, origenesConfigurados) && origen
		? {
				"Access-Control-Allow-Origin": origen,
				"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
				"Access-Control-Allow-Methods": "POST, OPTIONS",
				Vary: "Origin",
			}
		: {};
