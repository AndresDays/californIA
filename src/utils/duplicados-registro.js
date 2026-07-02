export const normalizarNombreDuplicado = (valor) =>
	String(valor || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
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

export const esMismoNombreRegistro = (a = {}, b = {}) =>
	normalizarNombreDuplicado(a.primer_nombre || a.nombre) ===
		normalizarNombreDuplicado(b.primer_nombre || b.nombre) &&
	normalizarNombreDuplicado(a.apellido_paterno) ===
		normalizarNombreDuplicado(b.apellido_paterno) &&
	normalizarNombreDuplicado(a.apellido_materno) ===
		normalizarNombreDuplicado(b.apellido_materno);

export const buscarDuplicadoRegistro = async ({
	supabase,
	tabla,
	registro,
	idCampo,
	idActual,
}) => {
	const nombre = normalizarNombreDuplicado(registro?.primer_nombre || registro?.nombre);
	const apellidoPaterno = normalizarNombreDuplicado(registro?.apellido_paterno);
	const apellidoMaterno = normalizarNombreDuplicado(registro?.apellido_materno);

	if (!nombre || !apellidoPaterno) return null;

	const { data, error } = await supabase
		.from(tabla)
		.select(`${idCampo}, nombre, primer_nombre, apellido_paterno, apellido_materno`)
		.ilike("apellido_paterno", registro.apellido_paterno)
		.limit(50);

	if (error) throw error;

	return (data || []).find((item) => {
		if (idActual && String(item[idCampo]) === String(idActual)) return false;
		return esMismoNombreRegistro(
			{ nombre, apellido_paterno: apellidoPaterno, apellido_materno: apellidoMaterno },
			item,
		);
	}) || null;
};

export const crearMensajeRegistroDuplicado = ({ tipo, duplicado }) => {
	const nombre = obtenerNombreCompletoRegistro(duplicado);
	return `Ya existe un ${tipo} con ese nombre${nombre ? `: ${nombre}` : ""}. ¿Deseas agregar otro igual?`;
};
