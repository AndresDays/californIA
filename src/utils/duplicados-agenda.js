// Visitas repetidas en la agenda: pasa al programar la semana dos veces, al
// importar y al guardar un formulario que se quedó pensando. Dos tarjetas del
// mismo médico el mismo día ensucian la ruta y luego el reporte cuenta dos
// visitas donde hubo una.

import { claveDeNombre } from "./crm-visitadora";

// Dos visitas son la misma cuando coinciden médico, día y hora. La que no trae
// hora se compara sólo por médico y día: es la misma visita capturada dos
// veces, una con horario y otra sin él.
const claveDeCita = (cita) =>
	[
		cita?.id_doctor ? `d${cita.id_doctor}` : claveDeNombre(cita?.medico_nombre),
		String(cita?.fecha || "").slice(0, 10),
		String(cita?.hora || "").slice(0, 5),
	].join("|");

const claveSinHora = (cita) => claveDeCita(cita).split("|").slice(0, 2).join("|");

// Cuál se queda: la que ya se registró —trae el resultado y el renglón del
// informe—, luego la que tiene hora, y a igualdad la primera capturada.
const puntaje = (cita) =>
	(cita?.id_visita ? 4 : 0) +
	(cita?.estatus === "realizada" ? 2 : 0) +
	(cita?.hora ? 1 : 0);

const masVieja = (uno, otro) =>
	String(uno?.created_at || "").localeCompare(String(otro?.created_at || "")) <= 0 ? uno : otro;

const mejor = (uno, otro) => {
	if (puntaje(uno) !== puntaje(otro)) return puntaje(uno) > puntaje(otro) ? uno : otro;
	return masVieja(uno, otro);
};

export const buscarDuplicadas = (citas = []) => {
	const grupos = new Map();
	for (const cita of citas) {
		// La cancelada ya no estorba en la agenda y puede ser justo el rastro de
		// una visita que se movió: no se toca.
		if (!cita || cita.estatus === "cancelada") continue;
		const clave = claveSinHora(cita);
		grupos.set(clave, [...(grupos.get(clave) ?? []), cita]);
	}

	const duplicados = [];
	for (const grupo of grupos.values()) {
		if (grupo.length < 2) continue;
		const conservar = grupo.reduce(mejor);
		duplicados.push({
			conservar,
			eliminar: grupo.filter((cita) => cita.id_agenda !== conservar.id_agenda),
		});
	}
	return duplicados;
};

export const contarDuplicadas = (duplicados = []) =>
	duplicados.reduce((suma, grupo) => suma + grupo.eliminar.length, 0);
