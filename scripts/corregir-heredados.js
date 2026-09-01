// Corrige el texto que queda ilegible por el fondo de su contenedor.
//
// Es el caso que el primer paso de conversión no podía ver: el fondo azul lo
// pone la tarjeta y el color lo ponen sus renglones, en bloques distintos. Al
// traducir cada bloque por separado, esos renglones se quedaron con el texto
// oscuro del tema y sobre el azul dejaron de leerse -es lo que pasó con el
// menú lateral y con las cabeceras de los modales-.
//
//   node scripts/corregir-heredados.js

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const MINIMO = 4.5;
const EXCLUIDOS = ["VisorDicom.css", "VisorPaciente.css", "Mpr2dViewer.css"];

const tokens = {};
for (const [, n, v] of readFileSync(join(RAIZ, "src/styles/tema.css"), "utf8").matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
	tokens[n] = v.trim();
}

const resolver = (valor, n = 0) => {
	if (!valor || n > 5) return valor;
	const usa = valor.match(/var\((--[\w-]+)\)/);
	if (!usa) return valor;
	if (!tokens[usa[1]]) return null;
	return resolver(valor.replace(usa[0], tokens[usa[1]]), n + 1);
};

const aRgb = (color) => {
	if (!color) return null;
	const t = color.trim().toLowerCase();
	if (t === "white") return [255, 255, 255, 1];
	if (t === "black") return [0, 0, 0, 1];
	const hex = t.match(/^#([0-9a-f]{3,8})$/);
	if (hex) {
		let d = hex[1];
		if (d.length === 3) d = d.split("").map((c) => c + c).join("");
		if (d.length < 6) return null;
		return [parseInt(d.slice(0, 2), 16), parseInt(d.slice(2, 4), 16), parseInt(d.slice(4, 6), 16), 1];
	}
	const rgb = t.match(/^rgba?\(([^)]+)\)$/);
	if (!rgb) return null;
	const p = rgb[1].split(/[,/]/).map((x) => parseFloat(x.trim()));
	if (p.length < 3 || p.slice(0, 3).some(Number.isNaN)) return null;
	return [p[0], p[1], p[2], p[3] ?? 1];
};

const sobreBlanco = ([r, g, b, a]) => [r * a + 255 * (1 - a), g * a + 255 * (1 - a), b * a + 255 * (1 - a)];

const lum = ([r, g, b]) => {
	const c = (v) => {
		const x = v / 255;
		return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
};

const contraste = (f, b) => {
	const a = lum(f);
	const d = lum(b);
	return (Math.max(a, d) + 0.05) / (Math.min(a, d) + 0.05);
};

const listarCss = (carpeta, acc = []) => {
	for (const e of readdirSync(carpeta)) {
		const ruta = join(carpeta, e);
		if (statSync(ruta).isDirectory()) listarCss(ruta, acc);
		else if (ruta.endsWith(".css")) acc.push(ruta);
	}
	return acc;
};

const RE_COLOR = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|var\(--[\w-]+\)|\bwhite\b|\bblack\b/;

let corregidos = 0;

for (const ruta of listarCss(join(RAIZ, "src")).filter((r) => !EXCLUIDOS.some((x) => r.endsWith(x)))) {
	const css = readFileSync(ruta, "utf8");

	// Qué selector pinta qué fondo opaco.
	const fondos = new Map();
	for (const regla of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
		const sel = regla[1].trim();
		if (sel.startsWith("@") || sel.includes("%")) continue;
		const fondo = regla[2].match(/(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/);
		if (!fondo || fondo[1].includes("gradient")) continue;
		const color = (fondo[1].match(RE_COLOR) || [])[0];
		if (!color) continue;
		const rgb = aRgb(resolver(color));
		if (!rgb || rgb[3] < 0.9) continue;
		for (const s of sel.split(",")) fondos.set(s.trim(), rgb);
	}
	if (fondos.size === 0) continue;

	const salida = css.replace(/([^{}]+)\{([^{}]*)\}/g, (completo, selectores, cuerpo) => {
		const sel = selectores.trim();
		if (sel.startsWith("@")) return completo;
		if (/(?:^|;)\s*background/.test(cuerpo)) return completo;
		const texto = cuerpo.match(/(?:^|;)\s*color\s*:\s*([^;]+)/);
		if (!texto) return completo;
		const colorTexto = (texto[1].match(RE_COLOR) || [])[0];
		const rgbTexto = aRgb(resolver(colorTexto));
		if (!rgbTexto) return completo;

		let contenedor = null;
		let mejor = 0;
		for (const parte of sel.split(",").map((x) => x.trim())) {
			for (const [candidato, rgb] of fondos) {
				if (candidato === parte || !parte.startsWith(`${candidato} `)) continue;
				if (candidato.length <= mejor) continue;
				mejor = candidato.length;
				contenedor = rgb;
			}
		}
		// Sin contenedor, debajo esta la pagina. El blanco se excluye: solo se usa
		// sobre un fondo de color, y la relacion padre-hijo no siempre se puede
		// deducir del selector, asi que medirlo contra la pagina daria falsos
		// positivos.
		if (!contenedor && colorTexto === "var(--texto-sobre-azul)") return completo;
		const fondoReal = contenedor ?? aRgb(resolver("var(--fondo-app)"));
		if (!fondoReal) return completo;

		const fondoPlano = sobreBlanco(fondoReal);
		if (contraste(sobreBlanco(rgbTexto), fondoPlano) >= MINIMO) return completo;

		// Sobre un contenedor oscuro se lee el blanco; sobre uno claro, el texto
		// normal del tema.
		const reemplazo = lum(fondoPlano) < 0.5 ? "var(--texto-sobre-azul)" : "var(--texto)";
		corregidos += 1;
		return completo.replace(texto[0], texto[0].replace(colorTexto, reemplazo));
	});

	if (salida !== css) {
		writeFileSync(ruta, salida);
		console.log("corregido:", relative(RAIZ, ruta));
	}
}

console.log(`\n${corregidos} textos heredados corregidos.`);
