// Las librerías de PDF y Excel se simulan: aquí lo que se prueba son los
// conteos del reporte, no que jsPDF sepa dibujar una tabla.
jest.mock("jspdf", () => {
	const documento = {
		setFontSize: jest.fn(),
		text: jest.fn(),
		save: jest.fn(),
		lastAutoTable: { finalY: 40 },
	};
	return jest.fn(() => documento);
});
jest.mock("jspdf-autotable", () => jest.fn());
jest.mock("xlsx", () => ({
	utils: {
		aoa_to_sheet: jest.fn(() => ({})),
		book_new: jest.fn(() => ({})),
		book_append_sheet: jest.fn(),
	},
	writeFile: jest.fn(),
}));

import { construirReporte, exportarReporteExcel, exportarReportePdf } from "./reporte-crm";

const visitas = [
	{
		id_visita: "v1",
		fecha: "2026-09-14",
		id_doctor: 1,
		medico_nombre: "Ramón Pérez",
		especialidad: "Ginecología",
		zona: "Centro",
		resultado: "Aceptó el convenio",
		tipo_convenio: "MIXTO",
	},
	{
		id_visita: "v2",
		fecha: "2026-09-16",
		id_doctor: 1,
		medico_nombre: "Ramón Pérez",
		especialidad: "Ginecología",
		zona: "Centro",
		tipo_convenio: "MIXTO",
	},
	{
		id_visita: "v3",
		fecha: "2026-09-16",
		id_doctor: 2,
		medico_nombre: "Ana Ruiz",
		especialidad: "Pediatría",
		zona: "Norte",
		resultado: "Pidió información",
		tipo_convenio: "PUNTOS",
	},
	// Fuera del periodo: es la primera visita histórica del doctor 1, y por eso
	// en la semana no cuenta como médico nuevo.
	{
		id_visita: "v0",
		fecha: "2026-08-03",
		id_doctor: 1,
		medico_nombre: "Ramón Pérez",
		especialidad: "Ginecología",
		zona: "Centro",
	},
];

const base = {
	desde: "2026-09-14",
	hasta: "2026-09-18",
	visitas,
	historicoVisitas: visitas,
	tareas: [
		{ id_tarea: "t1", tipo: "llamada", estado: "hecha", fecha_objetivo: "2026-09-15" },
		{ id_tarea: "t2", tipo: "seguimiento", estado: "hecha", fecha_objetivo: "2026-09-16" },
		{ id_tarea: "t3", tipo: "seguimiento", estado: "pendiente", fecha_objetivo: "2026-09-17" },
		{ id_tarea: "t4", tipo: "alta_ebudaicom", estado: "hecha", fecha_objetivo: "2026-09-17" },
		{ id_tarea: "t5", tipo: "llamada", estado: "hecha", fecha_objetivo: "2026-09-30" },
	],
	ordenes: [
		{ id_entrega: "o1", id_doctor: 1, fecha_entrega: "2026-09-16", cantidad: 25 },
		{ id_entrega: "o2", id_doctor: 2, fecha_entrega: "2026-08-01", cantidad: 10 },
	],
	convenios: [
		{ id_doctor: 1, tipo: "mixto", vigente_desde: "2026-08-10" },
		{ id_doctor: 1, tipo: "especial", vigente_desde: "2026-09-16" },
		{ id_doctor: 2, tipo: "puntos", vigente_desde: "2026-09-15" },
	],
	medicos: [{ estatus: "prospecto" }, { estatus: "activo" }, { estatus: "prospecto" }],
};

test("cuenta las visitas y los médicos distintos del periodo", () => {
	const reporte = construirReporte(base);
	expect(reporte.visitas).toBe(3);
	expect(reporte.medicos_visitados).toBe(2);
	expect(reporte.resultados).toBe(2);
});

// Lo que se contaba mal a mano: el doctor 1 ya se había visitado en agosto, así
// que no es un médico nuevo de esta semana aunque aparezca dos veces en ella.
test("médico nuevo es el que se ve por primera vez en el periodo", () => {
	expect(construirReporte(base).medicos_nuevos).toBe(1);
});

test("separa convenios nuevos de reactivados", () => {
	const reporte = construirReporte(base);
	expect(reporte.convenios_nuevos).toBe(1);
	expect(reporte.convenios_reactivados).toBe(1);
});

test("sólo cuenta las tareas hechas dentro del periodo", () => {
	const reporte = construirReporte(base);
	expect(reporte.llamadas).toBe(1);
	expect(reporte.seguimientos).toBe(1);
	expect(reporte.usuarios_ebudaicom).toBe(1);
	expect(reporte.pendientes).toBe(1);
});

test("suma las órdenes entregadas en el periodo", () => {
	const reporte = construirReporte(base);
	expect(reporte.entregas_ordenes).toBe(1);
	expect(reporte.ordenes_entregadas).toBe(25);
});

test("los filtros recortan el detalle", () => {
	const porZona = construirReporte({ ...base, filtros: { zona: "Norte" } });
	expect(porZona.visitas).toBe(1);
	expect(porZona.detalle[0].medico_nombre).toBe("Ana Ruiz");

	const porMedico = construirReporte({ ...base, filtros: { idDoctor: 1 } });
	expect(porMedico.visitas).toBe(2);

	const porConvenio = construirReporte({ ...base, filtros: { tipoConvenio: "PUNTOS" } });
	expect(porConvenio.visitas).toBe(1);
});

test("un periodo sin movimiento devuelve ceros, no errores", () => {
	const reporte = construirReporte({ ...base, desde: "2026-07-01", hasta: "2026-07-07" });
	expect(reporte.visitas).toBe(0);
	expect(reporte.medicos_visitados).toBe(0);
	expect(reporte.detalle).toEqual([]);
});

test("la exportación entrega un archivo por cada formato", () => {
	const XLSX = require("xlsx");
	const jsPDF = require("jspdf");
	const reporte = construirReporte(base);
	exportarReporteExcel(reporte, "Reporte_prueba");
	expect(XLSX.writeFile).toHaveBeenCalledWith(expect.anything(), "Reporte_prueba.xlsx");
	exportarReportePdf(reporte, "Reporte_prueba");
	expect(jsPDF.mock.results[0].value.save).toHaveBeenCalledWith("Reporte_prueba.pdf");
});
