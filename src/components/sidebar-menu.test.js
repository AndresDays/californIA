import { filtrarMenuPorRol } from "../utils/role-permissions";
import { sidebarItems } from "./sidebar-menu";

const labelsFor = (itemId) =>
	sidebarItems.find((item) => item.id === itemId)?.submenu?.map((item) => item.label);

describe("sidebar shared menu", () => {
	test("organizes daily operation and reception around the lab workflow", () => {
		expect(sidebarItems.map((item) => item.label)).toEqual([
			"Inicio",
			"Nuevo Paciente",
			"Calendario",
			"Captura",
			"Entrega",
			"Recepción",
			"Administración",
			"Reportes",
			"Visitadora",
			"Configuración",
		]);

		expect(labelsFor("recepcion")).toEqual([
			"Editar Solicitud",
			"Cotización",
			"Historial",
			"Turnos",
			"Cierre Caja",
		]);
	});

	test("groups the medical rep module into its own section", () => {
		expect(labelsFor("visitadora")).toEqual([
			"Informe de visitas",
			"Programación",
			"Concentrado",
		]);
	});

	test("keeps catalogs and technical configuration separated", () => {
		expect(labelsFor("administracion")).toEqual([
			"Pacientes",
			"Doctores",
			"Usuarios",
		]);

		expect(labelsFor("configuracion")).toEqual([
			"Estudios",
			"Analitos",
			"Paquetes",
			"Precios",
			"Áreas",
			"Tipo de Muestra",
			"Equipos",
			"Métodos",
			"Técnicas",
			"Recipientes",
			"Nivel del Mar",
			"Versión de la app",
		]);
	});

	// Recepción abre Configuración únicamente para consultar la versión
	// instalada; los catálogos y los precios no le aparecen ni por error.
	test("shows reception only the app version inside configuration", () => {
		const configuracion = filtrarMenuPorRol(sidebarItems, "recepcionista").find(
			(item) => item.id === "configuracion",
		);

		expect(configuracion).toBeDefined();
		expect(configuracion.submenu.map((item) => item.label)).toEqual([
			"Versión de la app",
		]);
		expect(configuracion.submenu.map((item) => item.path)).toEqual([
			"/configuracion/version",
		]);
	});

	test("keeps the full configuration submenu for the other roles", () => {
		const configuracion = filtrarMenuPorRol(sidebarItems, "admin").find(
			(item) => item.id === "configuracion",
		);

		expect(configuracion.submenu.map((item) => item.label)).toEqual(
			labelsFor("configuracion"),
		);
	});
});
