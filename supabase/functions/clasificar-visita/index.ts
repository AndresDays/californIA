// Reparte el dictado de una visita en las columnas del informe semanal.
//
// El reparto por palabras que vive en la aplicación (clasificar-captura.js)
// acierta en lo típico y se equivoca en cuanto la frase se sale del molde. Esta
// función se lo pasa a Claude Haiku, que entiende el matiz —"no fue posible
// abordarlo", "quedó de mandarme la base de datos"—, y devuelve lo mismo que el
// reparto local: un objeto con las cinco columnas. Además lo redacta como va en
// el informe —tercera persona, ortografía corregida, sin muletillas—, porque lo
// que ella teclea entre consultorios va en taquigrafía y el informe lo lee su
// jefe. Redactar es reescribir lo dictado, nunca agregarle nada. Si falla, la
// aplicación cae al reparto local, que reparte sin redactar, y nadie se queda
// sin guardar.
//
// La llave de la API vive aquí, en el servidor: nunca viaja al navegador.
import Anthropic from "npm:@anthropic-ai/sdk@0.127.0";

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Content-Type": "application/json",
};

const responder = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: CORS_HEADERS });

// El dictado de una visita son unas cuantas líneas; más que esto es que algo
// se pegó por error, y no hay por qué pagarlo.
const LIMITE_CARACTERES = 4000;

const COLUMNAS = ["actividades", "comentarios_medico", "observaciones", "seguimiento", "tipo_convenio"];

// La misma forma que devuelve el reparto local, para que la aplicación no tenga
// que distinguir de dónde vino.
const ESQUEMA = {
	type: "json_schema",
	schema: {
		type: "object",
		properties: Object.fromEntries(COLUMNAS.map((columna) => [columna, { type: "string" }])),
		additionalProperties: false,
		required: COLUMNAS,
	},
};

// Las reglas son las de su informe real: se escribieron leyendo cómo clasifica
// ella misma sus visitas, no cómo se clasificarían "en general".
const INSTRUCCIONES = `Eres quien captura el informe semanal de una representante médica en México.
Recibes lo que ella dictó de una visita a un médico, escrito de corrido y con prisa, y devuelves ese contenido repartido en las cinco columnas de su informe y redactado como va en un informe de trabajo.

Columnas:
- actividades: lo que ella hizo en la visita. "Se presentaron los servicios", "se dejaron órdenes", "visita de seguimiento", "entrega de material".
- comentarios_medico: lo que el médico dijo, pidió, preguntó o mostró. "Mostró interés", "pidió precios de resonancia", "desconocía el convenio", "no estaba".
- observaciones: el contexto de la visita y lo que ella le explicó o hizo notar. "Se le explicó el esquema de comisiones", "recibe representantes los miércoles", "es un médico estricto", "no fue posible abordarlo".
- seguimiento: lo que queda por hacer después de la visita, en infinitivo. "Dar seguimiento en 15 días", "mandar la lista de precios", "programar nueva visita".
- tipo_convenio: sólo si el dictado nombra el convenio. Usa exactamente una de: MIXTO, PUNTOS, N/A, PENDIENTE, Descuento para Pacientes. Si no lo nombra, cadena vacía.

Cómo repartir:
- Una idea va completa a una sola columna; no la partas ni la repitas en dos.
- Si una frase menciona lo que el médico pidió Y lo que hay que hacer, la parte del pendiente va en seguimiento.
- Columna sin contenido: cadena vacía.
- Si el dictado trae una etiqueta escrita a mano ("Seguimiento: ..."), respétala: ese contenido va a esa columna.

Cómo redactar:
- Escribe en tercera persona y en pasado lo que ya ocurrió; el seguimiento en infinitivo.
- Ella dicta en primera persona ("pasé", "dejé", "le expliqué"); pásalo a la forma impersonal del informe ("se acudió", "se dejaron", "se le explicó").
- Corrige ortografía, acentos y puntuación. Frases completas que empiecen con mayúscula y terminen con punto.
- Quita muletillas y repeticiones, ordena la idea, y usa el término correcto cuando ella lo abrevió ("resos" -> "resonancias magnéticas", "labs" -> "estudios de laboratorio").
- Mantén el tono sobrio de un informe: sin adornos, sin adjetivos que ella no dijo, sin interpretar intenciones.
- No alargues el texto. Redactar mejor no es escribir más: el resultado debe quedar igual de corto que el dictado o más corto. Si una frase ya está bien dicha, déjala casi igual —sólo corrígela— en vez de reescribirla larga.
- Nada de relleno: sin frases de enlace ("cabe mencionar que", "es importante señalar"), sin repetir el contexto en cada columna, sin cerrar con conclusiones.

Lo que NO debes hacer nunca:
- No agregues hechos que no estén en el dictado: ni cifras, ni nombres, ni fechas, ni servicios, ni conclusiones.
- No quites información: todo lo que dictó tiene que aparecer en alguna columna.
- No cambies el sentido ni suavices lo negativo. Si el médico se mostró molesto, el informe dice que se mostró molesto.
- No inventes el convenio: si no lo nombró, va vacío.`

const EJEMPLOS = [
	{
		role: "user" as const,
		content:
			"pase a presentarle la clinica y sus servicios, le deje 25 ordenes. mostro apertura y acepto trabajar con descuentos para sus pacientes, me pidio precios de resos de rodilla. es un medico muy estricto para recibir representantes, nomas los miercoles. hay que mantener contacto y darle seguimiento al uso de las ordenes. quedo en mixto",
	},
	{
		role: "assistant" as const,
		content: JSON.stringify({
			actividades:
				"Se presentó Clínica California y sus servicios. Se entregaron 25 órdenes médicas.",
			comentarios_medico:
				"Mostró apertura y aceptó trabajar con descuentos para sus pacientes. Solicitó precios de resonancias magnéticas de rodilla.",
			observaciones:
				"Es un médico estricto para recibir representantes: únicamente atiende los miércoles.",
			seguimiento: "Mantener contacto y dar seguimiento al uso de las órdenes médicas.",
			tipo_convenio: "MIXTO",
		}),
	},
];

Deno.serve(async (req) => {
	if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
	if (req.method !== "POST") return responder({ error: "Método no permitido" }, 405);

	const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
	// Sin llave la función no improvisa: contesta que no está configurada y la
	// aplicación se queda con su reparto local.
	if (!apiKey) return responder({ error: "Clasificación por IA no configurada" }, 503);

	const body = await req.json().catch(() => null);
	const texto = String(body?.texto || "").trim();
	if (!texto) return responder({ error: "No hay texto que repartir" }, 400);
	if (texto.length > LIMITE_CARACTERES) {
		return responder({ error: "El dictado es demasiado largo" }, 413);
	}

	const anthropic = new Anthropic({ apiKey });

	try {
		const respuesta = await anthropic.messages.create({
			model: "claude-haiku-4-5",
			max_tokens: 2000,
			system: INSTRUCCIONES,
			// El ejemplo enseña el reparto y el estilo de redacción mejor que
			// cualquier regla añadida a las instrucciones.
			messages: [...EJEMPLOS, { role: "user", content: texto }],
			output_config: { format: ESQUEMA },
		});

		// Si la respuesta se cortó, el JSON viene a medias: mejor que la
		// aplicación use su reparto local que guardar una visita incompleta.
		if (respuesta.stop_reason === "max_tokens") {
			return responder({ error: "El dictado no cupo en una respuesta" }, 422);
		}

		const textoRespuesta = respuesta.content
			.filter((bloque) => bloque.type === "text")
			.map((bloque) => (bloque as { text: string }).text)
			.join("");

		const desglose = JSON.parse(textoRespuesta);
		return responder({
			desglose: Object.fromEntries(
				COLUMNAS.map((columna) => [columna, String(desglose?.[columna] ?? "").trim()]),
			),
			// Sirve para ver en los registros cuánto cuesta de verdad.
			uso: {
				entrada: respuesta.usage?.input_tokens ?? 0,
				salida: respuesta.usage?.output_tokens ?? 0,
			},
		});
	} catch (fallo) {
		return responder({ error: (fallo as Error).message || "No se pudo repartir el dictado" }, 502);
	}
});
