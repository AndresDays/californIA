export const crearCadenaFirmaTwilio = (url, params) => {
	const entradas = Array.from(params.entries()).sort(([nombreA, valorA], [nombreB, valorB]) =>
		nombreA === nombreB
			? valorA === valorB ? 0 : valorA < valorB ? -1 : 1
			: nombreA < nombreB ? -1 : 1,
	);
	return `${url}${entradas.map(([nombre, valor]) => `${nombre}${valor}`).join("")}`;
};

const aBase64 = (bytes) => {
	let texto = "";
	for (const byte of new Uint8Array(bytes)) texto += String.fromCharCode(byte);
	return btoa(texto);
};

const sonIguales = (izquierdo, derecho) => {
	if (!izquierdo || !derecho || izquierdo.length !== derecho.length) return false;
	let diferencia = 0;
	for (let indice = 0; indice < izquierdo.length; indice += 1) {
		diferencia |= izquierdo.charCodeAt(indice) ^ derecho.charCodeAt(indice);
	}
	return diferencia === 0;
};

export const validarFirmaTwilio = async (authToken, firma, url, params) => {
	if (!authToken || !firma || !url) return false;
	const encoder = new TextEncoder();
	const clave = await crypto.subtle.importKey(
		"raw",
		encoder.encode(authToken),
		{ name: "HMAC", hash: "SHA-1" },
		false,
		["sign"],
	);
	const firmaEsperada = await crypto.subtle.sign(
		"HMAC",
		clave,
		encoder.encode(crearCadenaFirmaTwilio(url, params)),
	);
	return sonIguales(aBase64(firmaEsperada), firma);
};
