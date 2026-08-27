// El precio pactado se busca por clave y cliente, pero ninguno de los dos se
// captura siempre igual: el cliente puede estar dado de alta como "MEDISIM" y
// su tarifario guardado como "Medisim", y con una comparación exacta no se
// encuentra nada. Cuando eso pasa el estudio se cobra al precio por defecto
// aunque sí tenga precio pactado.
const escaparComodines = (valor) => String(valor ?? "").trim().replace(/[%_]/g, "\\$&");

export const PRECIO_POR_DEFECTO = 150;

// Se compara sin distinguir mayúsculas ni espacios de sobra. Se piden varios
// renglones a propósito: un tarifario con la clave repetida hacía fallar la
// consulta cuando esperaba exactamente uno, y eso también terminaba en el
// precio por defecto.
const buscarPrecio = async (supabase, cliente, columna, valor) => {
	if (!valor) return null;

	const { data, error } = await supabase
		.from("precios_estudios")
		.select("precio")
		.ilike("cliente", escaparComodines(cliente))
		.ilike(columna, escaparComodines(valor))
		.limit(5);

	if (error || !data?.length) return null;

	const precio = data
		.map((fila) => Number(fila?.precio))
		.find((valor) => Number.isFinite(valor) && valor > 0);

	return precio ?? null;
};

// La búsqueda de estudios ofrece lo que el convenio cubre cruzando por clave o
// por descripción, así que el precio se resuelve igual: si sólo se buscara por
// clave, un estudio que se ofreció por su descripción caería al precio por
// defecto.
export const buscarPrecioEstudioCliente = async (
	supabase,
	{ clave, descripcion, cliente } = {},
) => {
	const nombreCliente = String(cliente ?? "").trim();
	if (!supabase || !nombreCliente) return null;

	return (
		(await buscarPrecio(supabase, nombreCliente, "clave", clave)) ??
		(await buscarPrecio(supabase, nombreCliente, "descripcion", descripcion))
	);
};

export const resolverPrecioEstudioCliente = async (supabase, datos = {}) => {
	const precio = await buscarPrecioEstudioCliente(supabase, datos);
	if (precio !== null) return precio;

	// Cobrar al precio por defecto un estudio que sí tiene precio pactado es
	// difícil de notar en caja y difícil de rastrear después, así que queda
	// dicho en la consola con qué se buscó.
	console.warn(
		`Sin precio pactado para la clave "${datos?.clave}" (${datos?.descripcion || "sin descripción"}) ` +
			`del cliente "${datos?.cliente}": se cobra el precio por defecto de $${PRECIO_POR_DEFECTO}.`,
	);
	return PRECIO_POR_DEFECTO;
};
