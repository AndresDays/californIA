// Escribir de corrido y que cada cosa caiga en su columna, sin etiquetar nada.
// La clave es cómo está escrita cada frase: lo que ella hizo va en pasado y con
// "se" ("se presentaron los servicios"), lo que dijo el médico lleva al médico
// de sujeto ("mostró interés", "pidió precios"), lo que queda por hacer va en
// infinitivo ("dar seguimiento", "volver en 15 días"), y el resto es contexto.
//
// Es un reparto por palabras, no adivinación: se equivoca de vez en cuando, por
// eso la pantalla enseña dónde quedó cada frase antes de guardar.

const sinAcentos = (valor) =>
	String(valor || "")
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase();

// El orden es el del desempate: lo que suena a pendiente se revisa antes que lo
// que suena a comentario, porque "dar seguimiento a lo que pidió" es pendiente.
const REGLAS = [
	{
		campo: "seguimiento",
		patrones: [
			/\bdar seguimiento\b/, /\bdarle seguimiento\b/, /\bseguimiento\b.*\b(en|el|la proxima)\b/,
			/\b(volver|regresar|visitar|pasar)\b.*\b(en|el|la|proxim)/, /\bproxima (visita|semana|cita)\b/,
			/\b(mantener|programar|agendar|confirmar|llevar|enviar|mandar|entregar|traer|cotizar|hablar|llamar|recordar)\b/,
			/\bpendiente\b/, /\bqueda de\b/, /\bcompromiso\b/,
		],
	},
	{
		// Lo que se le explicó o se le hizo notar al médico es contexto de la
		// visita, no la visita misma: en su informe eso va en Observaciones.
		campo: "observaciones",
		patrones: [
			/\bse (informo|explico|reforzo|compartio|compartieron|logro|tuvo|noto|aclaro|detecto)\b/,
			/\bse le (explico|informo|compartieron|hizo saber)\b/,
			/\bquedo (claro|pendiente de su parte|una comunicacion)\b/,
			/\bla relacion (con el medico|es)\b/,
			/\bes un medico\b/, /\brecibe representantes\b/, /\bno fue posible\b/,
		],
	},
	{
		campo: "comentarios_medico",
		patrones: [
			/\b(mostro|manifesto|comento|menciono|dijo|pidio|solicito|pregunto|respondio|acepto|desconocia|agradecio|reconocio|expreso|le interesa|se intereso|quiere|prefiere|no estaba|no pudo)\b/,
			/\bel (doctor|medico)\b/, /\bla (doctora|medica)\b/,
		],
	},
	{
		campo: "actividades",
		patrones: [
			/\bse (presento|presentaron|entrego|entregaron|dejo|dejaron|realizo|realizaron|ofrecio|ofrecieron|hizo|hicieron|visito)\b/,
			/\b(presentacion|entrega|visita de|recorrido|capacitacion)\b/,
			/\bse le (entregaron|dejaron|presento|ofrecio)\b/,
		],
	},
];

// El convenio casi siempre se dicta como una palabra suelta.
const CONVENIOS = [
	{ patron: /\bmixto\b/, valor: "MIXTO" },
	{ patron: /\bpuntos\b/, valor: "PUNTOS" },
	{ patron: /\bdescuento (para )?(sus )?pacientes\b/, valor: "Descuento para Pacientes" },
	{ patron: /\bsin convenio\b/, valor: "N/A" },
	{ patron: /\bconvenio pendiente\b|\bpendiente de convenio\b/, valor: "PENDIENTE" },
];

// Se corta por renglones y por punto y seguido: así cada idea se clasifica
// sola, que es como las dicta.
export const partirEnFrases = (texto = "") =>
	String(texto ?? "")
		.split(/\r?\n|(?<=[.;])\s+/)
		.map((frase) => frase.trim())
		.filter(Boolean);

export const campoDeFrase = (frase, { yaHayActividades = false } = {}) => {
	const limpia = sinAcentos(frase);
	for (const { campo, patrones } of REGLAS) {
		if (patrones.some((patron) => patron.test(limpia))) return campo;
	}
	// Lo que no cae en ninguna: la primera frase es lo que se hizo, y de ahí en
	// adelante es contexto de la visita.
	return yaHayActividades ? "observaciones" : "actividades";
};

export const convenioDelTexto = (texto = "") => {
	const limpio = sinAcentos(texto);
	return CONVENIOS.find(({ patron }) => patron.test(limpio))?.valor ?? "";
};

export const clasificarCaptura = (texto = "") => {
	const partes = {
		actividades: "",
		comentarios_medico: "",
		observaciones: "",
		seguimiento: "",
		tipo_convenio: convenioDelTexto(texto),
	};
	for (const frase of partirEnFrases(texto)) {
		const campo = campoDeFrase(frase, { yaHayActividades: Boolean(partes.actividades) });
		partes[campo] = partes[campo] ? `${partes[campo]} ${frase}` : frase;
	}
	return partes;
};
