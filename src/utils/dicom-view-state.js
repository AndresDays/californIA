export const crearClaveImagenDicom = (imagen = {}) =>
	String(imagen.storage_path || "").trim();

export const crearClaveSerieDicom = (serie = {}) =>
	`serie:${String(serie.id || "").trim()}`;

export const crearEstadoVentanaSerieDicom = ({ windowWidth, windowCenter } = {}) => ({
	version: 1,
	voi: { windowWidth, windowCenter },
});

export const leerEstadoVentanaSerieDicom = (estado) =>
	estado?.version === 1 && Number.isFinite(estado?.voi?.windowWidth) &&
	Number.isFinite(estado?.voi?.windowCenter)
		? estado
		: null;

export const crearEstadoVistaDicom = ({
	viewport,
	lineas = [],
	anotaciones = [],
	angulos = [],
	elipses = [],
	rects = [],
	bidis = [],
} = {}) => ({
	version: 2,
	viewport: {
		scale: viewport?.scale ?? 1,
		voi: {
			windowWidth: viewport?.voi?.windowWidth ?? 2000,
			windowCenter: viewport?.voi?.windowCenter ?? 0,
		},
		translation: {
			x: viewport?.translation?.x ?? 0,
			y: viewport?.translation?.y ?? 0,
		},
		invert: Boolean(viewport?.invert),
		rotation: viewport?.rotation ?? 0,
		hflip: Boolean(viewport?.hflip),
		vflip: Boolean(viewport?.vflip),
	},
	overlays: { lineas, anotaciones, angulos, elipses, rects, bidis },
});

export const leerEstadoVistaDicom = (estado) =>
	estado?.version === 1 || estado?.version === 2 ? estado : null;
