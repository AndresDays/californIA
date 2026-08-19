// Datos de compilación inyectados por Vite (ver `define` en vite.config.js).
// Fuera del build (pruebas, SSR) los globales no existen, por eso se leen con
// cuidado y con valores de respaldo.
export const VERSION_APP =
	typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "desarrollo";
export const COMMIT_APP = typeof __APP_COMMIT__ === "string" ? __APP_COMMIT__ : "";
export const FECHA_COMPILACION_APP =
	typeof __APP_BUILD_DATE__ === "string" ? __APP_BUILD_DATE__ : "";

export const formatearFechaCompilacion = (valor = FECHA_COMPILACION_APP) => {
	if (!valor) return "No disponible";
	const fecha = new Date(valor);
	if (Number.isNaN(fecha.getTime())) return "No disponible";
	return fecha.toLocaleString("es-MX", {
		day: "2-digit",
		month: "long",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

// Identificador corto que resume qué build está cargado; sirve para comparar de
// un vistazo lo que ve el usuario contra lo que se publicó.
export const etiquetaVersionApp = ({
	version = VERSION_APP,
	commit = COMMIT_APP,
} = {}) => (commit ? `v${version} (${commit})` : `v${version}`);
