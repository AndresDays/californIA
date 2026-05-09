export const esErrorColumnaSchemaCache = (error, columna) => {
	const mensaje = error?.message || "";
	return (
		mensaje.includes(`'${columna}' column`) &&
		mensaje.includes("schema cache")
	);
};
