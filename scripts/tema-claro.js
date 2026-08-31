// Convierte el CSS del tema oscuro al claro.
//
// No es un buscar y reemplazar: el mismo color significa cosas distintas según
// la propiedad donde aparece. `rgba(255,255,255,0.08)` es un velo de fondo y
// `rgba(255,255,255,0.85)` es texto; cambiar los dos por lo mismo deja letras
// invisibles. Por eso cada declaración se clasifica por su propiedad -texto,
// fondo, borde o sombra- y se traduce con la regla de ese papel.
//
// El visor DICOM y el lienzo de imágenes quedan fuera a propósito: siguen
// oscuros porque sobre blanco se pierde rango en las escalas de grises.
//
//   node scripts/tema-claro.js --dry   -> reporta sin escribir
//   node scripts/tema-claro.js         -> reescribe los CSS

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");

// El visor y su lienzo conservan el tema oscuro.
const EXCLUIDOS = [
	"src/pages/radiologia/pages/VisorDicom.css",
	"src/pages/radiologia/pages/VisorPaciente.css",
	"src/pages/radiologia/componentes/Mpr2dViewer.css",
	"src/styles/tema.css",
];

const listarCss = (carpeta, acumulado = []) => {
	for (const entrada of readdirSync(carpeta)) {
		const ruta = join(carpeta, entrada);
		if (statSync(ruta).isDirectory()) listarCss(ruta, acumulado);
		else if (entrada.endsWith(".css")) acumulado.push(ruta);
	}
	return acumulado;
};

const aRgb = (color) => {
	const texto = color.trim().toLowerCase();
	if (texto === "white") return { r: 255, g: 255, b: 255, a: 1 };
	if (texto === "black") return { r: 0, g: 0, b: 0, a: 1 };
	const hex = texto.match(/^#([0-9a-f]{3,8})$/);
	if (hex) {
		let d = hex[1];
		if (d.length === 3) d = d.split("").map((c) => c + c).join("");
		if (d.length === 8) d = d.slice(0, 6);
		if (d.length !== 6) return null;
		return {
			r: parseInt(d.slice(0, 2), 16),
			g: parseInt(d.slice(2, 4), 16),
			b: parseInt(d.slice(4, 6), 16),
			a: 1,
		};
	}
	const rgb = texto.match(/^rgba?\(([^)]+)\)$/);
	if (rgb) {
		const partes = rgb[1].split(/[,/]/).map((p) => parseFloat(p.trim()));
		if (partes.length < 3 || partes.some((p) => Number.isNaN(p))) return null;
		return { r: partes[0], g: partes[1], b: partes[2], a: partes[3] ?? 1 };
	}
	return null;
};

const luminancia = ({ r, g, b }) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

const esAzulDeMarca = ({ r, g, b }) => b > r + 20 && b > 90 && g >= r;
const esGrisNeutro = ({ r, g, b }) => Math.abs(r - g) < 12 && Math.abs(g - b) < 12;

// Traduce un color según el papel que juega en su declaración.
const traducir = (color, papel) => {
	const rgb = aRgb(color);
	if (!rgb) return null;
	const { a } = rgb;
	const lum = luminancia(rgb);
	const claro = lum > 0.75;
	const oscuro = lum < 0.3;

	if (papel === "sombra") {
		// Las sombras negras del tema oscuro se ven sucias sobre blanco.
		if (esGrisNeutro(rgb) && oscuro) return `rgba(18, 41, 61, ${Math.min(a * 0.5, 0.14)})`;
		return null;
	}

	if (papel === "texto") {
		if (claro) {
			// Texto blanco: pasa a la escala de grises azulados según su énfasis.
			if (a >= 0.7) return "var(--texto)";
			if (a >= 0.45) return "var(--texto-suave)";
			return "var(--texto-tenue)";
		}
		if (esAzulDeMarca(rgb)) return "var(--azul)";
		if (oscuro) return "var(--texto)";
		return null;
	}

	if (papel === "borde") {
		if (esAzulDeMarca(rgb)) return a >= 0.35 ? "var(--borde-fuerte)" : "var(--borde)";
		if (claro) return "var(--borde)";
		if (oscuro) return "var(--borde-fuerte)";
		return null;
	}

	// Fondos.
	if (esAzulDeMarca(rgb)) {
		// Un azul sólido sigue siendo azul; uno translúcido era un realce y pasa
		// a ser el velo suave que se usa en las filas de tabla.
		if (a >= 0.85) return lum < 0.45 ? "var(--azul)" : "var(--azul-claro)";
		if (a >= 0.25) return "var(--superficie-activa)";
		return "var(--superficie-hover)";
	}
	if (oscuro) {
		// Las superficies navy del tema anterior son las tarjetas de la interfaz.
		return a >= 0.85 ? "var(--superficie)" : "var(--superficie-2)";
	}
	if (claro) {
		// Blancos translúcidos: eran realces sobre lo oscuro, no superficies.
		if (a >= 0.85) return "var(--superficie)";
		return a >= 0.12 ? "var(--superficie-3)" : "var(--superficie-hover)";
	}
	return null;
};

const papelDePropiedad = (propiedad) => {
	const p = propiedad.trim().toLowerCase();
	if (p === "color" || p === "-webkit-text-fill-color" || p === "caret-color" || p === "fill" || p === "stroke") {
		return "texto";
	}
	if (p.startsWith("border") || p.startsWith("outline") || p === "column-rule-color") return "borde";
	if (p.endsWith("shadow")) return "sombra";
	if (p.startsWith("background")) return "fondo";
	return null;
};

const RE_COLOR = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\bwhite\b|\bblack\b/g;

// Un bloque cuyo fondo queda azul sólido necesita su texto en blanco: si se
// tradujera cada declaración por separado, el azul claro que antes resaltaba
// sobre el navy se volvería azul sobre azul y el rótulo desaparecería.
const FONDOS_SOLIDOS = ["var(--azul)", "var(--azul-oscuro)", "var(--naranja)"];

const tieneFondoSolido = (bloque) => {
	const declaraciones = bloque.match(/background[^;{}]*/g) || [];
	return declaraciones.some((declaracion) => {
		const valores = declaracion.split(":").slice(1).join(":");
		return (valores.match(RE_COLOR) || []).some((color) =>
			FONDOS_SOLIDOS.includes(traducir(color, "fondo")),
		);
	});
};

const convertirDeclaraciones = (texto, sobreFondoSolido, contar) =>
	texto.replace(
		/(^|[;{}])(\s*)([-a-zA-Z]+)(\s*):([^;{}]*)/g,
		(completo, previo, sangria, propiedad, espacio, valor) => {
			const papel = papelDePropiedad(propiedad);
			if (!papel) return completo;
			const nuevoValor = valor.replace(RE_COLOR, (color) => {
				let traducido = traducir(color, papel);
				if (sobreFondoSolido && papel === "texto") {
					const rgb = aRgb(color);
					// Sobre el azul sólido sólo se deja el texto en blanco; un
					// color oscuro intencional se respeta.
					if (rgb && luminancia(rgb) > 0.35) traducido = "var(--texto-sobre-azul)";
				}
				if (sobreFondoSolido && papel === "borde") traducido = "rgba(255, 255, 255, 0.25)";
				if (!traducido) return color;
				contar();
				return traducido;
			});
			return `${previo}${sangria}${propiedad}${espacio}:${nuevoValor}`;
		},
	);

const convertir = (css) => {
	let cambios = 0;
	const contar = () => { cambios += 1; };
	// Se trabaja bloque por bloque para poder mirar el fondo y el texto juntos.
	const salida = css.replace(/\{([^{}]*)\}/g, (completo, cuerpo) => {
		const solido = tieneFondoSolido(cuerpo);
		return `{${convertirDeclaraciones(cuerpo, solido, contar)}}`;
	});
	return { salida, cambios };
};

const principal = () => {
	const dryRun = process.argv.includes("--dry");
	const archivos = listarCss(join(RAIZ, "src")).filter(
		(ruta) => !EXCLUIDOS.includes(relative(RAIZ, ruta).split("\\").join("/")),
	);

	let total = 0;
	for (const ruta of archivos) {
		const css = readFileSync(ruta, "utf8");
		const { salida, cambios } = convertir(css);
		if (cambios === 0) continue;
		total += cambios;
		if (!dryRun) writeFileSync(ruta, salida);
		console.log(`${String(cambios).padStart(4)}  ${relative(RAIZ, ruta)}`);
	}
	console.log(`\n${total} colores traducidos en ${archivos.length} archivos${dryRun ? " (simulado)" : ""}.`);
};

principal();
