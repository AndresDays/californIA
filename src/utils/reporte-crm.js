// El reporte de trabajo se armaba a mano cada viernes contando renglones del
// Excel. Aquí se calcula de lo que ya está capturado: visitas, tareas, órdenes,
// convenios y altas de eBudaicom del periodo que se pida.
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { etiquetaConvenio, etiquetaTipoVisita } from "./crm-visitadora";

const texto = (valor) => String(valor ?? "").trim();
const dentro = (fecha, desde, hasta) => {
	const dia = texto(fecha).slice(0, 10);
	return Boolean(dia) && dia >= desde && dia <= hasta;
};

const cumpleFiltros = (visita, filtros = {}) => {
	if (filtros.idDoctor && String(visita.id_doctor) !== String(filtros.idDoctor)) return false;
	if (filtros.especialidad && texto(visita.especialidad) !== filtros.especialidad) return false;
	if (filtros.zona && texto(visita.zona) !== filtros.zona) return false;
	if (filtros.tipoConvenio && texto(visita.tipo_convenio) !== filtros.tipoConvenio) return false;
	return true;
};

// Un médico cuenta como nuevo cuando su primera visita del histórico cae dentro
// del periodo: es la primera vez que se le ve, no sólo la primera de la semana.
const medicosNuevos = (visitasPeriodo, historico, desde) => {
	const primeraVisita = new Map();
	for (const visita of historico) {
		const clave = visita.id_doctor ?? texto(visita.medico_nombre).toLowerCase();
		const fecha = texto(visita.fecha).slice(0, 10);
		if (!fecha) continue;
		const previa = primeraVisita.get(clave);
		if (!previa || fecha < previa) primeraVisita.set(clave, fecha);
	}
	const nuevos = new Set();
	for (const visita of visitasPeriodo) {
		const clave = visita.id_doctor ?? texto(visita.medico_nombre).toLowerCase();
		if ((primeraVisita.get(clave) ?? "") >= desde) nuevos.add(clave);
	}
	return nuevos.size;
};

export const construirReporte = ({
	desde,
	hasta,
	visitas = [],
	historicoVisitas = null,
	tareas = [],
	ordenes = [],
	convenios = [],
	medicos = [],
	filtros = {},
} = {}) => {
	const delPeriodo = visitas.filter(
		(visita) => dentro(visita.fecha, desde, hasta) && cumpleFiltros(visita, filtros),
	);
	const conveniosPeriodo = convenios.filter((convenio) =>
		dentro(convenio.vigente_desde, desde, hasta),
	);
	const tareasPeriodo = tareas.filter((tarea) => dentro(tarea.fecha_objetivo, desde, hasta));
	const ordenesPeriodo = ordenes.filter((orden) => dentro(orden.fecha_entrega, desde, hasta));

	const visitados = new Set(
		delPeriodo.map((visita) => visita.id_doctor ?? texto(visita.medico_nombre).toLowerCase()),
	);

	const hechas = (tipo) =>
		tareasPeriodo.filter((tarea) => tarea.tipo === tipo && tarea.estado === "hecha").length;

	// Reactivado: el médico ya tenía un convenio anterior y en el periodo se le
	// abrió otro. Nuevo: es su primer convenio.
	const conveniosPrevios = new Map();
	for (const convenio of convenios) {
		const fecha = texto(convenio.vigente_desde).slice(0, 10);
		const previa = conveniosPrevios.get(convenio.id_doctor);
		if (!previa || fecha < previa) conveniosPrevios.set(convenio.id_doctor, fecha);
	}

	return {
		periodo: { desde, hasta },
		medicos_visitados: visitados.size,
		visitas: delPeriodo.length,
		medicos_nuevos: medicosNuevos(delPeriodo, historicoVisitas ?? visitas, desde),
		prospectos: medicos.filter((medico) => medico.estatus === "prospecto").length,
		convenios_nuevos: conveniosPeriodo.filter(
			(convenio) => (conveniosPrevios.get(convenio.id_doctor) ?? "") >= desde,
		).length,
		convenios_reactivados: conveniosPeriodo.filter(
			(convenio) => (conveniosPrevios.get(convenio.id_doctor) ?? "") < desde,
		).length,
		seguimientos: hechas("seguimiento"),
		llamadas: hechas("llamada"),
		entregas_ordenes: ordenesPeriodo.length,
		ordenes_entregadas: ordenesPeriodo.reduce((suma, orden) => suma + Number(orden.cantidad || 0), 0),
		usuarios_ebudaicom: hechas("alta_ebudaicom"),
		pendientes: tareasPeriodo.filter((tarea) => tarea.estado === "pendiente").length,
		resultados: delPeriodo.filter((visita) => texto(visita.resultado)).length,
		detalle: delPeriodo,
	};
};

export const RENGLONES_RESUMEN = [
	["Médicos visitados", "medicos_visitados"],
	["Número de visitas", "visitas"],
	["Médicos nuevos", "medicos_nuevos"],
	["Prospectos", "prospectos"],
	["Convenios nuevos", "convenios_nuevos"],
	["Convenios reactivados", "convenios_reactivados"],
	["Seguimientos realizados", "seguimientos"],
	["Llamadas realizadas", "llamadas"],
	["Entregas de órdenes", "entregas_ordenes"],
	["Órdenes entregadas", "ordenes_entregadas"],
	["Usuarios creados en eBudaicom", "usuarios_ebudaicom"],
	["Pendientes", "pendientes"],
	["Resultados registrados", "resultados"],
];

const COLUMNAS_DETALLE = [
	"Fecha",
	"Médico",
	"Especialidad",
	"Zona",
	"Tipo de visita",
	"Objetivo",
	"Resultado",
	"Convenio",
	"Seguimiento",
];

const filasDetalle = (reporte) =>
	reporte.detalle.map((visita) => [
		texto(visita.fecha),
		texto(visita.medico_nombre),
		texto(visita.especialidad),
		texto(visita.zona),
		visita.tipo_visita ? etiquetaTipoVisita(visita.tipo_visita) : "",
		texto(visita.objetivo || visita.actividades),
		texto(visita.resultado),
		texto(visita.tipo_convenio),
		texto(visita.fecha_seguimiento || visita.seguimiento),
	]);

export const exportarReporteExcel = (reporte, nombreArchivo = "Reporte_visitadora") => {
	const libro = XLSX.utils.book_new();
	const resumen = [
		["REPORTE DE ACTIVIDADES"],
		[`Del ${reporte.periodo.desde} al ${reporte.periodo.hasta}`],
		[],
		["Concepto", "Total"],
		...RENGLONES_RESUMEN.map(([etiqueta, clave]) => [etiqueta, reporte[clave]]),
	];
	XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(resumen), "Resumen");
	XLSX.utils.book_append_sheet(
		libro,
		XLSX.utils.aoa_to_sheet([COLUMNAS_DETALLE, ...filasDetalle(reporte)]),
		"Detalle",
	);
	XLSX.writeFile(libro, `${nombreArchivo}.xlsx`);
};

export const exportarReportePdf = (reporte, nombreArchivo = "Reporte_visitadora") => {
	const documento = new jsPDF({ orientation: "landscape" });
	documento.setFontSize(14);
	documento.text("Reporte de actividades", 14, 16);
	documento.setFontSize(10);
	documento.text(`Del ${reporte.periodo.desde} al ${reporte.periodo.hasta}`, 14, 22);
	autoTable(documento, {
		startY: 28,
		head: [["Concepto", "Total"]],
		body: RENGLONES_RESUMEN.map(([etiqueta, clave]) => [etiqueta, String(reporte[clave])]),
		styles: { fontSize: 9 },
	});
	autoTable(documento, {
		startY: documento.lastAutoTable.finalY + 8,
		head: [COLUMNAS_DETALLE],
		body: filasDetalle(reporte),
		styles: { fontSize: 8, cellWidth: "wrap" },
	});
	documento.save(`${nombreArchivo}.pdf`);
};

// Para el filtro por tipo de convenio del reporte: las visitas guardan el
// convenio como texto libre, así que la lista se arma de lo capturado.
export const conveniosCapturados = (visitas = []) =>
	[...new Set(visitas.map((visita) => texto(visita.tipo_convenio)).filter(Boolean))].sort();

export const etiquetaConvenioReporte = etiquetaConvenio;
