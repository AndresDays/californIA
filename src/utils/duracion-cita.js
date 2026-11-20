// Cuánto dura una cita en la agenda. Cada estudio aparta su tiempo: una
// resonancia lleva una hora y cualquier otro estudio -tomografía, ultrasonido,
// mastografía...- media hora. Una cita con tres resonancias ocupa tres horas, y
// el calendario aparta todos esos bloques para que nadie agende encima. La
// duración se puede alargar a mano, siempre en bloques de media hora.

export const PASO_DURACION = 30;
export const DURACION_CORTA = 30;
export const DURACION_LARGA = 60;
export const MINUTOS_POR_RESONANCIA = 60;
export const MINUTOS_POR_ESTUDIO = 30;
// Un día de agenda completo: más que eso es un error de captura.
export const DURACION_MAXIMA = 12 * 60;

const normalizar = (texto = "") =>
	String(texto ?? "")
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase();

// Redondea hacia arriba al bloque de media hora y la deja entre media hora y un
// día de agenda.
export const normalizarDuracion = (minutos) => {
	const valor = Number(minutos);
	if (!Number.isFinite(valor) || valor <= 0) return DURACION_CORTA;
	const enBloques = Math.ceil(valor / PASO_DURACION) * PASO_DURACION;
	return Math.min(DURACION_MAXIMA, Math.max(DURACION_CORTA, enBloques));
};

// Las citas guardadas antes de que existiera la columna llegan sin duración:
// son de media hora, que era lo único que se podía agendar.
export const duracionDeCita = (cita) => normalizarDuracion(cita?.duracion_minutos);

// El catálogo de imagen dice la modalidad; un estudio escrito a mano sólo trae
// su nombre, y ahí se reconoce por cómo se escribe una resonancia.
export const esResonancia = (estudio) => {
	if (normalizar(estudio?.modalidad) === "resonancia") return true;
	const texto = normalizar(`${estudio?.descripcion || ""} ${estudio?.area || ""}`);
	return /\b(resonancia|rm|rmn|irm)\b/.test(texto);
};

export const minutosDeEstudio = (estudio) =>
	esResonancia(estudio) ? MINUTOS_POR_RESONANCIA : MINUTOS_POR_ESTUDIO;

// La suma de lo que aparta cada estudio; sin estudios, media hora.
export const duracionSugerida = (estudios = []) =>
	normalizarDuracion(estudios.reduce((total, estudio) => total + minutosDeEstudio(estudio), 0));

// Los estudios de una cita guardada o de un renglón son texto separado por
// comas -o por "+", como se juntan en el renglón: "mastografía + USG"-; cada
// pieza cuenta como un estudio. `area` ayuda cuando el nombre no
// dice la modalidad -"cráneo simple" abierto desde la columna de Resonancia-.
export const estudiosDesdeTexto = (texto = "", area = "") =>
	String(texto ?? "")
		.split(/[,+]/)
		.map((pieza) => pieza.trim())
		.filter(Boolean)
		.map((descripcion) => ({ descripcion, area }));

export const formatearDuracion = (minutos) => {
	const total = normalizarDuracion(minutos);
	const horas = Math.floor(total / 60);
	const resto = total % 60;
	if (!horas) return `${resto} min`;
	return resto ? `${horas} h ${resto} min` : `${horas} h`;
};

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
