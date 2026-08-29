// Captura e historial armaban los analitos de una orden con una cascada: una
// consulta por estudio para traer sus relaciones y, dentro, otra por cada
// analito con `.single()`. Una orden de cinco estudios de diez analitos se iba
// a más de cincuenta peticiones, en la pantalla donde se firman resultados y
// que es la que más se abre en el día. Aquí se resuelve en dos consultas: las
// relaciones de todas las claves y los analitos de todos los ids.

// Un `.in()` viaja en la URL, así que una orden con muchas claves distintas
// puede pasarse del límite del servidor y devolver 414. Se trocea.
const TAMANO_LOTE = 100;

const enLotes = (valores, tamano = TAMANO_LOTE) => {
	const lotes = [];
	for (let inicio = 0; inicio < valores.length; inicio += tamano) {
		lotes.push(valores.slice(inicio, inicio + tamano));
	}
	return lotes;
};

const consultarEnLotes = async (supabase, tabla, columna, valores, columnas) => {
	const filas = [];
	for (const lote of enLotes(valores)) {
		const { data, error } = await supabase
			.from(tabla)
			.select(columnas)
			.in(columna, lote);
		if (error) throw error;
		if (data?.length) filas.push(...data);
	}
	return filas;
};

// La referencia se arma igual que en el portal de resultados (ver la vista de
// las migraciones): rango cuando hay ambos extremos, mínimo cuando sólo hay
// uno, y si no el texto libre. Un subtítulo no lleva referencia porque no es
// un valor, es un encabezado dentro del estudio.
export const referenciaDeAnalito = (analito) => {
	if (analito?.tipo_resultado === "Subtitulo") return "";
	const bajo = analito?.vr_bajo;
	const alto = analito?.vr_alto;
	if (bajo != null && alto != null) return `${bajo} - ${alto}`;
	if (bajo != null) return `>${bajo}`;
	return analito?.referencia || "";
};

// Los resultados de un estudio son un JSON con los valores capturados. Se
// parsea una vez por estudio y no una vez por analito, como se hacía antes.
const resultadosDeEstudio = (estudio) => {
	if (!estudio?.resultados) return {};
	try {
		return JSON.parse(estudio.resultados) || {};
	} catch {
		// Un JSON corrupto no puede dejar la orden sin capturar: se sigue con
		// los analitos en blanco, que es lo que hacía la versión anterior.
		return {};
	}
};

export const cargarAnalitosDeEstudios = async (supabase, estudios = []) => {
	const lista = estudios || [];
	if (lista.length === 0) return [];

	const claves = [
		...new Set(lista.map((estudio) => estudio?.clave_estudio).filter(Boolean)),
	];
	if (claves.length === 0) return lista.map((estudio) => ({ ...estudio, analitos: [] }));

	let relaciones = [];
	let analitos = [];
	try {
		relaciones = await consultarEnLotes(
			supabase,
			"estudio_analitos",
			"clave_estudio",
			claves,
			"id_estudio_analito, clave_estudio, id_analito, orden",
		);

		const idsAnalitos = [
			...new Set(relaciones.map((relacion) => relacion?.id_analito).filter((id) => id != null)),
		];
		analitos = idsAnalitos.length
			? await consultarEnLotes(supabase, "analitos", "id_analito", idsAnalitos, "*")
			: [];
	} catch (error) {
		// Si la consulta falla, la orden se muestra sin analitos en lugar de no
		// abrirse: es como se degradaba antes, cuando cada estudio fallaba por
		// su cuenta.
		console.error("Error al cargar los analitos de los estudios:", error);
		return lista.map((estudio) => ({ ...estudio, analitos: [] }));
	}

	const analitoPorId = new Map(
		analitos.map((analito) => [String(analito.id_analito), analito]),
	);

	// Varios estudios de la orden pueden compartir clave -y con la captura de
	// cantidades es lo normal-, así que las relaciones se agrupan una sola vez
	// y cada estudio toma las suyas del mapa.
	const relacionesPorClave = new Map();
	relaciones.forEach((relacion) => {
		const clave = String(relacion.clave_estudio);
		if (!relacionesPorClave.has(clave)) relacionesPorClave.set(clave, []);
		relacionesPorClave.get(clave).push(relacion);
	});
	relacionesPorClave.forEach((lista) =>
		lista.sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0)),
	);

	return lista.map((estudio) => {
		const relacionesDelEstudio = relacionesPorClave.get(String(estudio?.clave_estudio)) || [];
		if (relacionesDelEstudio.length === 0) return { ...estudio, analitos: [] };

		const capturado = resultadosDeEstudio(estudio);
		const analitosDelEstudio = relacionesDelEstudio
			.map((relacion) => {
				const analito = analitoPorId.get(String(relacion.id_analito));
				if (!analito) return null;
				return {
					id_estudio_analito: relacion.id_estudio_analito,
					id_analito: analito.id_analito,
					clave: analito.clave,
					descripcion: analito.descripcion,
					unidades: analito.unidad || "",
					referencia: referenciaDeAnalito(analito),
					tipo_resultado: analito.tipo_resultado || "Numerico",
					resultado: capturado[analito.clave] || "",
					orden: relacion.orden,
				};
			})
			.filter(Boolean);

		return { ...estudio, analitos: analitosDelEstudio };
	});
};
