export const esErrorColumnaDoctoresNoCacheada = (error, columna) =>
	error?.code === "PGRST204" &&
	String(error?.message || "").includes(`'${columna}' column`) &&
	String(error?.message || "").includes("'doctores'");

export const quitarColumnasDoctoresExternos = (doctorData = {}) => {
	const { tipo_doctor, institucion, activo, ...doctorCompatible } = doctorData;
	return doctorCompatible;
};
