import {
	normalizarClaveEstudio,
	normalizarDescripcionEstudio,
} from "./cita-nuevo-paciente";

// Los convenios (IMSS, ISSSTE) sólo tienen precio para parte del catálogo. Se
// carga su lista de precios para que la búsqueda de estudios ofrezca nada más
// lo que sí se les puede cobrar.
const TAMANO_PAGINA = 1000;

export const cargarPreciosCliente = async (supabase, nombreCliente) => {
	const cliente = String(nombreCliente || "").trim();
	if (!supabase || !cliente) return null;

	const claves = new Set();
	const descripciones = new Set();
	let desde = 0;

	// La lista de precios de un convenio pasa de mil renglones y Supabase corta
	// la respuesta: se pagina hasta traerla completa.
	for (;;) {
		const { data, error } = await supabase
			.from("precios_estudios")
			.select("clave, descripcion")
			// Sin distinguir mayúsculas: el cliente puede estar dado de alta como
			// "MEDISIM" y su tarifario guardado como "Medisim". Con la comparación
			// exacta no cruzaba ninguna clave, y entonces la búsqueda ofrecía todo
			// el catálogo y cada estudio se cobraba al precio por defecto.
			.ilike("cliente", cliente.replace(/[%_]/g, "\\$&"))
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
			const descripcion = normalizarDescripcionEstudio(fila?.descripcion);
			if (descripcion) descripciones.add(descripcion);
		});

		if (!data || data.length < TAMANO_PAGINA) break;
		desde += TAMANO_PAGINA;
	}

	// Un cliente sin precios cargados (particulares, convenios recién dados de
	// alta) usa el catálogo completo con el precio por defecto.
	if (claves.size === 0 && descripciones.size === 0) return null;
	return { claves, descripciones };
};

// Cruza la lista de precios contra el catálogo que se está mostrando. Se
// resuelve contra el catálogo real —y no sólo con las claves del tarifario—
// porque una lista capturada con otra nomenclatura dejaría la búsqueda
// completamente vacía; en ese caso es mejor no filtrar y avisar.
export const resolverClavesConPrecio = (precios, estudios = []) => {
	if (!precios) return null;
	const { claves, descripciones } = precios;
	if (!claves?.size && !descripciones?.size) return null;

	const permitidas = new Set();
	estudios.forEach((estudio) => {
		const clave = normalizarClaveEstudio(estudio?.clave);
		if (!clave) return;
		const descripcion = normalizarDescripcionEstudio(estudio?.descripcion);
		if (claves?.has(clave) || (descripcion && descripciones?.has(descripcion))) {
			permitidas.add(clave);
		}
	});

	return permitidas.size > 0 ? permitidas : null;
};
