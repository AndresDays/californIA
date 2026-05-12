export const esErrorColumnaSchemaCache = (error, columna) => {
	const mensaje = error?.message || "";
	return (
		mensaje.includes(`'${columna}' column`) &&
		mensaje.includes("schema cache")
	);
};

export const esErrorColumnaInexistente = (error, columna) => {
	const mensaje = error?.message || "";
	return (
		esErrorColumnaSchemaCache(error, columna) ||
		(error?.code === "42703" &&
			mensaje.includes(`.${columna}`) &&
		mensaje.includes("does not exist"))
	);
};

export const esErrorTablaInexistente = (error, tabla) => {
	const mensaje = error?.message || "";
	return (
		(mensaje.includes(`table 'public.${tabla}'`) &&
			mensaje.includes("schema cache")) ||
		(error?.code === "42P01" && mensaje.includes(tabla))
	);
};

export const obtenerColumnaSchemaCacheFaltante = (error) => {
	const mensaje = error?.message || "";
	if (!mensaje.includes("schema cache")) return null;

	const match = mensaje.match(/Could not find the '([^']+)' column/);
	return match?.[1] || null;
};
