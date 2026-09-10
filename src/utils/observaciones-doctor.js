// Observaciones sobre un doctor: lo que el personal se entera mientras captura
// -que cambió de consultorio, que pidió que le llamen antes de mandar
// resultados- y que hoy se contaba de palabra y se perdía.
//
// Es una bitácora: se agregan, no se corrigen, para que quede el historial de
// lo que se fue sabiendo y quién lo anotó.

export const LARGO_MINIMO_OBSERVACION = 5;
export const LARGO_MAXIMO_OBSERVACION = 500;

export const validarObservacionDoctor = (texto = "") => {
	const limpio = String(texto || "").trim();
	if (!limpio) return "Escribe la observación";
	if (limpio.length < LARGO_MINIMO_OBSERVACION) {
		return `Escribe al menos ${LARGO_MINIMO_OBSERVACION} caracteres`;
	}
	return "";
};

export const construirObservacionDoctor = ({ doctor = {}, texto = "", empleado = {} } = {}) => ({
	id_doctor: doctor?.id_doctor ?? doctor?.id ?? null,
	observacion: String(texto || "").trim().slice(0, LARGO_MAXIMO_OBSERVACION),
	id_empleado: empleado?.id_empleado ?? null,
	creado_por_nombre: empleado?.nombre || null,
});

export const formatearFechaObservacion = (fecha) => {
	if (!fecha) return "";
	const valor = new Date(fecha);
	if (Number.isNaN(valor.getTime())) return String(fecha);
	return valor.toLocaleString("es-MX", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "America/Mexico_City",
	});
};
