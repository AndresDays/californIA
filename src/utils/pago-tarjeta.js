// Los pagos con tarjeta necesitan comprobante: los últimos 4 dígitos y el
// código de aprobación de la terminal son lo que permite conciliar el cobro
// con el estado de cuenta cuando el paciente reclama.

export const LONGITUD_ULTIMOS_4 = 4;
export const LONGITUD_MAXIMA_CODIGO = 12;

export const esPagoConTarjeta = (formaPago) =>
	String(formaPago || "")
		.toLowerCase()
		.includes("tarjeta");

export const normalizarUltimos4 = (valor) =>
	String(valor ?? "")
		.replace(/\D/g, "")
		.slice(0, LONGITUD_ULTIMOS_4);

export const normalizarCodigoAprobacion = (valor) =>
	String(valor ?? "")
		.replace(/[^a-zA-Z0-9]/g, "")
		.toUpperCase()
		.slice(0, LONGITUD_MAXIMA_CODIGO);

export const validarPagoTarjeta = ({
	formaPago,
	ultimos4,
	codigoAprobacion,
} = {}) => {
	if (!esPagoConTarjeta(formaPago)) return { valido: true, mensaje: "" };

	if (normalizarUltimos4(ultimos4).length !== LONGITUD_ULTIMOS_4) {
		return {
			valido: false,
			mensaje: "Capture los últimos 4 dígitos de la tarjeta",
		};
	}
	if (!normalizarCodigoAprobacion(codigoAprobacion)) {
		return {
			valido: false,
			mensaje: "Capture el código de aprobación de la tarjeta",
		};
	}
	return { valido: true, mensaje: "" };
};

// Texto corto para el ticket, el historial de pagos y la columna `referencia`
// de los movimientos, que ya existía para este tipo de dato.
export const describirPagoTarjeta = ({ ultimos4, codigoAprobacion } = {}) => {
	const digitos = normalizarUltimos4(ultimos4);
	const codigo = normalizarCodigoAprobacion(codigoAprobacion);
	const partes = [];
	if (digitos) partes.push(`****${digitos}`);
	if (codigo) partes.push(`Aprob. ${codigo}`);
	return partes.join(" · ");
};

// Campos que se mandan a `ventas` y a `movimientos_pago_venta`. Con una forma
// de pago que no es tarjeta se limpian, para que un cambio de forma de pago no
// deje pegados los datos de un cobro anterior.
export const construirDatosTarjeta = ({
	formaPago,
	ultimos4,
	codigoAprobacion,
} = {}) => {
	if (!esPagoConTarjeta(formaPago)) {
		return { tarjeta_ultimos4: null, codigo_aprobacion: null };
	}
	return {
		tarjeta_ultimos4: normalizarUltimos4(ultimos4) || null,
		codigo_aprobacion: normalizarCodigoAprobacion(codigoAprobacion) || null,
	};
};
