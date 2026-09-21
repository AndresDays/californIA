// Mover una visita de día se hacía escribiendo la fecha a mano en un aviso del
// navegador. Arrastrando la tarjeta es lo natural en una agenda, pero la
// decisión de qué se puede soltar y dónde vive aquí, fuera del componente, para
// poder probarla sin simular un arrastre real.

// Sólo se arrastra lo que sigue por hacer: la visita ya registrada quedó con su
// resultado en el informe y moverla de día falsearía cuándo se hizo.
export const puedeArrastrarse = (cita) => cita?.estatus === "programada";

// Una celda es un día y una hora; la franja "sin hora" del día lleva hora nula,
// que es donde caen las visitas a las que todavía no se les puso hora.
export const idDeCelda = (fecha, hora = null) => `celda-${fecha}-${hora ?? "sinhora"}`;

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

// Devuelve el movimiento a ejecutar, o null cuando no hay nada que hacer: se
// soltó fuera de un día, sobre el mismo día, o la visita no era movible.
export const movimientoDeArrastre = (evento) => {
	const cita = evento?.active?.data?.current?.cita;
	const celda = evento?.over?.data?.current;
	const destino = celda?.fecha;
	if (!cita || !destino) return null;
	if (!puedeArrastrarse(cita)) return null;
	// La celda sin hora no le quita la que ya tenía: soltar ahí es mover de día,
	// no borrar el horario que se acordó con el consultorio.
	const hora = celda.hora === undefined ? null : horaDeFranja(celda.hora);
	const mismoDia = String(cita.fecha).slice(0, 10) === destino;
	const mismaHora = hora === null || String(cita.hora || "").slice(0, 5) === hora;
	if (mismoDia && mismaHora) return null;
	return { cita, fecha: destino, ...(hora ? { hora } : {}) };
};
