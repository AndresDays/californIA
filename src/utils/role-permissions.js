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
// Los clientes de convenio entran con cuenta propia: la de imagen ve
// radiología, la de laboratorio su pantalla de resultados. Ninguna de las dos
// es personal de la clínica, así que no ven menú ni ninguna otra pantalla.
const ROL_CLIENTE_IMAGEN = "cliente_imagen";
const ROL_CLIENTE_LABORATORIO = "cliente_laboratorio";
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
// "Técnico - Recepción" cubre los dos puestos a la vez: toma y sube estudios
// como el técnico en radiología y atiende el mostrador como recepción. No
// tiene reglas propias: sus permisos son la suma de los de esos dos roles.
const ROL_TECNICO_RECEPCION = "tecnico_recepcion";
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

export const esTecnicoRecepcion = (rol) =>
	normalizarRolPermisos(rol) === ROL_TECNICO_RECEPCION;

export const esRecepcionista = (rol) =>
	ROLES_RECEPCIONISTA.has(normalizarRolPermisos(rol));

// Quien atiende recepción, sea de tiempo completo o como técnico - recepción.
export const atiendeRecepcion = (rol) => esRecepcionista(rol) || esTecnicoRecepcion(rol);

// Quien toma y sube estudios de imagen como técnico.
export const esTecnicoRadiologia = (rol) => {
	const rolNormalizado = normalizarRolPermisos(rol);
	return rolNormalizado === ROL_TECNICO_RADIOLOGIA || rolNormalizado === ROL_TECNICO_RECEPCION;
};

export const esQuimico = (rol) => normalizarRolPermisos(rol) === "quimico";

export const esDoctorExternoPermisos = (rol) =>
	ROLES_DOCTOR_EXTERNO.has(normalizarRolPermisos(rol));

export const esClienteImagen = (rol) =>
	normalizarRolPermisos(rol) === ROL_CLIENTE_IMAGEN;

export const esClienteLaboratorio = (rol) =>
	normalizarRolPermisos(rol) === ROL_CLIENTE_LABORATORIO;

export const esClienteConvenio = (rol) =>
	esClienteImagen(rol) || esClienteLaboratorio(rol);

export const esRadiologoClinicoPermisos = (rol) =>
	normalizarRolPermisos(rol) === ROL_RADIOLOGO_CLINICO;

export const esMenuTipoQuimico = (rol) =>
	ROLES_MENU_TIPO_QUIMICO.has(normalizarRolPermisos(rol));

export const esDashboardRayosX = (rol) =>
	ROLES_DASHBOARD_RAYOS_X.has(normalizarRolPermisos(rol)) || esTecnicoRecepcion(rol);

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

// La visitadora sale de su módulo para su propio perfil, donde cambia su
// contraseña, y para el catálogo de doctores de Administración: es el mismo
// catálogo del que cuelga su directorio, y ahí da de alta al médico que acaba
// de conocer aunque todavía no tenga expediente comercial.
const VISITADORA_PATHS = ["/visitadora", "/perfil", "/doctores"];

// De Administración ve esa pantalla y nada más: pacientes, usuarios y clientes
// siguen fuera de su alcance.
const VISITADORA_SUBMENU_ADMINISTRACION = new Set(["doctores"]);

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
	// Estas dos van antes que las reglas por rol: cada rama de abajo decide por
	// su cuenta y una de ellas -química, por ejemplo- dejaría pasar lo que no
	// tiene en su lista de bloqueos.
	if (pathname === "/clientes-convenio") return puedeVerClientesConvenio(rol);
	// La pantalla del convenio es del convenio: ningún empleado entra ahí.
	if (pathname === "/resultados-convenio") return esClienteLaboratorio(rol);

	// El convenio entra a lo suyo y a nada más: ni al dashboard ni al perfil,
	// que son pantallas de la clínica.
	if (esClienteImagen(rol)) {
		return ["/radiologia", "/visor-dicom"].some(
			(path) => pathname === path || pathname.startsWith(`${path}/`),
		);
	}
	if (esClienteLaboratorio(rol)) {
		return pathname === "/resultados-convenio";
	}

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

	// Entra a donde entraría cualquiera de los dos roles que reúne.
	if (esTecnicoRecepcion(rol)) {
		return (
			puedeAccederRuta(ROL_TECNICO_RADIOLOGIA, pathname) ||
			puedeAccederRuta("recepcionista", pathname)
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

// Los accesos de los convenios los da dirección: para los demás roles la
// pantalla no está ni en el menú ni por URL.
const ROLES_ADMIN_CLIENTES = new Set([
	"admin",
	"administrador",
	"desarrollador",
	"radiologo",
	"radiologo_director",
]);

export const puedeVerClientesConvenio = (rol) =>
	ROLES_ADMIN_CLIENTES.has(normalizarRolPermisos(rol));

const sinClientesConvenio = (items = []) =>
	items.map((item) =>
		item.id === "administracion"
			? {
					...item,
					submenu: item.submenu?.filter((subItem) => subItem.id !== "clientes-convenio"),
				}
			: item,
	);

// Junta dos menús ya filtrados respetando el orden del menú original: un ítem
// aparece si está en cualquiera de los dos, con la unión de sus submenús.
const unirMenus = (items = [], menuA = [], menuB = []) => {
	const porIdA = new Map(menuA.map((item) => [item.id, item]));
	const porIdB = new Map(menuB.map((item) => [item.id, item]));
	return items
		.map((item) => {
			const a = porIdA.get(item.id);
			const b = porIdB.get(item.id);
			if (!a && !b) return null;
			if (!a || !b) return a || b;
			if (!item.submenu) return a;
			const subIds = new Set(
				[...(a.submenu || []), ...(b.submenu || [])].map((subItem) => subItem.id),
			);
			return {
				...a,
				// Si alguno de los dos navegaba con el ítem padre, se conserva el
				// path original del menú.
				path: a.path === b.path ? a.path : item.path,
				submenu: item.submenu.filter((subItem) => subIds.has(subItem.id)),
			};
		})
		.filter(Boolean);
};

const filtrarMenuPorRolBase = (items = [], rol) => {
	// Para la visitadora el módulo es casi todo su menú; de Administración se le
	// deja únicamente el catálogo de doctores.
	if (esVisitadora(rol)) {
		return items
			.filter((item) => item.id === "visitadora" || item.id === "administracion")
			.map((item) =>
				item.id === "administracion"
					? {
							...item,
							path: "/doctores",
							submenu: item.submenu?.filter((subItem) =>
								VISITADORA_SUBMENU_ADMINISTRACION.has(subItem.id),
							),
						}
					: item,
			);
	}

	if (esClienteConvenio(rol)) return [];
	if (normalizarRolPermisos(rol) === ROL_RADIOLOGO_CLINICO) return [];
	if (esDoctorExternoPermisos(rol)) {
		return items.filter((item) => item.id === "inicio");
	}
	if (esTecnicoRecepcion(rol)) {
		return unirMenus(
			items,
			filtrarMenuPorRolBase(items, ROL_TECNICO_RADIOLOGIA),
			filtrarMenuPorRolBase(items, "recepcionista"),
		);
	}
	if (normalizarRolPermisos(rol) === ROL_TECNICO_RADIOLOGIA) {
		return filtrarMenuPorRolBase(
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

// Los accesos de los convenios se quitan del menú al final y para todos los
// roles: cada rama arma su menú por su cuenta, y filtrarlo dentro de una sola
// dejaba la pantalla a la vista en las demás.
export const filtrarMenuPorRol = (items = [], rol) => {
	const menu = filtrarMenuPorRolBase(items, rol);
	return puedeVerClientesConvenio(rol) ? menu : sinClientesConvenio(menu);
};

// Dónde aterriza cada rol al iniciar sesión, y a dónde rebota cuando pide una
// pantalla que no le toca. Vivía repartido entre auth-context y protected-route,
// que lo decidían por su cuenta; la visitadora obliga a que sea una sola regla,
// porque mandarla al dashboard -al que tampoco entra- la dejaría rebotando.
export const rutaInicialPorRol = (rol) => {
	if (esVisitadora(rol)) return "/visitadora/panel";
	if (esClienteImagen(rol)) return "/radiologia";
	if (esClienteLaboratorio(rol)) return "/resultados-convenio";
	if (esDoctorExternoPermisos(rol) || esRadiologoClinicoPermisos(rol)) return "/radiologia";
	return "/dashboard";
};
