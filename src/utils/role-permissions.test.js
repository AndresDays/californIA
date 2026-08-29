import {
	filtrarMenuPorRol,
	puedeAccederRuta,
	puedeEditarComisiones,
	puedeVerModuloVisitadora,
	rutaInicialPorRol,
} from "./role-permissions";

const menu = [
	{ id: "inicio", label: "Inicio", path: "/dashboard" },
	{ id: "nuevo-paciente", label: "Nuevo Paciente", path: "/nuevo-paciente" },
	{ id: "captura", label: "Captura", path: "/captura" },
	{ id: "entrega", label: "Entrega", path: "/entrega-resultados" },
	{
		id: "recepcion",
		label: "Recepcion",
		hasSubmenu: true,
		submenu: [{ id: "turnos", path: "/turnos" }],
	},
	{
		id: "administracion",
		label: "Administracion",
		hasSubmenu: true,
		submenu: [
			{ id: "pacientes", path: "/pacientes" },
			{ id: "doctores", path: "/doctores" },
			{ id: "usuarios", path: "/usuarios" },
		],
	},
	{
		id: "reportes",
		label: "Reportes",
		path: "/reporte-ventas",
		submenu: [
			{ id: "reporte-ventas", path: "/reporte-ventas" },
			{ id: "reporte-administrativo", path: "/reporte-administrativo" },
		],
	},
	{
		id: "configuracion",
		label: "Configuracion",
		path: "/configuracion",
		hasSubmenu: true,
		submenu: [
			{ id: "estudios", path: "/configuracion/estudios" },
			{ id: "analitos", path: "/configuracion/analitos" },
			{ id: "precios", path: "/configuracion/precios" },
			{ id: "version", path: "/configuracion/version" },
		],
	},
];

test("limits receptionist menu to reception and allowed admin catalogs", () => {
	const filtrado = filtrarMenuPorRol(menu, "recepcionista");
	expect(filtrado.map((item) => item.id)).toEqual([
		"inicio",
		"nuevo-paciente",
		"entrega",
		"recepcion",
		"administracion",
		"reportes",
		"configuracion",
	]);
	expect(filtrado.find((item) => item.id === "administracion").submenu.map((item) => item.id)).toEqual([
		"pacientes",
		"doctores",
	]);
	const reportes = filtrado.find((item) => item.id === "reportes");
	expect(reportes.submenu.map((item) => item.id)).toEqual(["reporte-ventas"]);
});

test("treats recepcion profile as receptionist permissions", () => {
	const filtrado = filtrarMenuPorRol(menu, "Recepcion");

	expect(filtrado.find((item) => item.id === "administracion").submenu.map((item) => item.id)).toEqual([
		"pacientes",
		"doctores",
	]);
	expect(puedeAccederRuta("Recepcion", "/usuarios")).toBe(false);
});

test("blocks receptionist access to restricted routes", () => {
	expect(puedeAccederRuta("recepcionista", "/pacientes")).toBe(true);
	expect(puedeAccederRuta("recepcionista", "/reporte-ventas")).toBe(true);
	expect(puedeAccederRuta("recepcionista", "/reporte-administrativo")).toBe(false);
	expect(puedeAccederRuta("recepcionista", "/cortes-dia")).toBe(false);
	expect(puedeAccederRuta("recepcionista", "/usuarios")).toBe(false);
	expect(puedeAccederRuta("recepcionista", "/radiologia")).toBe(false);
	expect(puedeAccederRuta("admin", "/usuarios")).toBe(true);
});

describe("recepcion en Configuracion", () => {
	// Recepcion necesita saber que version tiene instalada para reportar fallas,
	// pero los catalogos y los precios siguen siendo territorio ajeno.
	test("entra solo a la version de la app", () => {
		expect(puedeAccederRuta("recepcionista", "/configuracion/version")).toBe(true);
		expect(puedeAccederRuta("Recepcion", "/configuracion/version")).toBe(true);
	});

	test.each([
		"/configuracion",
		"/configuracion/estudios",
		"/configuracion/precios",
		"/configuracion/analitos",
		"/configuracion/paquetes",
		"/configuracion/areas",
		"/configuracion/tipo-muestra",
		"/configuracion/recipientes",
		"/configuracion/metodo",
		"/configuracion/tecnica",
		"/configuracion/equipos",
		"/configuracion/nivel",
	])("no entra a %s", (ruta) => {
		expect(puedeAccederRuta("recepcionista", ruta)).toBe(false);
		expect(puedeAccederRuta("Recepcion", ruta)).toBe(false);
	});

	// El permiso es la ruta exacta: nada colgado debajo de ella se abre solo.
	test("no abre subrutas colgadas de la version", () => {
		expect(puedeAccederRuta("recepcionista", "/configuracion/version/editar")).toBe(false);
		expect(puedeAccederRuta("recepcionista", "/configuracion/versiones")).toBe(false);
	});

	test("ve Configuracion en el menu con la version como unica opcion", () => {
		const configuracion = filtrarMenuPorRol(menu, "recepcionista").find(
			(item) => item.id === "configuracion",
		);

		expect(configuracion).toBeDefined();
		expect(configuracion.submenu.map((item) => item.id)).toEqual(["version"]);
	});

	test.each(["admin", "quimico", "tecnico", "medico"])(
		"%s conserva Configuracion completa",
		(rol) => {
			const configuracion = filtrarMenuPorRol(menu, rol).find(
				(item) => item.id === "configuracion",
			);

			expect(configuracion.submenu.map((item) => item.id)).toEqual([
				"estudios",
				"analitos",
				"precios",
				"version",
			]);
			expect(puedeAccederRuta(rol, "/configuracion/precios")).toBe(true);
		},
	);
});

test("hides reports users and reception module for quimico", () => {
	const filtrado = filtrarMenuPorRol(menu, "quimico");

	expect(filtrado.map((item) => item.id)).not.toContain("recepcion");
	expect(filtrado.map((item) => item.id)).not.toContain("reportes");
	expect(filtrado.find((item) => item.id === "administracion").submenu.map((item) => item.id)).toEqual([
		"pacientes",
		"doctores",
	]);
});

test.each(["quimico", "tecnico", "medico"])(
	"hides reports users and reception module for %s",
	(rol) => {
		const filtrado = filtrarMenuPorRol(menu, rol);

		expect(filtrado.map((item) => item.id)).not.toContain("recepcion");
		expect(filtrado.map((item) => item.id)).not.toContain("reportes");
		expect(filtrado.find((item) => item.id === "administracion").submenu.map((item) => item.id)).toEqual([
			"pacientes",
			"doctores",
		]);
	},
);

test.each(["quimico", "tecnico", "medico"])(
	"blocks %s access to reports users and reception routes",
	(rol) => {
		expect(puedeAccederRuta(rol, "/dashboard")).toBe(true);
		expect(puedeAccederRuta(rol, "/captura")).toBe(true);
		expect(puedeAccederRuta(rol, "/radiologia")).toBe(true);
		expect(puedeAccederRuta(rol, "/usuarios")).toBe(false);
		expect(puedeAccederRuta(rol, "/reporte-ventas")).toBe(false);
		expect(puedeAccederRuta(rol, "/reporte-administrativo")).toBe(false);
		expect(puedeAccederRuta(rol, "/cotizacion")).toBe(false);
		expect(puedeAccederRuta(rol, "/turnos")).toBe(false);
	},
);

test("hides capture administration and configuration for tecnico radiologia", () => {
	const filtrado = filtrarMenuPorRol(menu, "tecnico_radiologia");

	expect(filtrado.map((item) => item.id)).not.toContain("captura");
	expect(filtrado.map((item) => item.id)).not.toContain("administracion");
	expect(filtrado.map((item) => item.id)).not.toContain("configuracion");
	expect(filtrado.map((item) => item.id)).not.toContain("recepcion");
	expect(filtrado.map((item) => item.id)).not.toContain("reportes");
});

test("blocks restricted routes only for tecnico radiologia", () => {
	expect(puedeAccederRuta("tecnico_radiologia", "/dashboard")).toBe(true);
	expect(puedeAccederRuta("tecnico_radiologia", "/radiologia")).toBe(true);
	expect(puedeAccederRuta("tecnico_radiologia", "/captura")).toBe(false);
	expect(puedeAccederRuta("tecnico_radiologia", "/usuarios")).toBe(false);
	expect(puedeAccederRuta("tecnico_radiologia", "/pacientes")).toBe(false);
	expect(puedeAccederRuta("tecnico_radiologia", "/doctores")).toBe(false);
	expect(puedeAccederRuta("tecnico_radiologia", "/configuracion/estudios")).toBe(false);
	expect(puedeAccederRuta("tecnico", "/captura")).toBe(true);
});

test("limits external doctor to radiology and assigned-study viewer routes", () => {
	const filtrado = filtrarMenuPorRol(menu, "doctor_externo");

	expect(filtrado.map((item) => item.id)).toEqual(["inicio"]);
	expect(puedeAccederRuta("doctor_externo", "/dashboard")).toBe(false);
	expect(puedeAccederRuta("doctor_externo", "/radiologia")).toBe(true);
	expect(puedeAccederRuta("doctor_externo", "/visor-dicom/123")).toBe(true);
	expect(puedeAccederRuta("doctor_externo", "/perfil")).toBe(false);
	expect(puedeAccederRuta("doctor_externo", "/nuevo-paciente")).toBe(false);
	expect(puedeAccederRuta("doctor_externo", "/captura")).toBe(false);
	expect(puedeAccederRuta("doctor_externo", "/usuarios")).toBe(false);
	expect(puedeAccederRuta("doctor_externo", "/reporte-ventas")).toBe(false);
});

test("limits radiologo clinico to radiology, viewer, and report routes", () => {
	expect(filtrarMenuPorRol(menu, "radiologo_clinico")).toEqual([]);
	expect(puedeAccederRuta("radiologo_clinico", "/radiologia")).toBe(true);
	expect(puedeAccederRuta("radiologo_clinico", "/visor-dicom/123")).toBe(true);
	expect(puedeAccederRuta("radiologo_clinico", "/reporte")).toBe(true);
	expect(puedeAccederRuta("radiologo_clinico", "/dashboard")).toBe(false);
	expect(puedeAccederRuta("radiologo_clinico", "/usuarios")).toBe(false);
	expect(puedeAccederRuta("radiologo_clinico", "/captura")).toBe(false);
	expect(puedeAccederRuta("radiologo_clinico", "/perfil")).toBe(false);
});

const menuConVisitadora = [
	...menu,
	{
		id: "visitadora",
		label: "Visitadora",
		path: "/visitadora/informe",
		hasSubmenu: true,
		submenu: [
			{ id: "visitadora-informe", path: "/visitadora/informe" },
			{ id: "visitadora-programacion", path: "/visitadora/programacion" },
			{ id: "visitadora-comisiones", path: "/visitadora/comisiones" },
		],
	},
];

describe("rol visitadora", () => {
	test("entra a sus tres pantallas y a su perfil", () => {
		expect(puedeAccederRuta("visitadora", "/visitadora/informe")).toBe(true);
		expect(puedeAccederRuta("visitadora", "/visitadora/programacion")).toBe(true);
		expect(puedeAccederRuta("visitadora", "/visitadora/comisiones")).toBe(true);
		expect(puedeAccederRuta("visitadora", "/perfil")).toBe(true);
	});

	test.each([
		"/dashboard",
		"/pacientes",
		"/doctores",
		"/usuarios",
		"/nuevo-paciente",
		"/captura",
		"/entrega-resultados",
		"/historial",
		"/cierre-caja",
		"/reporte-ventas",
		"/reporte-administrativo",
		"/radiologia",
		"/configuracion/precios",
	])("no entra a %s", (ruta) => {
		expect(puedeAccederRuta("visitadora", ruta)).toBe(false);
	});

	test("su menu son sus tres pantallas y nada mas", () => {
		const filtrado = filtrarMenuPorRol(menuConVisitadora, "visitadora");
		expect(filtrado.map((item) => item.id)).toEqual(["visitadora"]);
		expect(filtrado[0].submenu.map((item) => item.id)).toEqual([
			"visitadora-informe",
			"visitadora-programacion",
			"visitadora-comisiones",
		]);
	});

	test.each(["visitadora", "Visitadora", "visitador", " VISITADORA "])(
		"reconoce el rol escrito como %s",
		(rol) => {
			expect(puedeAccederRuta(rol, "/visitadora/informe")).toBe(true);
			expect(puedeAccederRuta(rol, "/dashboard")).toBe(false);
		},
	);

	test("no puede fijar porcentajes ni cerrar el mes", () => {
		expect(puedeVerModuloVisitadora("visitadora")).toBe(true);
		expect(puedeEditarComisiones("visitadora")).toBe(false);
	});
});

describe("acceso al modulo de visitadora desde los demas roles", () => {
	test.each(["admin", "administrador", "desarrollador", "radiologo", "Radiologo Director"])(
		"%s entra al modulo, lo ve en el menu y puede fijar porcentajes",
		(rol) => {
			expect(puedeAccederRuta(rol, "/visitadora/comisiones")).toBe(true);
			expect(filtrarMenuPorRol(menuConVisitadora, rol).map((item) => item.id)).toContain("visitadora");
			expect(puedeEditarComisiones(rol)).toBe(true);
		},
	);

	test.each([
		"recepcionista",
		"quimico",
		"tecnico",
		"tecnico_radiologia",
		"radiologo_clinico",
		"medico",
		"doctor_externo",
	])("%s no ve el modulo ni por menu ni por URL", (rol) => {
		expect(puedeAccederRuta(rol, "/visitadora/informe")).toBe(false);
		expect(puedeAccederRuta(rol, "/visitadora/comisiones")).toBe(false);
		expect(filtrarMenuPorRol(menuConVisitadora, rol).map((item) => item.id)).not.toContain("visitadora");
		expect(puedeVerModuloVisitadora(rol)).toBe(false);
		expect(puedeEditarComisiones(rol)).toBe(false);
	});

	test("el radiologo director conserva el resto de su menu", () => {
		const ids = filtrarMenuPorRol(menuConVisitadora, "radiologo").map((item) => item.id);
		expect(ids).toContain("inicio");
		expect(ids).toContain("reportes");
		expect(ids).toContain("visitadora");
	});
});

describe("rutaInicialPorRol", () => {
	// La visitadora no puede entrar a /dashboard, asi que mandarla ahi la
	// dejaria rebotando entre redirecciones sin poder usar la aplicacion.
	test("la visitadora aterriza en su informe, no en el dashboard", () => {
		expect(rutaInicialPorRol("visitadora")).toBe("/visitadora/informe");
		expect(rutaInicialPorRol("Visitadora")).toBe("/visitadora/informe");
	});

	test("los demas roles conservan su destino de siempre", () => {
		expect(rutaInicialPorRol("recepcionista")).toBe("/dashboard");
		expect(rutaInicialPorRol("admin")).toBe("/dashboard");
		expect(rutaInicialPorRol("radiologo")).toBe("/dashboard");
		expect(rutaInicialPorRol("radiologo_clinico")).toBe("/radiologia");
		expect(rutaInicialPorRol("doctor_externo")).toBe("/radiologia");
	});

	test("cada rol aterriza en una pantalla a la que si tiene acceso", () => {
		for (const rol of [
			"visitadora",
			"recepcionista",
			"admin",
			"quimico",
			"tecnico_radiologia",
			"radiologo_clinico",
			"doctor_externo",
		]) {
			expect(puedeAccederRuta(rol, rutaInicialPorRol(rol))).toBe(true);
		}
	});
});
