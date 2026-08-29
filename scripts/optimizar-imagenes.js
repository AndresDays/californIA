// Redimensiona y recomprime las imágenes de src/assets.
//
// Los botones y los iconos venían del diseño en su tamaño original -algunos de
// 1780 px de ancho- y se muestran a 40 px de alto, así que la clínica bajaba
// megabytes para pintar miniaturas. Aquí se acotan al doble del tamaño en que
// se ven, que es lo que necesita una pantalla retina, y se recomprimen.
//
// Se conserva el nombre y el formato de cada archivo a propósito: así ningún
// import cambia y el script se puede volver a correr cuando entren imágenes
// nuevas. Es idempotente, porque una imagen que ya está por debajo del límite
// no se amplía.
//
//   node scripts/optimizar-imagenes.js          -> reescribe los archivos
//   node scripts/optimizar-imagenes.js --dry    -> sólo reporta

import { readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const CARPETA = join(RAIZ, "src", "assets");

// Los fondos sí cubren la pantalla completa, así que conservan su ancho y sólo
// se recomprimen; el resto son botones, iconos y logos.
const FONDOS = new Set(["FONDO.jpg", "fondo-login.jpg", "fondo-lab1.jpg"]);
const ANCHO_FONDO = 1920;
// Ningún botón se dibuja a más de 55 px de alto (ver los CSS de cotización,
// pacientes y nuevo paciente); 160 px deja margen de sobra para retina y para
// que alguien lo use más grande sin que se vea pixeleado.
const ALTO_MAXIMO_BOTON = 160;
// Los logos entran a los PDF de tickets y cotizaciones, donde se imprimen a
// unos pocos centímetros: 600 px de ancho es más de lo que usa la impresora
// térmica.
const ANCHO_MAXIMO_LOGO = 600;
const ES_LOGO = /^logo/i;

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;

const optimizar = async (archivo, dryRun) => {
	const ruta = join(CARPETA, archivo);
	const extension = extname(archivo).toLowerCase();
	const esJpeg = extension === ".jpg" || extension === ".jpeg";
	if (![".png", ".jpg", ".jpeg"].includes(extension)) return null;

	const tamanoOriginal = statSync(ruta).size;
	const imagen = sharp(ruta);
	const { width, height } = await imagen.metadata();

	let transformada = sharp(ruta);
	if (FONDOS.has(archivo)) {
		if (width > ANCHO_FONDO) transformada = transformada.resize({ width: ANCHO_FONDO });
	} else if (ES_LOGO.test(archivo)) {
		if (width > ANCHO_MAXIMO_LOGO) transformada = transformada.resize({ width: ANCHO_MAXIMO_LOGO });
	} else if (height > ALTO_MAXIMO_BOTON) {
		transformada = transformada.resize({ height: ALTO_MAXIMO_BOTON });
	}

	// El PNG se queda en PNG por los bordes suaves y la transparencia de los
	// botones; la paleta de 256 colores basta para un botón plano y pesa mucho
	// menos que el color verdadero.
	const buffer = await (esJpeg
		? transformada.jpeg({ quality: 78, mozjpeg: true })
		: transformada.png({ compressionLevel: 9, palette: true, quality: 82 })
	).toBuffer();

	// Nunca se escribe un archivo más grande del que ya había: recomprimir algo
	// ya optimizado sólo lo empeora.
	if (buffer.length >= tamanoOriginal) return { archivo, antes: tamanoOriginal, despues: tamanoOriginal, sinCambio: true };
	if (!dryRun) writeFileSync(ruta, buffer);
	return { archivo, antes: tamanoOriginal, despues: buffer.length, sinCambio: false };
};

const principal = async () => {
	const dryRun = process.argv.includes("--dry");
	const archivos = readdirSync(CARPETA).sort();
	let antesTotal = 0;
	let despuesTotal = 0;

	for (const archivo of archivos) {
		const resultado = await optimizar(archivo, dryRun);
		if (!resultado) continue;
		antesTotal += resultado.antes;
		despuesTotal += resultado.despues;
		if (resultado.sinCambio) continue;
		const ahorro = ((1 - resultado.despues / resultado.antes) * 100).toFixed(0);
		console.log(`${resultado.archivo.padEnd(34)} ${kb(resultado.antes).padStart(8)} -> ${kb(resultado.despues).padStart(8)}  (-${ahorro}%)`);
	}

	console.log(
		`\nTotal${dryRun ? " (simulado)" : ""}: ${kb(antesTotal)} -> ${kb(despuesTotal)} ` +
			`(-${((1 - despuesTotal / antesTotal) * 100).toFixed(0)}%)`,
	);
};

principal().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
