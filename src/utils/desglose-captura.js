// Parada en el consultorio no hay tiempo de ir saltando entre siete campos: se
// escribe todo de corrido, como lo va diciendo el médico, y cada cosa se marca
// con una etiqueta al principio del renglón. De ahí salen las columnas del
// informe semanal, que es lo que al final se entrega.

// Cada columna del informe con las palabras que ella usa para nombrarla. El
// orden importa: "comentarios del médico" se busca antes que "comentarios".
export const ETIQUETAS_CAPTURA = [
	{ campo: "actividades", etiqueta: "Actividades", alias: ["actividades", "actividad", "se hizo", "visita"] },
	{
		campo: "comentarios_medico",
		etiqueta: "Comentarios del médico",
		alias: ["comentarios del medico", "comentario del medico", "comentarios", "comentario", "dijo", "medico"],
	},
	{
		campo: "observaciones",
		etiqueta: "Observaciones",
		alias: ["observaciones", "observacion", "nota", "notas"],
	},
	{
		campo: "seguimiento",
		etiqueta: "Seguimiento",
		alias: ["seguimiento", "pendiente", "proxima accion", "siguiente"],
	},
	{ campo: "tipo_convenio", etiqueta: "Convenio", alias: ["convenio", "tipo de convenio"] },
];

const sinAcentos = (valor) =>
	String(valor || "")
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.trim();

// Se reconocen tanto "Actividades:" como "- actividades -" o "ACTIVIDADES -",
// porque nadie teclea igual dos veces con el celular en una mano.
const campoDelRenglon = (renglon) => {
	const limpio = sinAcentos(renglon).replace(/^[-*•\s]+/, "");
	const corte = limpio.search(/[:\-–]/);
	if (corte <= 0) return null;
	const posible = limpio.slice(0, corte).trim();
	for (const { campo, alias } of ETIQUETAS_CAPTURA) {
		if (alias.includes(posible)) {
			return { campo, resto: renglon.replace(/^[-*•\s]+/, "").slice(corte + 1).trim() };
		}
	}
	return null;
};

const VACIO = {
	actividades: "",
	comentarios_medico: "",
	observaciones: "",
	seguimiento: "",
	tipo_convenio: "",
};

// Lo que se escribe antes de la primera etiqueta son las actividades: es lo que
// se dicta primero y obligar a etiquetarlo sería estorbar de más.
export const desglosarCaptura = (texto = "") => {
	const partes = { ...VACIO };
	let actual = "actividades";
	for (const renglon of String(texto ?? "").split(/\r?\n/)) {
		const marca = campoDelRenglon(renglon);
		if (marca) {
			actual = marca.campo;
			if (marca.resto) {
				partes[actual] = partes[actual] ? `${partes[actual]}\n${marca.resto}` : marca.resto;
			}
			continue;
		}
		if (!renglon.trim()) continue;
		partes[actual] = partes[actual] ? `${partes[actual]}\n${renglon.trim()}` : renglon.trim();
	}
	return partes;
};

// El camino de vuelta: al reabrir una visita capturada por campos se arma el
// texto con sus etiquetas, para poder seguir escribiendo de corrido.
export const componerCaptura = (visita = {}) =>
	ETIQUETAS_CAPTURA.filter(({ campo }) => String(visita[campo] || "").trim())
		.map(({ campo, etiqueta }) => `${etiqueta}: ${String(visita[campo]).trim()}`)
		.join("\n");
