import { componerCaptura, desglosarCaptura, ETIQUETAS_CAPTURA } from "./desglose-captura";

describe("desglosar lo que se escribe de corrido", () => {
	// Lo primero que se dicta son las actividades, y obligar a etiquetarlas
	// sería estorbar de más.
	test("lo que va antes de la primera etiqueta son actividades", () => {
		expect(desglosarCaptura("Se presentaron los servicios de laboratorio")).toMatchObject({
			actividades: "Se presentaron los servicios de laboratorio",
			comentarios_medico: "",
		});
	});

	test("reparte cada etiqueta en su columna", () => {
		const partes = desglosarCaptura(
			[
				"Actividades: Se dejaron órdenes",
				"Comentarios del médico: Pidió precios de resonancia",
				"Observaciones: Recibe representantes los miércoles",
				"Seguimiento: Volver en 15 días",
				"Convenio: MIXTO",
			].join("\n"),
		);
		expect(partes).toEqual({
			actividades: "Se dejaron órdenes",
			comentarios_medico: "Pidió precios de resonancia",
			observaciones: "Recibe representantes los miércoles",
			seguimiento: "Volver en 15 días",
			tipo_convenio: "MIXTO",
		});
	});

	// Nadie teclea igual dos veces con el celular en una mano.
	test("reconoce la etiqueta sin acentos, con guion y con viñeta", () => {
		const partes = desglosarCaptura("- comentario - Le interesa el convenio\n• SEGUIMIENTO: llamar el lunes");
		expect(partes.comentarios_medico).toBe("Le interesa el convenio");
		expect(partes.seguimiento).toBe("llamar el lunes");
	});

	test("los renglones sueltos se pegan a la etiqueta anterior", () => {
		const partes = desglosarCaptura(
			["Comentarios: Quiere paquetes", "para sus pacientes de control", "Seguimiento: mandar lista"].join("\n"),
		);
		expect(partes.comentarios_medico).toBe("Quiere paquetes\npara sus pacientes de control");
		expect(partes.seguimiento).toBe("mandar lista");
	});

	test("los renglones vacíos no ensucian el desglose", () => {
		expect(desglosarCaptura("Actividades: Entrega\n\n\nSeguimiento: Volver").actividades).toBe("Entrega");
	});

	test("un texto vacío devuelve todas las columnas vacías", () => {
		expect(desglosarCaptura("")).toEqual({
			actividades: "",
			comentarios_medico: "",
			observaciones: "",
			seguimiento: "",
			tipo_convenio: "",
		});
		expect(desglosarCaptura(null).actividades).toBe("");
	});

	// Una hora con dos puntos no es una etiqueta.
	test("un renglón con dos puntos que no es etiqueta se queda donde va", () => {
		expect(desglosarCaptura("Llegué a las 10:30 y no estaba").actividades).toBe(
			"Llegué a las 10:30 y no estaba",
		);
	});
});

describe("volver a armar el texto", () => {
	test("arma el texto con sus etiquetas", () => {
		const texto = componerCaptura({
			actividades: "Se dejaron órdenes",
			comentarios_medico: "Pidió precios",
			seguimiento: "Volver en 15 días",
		});
		expect(texto).toBe(
			["Actividades: Se dejaron órdenes", "Comentarios del médico: Pidió precios", "Seguimiento: Volver en 15 días"].join("\n"),
		);
	});

	// Lo que se escribe de corrido y se vuelve a leer tiene que dar lo mismo.
	test("componer y desglosar son ida y vuelta", () => {
		const visita = {
			actividades: "Entrega de órdenes",
			comentarios_medico: "Sin comentarios",
			observaciones: "Llegar temprano",
			seguimiento: "Llamar el viernes",
			tipo_convenio: "PUNTOS",
		};
		expect(desglosarCaptura(componerCaptura(visita))).toEqual(visita);
	});

	test("una visita sin nada da texto vacío", () => {
		expect(componerCaptura({})).toBe("");
	});

	test("hay una etiqueta por columna del informe", () => {
		expect(ETIQUETAS_CAPTURA.map((fila) => fila.campo)).toEqual([
			"actividades",
			"comentarios_medico",
			"observaciones",
			"seguimiento",
			"tipo_convenio",
		]);
	});
});
