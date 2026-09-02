// Resuelve el id de un catálogo a partir del nombre escrito a mano.
//
// La cita por teléfono se captura escribiendo, no eligiendo de tres listas
// encadenadas. Pero la tabla guarda ids, así que al guardar hay que intentar
// casar lo tecleado con el catálogo: si coincide se conserva la relación, y si
// no, la cita se guarda igual con el id vacío en vez de rechazarse.
//
// La comparación ignora acentos, mayúsculas y espacios de sobra, porque nadie
// teclea "CENTRAL DIAGNÓSTICA CALIFORNIA" con el acento puesto cuando tiene al
// paciente esperando en la línea.

export const normalizarNombre = (valor = "") =>
	String(valor ?? "")
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");

// Devuelve el registro cuyo nombre coincide con lo escrito. Primero busca la
// coincidencia exacta; si no la hay, acepta que lo tecleado sea el principio de
// un nombre del catálogo, pero sólo cuando no hay ambigüedad: "central" vale si
// una sola empresa empieza así, y no vale si empiezan dos.
export const buscarPorNombre = (catalogo = [], texto = "", campoNombre = "nombre") => {
	const buscado = normalizarNombre(texto);
	if (!buscado) return null;

	const exacto = catalogo.find(
		(registro) => normalizarNombre(registro?.[campoNombre]) === buscado,
	);
	if (exacto) return exacto;

	const empiezan = catalogo.filter((registro) =>
		normalizarNombre(registro?.[campoNombre]).startsWith(buscado),
	);
	return empiezan.length === 1 ? empiezan[0] : null;
};

// El id del registro que coincide, o null. Es lo que viaja a la base: una cita
// con el cliente escrito a mano pero sin coincidencia se guarda sin id_cliente,
// que la tabla acepta.
export const idPorNombre = (catalogo = [], texto = "", campoId = "id", campoNombre = "nombre") => {
	const encontrado = buscarPorNombre(catalogo, texto, campoNombre);
	return encontrado ? encontrado[campoId] : null;
};
