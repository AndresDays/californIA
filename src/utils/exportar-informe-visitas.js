// El archivo que sale del sistema tiene que ser intercambiable con el que la
// visitadora arma a mano: mismos encabezados, mismo orden de columnas y una
// hoja por semana. Así puede seguir mandándolo por correo como siempre.
import * as XLSX from "xlsx";
import { ENCABEZADOS_INFORME } from "./importar-informe-visitas";

const TITULO_INFORME = "REPORTE SEMANAL DE ACTIVIDADES";

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
