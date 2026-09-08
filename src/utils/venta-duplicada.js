// Una orden se registraba dos veces —el mismo paciente aparecía como C0001 y
// enseguida como C0002— cuando el guardado se disparaba dos veces: doble clic,
// una red lenta que hacía pensar que no había pasado nada, o volver a la
// pantalla con la captura todavía cargada y guardar de nuevo.
//
// Contra eso hay tres cercos: no dejar que el guardado corra dos veces a la
// vez, no dejar guardar otra vez una captura ya registrada, y avisar cuando la
// base ya tiene una orden igual del mismo paciente hace un momento.

export const MINUTOS_VENTA_DUPLICADA = 10;

const numero = (valor) => {
	const monto = Number.parseFloat(valor);
	return Number.isFinite(monto) ? monto : 0;
};

const mismoImporte = (a, b) => Math.abs(numero(a) - numero(b)) < 0.005;

export const inicioVentanaDuplicados = (
	ahora = new Date(),
	minutos = MINUTOS_VENTA_DUPLICADA,
) => new Date(ahora.getTime() - minutos * 60 * 1000);

// De las ventas recientes del paciente, la que ya cobra lo mismo. Sólo cuentan
// las activas: una cancelada se repone a propósito.
export const buscarVentaDuplicada = ({
	ventas = [],
	total,
	ahora = new Date(),
	minutos = MINUTOS_VENTA_DUPLICADA,
} = {}) => {
	const desde = inicioVentanaDuplicados(ahora, minutos).getTime();
	return (
		ventas.find((venta) => {
			if (String(venta?.estado || "activo") !== "activo") return false;
			if (!mismoImporte(venta?.total, total)) return false;
			const fecha = new Date(venta?.fecha_venta || 0).getTime();
			return Number.isFinite(fecha) && fecha >= desde;
		}) || null
	);
};

export const mensajeVentaDuplicada = (venta = {}) =>
	`Este paciente ya tiene la orden ${venta.folio || ""} por el mismo importe de hace unos minutos. ` +
	"Si de verdad es una orden nueva, vuelva a presionar Guardar para confirmarla.";
