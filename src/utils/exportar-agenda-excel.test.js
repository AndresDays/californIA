import {
	COLUMNAS_AGENDA,
	construirFilasAgenda,
	nombreDeHoja,
	tituloDeSemana,
} from "./exportar-agenda-excel";

const medicos = [
	{
		id_doctor: 1,
		hospital: "Hospital Multimedica",
		especialidad: "Internista",
		tipo_convenio: "mixto",
	},
	{ id_doctor: 2, direccion_consultorio: "Av. Palmas 100", tipo_convenio: "puntos" },
];

const cita = (extra) => ({
	id_agenda: "a1",
	id_doctor: 1,
	medico_nombre: "Dr. Luis Suárez",
	especialidad: "Internista",
	zona: "Centro",
	fecha: "2026-08-03",
	hora: "10:00:00",
	objetivo: "Presentación de servicios",
	resultado: "",
	proximo_seguimiento: "2026-08-17",
	...extra,
});

describe("columnas del reporte semanal", () => {
	// Son las mismas nueve columnas del archivo que ella entrega: si cambian,
	// tiene que rehacer la hoja a mano antes de mandarla.
	test("van en el orden de su archivo y sin columna de hora", () => {
		expect(COLUMNAS_AGENDA.map((columna) => columna.titulo)).toEqual([
			"📅 Fecha",
			"👨‍⚕️ Médico / Empresa",
			"🩺 Especialidad / Giro",
			"📍 Ubicación",
			"📝 Actividades",
			"💬 Comentarios del Médico",
			"🔍 Observaciones",
			"✍🏻 Seguimiento",
			"Tipo de convenio ",
		]);
	});

	test("conservan los anchos de su archivo", () => {
		expect(COLUMNAS_AGENDA.map((columna) => columna.ancho)).toEqual([
			13, 17.14, 18.43, 16.57, 25.71, 35.71, 32.14, 19, 16.29,
		]);
	});
});

describe("filas de la agenda", () => {
	test("la hora no sale en ninguna celda", () => {
		const [fila] = construirFilasAgenda([cita()], medicos);
		expect(fila.some((valor) => String(valor).includes("10:00"))).toBe(false);
		expect(fila).toHaveLength(COLUMNAS_AGENDA.length);
	});

	// La zona servía de "ubicación" y decía "Centro" donde debía decir el
	// consultorio: ahora sale el hospital del médico.
	test("la ubicación es el consultorio del médico", () => {
		const [fila] = construirFilasAgenda([cita()], medicos);
		expect(fila[3]).toBe("Hospital Multimedica");
	});

	test("sin hospital usa la dirección, y sin ficha la zona de la cita", () => {
		const [conDireccion] = construirFilasAgenda([cita({ id_doctor: 2 })], medicos);
		expect(conDireccion[3]).toBe("Av. Palmas 100");
		const [sinFicha] = construirFilasAgenda([cita({ id_doctor: 99 })], medicos);
		expect(sinFicha[3]).toBe("Centro");
	});

	test("la fecha va como fecha, no como texto", () => {
		const [fila] = construirFilasAgenda([cita()], medicos);
		expect(fila[0]).toBeInstanceOf(Date);
		expect(fila[0].toISOString().slice(0, 10)).toBe("2026-08-03");
	});

	test("el convenio se escribe con su nombre", () => {
		expect(construirFilasAgenda([cita()], medicos)[0][8]).toBe("Mixto");
		expect(construirFilasAgenda([cita({ id_doctor: 99 })], medicos)[0][8]).toBe("");
	});

	test("una agenda vacía no genera renglones", () => {
		expect(construirFilasAgenda([], medicos)).toEqual([]);
	});
});

describe("encabezado de la hoja", () => {
	test("la hoja se llama como la semana, igual que en su archivo", () => {
		expect(nombreDeHoja("2026-08-03", "2026-08-07")).toBe("03-07 AGO");
	});

	test("el título dice el rango en palabras", () => {
		expect(tituloDeSemana("2026-08-03", "2026-08-07")).toBe("Del 03 al 07 de Agosto");
		expect(tituloDeSemana("2026-08-31", "2026-09-04")).toBe("Del 31 de Agosto al 04 de Septiembre");
	});
});
