// En qué franja del calendario cae cada visita. Vive fuera del componente para
// poder probar los casos de orilla —la visita sin hora, la de las seis de la
// mañana— sin montar la pantalla entera.

// Las horas a las que se consulta; fuera de esto no hay consultorio abierto.
export const HORA_INICIO = 7;
export const HORA_FIN = 20;

export const HORAS_AGENDA = Array.from(
	{ length: HORA_FIN - HORA_INICIO + 1 },
	(_, indice) => HORA_INICIO + indice,
);

export const horaDeCita = (cita) => {
	const hora = Number(String(cita?.hora || "").slice(0, 2));
	return Number.isFinite(hora) && String(cita?.hora || "").includes(":") ? hora : null;
};

// La visita de las 6 de la mañana o la de las 10 de la noche existen aunque la
// rejilla no llegue hasta ahí: se arriman a la primera o la última franja en
// vez de desaparecer de la pantalla.
export const franjaDeCita = (cita) => {
	const hora = horaDeCita(cita);
	if (hora === null) return null;
	return Math.min(HORA_FIN, Math.max(HORA_INICIO, hora));
};

export const horaDeFranja = (hora) => (hora === null ? null : `${String(hora).padStart(2, "0")}:00`);
