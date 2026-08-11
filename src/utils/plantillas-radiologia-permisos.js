import { normalizarRolPermisos } from "./role-permissions";

const ROLES_PUBLICADORES = new Set([
	"radiologo",
	"radiologo_director",
	"admin",
	"administrador",
	"desarrollador",
]);

export const puedePublicarPlantillasRadiologia = (rol) =>
	ROLES_PUBLICADORES.has(normalizarRolPermisos(rol));
