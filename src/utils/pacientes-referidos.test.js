jest.mock("xlsx", () => ({
	utils: {
		aoa_to_sheet: jest.fn(() => ({})),
		book_new: jest.fn(() => ({})),
		book_append_sheet: jest.fn(),
	},
	writeFile: jest.fn(),
}));

import { construirReferidos, exportarReferidosExcel, totalesReferidos } from "./pacientes-referidos";

const medicos = [
	{ id_doctor: 1, nombre_completo: "Ramón Pérez", especialidad: "Ginecología", zona: "Centro", tipo_convenio: "mixto" },
	{ id_doctor: 2, nombre_completo: "Ana Ruiz", especialidad: "Pediatría", zona: "Norte", tipo_convenio: "puntos" },
];

const ventas = [
	{ id_venta: 1, id_doctor: 1, id_paciente: 10, total: 1000, estado: "activo" },
	// El mismo paciente volvió: es un paciente con dos órdenes, no dos pacientes.
	{ id_venta: 2, id_doctor: 1, id_paciente: 10, total: 500, estado: "activo" },
	{ id_venta: 3, id_doctor: 1, id_paciente: 11, total: 250, estado: "activo" },
	{ id_venta: 4, id_doctor: 2, id_paciente: 12, total: 800, estado: "activo" },
	// Cancelada: no cuenta para nadie.
	{ id_venta: 5, id_doctor: 2, id_paciente: 13, total: 900, estado: "cancelado" },
	// Sin remitente: no es de ningún médico.
	{ id_venta: 6, id_doctor: null, id_paciente: 14, total: 300, estado: "activo" },
];

test("cuenta pacientes distintos, no órdenes", () => {
	const filas = construirReferidos({ ventas, medicos });
	const ramon = filas.find((fila) => fila.id_doctor === 1);
	expect(ramon.pacientes).toBe(2);
	expect(ramon.ordenes).toBe(3);
	expect(ramon.facturado).toBe(1750);
});

test("deja fuera las ventas canceladas y las que no traen médico", () => {
	const filas = construirReferidos({ ventas, medicos });
	const ana = filas.find((fila) => fila.id_doctor === 2);
	expect(ana.pacientes).toBe(1);
	expect(ana.facturado).toBe(800);
	expect(filas).toHaveLength(2);
});

// La captura de mostrador a veces no liga paciente; aun así alguien se hizo el
// estudio, así que cada una de esas ventas cuenta como un paciente.
test("una venta sin paciente ligado cuenta como un paciente", () => {
	const filas = construirReferidos({
		ventas: [
			{ id_venta: 7, id_doctor: 1, id_paciente: null, total: 100, estado: "activo" },
			{ id_venta: 8, id_doctor: 1, id_paciente: null, total: 100, estado: "activo" },
		],
		medicos,
	});
	expect(filas[0].pacientes).toBe(2);
});

test("ordena de más a menos pacientes", () => {
	expect(construirReferidos({ ventas, medicos }).map((fila) => fila.id_doctor)).toEqual([1, 2]);
});

test("un médico que no está en el directorio aparece con su id", () => {
	const filas = construirReferidos({
		ventas: [{ id_venta: 9, id_doctor: 99, id_paciente: 1, total: 10, estado: "activo" }],
		medicos,
	});
	expect(filas[0].nombre).toBe("Médico 99");
});

test("los totales suman lo visible", () => {
	expect(totalesReferidos(construirReferidos({ ventas, medicos }))).toEqual({
		medicos: 2,
		pacientes: 3,
		ordenes: 4,
		facturado: 2550,
	});
});

test("un periodo sin ventas devuelve una lista vacía", () => {
	expect(construirReferidos({ ventas: [], medicos })).toEqual([]);
	expect(totalesReferidos([])).toEqual({ medicos: 0, pacientes: 0, ordenes: 0, facturado: 0 });
});

test("la exportación nombra el archivo con el rango", () => {
	const XLSX = require("xlsx");
	exportarReferidosExcel(construirReferidos({ ventas, medicos }), { desde: "2026-09-01", hasta: "2026-09-30" }, "Referidos_septiembre");
	expect(XLSX.writeFile).toHaveBeenCalledWith(expect.anything(), "Referidos_septiembre.xlsx");
});
