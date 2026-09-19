import * as XLSX from "xlsx";
import {
	construirHojaAgenda,
	construirHojaInforme,
	construirHojaProgramacion,
	ENCABEZADOS_AGENDA,
} from "./exportar-informe-visitas";
import {
	ENCABEZADOS_INFORME,
	ENCABEZADOS_PROGRAMACION,
	leerInformeVisitas,
	leerProgramacionSemanal,
} from "./importar-informe-visitas";

const libroDeUnaHoja = (nombre, filas) => {
	const libro = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(filas), nombre);
	return libro;
};

describe("construirHojaInforme", () => {
	const visita = {
		fecha: "2026-08-03",
		medico_nombre: "Dr. Luis Suarez Lopez",
		especialidad: "Internista",
		ubicacion: "Hospital Multimedica",
		actividades: "Presentación de servicios.",
		comentarios_medico: "Mostró apertura.",
		observaciones: "Médico estricto con representantes.",
		seguimiento: "Mantener contacto.",
		tipo_convenio: "MIXTO",
	};

	test("conserva el titulo y los encabezados que usa la visitadora", () => {
		const filas = construirHojaInforme([visita], { semana: "Del 03 al 07 de Agosto", zona: "Centro" });
		expect(filas[0]).toEqual(["REPORTE SEMANAL DE ACTIVIDADES"]);
		expect(filas[1][0]).toBe("📅 Semana / Fecha: Del 03 al 07 de Agosto");
		expect(filas[1][5]).toBe("📍 Zona / Ruta: Centro");
		expect(filas[2]).toEqual(ENCABEZADOS_INFORME);
	});

	test("escribe las nueve columnas en el mismo orden del archivo original", () => {
		const [, , , renglon] = construirHojaInforme([visita]);
		expect(renglon).toEqual([
			"2026-08-03",
			"Dr. Luis Suarez Lopez",
			"Internista",
			"Hospital Multimedica",
			"Presentación de servicios.",
			"Mostró apertura.",
			"Médico estricto con representantes.",
			"Mantener contacto.",
			"MIXTO",
		]);
	});

	test("los campos faltantes salen vacios, no como undefined", () => {
		const [, , , renglon] = construirHojaInforme([{ fecha: "2026-08-03", medico_nombre: "Dr. Uno" }]);
		expect(renglon).toEqual(["2026-08-03", "Dr. Uno", "", "", "", "", "", "", ""]);
	});

	test("una semana sin visitas sigue produciendo la hoja con encabezados", () => {
		expect(construirHojaInforme([])).toHaveLength(3);
	});

	// La prueba que de verdad importa: lo que exporta el sistema tiene que poder
	// volver a entrar por la importación sin perder nada.
	test("lo exportado se vuelve a leer identico", () => {
		const filas = construirHojaInforme([visita], { semana: "Del 03 al 07 de Agosto" });
		const { filas: leidas, advertencias } = leerInformeVisitas(libroDeUnaHoja("03-07 AGO", filas));
		expect(advertencias).toEqual([]);
		expect(leidas).toEqual([{ hoja: "03-07 AGO", renglon: 4, ...visita }]);
	});
});

describe("construirHojaProgramacion", () => {
	const dia = {
		dia_semana: 1,
		zona: "Torre coralia",
		medicos_programados: [{ nombre: "Camila Ross", id_doctor: 42 }, { nombre: "Mona Khalaf", id_doctor: null }],
		objetivos: "Seguimiento y entrega de órdenes.",
	};

	test("conserva titulo y encabezados", () => {
		const filas = construirHojaProgramacion([dia], { titulo: "PROGRAMACION SEMANAL DEL 17 AL 21 AGO" });
		expect(filas[0]).toEqual(["PROGRAMACION SEMANAL DEL 17 AL 21 AGO"]);
		expect(filas[1]).toEqual(ENCABEZADOS_PROGRAMACION);
	});

	test("escribe el dia con nombre y junta los medicos en una celda", () => {
		const [, , renglon] = construirHojaProgramacion([dia]);
		expect(renglon[0]).toBe("Lunes");
		expect(renglon[1]).toBe("Torre coralia");
		expect(renglon[2]).toBe("Camila Ross     Mona Khalaf");
		expect(renglon[3]).toBe("Seguimiento y entrega de órdenes.");
	});

	test("acepta los medicos como texto suelto ademas de como objeto", () => {
		const [, , renglon] = construirHojaProgramacion([
			{ dia_semana: 2, medicos_programados: ["Nadia Fierro", "Felipe Magaña"] },
		]);
		expect(renglon[2]).toBe("Nadia Fierro     Felipe Magaña");
	});

	test("lo exportado se vuelve a leer identico", () => {
		const filas = construirHojaProgramacion([dia]);
		const { filas: leidas, advertencias } = leerProgramacionSemanal(libroDeUnaHoja("17-21 ago", filas));
		expect(advertencias).toEqual([]);
		expect(leidas).toEqual([
			{
				hoja: "17-21 ago",
				renglon: 3,
				dia_semana: 1,
				zona: "Torre coralia",
				medicos_programados: ["Camila Ross", "Mona Khalaf"],
				objetivos: "Seguimiento y entrega de órdenes.",
			},
		]);
	});
});

describe("construirHojaAgenda", () => {
	const cita = {
		fecha: "2026-09-21",
		hora: "16:30:00",
		medico_nombre: "Ramón Pérez",
		especialidad: "Ginecología",
		zona: "Centro",
		tipo_visita: "entrega_ordenes",
		objetivo: "Dejar talonario",
		estatus: "programada",
		resultado: "",
		proximo_seguimiento: "2026-10-05",
	};

	test("pone los encabezados de la agenda y un renglón por visita", () => {
		const filas = construirHojaAgenda([cita], { titulo: "Del 21 al 27 de septiembre" });
		expect(filas[2]).toEqual(ENCABEZADOS_AGENDA);
		expect(filas[3][0]).toBe("2026-09-21");
		expect(filas[3][2]).toBe("Ramón Pérez");
		expect(filas).toHaveLength(4);
	});

	// La hora se guarda como "16:30:00" y en la hoja estorban los segundos.
	test("recorta los segundos de la hora", () => {
		expect(construirHojaAgenda([cita])[3][1]).toBe("16:30");
	});

	test("traduce el tipo de visita con la etiqueta que se le pase", () => {
		const filas = construirHojaAgenda([cita], {
			etiquetaTipo: (valor) => (valor === "entrega_ordenes" ? "Entrega de órdenes" : valor),
		});
		expect(filas[3][5]).toBe("Entrega de órdenes");
	});

	test("una agenda vacía deja sólo el encabezado", () => {
		expect(construirHojaAgenda([])).toHaveLength(3);
	});
});
