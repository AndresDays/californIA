import {
	esEstudioCultivo,
	esArchivoCultivoPathValido,
	separarEstudiosConCultivo,
	validarPdfCultivo,
} from "./resultados-cultivo";

describe("resultados-cultivo", () => {
	test("detecta cultivo sin importar las mayusculas en las descripciones disponibles", () => {
		expect(esEstudioCultivo({ descripcion_estudio: "CuLtIvO de orina" })).toBe(true);
		expect(esEstudioCultivo({ descripcion: "cultivo bacteriologico" })).toBe(true);
		expect(esEstudioCultivo({ descripcion_estudio: "Biometria hematica" })).toBe(false);
	});

	test("valida la ruta determinista, pero solo clasifica la URL firmada recibida del servidor", () => {
		const cultivo = {
			id_estudio_venta: 17,
			descripcion_estudio: "Cultivo de orina",
			archivo_cultivo_path: "17/cultivo.pdf",
		};
		expect(esArchivoCultivoPathValido(cultivo.archivo_cultivo_path)).toBe(true);
		expect(esArchivoCultivoPathValido("17/otro.pdf")).toBe(false);
		expect(separarEstudiosConCultivo([cultivo]).adjuntosCultivo).toEqual([]);
		const firmado = { ...cultivo, archivo_cultivo_url: "https://project.supabase.co/storage/v1/object/sign/resultados-cultivo-adjuntos/17/cultivo.pdf" };
		expect(separarEstudiosConCultivo([firmado]).adjuntosCultivo).toEqual([firmado]);
	});

	test("separa solo los cultivos que ya tienen un PDF adjunto", () => {
		const cultivoAdjunto = {
			id_estudio_venta: 1,
			descripcion_estudio: "CULTIVO DE ORINA",
			archivo_cultivo_path: "1/cultivo.pdf",
			archivo_cultivo_url:
				"https://storage.example.test/storage/v1/object/public/resultados-cultivo-adjuntos/1/cultivo.pdf",
		};
		const bhc = { id_estudio_venta: 2, descripcion_estudio: "BHC" };
		const cultivoSinAdjunto = {
			id_estudio_venta: 3,
			descripcion: "Cultivo faríngeo",
		};

		expect(
			separarEstudiosConCultivo([cultivoAdjunto, bhc, cultivoSinAdjunto]),
		).toEqual({
			generados: [bhc, cultivoSinAdjunto],
			adjuntosCultivo: [cultivoAdjunto],
		});
	});

	test("trata una lista de estudios vacia o nula como sin resultados", () => {
		expect(separarEstudiosConCultivo()).toEqual({
			generados: [],
			adjuntosCultivo: [],
		});
		expect(separarEstudiosConCultivo(null)).toEqual({
			generados: [],
			adjuntosCultivo: [],
		});
	});

	test("rechaza archivos de cultivo que no son PDF o que exceden 25 MiB", () => {
		expect(validarPdfCultivo({ type: "image/png", size: 100 })).toContain("PDF");
		expect(
			validarPdfCultivo({ type: "application/pdf", size: 25 * 1024 * 1024 + 1 }),
		).toContain("25 MiB");
	});

	test("acepta un PDF exactamente en el limite de 25 MiB", () => {
		expect(
			validarPdfCultivo({ type: "application/pdf", size: 25 * 1024 * 1024 }),
		).toBe("");
	});
});
