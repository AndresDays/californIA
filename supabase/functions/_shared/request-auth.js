export const esSecretoBearerValido = (authorization, secretoEsperado) => {
	if (!secretoEsperado || !authorization?.startsWith("Bearer ")) return false;

	const recibido = authorization.slice("Bearer ".length);
	if (recibido.length !== secretoEsperado.length) return false;

	let diferencia = 0;
	for (let indice = 0; indice < recibido.length; indice += 1) {
		diferencia |= recibido.charCodeAt(indice) ^ secretoEsperado.charCodeAt(indice);
	}
	return diferencia === 0;
};
