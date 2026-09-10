// La pantalla del convenio: filtros y cuentas de la lista de órdenes.
//
// Van aparte de la pantalla para poder probarlos sin montar la página, que
// depende de Supabase y del generador de PDF.

const normalizar = (valor = "") =>
	String(valor ?? "")
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.trim()
		.toLowerCase();

// Se busca por paciente y por folio: el convenio llega con una de las dos
// cosas, nunca con las dos.
export const filtrarOrdenesConvenio = (ordenes = [], busqueda = "") => {
	const termino = normalizar(busqueda);
	if (!termino) return ordenes;
	return ordenes.filter(
		(orden) =>
			normalizar(orden?.paciente).includes(termino) ||
			normalizar(orden?.folio).includes(termino),
	);
};

// Cuántos estudios de la orden ya se pueden consultar: validado es el estado a
// partir del cual el resultado se entrega.
export const contarEstudiosListos = (orden = {}) =>
	(orden?.estudios || []).filter((estudio) => estudio?.estado === "validado").length;

export const formatearFechaOrden = (fecha) => {
	if (!fecha) return "";
	const valor = new Date(fecha);
	if (Number.isNaN(valor.getTime())) return String(fecha);
	return valor.toLocaleDateString("es-MX", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		timeZone: "America/Mexico_City",
	});
};
