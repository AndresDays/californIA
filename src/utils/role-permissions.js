export const normalizarRolPermisos = (rol = "") =>
	String(rol || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "_");

const ROLES_RECEPCIONISTA = new Set(["recepcionista", "recepcion"]);
const ROLES_DOCTOR_EXTERNO = new Set([
	"doctor_externo",
	"medico_externo",
	"doctor_particular",
	"medico_particular",
	"institucion_externa",
]);
const ROL_RADIOLOGO_CLINICO = "radiologo_clinico";
const ROLES_VISITADORA = new Set(["visitadora", "visitador"]);
// "Radiólogo - Director" se guarda como `radiologo`; ver normalizarRolUsuario
// en usuarios-auth.js. Es quien autoriza los porcentajes de comisión.
const ROLES_MODULO_VISITADORA = new Set([
	"admin",
	"administrador",
	"desarrollador",
	"radiologo",
	"radiologo_director",
]);
const ROL_TECNICO_RADIOLOGIA = "tecnico_radiologia";
const ROLES_MENU_TIPO_QUIMICO = new Set([
	"quimico",
	"tecnico",
	"tecnico_radiologia",
	"medico",
]);
const ROLES_DASHBOARD_RAYOS_X = new Set([
	"tecnico",
	"tecnico_radiologia",
	"medico",
	...ROLES_DOCTOR_EXTERNO,
]);

export const esRecepcionista = (rol) =>
	ROLES_RECEPCIONISTA.has(normalizarRolPermisos(rol));

export const esQuimico = (rol) => normalizarRolPermisos(rol) === "quimico";

export const esDoctorExternoPermisos = (rol) =>
	ROLES_DOCTOR_EXTERNO.has(normalizarRolPermisos(rol));

export const esRadiologoClinicoPermisos = (rol) =>
	normalizarRolPermisos(rol) === ROL_RADIOLOGO_CLINICO;

export const esMenuTipoQuimico = (rol) =>
	ROLES_MENU_TIPO_QUIMICO.has(normalizarRolPermisos(rol));

export const esDashboardRayosX = (rol) =>
	ROLES_DASHBOARD_RAYOS_X.has(normalizarRolPermisos(rol));

export const esVisitadora = (rol) => ROLES_VISITADORA.has(normalizarRolPermisos(rol));

// Quién ve el módulo. La visitadora entra, pero a cambio no ve nada más de la
// aplicación; el resto de los roles no lo encuentra ni en el menú ni por URL.
export const puedeVerModuloVisitadora = (rol) =>
	esVisitadora(rol) || ROLES_MODULO_VISITADORA.has(normalizarRolPermisos(rol));

// Quién mueve dinero: fija porcentajes, cierra el mes y marca pagos. La
// visitadora consulta el concentrado, pero no autoriza.
export const puedeEditarComisiones = (rol) =>
	ROLES_MODULO_VISITADORA.has(normalizarRolPermisos(rol));

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
	"/reporte-ventas",
	"/pacientes",
	"/doctores",
	"/perfil",
];

// Recepción necesita consultar qué versión de la aplicación tiene instalada,
// pero nada más de Configuración (estudios, analitos, precios, equipos...).
// Va en una lista aparte porque RECEPCIONISTA_PATHS se compara con
// `startsWith`, y meter "/configuracion" ahí abriría todo el submódulo; aquí la
// comparación es exacta, así que sólo pasa esta pantalla.
const RECEPCIONISTA_PATHS_EXACTOS = ["/configuracion/version"];

// La visitadora sólo sale de su módulo para su propio perfil, donde cambia su
// contraseña.
const VISITADORA_PATHS = ["/visitadora", "/perfil"];

const QUIMICO_PATHS_BLOQUEADOS = [
	"/visitadora",
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

const TECNICO_RADIOLOGIA_PATHS_BLOQUEADOS = [
	"/visitadora",
	"/captura",
	"/usuarios",
	"/pacientes",
	"/doctores",
	"/configuracion",
];

const TECNICO_RADIOLOGIA_MENU_BLOQUEADO = new Set([
	"visitadora",
	"captura",
	"administracion",
	"configuracion",
]);

export const puedeAccederRuta = (rol, pathname = "") => {
	if (esVisitadora(rol)) {
		return VISITADORA_PATHS.some(
			(path) => pathname === path || pathname.startsWith(`${path}/`),
		);
	}

	if (normalizarRolPermisos(rol) === ROL_RADIOLOGO_CLINICO) {
		return ["/radiologia", "/visor-dicom", "/reporte"].some(
			(path) => pathname === path || pathname.startsWith(`${path}/`),
		);
	}
	if (esDoctorExternoPermisos(rol)) {
		return ["/radiologia", "/visor-dicom"].some(
			(path) => pathname === path || pathname.startsWith(`${path}/`),
		);
	}

	if (normalizarRolPermisos(rol) === ROL_TECNICO_RADIOLOGIA) {
		return !TECNICO_RADIOLOGIA_PATHS_BLOQUEADOS.some(
			(path) => pathname === path || pathname.startsWith(`${path}/`),
		);
	}

	if (esRecepcionista(rol)) {
		if (RECEPCIONISTA_PATHS_EXACTOS.includes(pathname)) return true;
		return RECEPCIONISTA_PATHS.some(
			(path) => pathname === path || pathname.startsWith(`${path}/`),
		);
	}

	if (esMenuTipoQuimico(rol)) {
		return !QUIMICO_PATHS_BLOQUEADOS.some(
			(path) => pathname === path || pathname.startsWith(`${path}/`),
		);
	}

	// El módulo es cerrado: un rol que llegue hasta aquí sin estar autorizado
	// tampoco entra escribiendo la dirección a mano.
	if (pathname === "/visitadora" || pathname.startsWith("/visitadora/")) {
		return puedeVerModuloVisitadora(rol);
	}

	return true;
};

const sinModuloVisitadora = (items = []) => items.filter((item) => item.id !== "visitadora");

export const filtrarMenuPorRol = (items = [], rol) => {
	// Para la visitadora el módulo no es una sección más: es su menú completo.
	if (esVisitadora(rol)) return items.filter((item) => item.id === "visitadora");

	if (normalizarRolPermisos(rol) === ROL_RADIOLOGO_CLINICO) return [];
	if (esDoctorExternoPermisos(rol)) {
		return items.filter((item) => item.id === "inicio");
	}
	if (normalizarRolPermisos(rol) === ROL_TECNICO_RADIOLOGIA) {
		return filtrarMenuPorRol(
			items.filter((item) => !TECNICO_RADIOLOGIA_MENU_BLOQUEADO.has(item.id)),
			"quimico",
		);
	}

	if (esRecepcionista(rol)) {
		return sinModuloVisitadora(items)
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
				if (item.id === "reportes") {
					return {
						...item,
						submenu: item.submenu?.filter(
							(subItem) => subItem.id === "reporte-ventas",
						),
					};
				}
				// Configuración aparece sólo como puerta a la versión de la
				// app; los catálogos y los precios siguen fuera de su alcance.
				// El ítem padre no navega -sólo despliega el submenú-, así que
				// dejarlo con su `path` "/configuracion" no la lleva a ninguna
				// pantalla prohibida.
				if (item.id === "configuracion") {
					return {
						...item,
						submenu: item.submenu?.filter(
							(subItem) => subItem.id === "version",
						),
					};
				}
				return null;
			})
			.filter(Boolean);
	}

	if (esMenuTipoQuimico(rol)) {
		return sinModuloVisitadora(items)
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

	return puedeVerModuloVisitadora(rol) ? items : sinModuloVisitadora(items);
};

// Dónde aterriza cada rol al iniciar sesión, y a dónde rebota cuando pide una
// pantalla que no le toca. Vivía repartido entre auth-context y protected-route,
// que lo decidían por su cuenta; la visitadora obliga a que sea una sola regla,
// porque mandarla al dashboard -al que tampoco entra- la dejaría rebotando.
export const rutaInicialPorRol = (rol) => {
	if (esVisitadora(rol)) return "/visitadora/informe";
	if (esDoctorExternoPermisos(rol) || esRadiologoClinicoPermisos(rol)) return "/radiologia";
	return "/dashboard";
};
