export const esErrorColumnaDoctoresNoCacheada = (error, columna) =>
	error?.code === "PGRST204" &&
	String(error?.message || "").includes(`'${columna}' column`) &&
	String(error?.message || "").includes("'doctores'");

export const quitarColumnasDoctoresExternos = (doctorData = {}) => {
	const { tipo_doctor, institucion, activo, es_radiologo, especialidad, ...doctorCompatible } = doctorData;
	return doctorCompatible;
};

export const quitarColumnasDoctoresLegacy = (doctorData = {}) => {
	const { tipo_doctor, institucion, activo, ...doctorCompatible } = doctorData;
	return doctorCompatible;
};
