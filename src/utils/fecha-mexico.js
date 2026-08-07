const OFFSET_CIUDAD_MEXICO = '-06:00';

const sumarDias = (fecha, dias) => {
	const base = new Date(`${fecha}T12:00:00Z`);
	base.setUTCDate(base.getUTCDate() + dias);
	return base.toISOString().slice(0, 10);
};

export const crearRangoFechaMexico = (fechaInicial, fechaFinal = fechaInicial) => ({
	inicio: `${fechaInicial}T00:00:00${OFFSET_CIUDAD_MEXICO}`,
	fin: `${sumarDias(fechaFinal, 1)}T00:00:00${OFFSET_CIUDAD_MEXICO}`,
});
