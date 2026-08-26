import {
	esEstudioLaboratorio,
	esRolSoloLaboratorio,
	filtrarEstudiosSoloLaboratorio,
	filtrarVentasSoloLaboratorio,
} from "./permisos-rol";

const laboratorio = { clave_estudio: "BH", descripcion_estudio: "BIOMETRIA HEMATICA", area: "Hematologia" };
const cultivo = { clave_estudio: "CULT", descripcion_estudio: "CULTIVO DE ORINA", area: "Microbiologia" };
const ultrasonido = { clave_estudio: "US-RENAL", descripcion_estudio: "U.S. RENAL", area: "Ultrasonidos" };
const resonancia = { clave_estudio: "RM-CRANEO", descripcion_estudio: "RM CRANEO SIMPLE", area: "Resonancia magnetica" };

describe("esRolSoloLaboratorio", () => {
	test.each(["quimico", "Químico", " QUIMICO "])("%s sólo ve laboratorio", (rol) => {
		expect(esRolSoloLaboratorio(rol)).toBe(true);
	});

	test.each(["admin", "recepcionista", "radiologo", "", null, undefined])(
		"%s ve todo",
		(rol) => expect(esRolSoloLaboratorio(rol)).toBe(false),
	);
});

describe("esEstudioLaboratorio", () => {
	test("distingue laboratorio de imagen", () => {
		expect(esEstudioLaboratorio(laboratorio)).toBe(true);
		expect(esEstudioLaboratorio(cultivo)).toBe(true);
		expect(esEstudioLaboratorio(ultrasonido)).toBe(false);
		expect(esEstudioLaboratorio(resonancia)).toBe(false);
	});
});

describe("filtrarVentasSoloLaboratorio", () => {
	const ventas = [
		{ id_venta: 1, folio: "C0001", estudios_venta: [laboratorio, ultrasonido] },
		{ id_venta: 2, folio: "A0001", estudios_venta: [ultrasonido, resonancia] },
		{ id_venta: 3, folio: "C0002", estudios_venta: [cultivo] },
	];

	test("al químico le deja sólo las partidas de laboratorio", () => {
		const filtradas = filtrarVentasSoloLaboratorio(ventas, "quimico");

		expect(filtradas.map((venta) => venta.folio)).toEqual(["C0001", "C0002"]);
		expect(filtradas[0].estudios_venta).toEqual([laboratorio]);
	});

	// Una orden de pura imagen no tiene nada que capturar ni entregar para él.
	test("las órdenes que sólo traen imagen desaparecen de su lista", () => {
		expect(
			filtrarVentasSoloLaboratorio(ventas, "quimico").some((venta) => venta.folio === "A0001"),
		).toBe(false);
	});

	test("los demás roles ven las órdenes completas", () => {
		expect(filtrarVentasSoloLaboratorio(ventas, "recepcionista")).toBe(ventas);
		expect(filtrarVentasSoloLaboratorio(ventas, "admin")[1].estudios_venta).toHaveLength(2);
	});

	test("no muta las ventas originales", () => {
		filtrarVentasSoloLaboratorio(ventas, "quimico");
		expect(ventas[0].estudios_venta).toHaveLength(2);
	});
});

describe("filtrarEstudiosSoloLaboratorio", () => {
	test("recorta la lista de estudios del químico", () => {
		expect(
			filtrarEstudiosSoloLaboratorio([laboratorio, ultrasonido, cultivo], "quimico"),
		).toEqual([laboratorio, cultivo]);
	});

	test("otro rol conserva la lista completa", () => {
		const estudios = [laboratorio, ultrasonido];
		expect(filtrarEstudiosSoloLaboratorio(estudios, "admin")).toBe(estudios);
	});
});
