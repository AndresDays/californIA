import {
	contarEstudiosListos,
	filtrarOrdenesConvenio,
	formatearFechaOrden,
} from "./resultados-convenio";

const ordenes = [
	{
		id_venta: 1,
		folio: "C0001",
		paciente: "José Pérez",
		estudios: [{ estado: "validado" }, { estado: "captura" }],
	},
	{ id_venta: 2, folio: "C0002", paciente: "Ana Ruiz", estudios: [{ estado: "validado" }] },
];

describe("pantalla de resultados del convenio", () => {
	test("busca por paciente sin depender de los acentos", () => {
		expect(filtrarOrdenesConvenio(ordenes, "jose")).toHaveLength(1);
		expect(filtrarOrdenesConvenio(ordenes, "PEREZ")[0].id_venta).toBe(1);
	});

	test("busca tambien por folio", () => {
		expect(filtrarOrdenesConvenio(ordenes, "c0002")[0].id_venta).toBe(2);
	});

	test("sin busqueda devuelve todas", () => {
		expect(filtrarOrdenesConvenio(ordenes, "  ")).toHaveLength(2);
	});

	// Sólo lo validado se entrega: el convenio ve cuánto le falta a cada orden.
	test("cuenta los estudios ya validados", () => {
		expect(contarEstudiosListos(ordenes[0])).toBe(1);
		expect(contarEstudiosListos({})).toBe(0);
	});

	test("la fecha se lee en la zona de la clinica", () => {
		expect(formatearFechaOrden("2026-09-10T02:00:00Z")).toBe("09/09/2026");
		expect(formatearFechaOrden("")).toBe("");
	});
});
