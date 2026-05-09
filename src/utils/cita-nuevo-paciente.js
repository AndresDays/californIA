const normalizarTexto = (valor = "") =>
	valor
		.toString()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/\s+/g, " ")
		.trim();

export const dividirEstudiosCita = (tipoEstudio = "") =>
	tipoEstudio
		.split(",")
		.map((estudio) => estudio.trim())
		.filter(Boolean);

export const encontrarEstudioCatalogo = (estudioCita, estudiosDisponibles = []) => {
	const estudioNormalizado = normalizarTexto(estudioCita);
	if (!estudioNormalizado) return null;

	return (
		estudiosDisponibles.find((estudio) => {
			const clave = normalizarTexto(estudio.clave);
			const descripcion = normalizarTexto(estudio.descripcion);
			return clave === estudioNormalizado || descripcion === estudioNormalizado;
		}) ||
		estudiosDisponibles.find((estudio) => {
			const descripcion = normalizarTexto(estudio.descripcion);
			return (
				descripcion.includes(estudioNormalizado) ||
				estudioNormalizado.includes(descripcion)
			);
		}) ||
		null
	);
};

export const construirEstudioSeleccionado = ({
	estudioCatalogo,
	precio,
	nombreCliente,
}) => ({
	...estudioCatalogo,
	precio: Number(precio) || 150,
	cantidad: 1,
	diasProceso: 1,
	cliente: nombreCliente || "Sin cliente",
});
