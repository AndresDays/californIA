import { normalizarRolPermisos } from "./role-permissions";

const ROLES_DOCTOR_EXTERNO = new Set([
	"doctor_externo",
	"medico_externo",
	"doctor_particular",
	"medico_particular",
	"institucion_externa",
]);

const ROLES_PUEDEN_INTERPRETAR = new Set([
	"admin",
	"administrador",
	"desarrollador",
	"radiologo",
	"radiologo_clinico",
]);

const ROLES_PUEDEN_SUBIR_IMAGEN = new Set([
	"admin",
	"administrador",
	"desarrollador",
	"radiologo",
	"radiologo_clinico",
	"tecnico",
	"tecnico_radiologia",
]);

const normalizarRolRadiologia = (rol) => {
	const rolNormalizado = normalizarRolPermisos(rol);
	if (rolNormalizado === "radiologo_clinico") return rolNormalizado;
	if (rolNormalizado.includes("administrador")) return "administrador";
	if (rolNormalizado.includes("radiologo")) return "radiologo";
	if (rolNormalizado.includes("desarrollador")) return "desarrollador";
	return rolNormalizado;
};

export const esDoctorExterno = (rol) =>
	ROLES_DOCTOR_EXTERNO.has(normalizarRolRadiologia(rol));

export const obtenerIdDoctorExterno = (empleado = {}) =>
	empleado?.id_doctor ?? empleado?.doctor_id ?? empleado?.id_medico_externo ?? null;

export const obtenerRestriccionDoctorExterno = (empleado = {}) => {
	if (!esDoctorExterno(empleado?.rol)) return null;
	const idDoctor = obtenerIdDoctorExterno(empleado);
	if (!idDoctor) return { columna: "id_doctor", valor: null };
	return { columna: "id_doctor", valor: idDoctor };
};

export const puedeInterpretarRadiologia = (empleado = {}) =>
	ROLES_PUEDEN_INTERPRETAR.has(normalizarRolRadiologia(empleado?.rol)) ||
	(esDoctorExterno(empleado?.rol) && empleado?.es_radiologo === true);

export const puedeEditarReporteRadiologia = (empleado = {}) =>
	puedeInterpretarRadiologia(empleado);

export const puedeVerReporteRadiologia = (empleado = {}) =>
	puedeEditarReporteRadiologia(empleado) || esDoctorExterno(empleado?.rol);

export const puedeSubirImagenRadiologia = (empleado = {}) =>
	ROLES_PUEDEN_SUBIR_IMAGEN.has(normalizarRolRadiologia(empleado?.rol));

export const puedeAsignarRadiologia = (empleado = {}) =>
	!esDoctorExterno(empleado?.rol) &&
	normalizarRolRadiologia(empleado?.rol) !== "radiologo_clinico" &&
	ROLES_PUEDEN_INTERPRETAR.has(normalizarRolRadiologia(empleado?.rol));

export const esDoctorAsignableRadiologia = (doctor = {}) => {
	if (doctor?.activo === false) return false;
	const tipo = normalizarRolPermisos(doctor?.tipo_doctor || doctor?.tipo || "");
	return !tipo || ["particular", "institucion", "institucion_externa"].includes(tipo);
};
