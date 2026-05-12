export const normalizarTelefono10 = (valor = "") =>
	String(valor).replace(/\D/g, "").slice(-10);

export const esTelefono10Digitos = (valor = "") => /^\d{10}$/.test(String(valor));

export const esEmailValido = (valor = "") =>
	/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(valor).trim());

export const normalizarPorcentaje = (valor, min = 0, max = 100) => {
	if (valor === "") return "";
	const numero = Number(valor);
	if (!Number.isFinite(numero)) return min;
	return Math.min(Math.max(numero, min), max);
};
