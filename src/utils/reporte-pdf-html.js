// El reporte se guarda como HTML desde el editor del radiólogo (negritas,
// títulos, alineación, listas...). Para el PDF se traduce ese marcado a
// bloques con tramos de texto y se dibuja con jsPDF, que sólo sabe escribir
// cadenas: así la hoja impresa conserva el formato que se ve en el visor.

const BLOQUES = new Set([
	"P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "TR", "SECTION", "ARTICLE",
	"BLOCKQUOTE", "PRE", "TD", "TH",
]);

const ESCALA_TITULOS = { H1: 1.45, H2: 1.28, H3: 1.15, H4: 1.08, H5: 1, H6: 1 };

const A_PIXELES = { px: 1, pt: 96 / 72, pc: 16, cm: 96 / 2.54, mm: 96 / 25.4, in: 96, em: 16, rem: 16 };
const TAMANO_BASE_PX = 16;
const ESCALA_MINIMA = 0.75;
const ESCALA_MAXIMA = 1.6;

const leerEstilo = (elemento) => {
	const estilo = String(elemento.getAttribute?.("style") || "").toLowerCase();
	const valor = (propiedad) =>
		new RegExp(`(?:^|;)\\s*${propiedad}\\s*:\\s*([^;]+)`, "i").exec(estilo)?.[1]?.trim() || "";
	return { valor };
};

const escalaDeFuente = (valorFuente) => {
	const encontrado = /^(-?[\d.]+)\s*(px|pt|pc|cm|mm|in|em|rem)?$/.exec(String(valorFuente).trim());
	if (!encontrado) return null;
	const unidad = (encontrado[2] || "px").toLowerCase();
	const enPixeles = parseFloat(encontrado[1]) * (A_PIXELES[unidad] ?? 1);
	if (!enPixeles) return null;
	const escala = enPixeles / TAMANO_BASE_PX;
	return Math.min(ESCALA_MAXIMA, Math.max(ESCALA_MINIMA, escala));
};

const ALINEACIONES = new Set(["left", "center", "right", "justify"]);

const heredarFormato = (nodo, formato) => {
	const etiqueta = nodo.tagName;
	const siguiente = { ...formato };
	if (etiqueta === "B" || etiqueta === "STRONG") siguiente.negrita = true;
	if (etiqueta === "I" || etiqueta === "EM") siguiente.cursiva = true;
	if (etiqueta === "U") siguiente.subrayado = true;
	if (ESCALA_TITULOS[etiqueta]) {
		siguiente.negrita = true;
		siguiente.escala = ESCALA_TITULOS[etiqueta];
	}

	const { valor } = leerEstilo(nodo);
	const peso = valor("font-weight");
	if (peso) siguiente.negrita = peso === "bold" || peso === "bolder" || Number(peso) >= 600;
	const estiloFuente = valor("font-style");
	if (estiloFuente) siguiente.cursiva = estiloFuente.includes("italic") || estiloFuente.includes("oblique");
	const decoracion = valor("text-decoration") || valor("text-decoration-line");
	if (decoracion) siguiente.subrayado = decoracion.includes("underline");
	const tamano = valor("font-size");
	if (tamano) siguiente.escala = escalaDeFuente(tamano) ?? siguiente.escala;
	const alineacion = valor("text-align");
	if (ALINEACIONES.has(alineacion)) siguiente.alineacion = alineacion;
	if (nodo.getAttribute?.("align") && ALINEACIONES.has(nodo.getAttribute("align").toLowerCase())) {
		siguiente.alineacion = nodo.getAttribute("align").toLowerCase();
	}
	return siguiente;
};

const limpiarTexto = (texto) => String(texto).replace(/\u00a0/g, " ").replace(/\s+/g, " ");

const FORMATO_INICIAL = { negrita: false, cursiva: false, subrayado: false, escala: 1, alineacion: "left" };

export const crearBloquesPdfDesdeHtml = (html) => {
	if (typeof document === "undefined") return [];
	const contenedor = document.createElement("div");
	contenedor.innerHTML = String(html || "");

	const bloques = [];
	let actual = null;

	const abrirBloque = (formato, sangria = 0, vinieta = "") => {
		actual = { alineacion: formato.alineacion, sangria, vinieta, tramos: [] };
		bloques.push(actual);
	};
	const cerrarBloque = () => {
		actual = null;
	};

	const agregarTexto = (texto, formato) => {
		if (!texto) return;
		if (!actual) abrirBloque(formato);
		const ultimo = actual.tramos[actual.tramos.length - 1];
		if (
			ultimo &&
			ultimo.negrita === formato.negrita &&
			ultimo.cursiva === formato.cursiva &&
			ultimo.subrayado === formato.subrayado &&
			ultimo.escala === formato.escala
		) {
			ultimo.texto += texto;
			return;
		}
		actual.tramos.push({
			texto,
			negrita: formato.negrita,
			cursiva: formato.cursiva,
			subrayado: formato.subrayado,
			escala: formato.escala,
		});
	};

	const recorrer = (nodo, formato, sangria, contadorLista) => {
		nodo.childNodes.forEach((hijo) => {
			if (hijo.nodeType === 3) {
				agregarTexto(limpiarTexto(hijo.textContent), formato);
				return;
			}
			if (hijo.nodeType !== 1) return;

			const etiqueta = hijo.tagName;
			if (etiqueta === "BR") {
				if (!actual) abrirBloque(formato, sangria);
				cerrarBloque();
				abrirBloque(formato, sangria);
				return;
			}
			if (etiqueta === "SCRIPT" || etiqueta === "STYLE") return;

			const formatoHijo = heredarFormato(hijo, formato);

			if (etiqueta === "UL" || etiqueta === "OL") {
				cerrarBloque();
				const ordenada = etiqueta === "OL";
				let indice = 0;
				Array.from(hijo.children).forEach((item) => {
					if (item.tagName !== "LI") return;
					indice += 1;
					abrirBloque(heredarFormato(item, formatoHijo), sangria + 1, ordenada ? `${indice}.` : "•");
					recorrer(item, heredarFormato(item, formatoHijo), sangria + 1, null);
					cerrarBloque();
				});
				return;
			}

			if (BLOQUES.has(etiqueta)) {
				cerrarBloque();
				abrirBloque(formatoHijo, sangria);
				recorrer(hijo, formatoHijo, sangria, contadorLista);
				cerrarBloque();
				return;
			}

			recorrer(hijo, formatoHijo, sangria, contadorLista);
		});
	};

	recorrer(contenedor, FORMATO_INICIAL, 0, null);

	return bloques
		.map((bloque) => ({
			...bloque,
			tramos: bloque.tramos.filter((tramo) => tramo.texto !== ""),
		}))
		.filter((bloque, indice, lista) => {
			const vacio = bloque.tramos.every((tramo) => !tramo.texto.trim());
			// Un bloque vacío es un renglón en blanco del reporte; sólo se
			// descartan los del principio y los repetidos al final.
			if (!vacio) return true;
			if (indice === 0) return false;
			return lista.slice(indice + 1).some((siguiente) => siguiente.tramos.some((tramo) => tramo.texto.trim()));
		});
};

const anchoTexto = (doc, texto, tramo, tamanoBase) => {
	doc.setFont("helvetica", tramo.negrita ? (tramo.cursiva ? "bolditalic" : "bold") : tramo.cursiva ? "italic" : "normal");
	doc.setFontSize(tamanoBase * tramo.escala);
	return doc.getTextWidth(texto);
};

// Reparte los tramos del bloque en renglones que quepan en el ancho útil.
const dividirEnRenglones = (doc, bloque, ancho, tamanoBase) => {
	const renglones = [];
	let renglon = [];
	let usado = 0;

	bloque.tramos.forEach((tramo) => {
		const partes = tramo.texto.split(" ").filter((parte, indice, lista) => parte !== "" || indice === lista.length - 1);
		partes.forEach((palabra, indice) => {
			if (!palabra) return;
			const conEspacio = indice > 0 || renglon.length > 0;
			const anchoPalabra = anchoTexto(doc, palabra, tramo, tamanoBase);
			const anchoEspacio = conEspacio ? anchoTexto(doc, " ", tramo, tamanoBase) : 0;
			if (renglon.length && usado + anchoEspacio + anchoPalabra > ancho) {
				renglones.push(renglon);
				renglon = [{ texto: palabra, tramo, ancho: anchoPalabra }];
				usado = anchoPalabra;
				return;
			}
			renglon.push({ texto: palabra, tramo, ancho: anchoPalabra, espacio: anchoEspacio });
			usado += anchoEspacio + anchoPalabra;
		});
	});

	if (renglon.length) renglones.push(renglon);
	return renglones.length ? renglones : [[]];
};

const escalaMaxima = (renglon) => renglon.reduce((maxima, palabra) => Math.max(maxima, palabra.tramo.escala), 1);

export const dibujarHtmlEnPdf = (doc, html, {
	x = 20,
	y = 40,
	ancho = 170,
	limiteInferior = 260,
	tamanoBase = 10,
	interlineado = 4.9,
	sangria = 6,
	nuevaPagina = () => y,
} = {}) => {
	const bloques = crearBloquesPdfDesdeHtml(html);
	let cursor = y;

	bloques.forEach((bloque) => {
		const margenIzquierdo = x + bloque.sangria * sangria;
		const anchoBloque = ancho - bloque.sangria * sangria;
		const renglones = dividirEnRenglones(doc, bloque, anchoBloque, tamanoBase);

		renglones.forEach((renglon, indiceRenglon) => {
			const alto = interlineado * escalaMaxima(renglon);
			if (cursor + alto > limiteInferior) cursor = nuevaPagina();

			if (!renglon.length) {
				cursor += alto;
				return;
			}

			const anchoRenglon = renglon.reduce(
				(total, palabra, indice) => total + palabra.ancho + (indice ? palabra.espacio || 0 : 0),
				0,
			);
			const esUltimo = indiceRenglon === renglones.length - 1;
			let posicion = margenIzquierdo;
			let espacioExtra = 0;
			if (bloque.alineacion === "center") posicion += (anchoBloque - anchoRenglon) / 2;
			else if (bloque.alineacion === "right") posicion += anchoBloque - anchoRenglon;
			else if (bloque.alineacion === "justify" && !esUltimo && renglon.length > 1) {
				espacioExtra = (anchoBloque - anchoRenglon) / (renglon.length - 1);
			}

			if (indiceRenglon === 0 && bloque.vinieta) {
				doc.setFont("helvetica", "normal");
				doc.setFontSize(tamanoBase);
				doc.text(bloque.vinieta, margenIzquierdo - sangria, cursor);
			}

			renglon.forEach((palabra, indice) => {
				if (indice) posicion += (palabra.espacio || 0) + espacioExtra;
				const { tramo } = palabra;
				doc.setFont(
					"helvetica",
					tramo.negrita ? (tramo.cursiva ? "bolditalic" : "bold") : tramo.cursiva ? "italic" : "normal",
				);
				doc.setFontSize(tamanoBase * tramo.escala);
				doc.text(palabra.texto, posicion, cursor);
				if (tramo.subrayado) doc.line(posicion, cursor + 0.7, posicion + palabra.ancho, cursor + 0.7);
				posicion += palabra.ancho;
			});

			cursor += alto;
		});
	});

	return cursor;
};
