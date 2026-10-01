// Caché en disco de los archivos DICOM del personal: reabrir un estudio no
// vuelve a descargar nada y la precarga deja el estudio completo listo antes
// de que el radiólogo llegue a cada corte. Las URLs firmadas cambian en cada
// firma, así que la caché normal del navegador nunca las reutilizaba.
//
// Cada estudio vive en su propio Cache (el primer segmento de la ruta es el id
// del estudio), para poder borrar estudios completos de una vez. Se conservan
// los estudios usados más recientemente, dentro de un límite de espacio.

const PREFIJO = "california-dicom-v1:";
const INDICE = "california-dicom-indice-v1";
const MAX_ESTUDIOS = 40;
const MAX_BYTES = 20 * 1024 ** 3;
const FRACCION_CUOTA = 0.5;

const disponible = () => {
	try {
		return typeof caches !== "undefined" && typeof window !== "undefined" && window.isSecureContext !== false;
	} catch {
		return false;
	}
};

export const grupoDicom = (bucket, ruta) => `${bucket}/${String(ruta).split("/")[0]}`;
const claveDicom = (bucket, ruta) => `https://dicom.local/${encodeURIComponent(bucket)}/${String(ruta).split("/").map(encodeURIComponent).join("/")}`;

let indice = null;
const leerIndice = () => {
	if (indice) return indice;
	try {
		indice = JSON.parse(localStorage.getItem(INDICE) || "{}") || {};
	} catch {
		indice = {};
	}
	return indice;
};
let escrituraProgramada = null;
const guardarIndice = () => {
	if (escrituraProgramada) return;
	escrituraProgramada = setTimeout(() => {
		escrituraProgramada = null;
		try {
			localStorage.setItem(INDICE, JSON.stringify(leerIndice()));
		} catch {
			// Sin localStorage la caché funciona igual; sólo se pierde el orden de uso.
		}
	}, 1000);
};
const marcarUso = (grupo) => {
	const actual = leerIndice();
	actual[grupo] = Date.now();
	guardarIndice();
};

const abiertos = new Map();
const abrir = (grupo) => {
	if (!abiertos.has(grupo)) abiertos.set(grupo, caches.open(PREFIJO + grupo));
	return abiertos.get(grupo);
};

// Estudios que se están viendo o precargando: la limpieza no los toca.
const protegidos = new Set();
export const protegerEstudioDicom = (grupo) => protegidos.add(grupo);
export const liberarEstudioDicom = (grupo) => protegidos.delete(grupo);

export const existeDicomLocal = async (bucket, ruta) => {
	if (!disponible()) return false;
	try {
		return Boolean(await (await abrir(grupoDicom(bucket, ruta))).match(claveDicom(bucket, ruta)));
	} catch {
		return false;
	}
};

export const leerDicomLocal = async (bucket, ruta) => {
	if (!disponible()) return null;
	try {
		const grupo = grupoDicom(bucket, ruta);
		const respuesta = await (await abrir(grupo)).match(claveDicom(bucket, ruta));
		if (!respuesta) return null;
		marcarUso(grupo);
		return await respuesta.arrayBuffer();
	} catch {
		return null;
	}
};

const borrarGrupo = async (grupo) => {
	abiertos.delete(grupo);
	delete leerIndice()[grupo];
	guardarIndice();
	try {
		await caches.delete(PREFIJO + grupo);
	} catch {
		// Si no se pudo borrar, se reintenta en la siguiente limpieza.
	}
};

let limpiando = null;
export const limpiarCacheDicom = () => {
	if (!disponible()) return Promise.resolve();
	limpiando ||= (async () => {
		try {
			const nombres = (await caches.keys()).filter((nombre) => nombre.startsWith(PREFIJO));
			const usados = leerIndice();
			// Lo más viejo primero; un Cache sin registro en el índice cuenta como viejo.
			const grupos = nombres
				.map((nombre) => nombre.slice(PREFIJO.length))
				.filter((grupo) => !protegidos.has(grupo))
				.sort((a, b) => (usados[a] || 0) - (usados[b] || 0));
			let total = nombres.length;
			const estimar = async () => {
				const { usage = 0, quota = 0 } = (await navigator.storage?.estimate?.()) || {};
				return { usage, limite: Math.min(MAX_BYTES, quota ? quota * FRACCION_CUOTA : MAX_BYTES) };
			};
			let { usage, limite } = await estimar();
			while (grupos.length && (total > MAX_ESTUDIOS || usage > limite)) {
				await borrarGrupo(grupos.shift());
				total -= 1;
				({ usage, limite } = await estimar());
			}
		} catch {
			// La limpieza es de mantenimiento: nunca debe tumbar el visor.
		} finally {
			limpiando = null;
		}
	})();
	return limpiando;
};

let limpiezaProgramada = null;
const programarLimpieza = () => {
	if (limpiezaProgramada) return;
	limpiezaProgramada = setTimeout(() => {
		limpiezaProgramada = null;
		void limpiarCacheDicom();
	}, 5000);
};

export const guardarDicomLocal = async (bucket, ruta, contenido) => {
	if (!disponible()) return false;
	const grupo = grupoDicom(bucket, ruta);
	try {
		marcarUso(grupo);
		await (await abrir(grupo)).put(
			claveDicom(bucket, ruta),
			new Response(contenido, { headers: { "Content-Type": "application/dicom" } }),
		);
		programarLimpieza();
		return true;
	} catch {
		// Disco lleno: se hace espacio para la siguiente.
		void limpiarCacheDicom();
		return false;
	}
};

let persistenciaPedida = false;
// Pide al navegador que no borre la caché por su cuenta cuando falte espacio.
export const pedirPersistenciaDicom = () => {
	if (persistenciaPedida) return;
	persistenciaPedida = true;
	try {
		void navigator.storage?.persist?.().catch?.(() => {});
	} catch {
		// Opcional.
	}
};

export const hayCacheDicomLocal = disponible;

// Al cerrar sesión no deben quedar estudios en la computadora.
export const borrarCacheDicom = async () => {
	abiertos.clear();
	indice = {};
	try {
		localStorage.removeItem(INDICE);
	} catch {
		// Nada que borrar.
	}
	if (!disponible()) return;
	try {
		const nombres = (await caches.keys()).filter((nombre) => nombre.startsWith(PREFIJO));
		await Promise.all(nombres.map((nombre) => caches.delete(nombre)));
	} catch {
		// Nada que borrar.
	}
};
