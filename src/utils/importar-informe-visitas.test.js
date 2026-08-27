import * as XLSX from "xlsx";
import {
	ENCABEZADOS_INFORME,
	ENCABEZADOS_PROGRAMACION,
	leerInformeVisitas,
	leerProgramacionSemanal,
	separarMedicosProgramados,
} from "./importar-informe-visitas";

const libroDesde = (hojas) => {
	const libro = XLSX.utils.book_new();
	for (const [nombre, filas] of Object.entries(hojas)) {
		XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(filas), nombre);
	}
	return libro;
};

// Las tres primeras filas del archivo real: título, semana/zona y encabezados.
const hojaInforme = (...visitas) => [
	["REPORTE SEMANAL DE ACTIVIDADES"],
	["📅 Semana / Fecha: Del 03 al 07 de Agosto", "", "", "", "", "📍 Zona / Ruta:"],
	ENCABEZADOS_INFORME,
	...visitas,
];

describe("leerInformeVisitas", () => {
	test("lee una visita con los encabezados con emoji del archivo real", () => {
		const { filas, advertencias } = leerInformeVisitas(
			libroDesde({
				"03-07 AGO": hojaInforme([
					new Date(Date.UTC(2026, 7, 3)),
					"Dr. Luis Suarez Lopez",
					"Internista",
					"Hospital Multimedica",
					"Presentación de Clínica California.",
					"Mostró apertura durante la visita.",
					"Es un médico estricto para recibir representantes.",
					"Mantener contacto y dar seguimiento.",
					"Descuento para Pacientes",
				]),
			}),
		);

		expect(advertencias).toEqual([]);
		expect(filas).toEqual([
			{
				hoja: "03-07 AGO",
				renglon: 4,
				fecha: "2026-08-03",
				medico_nombre: "Dr. Luis Suarez Lopez",
				especialidad: "Internista",
				ubicacion: "Hospital Multimedica",
				actividades: "Presentación de Clínica California.",
				comentarios_medico: "Mostró apertura durante la visita.",
				observaciones: "Es un médico estricto para recibir representantes.",
				seguimiento: "Mantener contacto y dar seguimiento.",
				tipo_convenio: "Descuento para Pacientes",
			},
		]);
	});

	test("lee todas las hojas del libro, una por semana", () => {
		const visita = (nombre) => [new Date(Date.UTC(2026, 7, 3)), nombre, "", "", "", "", "", "", ""];
		const { filas } = leerInformeVisitas(
			libroDesde({
				"03-07 AGO": hojaInforme(visita("Dr. Uno")),
				"10-14 AGO": hojaInforme(visita("Dr. Dos")),
			}),
		);
		expect(filas.map((fila) => fila.medico_nombre)).toEqual(["Dr. Uno", "Dr. Dos"]);
		expect(filas.map((fila) => fila.hoja)).toEqual(["03-07 AGO", "10-14 AGO"]);
	});

	test("encuentra los encabezados aunque cambie el numero de filas de arriba", () => {
		const { filas } = leerInformeVisitas(
			libroDesde({
				Semana: [
					["REPORTE"],
					[],
					[],
					ENCABEZADOS_INFORME,
					[new Date(Date.UTC(2026, 7, 4)), "Dr. Saul Ruiz", "Ginecologo"],
				],
			}),
		);
		expect(filas).toHaveLength(1);
		expect(filas[0]).toMatchObject({ medico_nombre: "Dr. Saul Ruiz", renglon: 5 });
	});

	test("acepta la fecha capturada como texto", () => {
		const { filas } = leerInformeVisitas(
			libroDesde({ Semana: hojaInforme(["2026-08-05", "Dr. Tres"], ["06/08/2026", "Dr. Cuatro"]) }),
		);
		expect(filas.map((fila) => fila.fecha)).toEqual(["2026-08-05", "2026-08-06"]);
	});

	// En el archivo real hay un renglón capturado como "6", que Excel guardó
	// como el serial 6 y muestra como 1900-01-06. Importarlo en silencio metería
	// una visita de hace más de un siglo en el informe.
	test("avisa de la fecha imposible en vez de importarla callando", () => {
		const { filas, advertencias } = leerInformeVisitas(
			libroDesde({
				"03-07 AGO": hojaInforme([
					6,
					"Dra Kihara Victoria Olivares Garcia",
					"Medico General",
				]),
			}),
		);
		expect(filas).toHaveLength(0);
		expect(advertencias).toEqual([
			{
				hoja: "03-07 AGO",
				renglon: 4,
				motivo: "La fecha 1900-01-06 no parece válida. Revísala en el Excel antes de importar.",
			},
		]);
	});

	test("avisa del renglon sin medico y del renglon sin fecha", () => {
		const { filas, advertencias } = leerInformeVisitas(
			libroDesde({
				Semana: hojaInforme(
					[new Date(Date.UTC(2026, 7, 3)), "   "],
					["", "Dr. Sin Fecha"],
				),
			}),
		);
		expect(filas).toHaveLength(0);
		expect(advertencias.map((aviso) => aviso.motivo)).toEqual([
			"El renglón no trae médico ni empresa.",
			"El renglón no trae fecha.",
		]);
	});

	test("omite en silencio los renglones completamente vacios del final", () => {
		const { filas, advertencias } = leerInformeVisitas(
			libroDesde({
				Semana: hojaInforme(
					[new Date(Date.UTC(2026, 7, 3)), "Dr. Uno"],
					[],
					["", "", ""],
				),
			}),
		);
		expect(filas).toHaveLength(1);
		expect(advertencias).toEqual([]);
	});

	test("una hoja sin encabezados reconocibles se reporta, no truena", () => {
		const { filas, advertencias } = leerInformeVisitas(
			libroDesde({ Notas: [["esto no es un informe"], ["ni de lejos"]] }),
		);
		expect(filas).toEqual([]);
		expect(advertencias).toEqual([
			{
				hoja: "Notas",
				renglon: null,
				motivo: "No se encontraron los encabezados del informe en esta hoja.",
			},
		]);
	});

	test("recorta los espacios sobrantes de las celdas", () => {
		const { filas } = leerInformeVisitas(
			libroDesde({
				Semana: hojaInforme([
					new Date(Date.UTC(2026, 7, 3)),
					"  Dr. Espacios  ",
					" Internista ",
					"",
					"  Visita  ",
				]),
			}),
		);
		expect(filas[0]).toMatchObject({
			medico_nombre: "Dr. Espacios",
			especialidad: "Internista",
			ubicacion: "",
			actividades: "Visita",
		});
	});
});

describe("separarMedicosProgramados", () => {
	// En el Excel los nombres van en una sola celda, separados por bloques de
	// espacios porque se alinearon a mano.
	test("separa los nombres pegados con bloques de espacios", () => {
		expect(
			separarMedicosProgramados(
				"Camila Ross                    Mona Khalaf                 Sergio Manolo",
			),
		).toEqual(["Camila Ross", "Mona Khalaf", "Sergio Manolo"]);
	});

	test("tambien separa por saltos de linea", () => {
		expect(separarMedicosProgramados("Diana Ciambelli\nDiego Arce Lopez")).toEqual([
			"Diana Ciambelli",
			"Diego Arce Lopez",
		]);
	});

	test("conserva el nombre que trae la sede pegada con guion", () => {
		expect(separarMedicosProgramados("Jorge Mendoza- Medical Center")).toEqual([
			"Jorge Mendoza- Medical Center",
		]);
	});

	test("una celda vacia no produce nombres", () => {
		expect(separarMedicosProgramados("   ")).toEqual([]);
		expect(separarMedicosProgramados(null)).toEqual([]);
	});
});

describe("leerProgramacionSemanal", () => {
	const hojaProgramacion = (...dias) => [
		["PROGRAMACION SEMANAL DEL 17 AL 21 AGO"],
		ENCABEZADOS_PROGRAMACION,
		...dias,
	];

	test("lee un dia con sus medicos separados", () => {
		const { filas, advertencias } = leerProgramacionSemanal(
			libroDesde({
				"17-21 ago": hojaProgramacion([
					"Lunes",
					"Torre coralia",
					"Camila Ross                Mona Khalaf",
					"Seguimiento a medicos visitados con anterioridad.",
				]),
			}),
		);

		expect(advertencias).toEqual([]);
		expect(filas).toEqual([
			{
				hoja: "17-21 ago",
				renglon: 3,
				dia_semana: 1,
				zona: "Torre coralia",
				medicos_programados: ["Camila Ross", "Mona Khalaf"],
				objetivos: "Seguimiento a medicos visitados con anterioridad.",
			},
		]);
	});

	test("reconoce los cinco dias con y sin acento", () => {
		const { filas } = leerProgramacionSemanal(
			libroDesde({
				Semana: hojaProgramacion(
					["Lunes", "A"],
					["Martes", "B"],
					["Miércoles", "C"],
					["Miercoles", "D"],
					["Jueves", "E"],
					["Viernes", "F"],
				),
			}),
		);
		expect(filas.map((fila) => fila.dia_semana)).toEqual([1, 2, 3, 3, 4, 5]);
	});

	test("avisa del dia que no reconoce", () => {
		const { filas, advertencias } = leerProgramacionSemanal(
			libroDesde({ Semana: hojaProgramacion(["Lunes o martes", "Zona"]) }),
		);
		expect(filas).toHaveLength(0);
		expect(advertencias).toEqual([
			{
				hoja: "Semana",
				renglon: 3,
				motivo: 'No se reconoce el día "Lunes o martes".',
			},
		]);
	});

	test("omite los renglones vacios del final", () => {
		const { filas, advertencias } = leerProgramacionSemanal(
			libroDesde({ Semana: hojaProgramacion(["Lunes", "Zona"], [], ["", ""]) }),
		);
		expect(filas).toHaveLength(1);
		expect(advertencias).toEqual([]);
	});
});
