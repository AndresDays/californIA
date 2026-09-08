// Editar una solicitud pide motivo porque cambia lo que ya se cobró o lo que
// se le va a hacer al paciente. Pero cuando lo único que pasa es que el
// paciente vino a completar lo que debía, no hay nada que justificar: el
// motivo es el abono mismo, y pedirlo sólo entorpece el cobro en mostrador.

const numero = (valor) => {
	const monto = Number.parseFloat(valor);
	return Number.isFinite(monto) ? monto : 0;
};

const CENTAVO = 0.005;

const mismoImporte = (a, b) => Math.abs(numero(a) - numero(b)) < CENTAVO;

const mismoId = (a, b) =>
	String(a ?? "") === String(b ?? "") ||
	(!a && !b);

// Los estudios se comparan por clave y precio: un renglón agregado, quitado o
// reprecificado ya no es un abono.
const firmaEstudios = (estudios = []) =>
	estudios
		.map((estudio) => {
			const clave = estudio?.clave ?? estudio?.clave_estudio ?? "";
			const precio = numero(estudio?.precio).toFixed(2);
			const muestra = estudio?.muestra_pendiente ? "1" : "0";
			return `${clave}:${precio}:${muestra}`;
		})
		.sort()
		.join("|");

export const MOTIVO_ABONO = "Abono a la solicitud";

// ¿La edición es sólo un abono? Todo lo demás debe seguir igual que en la
// orden guardada y tiene que haber un pago nuevo mayor a cero.
export const esSoloAbono = ({ orden, estudios = [], clienteSeleccionado, idDoctor, granTotal, pagoNuevo } = {}) => {
	if (!orden) return false;
	if (numero(pagoNuevo) <= 0) return false;
	if (!mismoImporte(granTotal, orden.total)) return false;
	if (!mismoId(clienteSeleccionado || null, orden.id_cliente)) return false;
	if (!mismoId(idDoctor || null, orden.id_doctor)) return false;
	return firmaEstudios(estudios) === firmaEstudios(orden.estudios_venta || []);
};

// El motivo que se guarda: el que capturó quien edita, o el del abono cuando
// no hizo falta pedirlo.
export const resolverMotivoEdicion = ({ motivo = "", soloAbono = false } = {}) => {
	const capturado = String(motivo || "").trim();
	if (capturado) return capturado;
	return soloAbono ? MOTIVO_ABONO : "";
};
