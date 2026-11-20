import { sidebarItems } from "../components/sidebar-menu";
import { esRolReporteSoloHoy } from "./permisos-rol";
import { puedeSubirImagenRadiologia } from "./radiologia-permisos";
import {
	atiendeRecepcion,
	esTecnicoRadiologia,
	filtrarMenuPorRol,
	puedeAccederRuta,
	rutaInicialPorRol,
} from "./role-permissions";
import { etiquetaRolUsuario, normalizarRolUsuario } from "./usuarios-auth";

const ROL = "tecnico_recepcion";

const rutasDelMenu = (items) =>
	items.flatMap((item) => [item, ...(item.submenu || [])]).map((item) => item.path);

describe("rol técnico - recepción", () => {
	test("se normaliza y etiqueta", () => {
		expect(normalizarRolUsuario("Técnico - Recepción")).toBe(ROL);
		expect(normalizarRolUsuario("tecnico recepcion")).toBe(ROL);
		expect(etiquetaRolUsuario(ROL)).toBe("Técnico - Recepción");
	});

	test("es técnico y recepción a la vez", () => {
		expect(esTecnicoRadiologia(ROL)).toBe(true);
		expect(atiendeRecepcion(ROL)).toBe(true);
		expect(puedeSubirImagenRadiologia({ rol: ROL })).toBe(true);
		expect(esRolReporteSoloHoy(ROL)).toBe(true);
		expect(rutaInicialPorRol(ROL)).toBe("/dashboard");
	});

	test.each([
		"/dashboard",
		"/radiologia",
		"/visor-dicom/12",
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
		"/configuracion/version",
	])("entra a %s", (ruta) => {
		expect(puedeAccederRuta(ROL, ruta)).toBe(true);
	});

	test.each([
		"/usuarios",
		"/captura",
		"/visitadora",
		"/configuracion",
		"/configuracion/estudios",
		"/clientes-convenio",
		"/resultados-convenio",
	])("no entra a %s", (ruta) => {
		expect(puedeAccederRuta(ROL, ruta)).toBe(false);
	});

	test("cualquier ruta permitida a técnico o recepcionista se le permite", () => {
		const rutas = rutasDelMenu(sidebarItems);
		rutas.forEach((ruta) => {
			const esperado =
				puedeAccederRuta("tecnico_radiologia", ruta) ||
				puedeAccederRuta("recepcionista", ruta);
			expect(puedeAccederRuta(ROL, ruta)).toBe(esperado);
		});
	});

	test("su menú es la unión de los menús de técnico y recepcionista", () => {
		const ids = (items) =>
			new Set(items.flatMap((item) => [item.id, ...(item.submenu || []).map((s) => `${item.id}/${s.id}`)]));
		const propio = ids(filtrarMenuPorRol(sidebarItems, ROL));
		const esperado = new Set([
			...ids(filtrarMenuPorRol(sidebarItems, "tecnico_radiologia")),
			...ids(filtrarMenuPorRol(sidebarItems, "recepcionista")),
		]);
		expect(propio).toEqual(esperado);
	});
});
