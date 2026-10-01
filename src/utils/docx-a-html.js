import JSZip from "jszip";

// Convierte el cuerpo de un .docx a HTML con estilos en línea, para que el
// texto llegue al editor del reporte con el formato que trae el Word: fuentes,
// tamaños, negritas, colores, alineación, sangrías, espaciado, listas, tablas
// e imágenes. Encabezados y pies de página no se copian (ahí vive el membrete).

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const WP = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
const V = "urn:schemas-microsoft-com:vml";

const hijos = (nodo, nombre) =>
	Array.from(nodo?.childNodes || []).filter(
		(hijo) => hijo.nodeType === 1 && hijo.namespaceURI === W && (!nombre || hijo.localName === nombre),
	);
const hijo = (nodo, nombre) => hijos(nodo, nombre)[0] || null;
const attr = (nodo, nombre) => (nodo ? nodo.getAttributeNS(W, nombre) || nodo.getAttribute(`w:${nombre}`) || null : null);
const val = (nodo, nombre) => attr(hijo(nodo, nombre), "val");
const numero = (valor) => (valor == null || valor === "" ? null : Number(valor));
// Las propiedades booleanas de Word (<w:b/>, <w:b w:val="0"/>) se activan sin valor.
const bandera = (nodo, nombre) => {
	const elemento = hijo(nodo, nombre);
	if (!elemento) return undefined;
	const valor = attr(elemento, "val");
	return !(valor === "0" || valor === "false" || valor === "none");
};

const twipsAPt = (twips) => `${+(twips / 20).toFixed(2)}pt`;

const escapar = (texto) =>
	String(texto).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const sinIndefinidos = (objeto) =>
	Object.fromEntries(Object.entries(objeto).filter(([, valor]) => valor !== undefined && valor !== null));

const COLORES_RESALTADO = {
	yellow: "#ffff00", green: "#00ff00", cyan: "#00ffff", magenta: "#ff00ff", blue: "#0000ff",
	red: "#ff0000", darkBlue: "#000080", darkCyan: "#008080", darkGreen: "#008000",
	darkMagenta: "#800080", darkRed: "#800000", darkYellow: "#808000", darkGray: "#808080",
	lightGray: "#c0c0c0", black: "#000000", white: "#ffffff",
};

const leerPropiedadesTexto = (rPr, temas) => {
	if (!rPr) return {};
	const fuentes = hijo(rPr, "rFonts");
	let fuente = attr(fuentes, "ascii") || attr(fuentes, "hAnsi");
	if (!fuente) {
		const tema = attr(fuentes, "asciiTheme") || attr(fuentes, "hAnsiTheme");
		if (tema) fuente = tema.startsWith("major") ? temas.mayor : temas.menor;
	}
	const subrayado = val(rPr, "u");
	const color = val(rPr, "color");
	const sombreado = attr(hijo(rPr, "shd"), "fill");
	return sinIndefinidos({
		negrita: bandera(rPr, "b"),
		cursiva: bandera(rPr, "i"),
		subrayado: hijo(rPr, "u") ? subrayado !== "none" : undefined,
		tachado: bandera(rPr, "strike") ?? bandera(rPr, "dstrike"),
		mayusculas: bandera(rPr, "caps"),
		versalitas: bandera(rPr, "smallCaps"),
		oculto: bandera(rPr, "vanish"),
		tamano: numero(val(rPr, "sz")),
		fuente: fuente || undefined,
		color: color && color !== "auto" ? `#${color}` : undefined,
		resaltado: COLORES_RESALTADO[val(rPr, "highlight")] ||
			(sombreado && sombreado !== "auto" ? `#${sombreado}` : undefined),
		posicion: val(rPr, "vertAlign") || undefined,
	});
};

const leerPropiedadesParrafo = (pPr) => {
	if (!pPr) return {};
	const sangria = hijo(pPr, "ind");
	const espacio = hijo(pPr, "spacing");
	const lista = hijo(pPr, "numPr");
	const sombreado = attr(hijo(pPr, "shd"), "fill");
	return sinIndefinidos({
		alineacion: val(pPr, "jc") || undefined,
		izquierda: numero(attr(sangria, "left") ?? attr(sangria, "start")),
		derecha: numero(attr(sangria, "right") ?? attr(sangria, "end")),
		primeraLinea: numero(attr(sangria, "firstLine")),
		francesa: numero(attr(sangria, "hanging")),
		antes: numero(attr(espacio, "before")),
		despues: numero(attr(espacio, "after")),
		interlineado: numero(attr(espacio, "line")),
		reglaInterlineado: attr(espacio, "lineRule") || undefined,
		contextual: bandera(pPr, "contextualSpacing"),
		idLista: lista ? val(lista, "numId") : undefined,
		nivelLista: lista ? numero(val(lista, "ilvl")) ?? 0 : undefined,
		fondo: sombreado && sombreado !== "auto" ? `#${sombreado}` : undefined,
	});
};

const leerEstilos = (xml, temas) => {
	const estilos = {};
	const predeterminados = { parrafo: {}, texto: {}, idParrafo: null };
	if (!xml) return { estilos, predeterminados };
	const raiz = xml.documentElement;
	const docDefaults = hijo(raiz, "docDefaults");
	predeterminados.texto = leerPropiedadesTexto(hijo(hijo(docDefaults, "rPrDefault"), "rPr"), temas);
	predeterminados.parrafo = leerPropiedadesParrafo(hijo(hijo(docDefaults, "pPrDefault"), "pPr"));
	hijos(raiz, "style").forEach((estilo) => {
		const id = attr(estilo, "styleId");
		estilos[id] = {
			tipo: attr(estilo, "type"),
			base: val(estilo, "basedOn"),
			parrafo: leerPropiedadesParrafo(hijo(estilo, "pPr")),
			texto: leerPropiedadesTexto(hijo(estilo, "rPr"), temas),
			bordesTabla: hijo(hijo(estilo, "tblPr"), "tblBorders"),
		};
		if (attr(estilo, "type") === "paragraph" && ["1", "true"].includes(attr(estilo, "default"))) {
			predeterminados.idParrafo = id;
		}
	});
	return { estilos, predeterminados };
};

// Los estilos heredan de su "basedOn"; se resuelven del más general al más específico.
const resolverEstilo = (estilos, id, clave, visitados = new Set()) => {
	const estilo = estilos[id];
	if (!estilo || visitados.has(id)) return {};
	visitados.add(id);
	return { ...resolverEstilo(estilos, estilo.base, clave, visitados), ...estilo[clave] };
};

const leerNumeracion = (xml) => {
	const abstractos = {};
	const listas = {};
	if (!xml) return { abstractos, listas };
	const raiz = xml.documentElement;
	hijos(raiz, "abstractNum").forEach((abstracto) => {
		const niveles = {};
		hijos(abstracto, "lvl").forEach((nivel) => {
			niveles[numero(attr(nivel, "ilvl"))] = {
				formato: val(nivel, "numFmt") || "decimal",
				texto: val(nivel, "lvlText") ?? "",
				inicio: numero(val(nivel, "start")) ?? 1,
				parrafo: leerPropiedadesParrafo(hijo(nivel, "pPr")),
				textoProps: leerPropiedadesTexto(hijo(nivel, "rPr"), {}),
			};
		});
		abstractos[attr(abstracto, "abstractNumId")] = niveles;
	});
	hijos(raiz, "num").forEach((lista) => {
		const reinicios = {};
		hijos(lista, "lvlOverride").forEach((cambio) => {
			const inicio = numero(val(cambio, "startOverride"));
			if (inicio != null) reinicios[numero(attr(cambio, "ilvl"))] = inicio;
		});
		listas[attr(lista, "numId")] = { abstracto: val(lista, "abstractNumId"), reinicios };
	});
	return { abstractos, listas };
};

const aRomano = (valor) => {
	const tabla = [[1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"],
		[50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]];
	let resto = valor;
	return tabla.reduce((texto, [cantidad, letra]) => {
		while (resto >= cantidad) {
			texto += letra;
			resto -= cantidad;
		}
		return texto;
	}, "");
};

const aLetra = (valor) => {
	let texto = "";
	let resto = valor;
	while (resto > 0) {
		resto -= 1;
		texto = String.fromCharCode(97 + (resto % 26)) + texto;
		resto = Math.floor(resto / 26);
	}
	return texto;
};

const formatearNumero = (valor, formato) => {
	switch (formato) {
		case "lowerLetter": return aLetra(valor);
		case "upperLetter": return aLetra(valor).toUpperCase();
		case "lowerRoman": return aRomano(valor);
		case "upperRoman": return aRomano(valor).toUpperCase();
		case "decimalZero": return String(valor).padStart(2, "0");
		default: return String(valor);
	}
};

// Las viñetas de Word usan caracteres de las fuentes Symbol/Wingdings
// (área privada de Unicode) que no existen en el navegador.
const VINETAS = { "": "•", "": "▪", "": "➢", "": "✓", "": "❖", o: "◦" };
const vineta = (texto) => {
	if (VINETAS[texto]) return VINETAS[texto];
	if (!texto || /[-]/.test(texto)) return "•";
	return texto;
};

const estiloTexto = (props) => {
	const reglas = [];
	if (props.fuente) reglas.push(`font-family:'${props.fuente.replace(/'/g, "")}'`);
	if (props.tamano) reglas.push(`font-size:${props.tamano / 2}pt`);
	if (props.negrita) reglas.push("font-weight:bold");
	if (props.cursiva) reglas.push("font-style:italic");
	const decoraciones = [props.subrayado && "underline", props.tachado && "line-through"].filter(Boolean);
	if (decoraciones.length) reglas.push(`text-decoration:${decoraciones.join(" ")}`);
	if (props.mayusculas) reglas.push("text-transform:uppercase");
	if (props.versalitas) reglas.push("font-variant:small-caps");
	if (props.color) reglas.push(`color:${props.color}`);
	if (props.resaltado) reglas.push(`background-color:${props.resaltado}`);
	if (props.posicion === "superscript") reglas.push("vertical-align:super;font-size:smaller");
	if (props.posicion === "subscript") reglas.push("vertical-align:sub;font-size:smaller");
	return reglas.join(";");
};

const ALINEACIONES = { center: "center", right: "right", end: "right", both: "justify", distribute: "justify" };

const estiloParrafo = (props, { sinAntes, sinDespues }) => {
	const reglas = [];
	reglas.push(`margin:${twipsAPt(sinAntes ? 0 : props.antes ?? 0)} ${twipsAPt(props.derecha ?? 0)} ${twipsAPt(sinDespues ? 0 : props.despues ?? 0)} ${twipsAPt(props.izquierda ?? 0)}`);
	if (props.francesa) reglas.push(`text-indent:-${twipsAPt(props.francesa)}`);
	else if (props.primeraLinea) reglas.push(`text-indent:${twipsAPt(props.primeraLinea)}`);
	if (ALINEACIONES[props.alineacion]) reglas.push(`text-align:${ALINEACIONES[props.alineacion]}`);
	if (props.interlineado) {
		reglas.push(
			!props.reglaInterlineado || props.reglaInterlineado === "auto"
				? `line-height:${+(props.interlineado / 240).toFixed(3)}`
				: `line-height:${twipsAPt(props.interlineado)}`,
		);
	}
	if (props.fondo) reglas.push(`background-color:${props.fondo}`);
	return reglas.join(";");
};

const crearConvertidor = ({ estilos, predeterminados, numeracion, imagenes, temas }) => {
	const contadores = {};

	const propsParrafo = (p) => {
		const pPr = hijo(p, "pPr");
		const idEstilo = val(pPr, "pStyle") || predeterminados.idParrafo;
		const directas = leerPropiedadesParrafo(pPr);
		let props = { ...predeterminados.parrafo, ...resolverEstilo(estilos, idEstilo, "parrafo"), ...directas };
		let lista = null;
		if (props.idLista && props.idLista !== "0") {
			const definicion = numeracion.listas[props.idLista];
			const nivel = definicion && numeracion.abstractos[definicion.abstracto]?.[props.nivelLista];
			if (nivel) {
				lista = { definicion, nivel, id: props.idLista, ilvl: props.nivelLista };
				// La sangría del nivel de lista aplica salvo que el párrafo traiga la suya.
				props = { ...predeterminados.parrafo, ...resolverEstilo(estilos, idEstilo, "parrafo"), ...nivel.parrafo, ...directas };
			}
		}
		const texto = { ...predeterminados.texto, ...resolverEstilo(estilos, idEstilo, "texto") };
		return { idEstilo, props, texto, lista };
	};

	const marcadorLista = ({ definicion, nivel, id, ilvl }, textoParrafo) => {
		const actuales = (contadores[id] ||= {});
		const niveles = numeracion.abstractos[definicion.abstracto];
		const inicioDe = (n) => definicion.reinicios[n] ?? niveles[n]?.inicio ?? 1;
		actuales[ilvl] = actuales[ilvl] == null ? inicioDe(ilvl) : actuales[ilvl] + 1;
		Object.keys(actuales).forEach((n) => {
			if (Number(n) > ilvl) delete actuales[n];
		});
		const etiqueta = nivel.formato === "bullet"
			? vineta(nivel.texto)
			: nivel.formato === "none"
				? ""
				: nivel.texto.replace(/%(\d)/g, (_, n) => {
					const indice = Number(n) - 1;
					return formatearNumero(actuales[indice] ?? inicioDe(indice), niveles[indice]?.formato);
				});
		const propsMarcador = { ...textoParrafo, ...nivel.textoProps, subrayado: false };
		if (nivel.formato === "bullet") delete propsMarcador.fuente;
		return `<span style="${estiloTexto(propsMarcador)};display:inline-block;min-width:18pt;text-indent:0">${escapar(etiqueta)}</span>`;
	};

	const convertirImagen = (nodo) => {
		const blip = nodo.getElementsByTagNameNS(A, "blip")[0];
		const idRelacion = blip?.getAttributeNS(R, "embed") || nodo.getElementsByTagNameNS(V, "imagedata")[0]?.getAttributeNS(R, "id");
		const src = imagenes[idRelacion];
		if (!src) return "";
		const extension = nodo.getElementsByTagNameNS(WP, "extent")[0];
		const ancho = Number(extension?.getAttribute("cx")) / 9525;
		const alto = Number(extension?.getAttribute("cy")) / 9525;
		const medidas = ancho && alto ? `width:${Math.round(ancho)}px;height:${Math.round(alto)}px;` : "";
		return `<img src="${src}" alt="" style="${medidas}max-width:100%">`;
	};

	const convertirRun = (r, textoParrafo) => {
		const props = {
			...textoParrafo,
			...resolverEstilo(estilos, val(hijo(r, "rPr"), "rStyle"), "texto"),
			...leerPropiedadesTexto(hijo(r, "rPr"), temas),
		};
		if (props.oculto) return [];
		const piezas = [];
		Array.from(r.childNodes).forEach((nodo) => {
			if (nodo.nodeType !== 1) return;
			const nombre = nodo.localName;
			if (nodo.namespaceURI === W && nombre === "t") piezas.push({ props, html: escapar(nodo.textContent) });
			else if (nombre === "tab") piezas.push({ props, html: '<span style="display:inline-block;width:36pt"></span>' });
			else if (nombre === "br" || nombre === "cr") {
				if (attr(nodo, "type") !== "page") piezas.push({ props, html: "<br>" });
			} else if (nombre === "noBreakHyphen") piezas.push({ props, html: "&#8209;" });
			else if (nombre === "drawing" || nombre === "pict") piezas.push({ props: {}, html: convertirImagen(nodo) });
		});
		return piezas;
	};

	// Hipervínculos, campos, controles de contenido y cambios marcados envuelven runs.
	const runsDe = (contenedor, textoParrafo) =>
		hijos(contenedor).flatMap((nodo) => {
			if (nodo.localName === "r") return convertirRun(nodo, textoParrafo);
			if (["hyperlink", "smartTag", "ins", "fldSimple", "customXml"].includes(nodo.localName)) return runsDe(nodo, textoParrafo);
			if (nodo.localName === "sdt") return runsDe(hijo(nodo, "sdtContent"), textoParrafo);
			return [];
		});

	const convertirParrafo = (p, anterior, siguiente) => {
		const { idEstilo, props, texto, lista } = propsParrafo(p);
		const mismoEstilo = (otro) => otro?.localName === "p" && propsParrafo(otro).idEstilo === idEstilo;
		const estilo = estiloParrafo(props, {
			sinAntes: props.contextual && mismoEstilo(anterior),
			sinDespues: props.contextual && mismoEstilo(siguiente),
		});
		// Se agrupan los runs contiguos con el mismo formato para no inflar el HTML.
		const grupos = [];
		runsDe(p, texto).forEach(({ props: propsRun, html }) => {
			const css = estiloTexto(propsRun);
			const ultimo = grupos.at(-1);
			if (ultimo && ultimo.css === css) ultimo.html += html;
			else grupos.push({ css, html });
		});
		const contenido = grupos.map(({ css, html }) => (css ? `<span style="${css}">${html}</span>` : html)).join("");
		const marcador = lista ? marcadorLista(lista, texto) : "";
		const vacio = !contenido.replace(/<span[^>]*><\/span>/g, "");
		// Un párrafo vacío conserva su altura con la fuente que tiene en Word.
		const relleno = vacio ? `<span style="${estiloTexto(texto)}"><br></span>` : "";
		return `<p style="${estilo}">${marcador}${contenido}${relleno}</p>`;
	};

	const bordeCss = (borde) => {
		const tipo = attr(borde, "val");
		if (!borde || !tipo || ["nil", "none"].includes(tipo)) return null;
		const grosor = Math.max(0.5, (numero(attr(borde, "sz")) || 4) / 8);
		const color = attr(borde, "color");
		const linea = tipo === "double" ? "double" : tipo.startsWith("dash") ? "dashed" : tipo === "dotted" ? "dotted" : "solid";
		return `${grosor}pt ${linea} ${color && color !== "auto" ? `#${color}` : "#000"}`;
	};

	const convertirTabla = (tbl) => {
		const tblPr = hijo(tbl, "tblPr");
		const idEstilo = val(tblPr, "tblStyle");
		let bordesTabla = hijo(tblPr, "tblBorders");
		for (let id = idEstilo, vistos = 0; !bordesTabla && estilos[id] && vistos < 10; id = estilos[id].base, vistos += 1) {
			bordesTabla = estilos[id].bordesTabla;
		}
		const bordeInterior = bordeCss(hijo(bordesTabla, "insideH")) || bordeCss(hijo(bordesTabla, "insideV"));
		const bordeExterior = bordeCss(hijo(bordesTabla, "top")) || bordeCss(hijo(bordesTabla, "left"));
		const bordePorDefecto = bordeInterior || bordeExterior || (idEstilo === "TableGrid" ? "0.5pt solid #000" : null);
		const alineacion = val(tblPr, "jc");
		const filas = hijos(tbl, "tr");
		const celdasPorFila = filas.map((tr) => {
			let columna = 0;
			return hijos(tr, "tc").map((tc) => {
				const tcPr = hijo(tc, "tcPr");
				const span = numero(val(tcPr, "gridSpan")) || 1;
				const fusion = hijo(tcPr, "vMerge");
				const celda = { tc, tcPr, columna, span, fusion: fusion ? attr(fusion, "val") || "continue" : null };
				columna += span;
				return celda;
			});
		});
		const filasHtml = celdasPorFila.map((celdas, indiceFila) => {
			const columnasHtml = celdas
				.filter((celda) => celda.fusion !== "continue")
				.map((celda) => {
					let filasFusionadas = 1;
					if (celda.fusion === "restart") {
						for (let i = indiceFila + 1; i < celdasPorFila.length; i += 1) {
							const debajo = celdasPorFila[i].find((otra) => otra.columna === celda.columna);
							if (debajo?.fusion !== "continue") break;
							filasFusionadas += 1;
						}
					}
					const reglas = ["padding:0 5.4pt", "vertical-align:top"];
					const ancho = hijo(celda.tcPr, "tcW");
					if (attr(ancho, "type") === "dxa" && numero(attr(ancho, "w"))) reglas.push(`width:${twipsAPt(numero(attr(ancho, "w")))}`);
					const bordesCelda = hijo(celda.tcPr, "tcBorders");
					["top", "right", "bottom", "left"].forEach((lado) => {
						const propio = hijo(bordesCelda, lado) || hijo(bordesCelda, lado === "left" ? "start" : lado === "right" ? "end" : lado);
						const css = propio ? bordeCss(propio) : bordePorDefecto;
						if (css) reglas.push(`border-${lado}:${css}`);
					});
					const fondo = attr(hijo(celda.tcPr, "shd"), "fill");
					if (fondo && fondo !== "auto") reglas.push(`background-color:#${fondo}`);
					const vertical = val(celda.tcPr, "vAlign");
					if (vertical === "center") reglas[1] = "vertical-align:middle";
					if (vertical === "bottom") reglas[1] = "vertical-align:bottom";
					const atributos = [
						celda.span > 1 ? ` colspan="${celda.span}"` : "",
						filasFusionadas > 1 ? ` rowspan="${filasFusionadas}"` : "",
					].join("");
					return `<td${atributos} style="${reglas.join(";")}">${convertirBloques(celda.tc)}</td>`;
				})
				.join("");
			return `<tr>${columnasHtml}</tr>`;
		});
		const margen = alineacion === "center" ? "margin:0 auto" : alineacion === "right" ? "margin:0 0 0 auto" : "margin:0";
		return `<table style="border-collapse:collapse;${margen}"><tbody>${filasHtml.join("")}</tbody></table>`;
	};

	const convertirBloques = (contenedor) => {
		const bloques = hijos(contenedor).flatMap((nodo) =>
			nodo.localName === "sdt" ? hijos(hijo(nodo, "sdtContent")) : [nodo],
		);
		return bloques
			.map((nodo, indice) => {
				if (nodo.localName === "p") return convertirParrafo(nodo, bloques[indice - 1], bloques[indice + 1]);
				if (nodo.localName === "tbl") return convertirTabla(nodo);
				return "";
			})
			.join("");
	};

	return convertirBloques;
};

const leerXml = async (zip, ruta) => {
	const archivo = zip.file(ruta);
	if (!archivo) return null;
	return new DOMParser().parseFromString(await archivo.async("text"), "application/xml");
};

const MIME_IMAGEN = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", bmp: "image/bmp", webp: "image/webp" };

const leerImagenes = async (zip) => {
	const relaciones = await leerXml(zip, "word/_rels/document.xml.rels");
	const imagenes = {};
	if (!relaciones) return imagenes;
	await Promise.all(
		Array.from(relaciones.getElementsByTagName("Relationship")).map(async (relacion) => {
			const destino = relacion.getAttribute("Target") || "";
			const extension = destino.split(".").pop().toLowerCase();
			if (!relacion.getAttribute("Type")?.endsWith("/image") || !MIME_IMAGEN[extension]) return;
			const ruta = destino.startsWith("/") ? destino.slice(1) : `word/${destino.replace(/^\.\//, "")}`;
			const archivo = zip.file(ruta);
			if (archivo) imagenes[relacion.getAttribute("Id")] = `data:${MIME_IMAGEN[extension]};base64,${await archivo.async("base64")}`;
		}),
	);
	return imagenes;
};

const leerTemas = async (zip) => {
	const tema = await leerXml(zip, "word/theme/theme1.xml");
	const fuente = (nombre) => tema?.getElementsByTagNameNS(A, nombre)[0]?.getElementsByTagNameNS(A, "latin")[0]?.getAttribute("typeface");
	return { mayor: fuente("majorFont") || undefined, menor: fuente("minorFont") || undefined };
};

export const convertirDocxAHtml = async (contenido) => {
	const zip = await JSZip.loadAsync(contenido);
	const documento = await leerXml(zip, "word/document.xml");
	const cuerpo = documento && hijo(documento.documentElement, "body");
	if (!cuerpo) throw new Error("El archivo no es un documento de Word (.docx) válido");
	const temas = await leerTemas(zip);
	const [estilos, numeracion, imagenes] = await Promise.all([
		leerXml(zip, "word/styles.xml").then((xml) => leerEstilos(xml, temas)),
		leerXml(zip, "word/numbering.xml").then(leerNumeracion),
		leerImagenes(zip),
	]);
	return crearConvertidor({ ...estilos, numeracion, imagenes, temas })(cuerpo);
};
