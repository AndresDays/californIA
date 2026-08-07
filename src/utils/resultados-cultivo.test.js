import {
	esEstudioCultivo,
	separarEstudiosConCultivo,
	validarPdfCultivo,
} from "./resultados-cultivo";

describe("resultados-cultivo", () => {
	test("detecta cultivo sin importar las mayusculas en las descripciones disponibles", () => {
		expect(esEstudioCultivo({ descripcion_estudio: "CuLtIvO de orina" })).toBe(true);
		expect(esEstudioCultivo({ descripcion: "cultivo bacteriologico" })).toBe(true);
		expect(esEstudioCultivo({ descripcion_estudio: "Biometria hematica" })).toBe(false);
	});

	test("separa solo los cultivos que ya tienen un PDF adjunto", () => {
		const cultivoAdjunto = {
			id_estudio_venta: 1,
			descripcion_estudio: "CULTIVO DE ORINA",
			archivo_cultivo_url: "https://storage.example.test/resultados-cultivo-adjuntos/1.pdf",
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
