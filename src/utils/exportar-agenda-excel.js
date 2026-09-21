// La agenda se exporta con el mismo formato del reporte semanal que ella
// entrega: encabezado azul, títulos dorados, las mismas nueve columnas y los
// mismos anchos. Si el archivo se ve distinto al suyo, tiene que rehacerlo a
// mano antes de mandarlo, y entonces exportar no sirve de nada.
import { etiquetaConvenio } from "./crm-visitadora";
import { MESES } from "./semanas-visitadora";

const AZUL_ENCABEZADO = "FF1B365D";
const DORADO_TITULOS = "FFD9A74A";
const TIPOGRAFIA = "Segoe UI";

export const COLUMNAS_AGENDA = [
	{ titulo: "📅 Fecha", ancho: 13 },
	{ titulo: "👨‍⚕️ Médico / Empresa", ancho: 17.14 },
	{ titulo: "🩺 Especialidad / Giro", ancho: 18.43 },
	{ titulo: "📍 Ubicación", ancho: 16.57 },
	{ titulo: "📝 Actividades", ancho: 25.71 },
	{ titulo: "💬 Comentarios del Médico", ancho: 35.71 },
	{ titulo: "🔍 Observaciones", ancho: 32.14 },
	{ titulo: "✍🏻 Seguimiento", ancho: 19 },
	{ titulo: "Tipo de convenio ", ancho: 16.29 },
];

const texto = (valor) => String(valor ?? "").trim();

// El nombre de la hoja es el rango de la semana como lo escribe ella:
// "03-07 AGO". Excel no admite más de 31 caracteres ni algunos signos.
export const nombreDeHoja = (desde, hasta) => {
	const inicio = String(desde).slice(8, 10);
	const fin = String(hasta).slice(8, 10);
	const mes = MESES[Number(String(hasta).slice(5, 7)) - 1] ?? "";
	return `${inicio}-${fin} ${mes.slice(0, 3).toUpperCase()}`.slice(0, 31);
};

export const tituloDeSemana = (desde, hasta) => {
	const mesInicio = MESES[Number(String(desde).slice(5, 7)) - 1] ?? "";
	const mesFin = MESES[Number(String(hasta).slice(5, 7)) - 1] ?? "";
	const dia = (fecha) => String(fecha).slice(8, 10);
	const conMayuscula = (mes) => mes.charAt(0).toUpperCase() + mes.slice(1);
	return mesInicio === mesFin
		? `Del ${dia(desde)} al ${dia(hasta)} de ${conMayuscula(mesFin)}`
		: `Del ${dia(desde)} de ${conMayuscula(mesInicio)} al ${dia(hasta)} de ${conMayuscula(mesFin)}`;
};

// La ubicación sale del consultorio del médico; la zona de la cita queda de
// respaldo, que es lo único que hay cuando el médico todavía no tiene ficha.
const ubicacionDeCita = (cita, medicosPorId) => {
	const medico = medicosPorId.get(cita.id_doctor);
	return texto(medico?.hospital || medico?.direccion_consultorio || cita.zona);
};

export const construirFilasAgenda = (citas = [], medicos = []) => {
	const medicosPorId = new Map(medicos.map((medico) => [medico.id_doctor, medico]));
	return citas.map((cita) => {
		const medico = medicosPorId.get(cita.id_doctor);
		return [
			// Fecha de verdad, no texto: en su archivo la columna va con formato
			// de fecha y así se puede ordenar y filtrar. Se fija a mediodía para
			// que ningún huso horario la recorra al día anterior; con el formato
			// "d-mmm" la hora no se ve.
			texto(cita.fecha) ? new Date(`${texto(cita.fecha)}T12:00:00Z`) : "",
			texto(cita.medico_nombre),
			texto(cita.especialidad || medico?.especialidad),
			ubicacionDeCita(cita, medicosPorId),
			texto(cita.objetivo),
			"",
			texto(cita.resultado),
			texto(cita.proximo_seguimiento),
			medico?.tipo_convenio ? etiquetaConvenio(medico.tipo_convenio) : "",
		];
	});
};

const bordeFino = {
	top: { style: "thin" },
	left: { style: "thin" },
	right: { style: "thin" },
	bottom: { style: "thin" },
};

export const construirLibroAgenda = (libro, citas, medicos, { desde, hasta, zona = "" }) => {
	const hoja = libro.addWorksheet(nombreDeHoja(desde, hasta));
	hoja.columns = COLUMNAS_AGENDA.map((columna) => ({ width: columna.ancho }));

	const titulo = hoja.addRow(["REPORTE SEMANAL DE ACTIVIDADES"]);
	hoja.mergeCells(1, 1, 1, COLUMNAS_AGENDA.length);
	titulo.height = 24;
	titulo.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL_ENCABEZADO } };
	titulo.getCell(1).font = { name: TIPOGRAFIA, size: 15, bold: true, color: { argb: "FFFFFFFF" } };
	// ExcelJS nombra "middle" al centro vertical; con "center" lo descarta y la
	// fila queda con el texto pegado arriba.
	titulo.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

	const semana = hoja.addRow([
		`📅 Semana / Fecha: ${tituloDeSemana(desde, hasta)}`,
		"",
		"",
		"",
		`📍 Zona / Ruta: ${texto(zona)}`,
	]);
	hoja.mergeCells(2, 1, 2, 4);
	semana.height = 16.5;
	for (const columna of [1, 5]) {
		semana.getCell(columna).font = {
			name: TIPOGRAFIA,
			size: 11,
			bold: true,
			color: { argb: AZUL_ENCABEZADO },
		};
	}
	semana.getCell(1).alignment = { horizontal: "left", wrapText: true };

	const titulos = hoja.addRow(COLUMNAS_AGENDA.map((columna) => columna.titulo));
	titulos.height = 33;
	titulos.eachCell((celda) => {
		celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DORADO_TITULOS } };
		celda.font = { name: TIPOGRAFIA, size: 11, bold: true, color: { argb: "FFFFFFFF" } };
		celda.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
		celda.border = bordeFino;
	});

	for (const fila of construirFilasAgenda(citas, medicos)) {
		const renglon = hoja.addRow(fila);
		renglon.eachCell({ includeEmpty: true }, (celda, columna) => {
			celda.font = { name: TIPOGRAFIA, size: 11 };
			celda.alignment = {
				// Las columnas de texto largo se leen alineadas a la izquierda; las
				// cortas, centradas, igual que en su archivo.
				horizontal: columna >= 5 && columna <= 8 ? "left" : "center",
				vertical: "middle",
				wrapText: true,
			};
			celda.border = bordeFino;
			if (columna === 1) celda.numFmt = "d-mmm";
		});
	}

	// Las dos primeras filas también llevan borde en su archivo.
	for (const numero of [2]) {
		hoja.getRow(numero).eachCell({ includeEmpty: true }, (celda) => {
			celda.border = bordeFino;
		});
	}

	return hoja;
};

// ExcelJS se carga sólo al exportar: pesa bastante y no tiene por qué viajar
// en la carga inicial de la aplicación.
export const exportarAgendaExcel = async (citas, medicos, rango, nombreArchivo = "Agenda_visitas") => {
	const { default: ExcelJS } = await import("exceljs");
	const libro = new ExcelJS.Workbook();
	construirLibroAgenda(libro, citas, medicos, rango);
	const datos = await libro.xlsx.writeBuffer();
	const enlace = document.createElement("a");
	const url = URL.createObjectURL(
		new Blob([datos], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
	);
	enlace.href = url;
	enlace.download = `${nombreArchivo}.xlsx`;
	enlace.click();
	URL.revokeObjectURL(url);
};
