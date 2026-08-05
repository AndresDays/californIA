const texto = (valor) => String(valor ?? "").trim();

export const construirLoteSwelab = (filas = []) => {
	if (!Array.isArray(filas) || filas.length === 0) {
		throw new Error("Se requiere al menos un resultado Swelab");
	}

	const folio = texto(filas[0].folio);
	if (!folio) throw new Error("El folio Swelab es obligatorio");

	const resultados = {};
	const idsOrigen = [];
	for (const fila of filas) {
		if (texto(fila.folio) !== folio) {
			throw new Error("El lote contiene más de un folio");
		}
		const clave = texto(fila.clave).toUpperCase();
		if (!/^BH\d+$/.test(clave)) {
			throw new Error("El lote contiene una clave que no pertenece a BHC");
		}
		if (Object.hasOwn(resultados, clave)) {
			throw new Error(`El lote contiene un analito duplicado: ${clave}`);
		}
		if (fila.id === null || fila.id === undefined || texto(fila.id) === "") {
			throw new Error("Cada resultado requiere su ID de origen");
		}
		const resultado = texto(fila.resultado);
		if (!resultado) throw new Error(`El resultado ${clave} está vacío`);

		idsOrigen.push(fila.id);
		resultados[clave] = resultado;
	}

	return { folio, idsOrigen, resultados };
};
