// Mover una visita de día se hacía escribiendo la fecha a mano en un aviso del
// navegador. Arrastrando la tarjeta es lo natural en una agenda, pero la
// decisión de qué se puede soltar y dónde vive aquí, fuera del componente, para
// poder probarla sin simular un arrastre real.

// Sólo se arrastra lo que sigue por hacer: la visita ya registrada quedó con su
// resultado en el informe y moverla de día falsearía cuándo se hizo.
export const puedeArrastrarse = (cita) => cita?.estatus === "programada";

export const idDeDia = (fecha) => `dia-${fecha}`;

// Devuelve el movimiento a ejecutar, o null cuando no hay nada que hacer: se
// soltó fuera de un día, sobre el mismo día, o la visita no era movible.
export const movimientoDeArrastre = (evento) => {
	const cita = evento?.active?.data?.current?.cita;
	const destino = evento?.over?.data?.current?.fecha;
	if (!cita || !destino) return null;
	if (!puedeArrastrarse(cita)) return null;
	if (String(cita.fecha).slice(0, 10) === destino) return null;
	return { cita, fecha: destino };
};
