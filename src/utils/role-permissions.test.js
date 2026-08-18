import {
	filtrarMenuPorRol,
	puedeAccederRuta,
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
	const filtrado = filtrarMenuPorRol(
		[...menu, { id: "configuracion", path: "/configuracion" }],
		"tecnico_radiologia",
	);

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
