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

export const formatearFechaHoraMexicoLocal = (fecha = new Date()) => {
	const partes = new Intl.DateTimeFormat("en-CA", {
		timeZone: "America/Mexico_City",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23",
	}).formatToParts(new Date(fecha));
	const valores = Object.fromEntries(
		partes
			.filter(({ type }) => type !== "literal")
			.map(({ type, value }) => [type, value]),
	);
	return `${valores.year}-${valores.month}-${valores.day}T${valores.hour}:${valores.minute}:${valores.second}`;
};
