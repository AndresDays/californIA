function crearLotesPendientes(filas, idsConfirmados) {
	const porFolio = new Map();

	for (const fila of filas || []) {
		const id = Number(fila.Id);
		const folio = String(fila.Folio || "").trim();
		const clave = String(fila.clave || "").trim();
		const valor = String(fila.Resultado ?? "").trim();
		if (!Number.isFinite(id) || idsConfirmados.has(id) || !folio || !/^BH\d+$/.test(clave) || !valor) continue;

		if (!porFolio.has(folio)) porFolio.set(folio, new Map());
		const analitos = porFolio.get(folio);
		if (analitos.has(clave)) continue;
		analitos.set(clave, {
			id,
			clave,
			valor,
			unidad: fila.Unidad ? String(fila.Unidad) : null,
			fecha: fila.Fecha ? String(fila.Fecha) : null,
		});
	}

	return [...porFolio.entries()].map(([folio, analitos]) => ({ folio, resultados: [...analitos.values()] }));
}

module.exports = { crearLotesPendientes };
