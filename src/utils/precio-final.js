// El redondeo de la casa: lo que se cobra sale a pesos cerrados.
//
// De 1 a 60 centavos se baja al peso y de 61 a 99 se sube al siguiente. No es
// el redondeo de la escuela -que parte en 50- sino el que se acordó en
// mostrador, y va en un solo lugar para que la pantalla, el ticket y lo que se
// guarda cobren exactamente lo mismo.
export const CENTAVOS_QUE_BAJAN = 0.6;

export const redondearPrecioFinal = (valor) => {
	const monto = Number(valor);
	if (!Number.isFinite(monto)) return 0;

	const signo = monto < 0 ? -1 : 1;
	const absoluto = Math.abs(monto);
	const entero = Math.floor(absoluto);
	// Los centavos se cierran a dos decimales antes de comparar: 0.61 en binario
	// es 0.6099999… y sin esto se iría para abajo.
	const centavos = Math.round((absoluto - entero) * 100) / 100;

	return signo * (centavos > CENTAVOS_QUE_BAJAN ? entero + 1 : entero);
};

// Sumar importes ya redondeados, en vez de redondear la suma: así el total de
// la orden es exactamente lo que suman sus renglones y ningún folio queda
// descuadrado por un peso.
export const sumarPreciosFinales = (importes = []) =>
	importes.reduce((suma, importe) => suma + redondearPrecioFinal(importe), 0);
