import {
	crearClaveImagenDicom,
	crearEstadoVistaDicom,
	leerEstadoVistaDicom,
} from "./dicom-view-state";

test("serializa viewport y overlays sin campos temporales", () => {
	const estado = crearEstadoVistaDicom({
		viewport: {
			scale: 1.5,
			voi: { windowWidth: 400, windowCenter: 40 },
			translation: { x: 4, y: 8 },
			invert: true,
		},
		lineas: [{ px1: 1, py1: 2, px2: 3, py2: 4, dist: 5 }],
		anotaciones: [{ px: 4, py: 5, texto: "lesión" }],
	});

	expect(estado).toEqual({
		version: 1,
		viewport: expect.objectContaining({ scale: 1.5, invert: true }),
		overlays: expect.objectContaining({
			lineas: [{ px1: 1, py1: 2, px2: 3, py2: 4, dist: 5 }],
			anotaciones: [{ px: 4, py: 5, texto: "lesión" }],
			angulos: [],
			elipses: [],
			rects: [],
			bidis: [],
		}),
	});
});

test("usa storage_path como clave para imágenes sin metadata", () => {
	expect(crearClaveImagenDicom({ storage_path: "123/imagen.dcm" })).toBe("123/imagen.dcm");
});

test("rechaza versiones de estado no compatibles", () => {
	expect(leerEstadoVistaDicom({ version: 2 })).toBeNull();
});
