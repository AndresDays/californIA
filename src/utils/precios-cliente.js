import { normalizarClaveEstudio } from "./cita-nuevo-paciente";

// Los convenios (IMSS, ISSSTE) sólo tienen precio para parte del catálogo. Se
// cargan las claves con precio del cliente para que la búsqueda de estudios
// ofrezca nada más lo que sí se le puede cobrar.
const TAMANO_PAGINA = 1000;

export const cargarClavesConPrecioCliente = async (supabase, nombreCliente) => {
	const cliente = String(nombreCliente || "").trim();
	if (!supabase || !cliente) return null;

	const claves = new Set();
	let desde = 0;

	// La lista de precios de un convenio pasa de mil renglones y Supabase corta
	// la respuesta: se pagina hasta traerla completa.
	for (;;) {
		const { data, error } = await supabase
			.from("precios_estudios")
			.select("clave")
			.eq("cliente", cliente)
			.range(desde, desde + TAMANO_PAGINA - 1);

		if (error) {
			console.warn("No se pudieron cargar los precios del cliente:", error);
			// Sin la lista de precios no se filtra nada: es preferible ofrecer de
			// más que dejar la búsqueda vacía.
			return null;
		}

		(data || []).forEach((fila) => {
			const clave = normalizarClaveEstudio(fila?.clave);
			if (clave) claves.add(clave);
		});

		if (!data || data.length < TAMANO_PAGINA) break;
		desde += TAMANO_PAGINA;
	}

	// Un cliente sin precios cargados (particulares, convenios recién dados de
	// alta) usa el catálogo completo con el precio por defecto.
	return claves.size > 0 ? claves : null;
};
