// Promociones que la pantalla de la sala de espera pasa en ciclo entre turnos.
// Se administran en Configuración > Promociones sala; aquí vive lo que comparten
// esa pantalla y la de la TV.

export const BUCKET_PROMOCIONES_SALA = "promociones-sala";

// Cuánto se queda cada promoción en pantalla y cuánto el turno recién llamado
// antes de regresar a las promociones.
export const SEGUNDOS_POR_PROMOCION = 10;
export const SEGUNDOS_TURNO_EN_PANTALLA = 45;

export const TIPOS_IMAGEN_PROMOCION = ["image/png", "image/jpeg", "image/webp"];
export const TAMANO_MAXIMO_PROMOCION = 10 * 1024 * 1024;

export const fechaLocalIso = (fecha = new Date()) =>
	`${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;

// Sin fechas se muestra siempre; con ellas, del primer al último día incluidos.
export const estadoPromocion = (promocion, hoy = fechaLocalIso()) => {
	if (!promocion?.activa) return "inactiva";
	if (promocion.vigente_desde && hoy < promocion.vigente_desde) return "programada";
	if (promocion.vigente_hasta && hoy > promocion.vigente_hasta) return "vencida";
	return "visible";
};

export const promocionesVisibles = (promociones = [], hoy = fechaLocalIso()) =>
	promociones
		.filter((promocion) => estadoPromocion(promocion, hoy) === "visible")
		.sort((una, otra) => (una.orden ?? 0) - (otra.orden ?? 0) || una.id_promocion - otra.id_promocion);

export const urlPromocion = (supabase, storagePath) =>
	supabase.storage.from(BUCKET_PROMOCIONES_SALA).getPublicUrl(storagePath).data?.publicUrl || "";

// Nombre único y sin caracteres raros: el archivo se llama como lo bajaron de
// WhatsApp ("WhatsApp Image 2026-11-09 at 10.15.32.jpeg") y Storage no acepta
// cualquier cosa en la ruta.
export const rutaParaPromocion = (nombreArchivo = "", ahora = Date.now()) => {
	const extension = (String(nombreArchivo).match(/\.([a-z0-9]+)$/i)?.[1] || "png").toLowerCase();
	const base = String(nombreArchivo)
		.replace(/\.[^.]+$/, "")
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 40) || "promocion";
	const azar = Math.random().toString(36).slice(2, 8);
	return `${ahora}-${azar}-${base}.${extension}`;
};

export const tituloDesdeArchivo = (nombreArchivo = "") =>
	String(nombreArchivo).replace(/\.[^.]+$/, "").trim() || "Promoción";
