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

describe("la visita ya registrada llena las columnas", () => {
	const visita = {
		id_visita: "v1",
		id_agenda: "a1",
		actividades: "Se presentaron laboratorio e imagen",
		comentarios_medico: "Pidió precios de resonancia",
		observaciones: "Recibe los miércoles",
		seguimiento: "Volver en 15 días",
		tipo_convenio: "MIXTO",
		ubicacion: "Consultorio 302",
		especialidad: "Internista",
	};

	// En el Excel salía el objetivo como actividades y el resto en blanco,
	// aunque la visita ya se hubiera registrado con todo desglosado.
	test("cada campo capturado va en su columna", () => {
		const [fila] = construirFilasAgenda([cita()], medicos, [visita]);
		expect(fila[2]).toBe("Internista");
		expect(fila[3]).toBe("Consultorio 302");
		expect(fila[4]).toBe("Se presentaron laboratorio e imagen");
		expect(fila[5]).toBe("Pidió precios de resonancia");
		expect(fila[6]).toBe("Recibe los miércoles");
		expect(fila[7]).toBe("Volver en 15 días");
		expect(fila[8]).toBe("MIXTO");
	});

	// Lo que todavía no se visita sí sale con el objetivo: es lo previsto.
	test("la cita sin visitar conserva su objetivo como actividades", () => {
		const [fila] = construirFilasAgenda([cita()], medicos, []);
		expect(fila[4]).toBe("Presentación de servicios");
		expect(fila[5]).toBe("");
	});

	test("la visita de otra cita no se cuela", () => {
		const [fila] = construirFilasAgenda([cita()], medicos, [{ ...visita, id_agenda: "otra" }]);
		expect(fila[4]).toBe("Presentación de servicios");
	});

	test("lo que la visita dejó vacío cae al dato de la cita", () => {
		const [fila] = construirFilasAgenda(
			[cita()],
			medicos,
			[{ id_agenda: "a1", actividades: "Entrega", comentarios_medico: "", seguimiento: "" }],
		);
		expect(fila[4]).toBe("Entrega");
		expect(fila[7]).toBe("2026-08-17");
	});
});
