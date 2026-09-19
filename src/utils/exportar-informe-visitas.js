// El archivo que sale del sistema tiene que ser intercambiable con el que la
// visitadora arma a mano: mismos encabezados, mismo orden de columnas y una
// hoja por semana. Así puede seguir mandándolo por correo como siempre.
import * as XLSX from "xlsx";
import {
	ENCABEZADOS_INFORME,
	ENCABEZADOS_PROGRAMACION,
} from "./importar-informe-visitas";

const TITULO_INFORME = "REPORTE SEMANAL DE ACTIVIDADES";
const DIAS_NOMBRE = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const texto = (valor) => String(valor ?? "").trim();

const anchosDeColumna = (filas, minimo = 10, maximo = 60) =>
	(filas[0] || []).map((_, columna) => ({
		wch: Math.min(
			maximo,
			Math.max(minimo, ...filas.map((fila) => texto(fila[columna]).length + 2)),
		),
	}));

export const construirHojaInforme = (visitas = [], { semana = "", zona = "" } = {}) => [
	[TITULO_INFORME],
	[`📅 Semana / Fecha: ${texto(semana)}`, "", "", "", "", `📍 Zona / Ruta: ${texto(zona)}`],
	ENCABEZADOS_INFORME,
	...visitas.map((visita) => [
		texto(visita.fecha),
		texto(visita.medico_nombre),
		texto(visita.especialidad),
		texto(visita.ubicacion),
		texto(visita.actividades),
		texto(visita.comentarios_medico),
		texto(visita.observaciones),
		texto(visita.seguimiento),
		texto(visita.tipo_convenio),
	]),
];

export const construirHojaProgramacion = (dias = [], { titulo = "" } = {}) => [
	[texto(titulo) || "PROGRAMACION SEMANAL"],
	ENCABEZADOS_PROGRAMACION,
	...dias.map((dia) => [
		DIAS_NOMBRE[dia.dia_semana] || "",
		texto(dia.zona),
		// Se vuelven a juntar con el mismo separador de bloques de espacios que
		// usa ella, para que el archivo se vea igual al suyo.
		(dia.medicos_programados || [])
			.map((medico) => texto(medico.nombre ?? medico))
			.filter(Boolean)
			.join("     "),
		texto(dia.objetivos),
	]),
];

const escribirLibro = (hojas, nombreArchivo) => {
	const libro = XLSX.utils.book_new();
	for (const { nombre, filas } of hojas) {
		const hoja = XLSX.utils.aoa_to_sheet(filas);
		hoja["!cols"] = anchosDeColumna(filas);
		// Excel no acepta nombres de hoja de más de 31 caracteres.
		XLSX.utils.book_append_sheet(libro, hoja, texto(nombre).slice(0, 31) || "Hoja1");
	}
	XLSX.writeFile(libro, `${nombreArchivo}.xlsx`);
};

export const exportarInformeVisitas = (semanas = [], nombreArchivo = "Reporte_visitas_medicas") =>
	escribirLibro(
		semanas.map(({ nombre, visitas, semana, zona }) => ({
			nombre,
			filas: construirHojaInforme(visitas, { semana, zona }),
		})),
		nombreArchivo,
	);

export const exportarProgramacionSemanal = (
	semanas = [],
	nombreArchivo = "Programacion_semanal",
) =>
	escribirLibro(
		semanas.map(({ nombre, dias, titulo }) => ({
			nombre,
			filas: construirHojaProgramacion(dias, { titulo }),
		})),
		nombreArchivo,
	);

// --- agenda de visitas ------------------------------------------------------
// La agenda también se manda por correo y se imprime para salir a la ruta, así
// que se exporta con las mismas columnas que se ven en pantalla.
export const ENCABEZADOS_AGENDA = [
	"Fecha",
	"Hora",
	"Médico",
	"Especialidad",
	"Zona",
	"Tipo de visita",
	"Objetivo",
	"Estatus",
	"Resultado",
	"Próximo seguimiento",
];

export const construirHojaAgenda = (citas = [], { titulo = "", etiquetaTipo = (valor) => valor } = {}) => [
	["AGENDA DE VISITAS MÉDICAS"],
	[`📅 ${texto(titulo)}`],
	ENCABEZADOS_AGENDA,
	...citas.map((cita) => [
		texto(cita.fecha),
		texto(cita.hora).slice(0, 5),
		texto(cita.medico_nombre),
		texto(cita.especialidad),
		texto(cita.zona),
		texto(etiquetaTipo(cita.tipo_visita)),
		texto(cita.objetivo),
		texto(cita.estatus),
		texto(cita.resultado),
		texto(cita.proximo_seguimiento),
	]),
];

export const exportarAgenda = (citas = [], opciones = {}, nombreArchivo = "Agenda_visitas") => {
	const filas = construirHojaAgenda(citas, opciones);
	const hoja = XLSX.utils.aoa_to_sheet(filas);
	hoja["!cols"] = anchosDeColumna(filas);
	const libro = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(libro, hoja, "Agenda");
	XLSX.writeFile(libro, `${nombreArchivo}.xlsx`);
};
