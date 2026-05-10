import { sidebarItems } from "./sidebar-menu";

const labelsFor = (itemId) =>
	sidebarItems.find((item) => item.id === itemId)?.submenu?.map((item) => item.label);

describe("sidebar shared menu", () => {
	test("organizes daily operation and reception around the lab workflow", () => {
		expect(sidebarItems.map((item) => item.label)).toEqual([
			"Inicio",
			"Nuevo Paciente",
			"Captura",
			"Entrega",
			"Recepción",
			"Administración",
			"Reportes",
			"Configuración",
		]);

		expect(labelsFor("recepcion")).toEqual([
			"Editar Solicitud",
			"Cotización",
			"Historial",
			"Cierre Caja",
		]);
	});

	test("keeps catalogs and technical configuration separated", () => {
		expect(labelsFor("administracion")).toEqual([
			"Pacientes",
			"Clientes",
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
		]);
	});
});
