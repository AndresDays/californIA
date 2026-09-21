import { campoDeFrase, clasificarCaptura, convenioDelTexto, partirEnFrases } from "./clasificar-captura";

// Las frases de estas pruebas están tomadas de su informe real de agosto: si
// el reparto funciona con lo que ella de verdad escribe, funciona.
describe("cada frase a su columna, sin etiquetas", () => {
	test("lo que ella hizo son actividades", () => {
		expect(campoDeFrase("Se presentaron los servicios de laboratorio e imagen")).toBe("actividades");
		expect(campoDeFrase("Se dejaron órdenes médicas")).toBe("actividades");
		expect(campoDeFrase("Visita de seguimiento y entrega de órdenes")).toBe("actividades");
	});

	test("lo que dijo el médico son sus comentarios", () => {
		expect(campoDeFrase("Mostró apertura durante la visita")).toBe("comentarios_medico");
		expect(campoDeFrase("Pidió precios de resonancia")).toBe("comentarios_medico");
		expect(campoDeFrase("Desconocía la existencia del convenio")).toBe("comentarios_medico");
	});

	test("lo que queda por hacer es seguimiento", () => {
		expect(campoDeFrase("Dar seguimiento al uso de órdenes médicas")).toBe("seguimiento");
		expect(campoDeFrase("Volver en 15 días")).toBe("seguimiento");
		expect(campoDeFrase("Programar nueva visita la próxima semana")).toBe("seguimiento");
		expect(campoDeFrase("Mandar la lista de precios")).toBe("seguimiento");
	});

	// "Dar seguimiento a lo que pidió" es pendiente, no comentario: por eso el
	// seguimiento se revisa primero.
	test("una frase que suena a las dos gana el pendiente", () => {
		expect(campoDeFrase("Dar seguimiento a los precios que pidió")).toBe("seguimiento");
	});

	test("la primera frase suelta son actividades y las demás, observaciones", () => {
		expect(campoDeFrase("Consultorio nuevo en Plaza Caracol")).toBe("actividades");
		expect(campoDeFrase("Recibe representantes los miércoles", { yaHayActividades: true })).toBe(
			"observaciones",
		);
	});
});

describe("texto completo", () => {
	const dictado = [
		"Se presentaron los servicios de laboratorio e imagen y se dejaron órdenes.",
		"Mostró interés en el convenio y pidió precios de resonancia.",
		"Recibe representantes únicamente los miércoles.",
		"Dar seguimiento en 15 días.",
	].join(" ");

	test("reparte un dictado de corrido en sus columnas", () => {
		const partes = clasificarCaptura(dictado);
		expect(partes.actividades).toContain("Se presentaron los servicios");
		expect(partes.comentarios_medico).toContain("Mostró interés");
		expect(partes.observaciones).toContain("Recibe representantes");
		expect(partes.seguimiento).toContain("Dar seguimiento en 15 días");
	});

	test("también reparte cuando viene en renglones", () => {
		const partes = clasificarCaptura(dictado.split(". ").join("\n"));
		expect(partes.comentarios_medico).toContain("Mostró interés");
		expect(partes.seguimiento).toContain("Dar seguimiento");
	});

	test("varias frases de la misma columna se juntan", () => {
		const partes = clasificarCaptura("Se dejaron órdenes. Se presentó el paquete de laboratorio.");
		expect(partes.actividades).toBe("Se dejaron órdenes. Se presentó el paquete de laboratorio.");
		expect(partes.comentarios_medico).toBe("");
	});

	test("un texto vacío no inventa nada", () => {
		expect(clasificarCaptura("")).toEqual({
			actividades: "",
			comentarios_medico: "",
			observaciones: "",
			seguimiento: "",
			tipo_convenio: "",
		});
	});
});

describe("el convenio se reconoce dicho de paso", () => {
	test("toma el convenio nombrado en el texto", () => {
		expect(convenioDelTexto("Quedó en convenio mixto")).toBe("MIXTO");
		expect(convenioDelTexto("Trabaja por puntos")).toBe("PUNTOS");
		expect(convenioDelTexto("Aceptó descuento para pacientes")).toBe("Descuento para Pacientes");
	});

	test("sin convenio nombrado no se inventa uno", () => {
		expect(convenioDelTexto("Se dejaron órdenes")).toBe("");
	});
});

test("las frases se parten por renglón y por punto", () => {
	expect(partirEnFrases("Uno. Dos\nTres")).toEqual(["Uno.", "Dos", "Tres"]);
	expect(partirEnFrases("  ")).toEqual([]);
});
