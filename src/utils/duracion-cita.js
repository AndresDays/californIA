// Cuánto dura una cita en la agenda. La mayoría de los estudios caben en media
// hora, pero una resonancia o una tomografía con contraste ocupan la hora
// entera: la cita guarda su duración para que el calendario aparte también el
// bloque siguiente y nadie agende encima.

export const DURACION_CORTA = 30;
export const DURACION_LARGA = 60;

export const OPCIONES_DURACION_CITA = [
	{ valor: DURACION_CORTA, etiqueta: "30 minutos" },
	{ valor: DURACION_LARGA, etiqueta: "1 hora" },
];

// Las citas guardadas antes de que existiera la columna llegan sin duración:
// son de media hora, que era lo único que se podía agendar.
export const duracionDeCita = (cita) =>
	Number(cita?.duracion_minutos) >= DURACION_LARGA ? DURACION_LARGA : DURACION_CORTA;

// `citas.fecha_estudio` es un timestamp sin zona: se recorre como texto para no
// pasar por la zona del navegador y que la cita no brinque de hora al moverla.
export const moverFechaEstudio = (fechaEstudio, minutos) => {
	const coincidencia = String(fechaEstudio || "").match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
	if (!coincidencia) return null;
	const [, anio, mes, dia, hora, minuto] = coincidencia.map(Number);
	const fecha = new Date(Date.UTC(anio, mes - 1, dia, hora, minuto + minutos));
	const dos = (valor) => String(valor).padStart(2, "0");
	return `${fecha.getUTCFullYear()}-${dos(fecha.getUTCMonth() + 1)}-${dos(fecha.getUTCDate())}T${dos(fecha.getUTCHours())}:${dos(fecha.getUTCMinutes())}:00`;
};
