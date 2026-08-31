// Corrige los pares de texto y fondo que la auditoría marca por debajo del
// mínimo legible.
//
// Dos causas, las dos propias de haber convertido el tema a máquina:
//
// 1. Bloques que quedaron con el texto en blanco sobre una superficie clara,
//    porque su fondo era un degradado azul que después se aplanó.
// 2. Insignias de estado -verdes, rojas, ámbar- pensadas para el fondo oscuro:
//    un rojo claro sobre un velo rojo se leía bien sobre navy y se lava sobre
//    blanco. Se oscurece el texto hasta que alcanza el contraste, conservando
//    su tono para que la insignia siga significando lo mismo.
//
//   node scripts/corregir-contraste.js

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const MINIMO = 4.5;
const EXCLUIDOS = ["VisorDicom.css", "VisorPaciente.css", "Mpr2dViewer.css"];

const tokens = {};
for (const [, nombre, valor] of readFileSync(join(RAIZ, "src/styles/tema.css"), "utf8")
	.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
	tokens[nombre] = valor.trim();
}

const resolver = (valor, n = 0) => {
	if (n > 5) return valor;
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

// Oscurece el color conservando su tono hasta que se lea sobre su fondo.
const oscurecerHastaLegible = (rgb, fondo) => {
	let [r, g, b] = rgb;
	for (let paso = 0; paso < 24; paso += 1) {
		if (contraste([r, g, b], fondo) >= MINIMO) break;
		r = Math.max(0, r * 0.88);
		g = Math.max(0, g * 0.88);
		b = Math.max(0, b * 0.88);
	}
	const hex = (v) => Math.round(v).toString(16).padStart(2, "0");
	return `#${hex(r)}${hex(g)}${hex(b)}`;
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
	const original = readFileSync(ruta, "utf8");
	const salida = original.replace(/\{([^{}]*)\}/g, (completo, cuerpo) => {
		const texto = cuerpo.match(/(?:^|;)\s*color\s*:\s*([^;]+)/);
		const fondo = cuerpo.match(/(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/);
		if (!texto || !fondo || fondo[1].includes("gradient")) return completo;

		const colorTexto = (texto[1].match(RE_COLOR) || [])[0];
		const colorFondo = (fondo[1].match(RE_COLOR) || [])[0];
		if (!colorTexto || !colorFondo) return completo;

		const rgbTexto = aRgb(resolver(colorTexto));
		const rgbFondo = aRgb(resolver(colorFondo));
		if (!rgbTexto || !rgbFondo) return completo;

		const fondoPlano = sobreBlanco(rgbFondo);
		if (contraste(sobreBlanco(rgbTexto), fondoPlano) >= MINIMO) return completo;

		// El blanco sobre una superficie clara sólo puede venir de un fondo azul
		// que se aplanó después: le corresponde el texto normal del tema.
		let reemplazo;
		if (colorTexto === "var(--texto-sobre-azul)") {
			reemplazo = "var(--texto)";
		} else if (lum(fondoPlano) < 0.45) {
			// Sobre un fondo sólido oscuro -un gris o un ámbar de botón- no hay
			// hacia dónde oscurecer el texto: lo que se lee es el blanco.
			reemplazo = "var(--texto-sobre-azul)";
		} else {
			reemplazo = oscurecerHastaLegible(sobreBlanco(rgbTexto), fondoPlano);
		}

		corregidos += 1;
		return completo.replace(texto[0], texto[0].replace(colorTexto, reemplazo));
	});

	if (salida !== original) {
		writeFileSync(ruta, salida);
		console.log("corregido:", relative(RAIZ, ruta));
	}
}

console.log(`\n${corregidos} pares corregidos.`);
