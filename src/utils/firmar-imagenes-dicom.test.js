import { crearFirmadorDicom, firmarImagenesDicom } from "./firmar-imagenes-dicom";

const crearStorage = (responder) => {
	const createSignedUrls = jest.fn(responder);
	return { createSignedUrls, from: jest.fn(() => ({ createSignedUrls })) };
};
const firmasOk = (paths) =>
	Promise.resolve({
		data: paths.map((path) => ({ path, error: null, signedUrl: `https://firmada/${path}` })),
		error: null,
	});
const imagenesTac = (n) =>
	Array.from({ length: n }, (_, i) => ({ id_imagen: i + 1, storage_path: `tac/${i + 1}.dcm` }));
const sinEspera = () => Promise.resolve();

describe("firmarImagenesDicom", () => {
	test("un TAC de 450 cortes se firma en 5 peticiones y no en 450", async () => {
		const storage = crearStorage(firmasOk);

		const firmadas = await firmarImagenesDicom(storage, imagenesTac(450), { esperar: sinEspera });

		expect(storage.createSignedUrls).toHaveBeenCalledTimes(5);
		storage.createSignedUrls.mock.calls.forEach(([rutas, expira]) => {
			expect(rutas.length).toBeLessThanOrEqual(100);
			expect(expira).toBe(900);
		});
		expect(firmadas).toHaveLength(450);
		expect(firmadas[449]).toMatchObject({ id_imagen: 450, bucket: "radiologia", url: "https://firmada/tac/450.dcm" });
	});

	test("reintenta cuando Storage responde 544 por timeout de la base", async () => {
		let llamadas = 0;
		const storage = crearStorage((paths) => {
			llamadas += 1;
			if (llamadas === 1) {
				return Promise.resolve({ data: null, error: { status: 544, message: "Database timeout" } });
			}
			return firmasOk(paths);
		});

		const firmadas = await firmarImagenesDicom(storage, imagenesTac(3), { esperar: sinEspera });

		expect(storage.createSignedUrls).toHaveBeenCalledTimes(2);
		expect(firmadas).toHaveLength(3);
	});

	test("no reintenta un error de permisos", async () => {
		const storage = crearStorage(() =>
			Promise.resolve({ data: null, error: { status: 403, message: "denied" } }),
		);

		await expect(firmarImagenesDicom(storage, imagenesTac(2), { esperar: sinEspera })).rejects.toMatchObject({ status: 403 });
		expect(storage.createSignedUrls).toHaveBeenCalledTimes(1);
	});

	test("un corte que no se pudo firmar no impide abrir el resto del estudio", async () => {
		const storage = crearStorage((paths) =>
			Promise.resolve({
				data: paths.map((path) =>
					path === "tac/2.dcm"
						? { path, error: "Object not found", signedUrl: null }
						: { path, error: null, signedUrl: `https://firmada/${path}` },
				),
				error: null,
			}),
		);

		const firmadas = await firmarImagenesDicom(storage, imagenesTac(3), { esperar: sinEspera });

		expect(firmadas.map((imagen) => imagen.id_imagen)).toEqual([1, 3]);
	});

	test("si no se firma ninguna imagen avisa el error", async () => {
		const storage = crearStorage((paths) =>
			Promise.resolve({ data: paths.map((path) => ({ path, error: "Object not found", signedUrl: null })), error: null }),
		);

		await expect(firmarImagenesDicom(storage, imagenesTac(2), { esperar: sinEspera })).rejects.toThrow(
			"No se pudo autorizar la imagen del estudio",
		);
	});
});

describe("crearFirmadorDicom", () => {
	test("agrupa en un lote lo que se pide a la vez y no repite rutas", async () => {
		const storage = crearStorage(firmasOk);
		const firmar = crearFirmadorDicom(storage, { esperar: sinEspera });

		const urls = await Promise.all([
			firmar("radiologia", "tac/1.dcm"),
			firmar("radiologia", "tac/2.dcm"),
			firmar("radiologia", "tac/1.dcm"),
		]);

		expect(urls).toEqual(["https://firmada/tac/1.dcm", "https://firmada/tac/2.dcm", "https://firmada/tac/1.dcm"]);
		expect(storage.createSignedUrls).toHaveBeenCalledTimes(1);
		expect(storage.createSignedUrls).toHaveBeenCalledWith(["tac/1.dcm", "tac/2.dcm"], 900);
	});

	test("reutiliza la URL mientras sigue vigente y la renueva antes de que expire", async () => {
		let reloj = 0;
		const storage = crearStorage(firmasOk);
		const firmar = crearFirmadorDicom(storage, { esperar: sinEspera, ahora: () => reloj });

		await firmar("radiologia", "tac/1.dcm");
		reloj = 10 * 60 * 1000;
		await firmar("radiologia", "tac/1.dcm");
		expect(storage.createSignedUrls).toHaveBeenCalledTimes(1);

		reloj = 15 * 60 * 1000;
		await firmar("radiologia", "tac/1.dcm");
		expect(storage.createSignedUrls).toHaveBeenCalledTimes(2);
	});

	test("firma primero lo que se pidió primero, en lotes del tamaño indicado", async () => {
		const storage = crearStorage(firmasOk);
		const firmar = crearFirmadorDicom(storage, { esperar: sinEspera, tamanoLote: 2 });

		await Promise.all(["a", "b", "c", "d", "e"].map((nombre) => firmar("radiologia", `${nombre}.dcm`)));

		expect(storage.createSignedUrls.mock.calls.map(([rutas]) => rutas)).toEqual([
			["a.dcm", "b.dcm"],
			["c.dcm", "d.dcm"],
			["e.dcm"],
		]);
	});

	test("rechaza sólo la imagen que no se pudo firmar", async () => {
		const storage = crearStorage((paths) =>
			Promise.resolve({
				data: paths.map((path) => ({ path, error: path === "mala.dcm" ? "not found" : null, signedUrl: path === "mala.dcm" ? null : `https://firmada/${path}` })),
				error: null,
			}),
		);
		const firmar = crearFirmadorDicom(storage, { esperar: sinEspera });

		const [buena, mala] = await Promise.allSettled([firmar("radiologia", "buena.dcm"), firmar("radiologia", "mala.dcm")]);
		expect(buena).toEqual({ status: "fulfilled", value: "https://firmada/buena.dcm" });
		expect(mala.status).toBe("rejected");
	});
});

describe("crearFirmadorDicom con prioridad", () => {
	test("la imagen prioritaria se firma en el primer lote aunque haya cientos en fila", async () => {
		const storage = crearStorage(firmasOk);
		const firmar = crearFirmadorDicom(storage, { esperar: sinEspera, tamanoLote: 10 });

		const precarga = Array.from({ length: 50 }, (_, i) => firmar("radiologia", `tac/${i}.dcm`));
		const visible = firmar("radiologia", "tac/45.dcm", { prioritaria: true });
		await Promise.all([...precarga, visible]);

		expect(storage.createSignedUrls.mock.calls[0][0][0]).toBe("tac/45.dcm");
	});

	test("olvidar obliga a volver a firmar", async () => {
		const storage = crearStorage(firmasOk);
		const firmar = crearFirmadorDicom(storage, { esperar: sinEspera });
		await firmar("radiologia", "a.dcm");
		firmar.olvidar("radiologia", "a.dcm");
		await firmar("radiologia", "a.dcm");
		expect(storage.createSignedUrls).toHaveBeenCalledTimes(2);
	});
});
