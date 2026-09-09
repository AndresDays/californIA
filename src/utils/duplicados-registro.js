export const normalizarNombreDuplicado = (valor) =>
	String(valor || "")
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.trim()
		.replace(/\s+/g, " ");

export const obtenerNombreCompletoRegistro = (registro = {}) =>
	[
		registro.primer_nombre || registro.nombre,
		registro.apellido_paterno,
		registro.apellido_materno,
	]
		.map((valor) => String(valor || "").trim())
		.filter(Boolean)
		.join(" ");

// El nombre completo normalizado, venga en campos separados o todo en `nombre`.
// Los registros viejos -y los que se dieron de alta pegando el nombre entero-
// guardan "MARIA LOPEZ SOTO" en `nombre` y los apellidos vacíos: comparar campo
// por campo no los ve, y por ahí se colaron los duplicados.
export const nombreCompletoNormalizado = (registro = {}) => {
	const partes = [
		registro.primer_nombre || registro.nombre,
		registro.apellido_paterno,
		registro.apellido_materno,
	]
		.map(normalizarNombreDuplicado)
		.filter(Boolean);

	// Con los campos separados, `nombre` suele traer también el nombre completo:
	// concatenarlo duplicaría las palabras.
	const nombreSuelto = normalizarNombreDuplicado(registro.nombre);
	if (partes.length === 1 && nombreSuelto) return nombreSuelto;

	return [...new Set(partes.join(" ").split(" "))].join(" ").trim();
};

export const esMismoNombreRegistro = (a = {}, b = {}) => {
	const mismoCampoPorCampo =
		normalizarNombreDuplicado(a.primer_nombre || a.nombre) ===
			normalizarNombreDuplicado(b.primer_nombre || b.nombre) &&
		normalizarNombreDuplicado(a.apellido_paterno) ===
			normalizarNombreDuplicado(b.apellido_paterno) &&
		normalizarNombreDuplicado(a.apellido_materno) ===
			normalizarNombreDuplicado(b.apellido_materno);

	if (mismoCampoPorCampo) return true;

	// Uno capturado en campos separados y el otro con el nombre completo en
	// `nombre` son la misma persona: es el caso que más duplicados dejó pasar.
	const unNombre = nombreCompletoNormalizado(a);
	const otroNombre = nombreCompletoNormalizado(b);
	return Boolean(unNombre) && unNombre === otroNombre;
};

// Un patrón para `ilike` que no depende de los acentos: la búsqueda va contra
// lo guardado, y "Pérez" capturado con acento nunca casaba con "perez". Cada
// vocal se cambia por el comodín de un carácter, así "perez" busca "p_r_z" y
// encuentra las dos formas.
const patronSinAcentos = (texto = "") => {
	const limpio = normalizarNombreDuplicado(texto).replace(/[%_]/g, " ").trim();
	return limpio ? `%${limpio.replace(/[aeiou]/g, "_")}%` : "";
};

// La palabra con la que se buscan los candidatos: el apellido paterno si se
// capturó, y si no, la palabra más larga del nombre, que es la que menos se
// repite.
const terminoDeBusqueda = (registro = {}) => {
	const apellido = normalizarNombreDuplicado(registro?.apellido_paterno);
	if (apellido) return apellido.split(" ")[0];

	const palabras = nombreCompletoNormalizado(registro).split(" ").filter(Boolean);
	return palabras.sort((una, otra) => otra.length - una.length)[0] || "";
};

const CANDIDATOS_MAXIMOS = 200;

export const buscarDuplicadoRegistro = async ({
	supabase,
	tabla,
	registro,
	idCampo,
	idActual,
}) => {
	// Basta con el nombre: antes se exigía también el apellido paterno, así que
	// todo lo capturado con el nombre completo en un solo campo se registraba sin
	// revisar nada.
	if (!nombreCompletoNormalizado(registro)) return null;

	const patron = patronSinAcentos(terminoDeBusqueda(registro));
	if (!patron) return null;

	const { data, error } = await supabase
		.from(tabla)
		.select(`${idCampo}, nombre, primer_nombre, apellido_paterno, apellido_materno`)
		// Se busca por apellido y por nombre porque el candidato puede tener el
		// apellido dentro de `nombre` y la columna de apellido vacía.
		.or(`apellido_paterno.ilike.${patron},nombre.ilike.${patron}`)
		.limit(CANDIDATOS_MAXIMOS);

	if (error) throw error;

	return (
		(data || []).find((item) => {
			if (idActual && String(item[idCampo]) === String(idActual)) return false;
			return esMismoNombreRegistro(registro, item);
		}) || null
	);
};

export const crearMensajeRegistroDuplicado = ({ tipo, duplicado }) => {
	const nombre = obtenerNombreCompletoRegistro(duplicado);
	return `Ya existe un ${tipo} con ese nombre${nombre ? `: ${nombre}` : ""}. ¿Deseas agregar otro igual?`;
};
