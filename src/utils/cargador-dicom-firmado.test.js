const mockCreateSignedUrls = jest.fn((rutas) => Promise.resolve({
	data: rutas.map((path) => ({ path, signedUrl: `https://storage.test/${path}?token=t`, error: null })),
	error: null,
}));
jest.mock("../lib/supabase-client", () => ({
	supabase: { storage: { from: () => ({ createSignedUrls: (...args) => mockCreateSignedUrls(...args) }) } },
}));

import {
	obtenerBytesDicom,
	porcentajeCargaDicom,
	precargarEstudioDicom,
	reiniciarFirmadoresDicom,
	suscribirProgresoDicom,
} from "./cargador-dicom-firmado";
import { crearImageIdDicomFirmado } from "./firmar-imagenes-dicom";
import { borrarCacheDicom } from "./cache-dicom-local";

// Cache API mínima en memoria (jsdom no la trae).
const crearCachesFalsos = () => {
	const almacenes = new Map();
	return {
		open: async (nombre) => {
			if (!almacenes.has(nombre)) almacenes.set(nombre, new Map());
			const almacen = almacenes.get(nombre);
			return {
				match: async (clave) => almacen.get(clave),
				put: async (clave, respuesta) => { almacen.set(clave, respuesta); },
				keys: async () => [...almacen.keys()],
			};
		},
		keys: async () => [...almacenes.keys()],
		delete: async (nombre) => almacenes.delete(nombre),
		total: () => [...almacenes.values()].reduce((suma, almacen) => suma + almacen.size, 0),
	};
};

class RespuestaFalsa {
	constructor(contenido) { this.contenido = contenido; }
	async arrayBuffer() { return this.contenido; }
}

const esperarA = async (condicion) => {
	for (let i = 0; i < 200 && !condicion(); i += 1) await new Promise((r) => setTimeout(r, 5));
};

const ids = (n, serie = "a") =>
	Array.from({ length: n }, (_, i) => crearImageIdDicomFirmado({ storage_path: `77/${serie}-${i}.dcm` }));

beforeEach(async () => {
	reiniciarFirmadoresDicom();
	mockCreateSignedUrls.mockClear();
	global.caches = crearCachesFalsos();
	global.Response = RespuestaFalsa;
	global.fetch = jest.fn((url) => Promise.resolve({ ok: true, status: 200, arrayBuffer: async () => `bytes:${url}` }));
	window.localStorage.clear();
	await borrarCacheDicom();
});

describe("obtenerBytesDicom", () => {
	test("la segunda vez sale del disco: sin firmar ni descargar", async () => {
		const [id] = ids(1);
		await obtenerBytesDicom(id);
		await esperarA(() => global.caches.total() === 1);

		await obtenerBytesDicom(id);

		expect(global.fetch).toHaveBeenCalledTimes(1);
		expect(mockCreateSignedUrls).toHaveBeenCalledTimes(1);
	});

	test("si Storage rechaza la URL, la vuelve a firmar una vez", async () => {
		const [id] = ids(1);
		global.fetch
			.mockResolvedValueOnce({ ok: false, status: 400, arrayBuffer: async () => null });

		await expect(obtenerBytesDicom(id)).resolves.toContain("bytes:");
		expect(mockCreateSignedUrls).toHaveBeenCalledTimes(2);
	});
});

describe("precargarEstudioDicom", () => {
	test("baja todo el estudio a disco firmando por lotes de cien", async () => {
		precargarEstudioDicom(ids(250));
		await esperarA(() => global.caches.total() === 250);

		expect(global.caches.total()).toBe(250);
		expect(global.fetch).toHaveBeenCalledTimes(250);
		mockCreateSignedUrls.mock.calls.forEach(([rutas]) => expect(rutas.length).toBeLessThanOrEqual(100));
		expect(mockCreateSignedUrls.mock.calls.length).toBeLessThanOrEqual(5);
	});

	test("lo que ya está en disco no se firma ni se descarga", async () => {
		const estudio = ids(20);
		precargarEstudioDicom(estudio);
		await esperarA(() => global.caches.total() === 20);
		global.fetch.mockClear();
		mockCreateSignedUrls.mockClear();

		precargarEstudioDicom(estudio);
		await new Promise((r) => setTimeout(r, 50));

		expect(global.fetch).not.toHaveBeenCalled();
		expect(mockCreateSignedUrls).not.toHaveBeenCalled();
	});
});

// La columna de series dice cuánto lleva cargado cada una.
describe("porcentajeCargaDicom", () => {
	test("cuenta los cortes de la serie que ya bajaron y avisa del avance", async () => {
		const serie = ids(4, "p");
		const aviso = jest.fn();
		const quitar = suscribirProgresoDicom(aviso);
		expect(porcentajeCargaDicom(serie)).toBe(0);

		await obtenerBytesDicom(serie[0]);
		expect(porcentajeCargaDicom(serie)).toBe(25);

		precargarEstudioDicom(serie);
		await esperarA(() => porcentajeCargaDicom(serie) === 100);
		expect(porcentajeCargaDicom(serie)).toBe(100);
		await esperarA(() => aviso.mock.calls.length > 0);
		expect(aviso).toHaveBeenCalled();
		quitar();
	});

	test("una serie sin cortes cuenta como completa", () => {
		expect(porcentajeCargaDicom([])).toBe(100);
	});
});
