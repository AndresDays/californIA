export const normalizarRolPermisos = (rol = "") =>
	String(rol || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "_");

const ROLES_RECEPCIONISTA = new Set(["recepcionista", "recepcion"]);
const ROLES_MENU_TIPO_QUIMICO = new Set([
	"quimico",
	"tecnico",
	"tecnico_radiologia",
	"medico",
]);
const ROLES_DASHBOARD_RAYOS_X = new Set(["tecnico", "tecnico_radiologia", "medico"]);

export const esRecepcionista = (rol) =>
	ROLES_RECEPCIONISTA.has(normalizarRolPermisos(rol));

export const esQuimico = (rol) => normalizarRolPermisos(rol) === "quimico";

export const esMenuTipoQuimico = (rol) =>
	ROLES_MENU_TIPO_QUIMICO.has(normalizarRolPermisos(rol));

export const esDashboardRayosX = (rol) =>
	ROLES_DASHBOARD_RAYOS_X.has(normalizarRolPermisos(rol));

const RECEPCIONISTA_PATHS = [
	"/dashboard",
	"/calendario",
	"/nuevo-paciente",
	"/entrega-resultados",
	"/editar-solicitud",
	"/cotizacion",
	"/historial",
	"/turnos",
	"/cierre-caja",
	"/pacientes",
	"/doctores",
	"/perfil",
];

const QUIMICO_PATHS_BLOQUEADOS = [
	"/usuarios",
	"/reporte-ventas",
	"/reporte-administrativo",
	"/cortes-dia",
	"/editar-solicitud",
	"/cotizacion",
	"/historial",
	"/turnos",
	"/cierre-caja",
];

export const puedeAccederRuta = (rol, pathname = "") => {
	if (esRecepcionista(rol)) {
		return RECEPCIONISTA_PATHS.some(
			(path) => pathname === path || pathname.startsWith(`${path}/`),
		);
	}

	if (esMenuTipoQuimico(rol)) {
		return !QUIMICO_PATHS_BLOQUEADOS.some(
			(path) => pathname === path || pathname.startsWith(`${path}/`),
		);
	}

	return true;
};

export const filtrarMenuPorRol = (items = [], rol) => {
	if (esRecepcionista(rol)) {
		return items
			.map((item) => {
				if (item.id === "inicio") return item;
				if (item.id === "calendario") return item;
				if (item.id === "nuevo-paciente" || item.id === "entrega") return item;
				if (item.id === "recepcion") return item;
				if (item.id === "administracion") {
					return {
						...item,
						submenu: item.submenu?.filter((subItem) =>
							["pacientes", "doctores"].includes(subItem.id),
						),
					};
				}
				if (item.id === "reportes") return null;
				return null;
			})
			.filter(Boolean);
	}

	if (esMenuTipoQuimico(rol)) {
		return items
			.map((item) => {
				if (item.id === "recepcion" || item.id === "reportes") return null;
				if (item.id === "administracion") {
					return {
						...item,
						submenu: item.submenu?.filter((subItem) => subItem.id !== "usuarios"),
					};
				}
				return item;
			})
			.filter(Boolean);
	}

	return items;
};
