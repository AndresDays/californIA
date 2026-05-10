export const esErrorColumnaSchemaCache = (error, columna) => {
	const mensaje = error?.message || "";
	return (
		mensaje.includes(`'${columna}' column`) &&
		mensaje.includes("schema cache")
	);
};

export const obtenerColumnaSchemaCacheFaltante = (error) => {
	const mensaje = error?.message || "";
	if (!mensaje.includes("schema cache")) return null;

	const match = mensaje.match(/Could not find the '([^']+)' column/);
	return match?.[1] || null;
};
