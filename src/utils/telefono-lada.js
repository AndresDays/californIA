// El teléfono se guarda como "<lada> <10 dígitos>" y la lada depende del país:
// México marca +52 y Estados Unidos y Canadá comparten +1. Aquí vive la tabla
// para que la captura, la edición y la orden usen exactamente los mismos
// valores y no se pierda la lada al pasar de una pantalla a otra.
export const LADA_MEXICO = "+52";
export const LADA_NORTEAMERICA = "+1";

export const PAISES_LADA = [
	{ pais: "México", lada: LADA_MEXICO },
	{ pais: "Estados Unidos", lada: LADA_NORTEAMERICA },
	{ pais: "Canadá", lada: LADA_NORTEAMERICA },
	{ pais: "Otro", lada: "" },
];

export const PAIS_POR_DEFECTO = "México";

export const ladaDePais = (pais) =>
	PAISES_LADA.find((entrada) => entrada.pais === pais)?.lada ?? "";

// Un teléfono ya guardado sólo trae la lada, no el país: +52 es México y +1 se
// muestra como Estados Unidos, que es el caso común de los dos que la comparten.
export const paisDeLada = (lada) => {
	if (lada === LADA_MEXICO) return "México";
	if (lada === LADA_NORTEAMERICA) return "Estados Unidos";
	return "Otro";
};

// Separa lo capturado de la lada con la que se guardó. Sirve tanto para
// "+52 3221234567" como para "+1 2135551234" o un número pelón de 10 dígitos.
export const separarLada = (valor = "") => {
	const texto = String(valor ?? "").trim();
	const digitos = texto.replace(/\D/g, "");
	const numero = digitos.slice(-10);
	const prefijo = digitos.slice(0, digitos.length - 10);

	if (!texto.startsWith("+") || !prefijo) return { lada: "", numero };

	const lada = `+${prefijo}`;
	return {
		lada: lada === LADA_MEXICO || lada === LADA_NORTEAMERICA ? lada : "",
		numero,
	};
};

// El país manda sobre la lada guardada: es lo que el usuario acaba de elegir en
// el select. Sin número no se guarda una lada sola, que no es un teléfono.
export const unirLada = (pais, numero = "") => {
	const digitos = String(numero ?? "").replace(/\D/g, "");
	if (!digitos) return "";
	const lada = ladaDePais(pais);
	return lada ? `${lada} ${digitos}` : digitos;
};

// Para las pantallas que ya reciben el teléfono completo y sólo lo muestran:
// deja "+1 2135551234" tal cual en vez de recortarlo a los diez dígitos.
export const normalizarTelefonoConLada = (valor = "") => {
	const { lada, numero } = separarLada(valor);
	if (!numero) return "";
	return lada ? `${lada} ${numero}` : numero;
};
