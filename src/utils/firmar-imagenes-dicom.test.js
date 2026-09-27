import { firmarImagenesDicom } from "./firmar-imagenes-dicom";

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
