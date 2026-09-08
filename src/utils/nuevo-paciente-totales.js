// Tope de unidades por renglón: alto para que no estorbe en una orden real, pero
// finito para que un click repetido por accidente en el "+" no dispare el cobro.
export const CANTIDAD_MAXIMA_ESTUDIO = 99;

// Los renglones capturados antes de que existiera el control de cantidad —los
// borradores vivos en producción y las cotizaciones ya guardadas— no traen el
// campo: se asumen como una unidad para que la orden cobre lo que muestra la
// pantalla en lugar de quedarse en $0.
export const normalizarCantidadEstudio = (cantidad) => {
	const unidades = Math.trunc(Number(cantidad));
	if (!Number.isFinite(unidades) || unidades < 1) return 1;
	return Math.min(unidades, CANTIDAD_MAXIMA_ESTUDIO);
};

export const calcularTotalesNuevoPaciente = (
	estudios = [],
	descuentoPercent = 0,
) => {
	const subtotal = estudios.reduce(
		(suma, estudio) =>
			suma +
			(Number(estudio.precio) || 0) * normalizarCantidadEstudio(estudio.cantidad),
		0,
	);
	const descuento = subtotal * ((Number(descuentoPercent) || 0) / 100);

	return { subtotal, descuento, total: subtotal - descuento };
};

// Lo que le queda a un renglón con el descuento de la orden aplicado. Es para
// que la tabla muestre el precio que se va a cobrar; el total de la orden se
// sigue calculando sobre el subtotal, así que la suma de los renglones puede
// diferir en centavos por el redondeo de cada uno.
export const aplicarDescuentoPorcentaje = (importe, descuentoPercent = 0) => {
	const monto = Number(importe) || 0;
	const porcentaje = Number(descuentoPercent) || 0;
	if (porcentaje <= 0) return monto;
	return monto - monto * (Math.min(porcentaje, 100) / 100);
};

// La venta se guarda con un renglón por unidad: estudios_venta no tiene columna
// de cantidad, y cada unidad necesita su propia captura, su etiqueta y su
// resultado. Así la suma de los renglones guardados sigue cuadrando con el
// total que se le cobró al paciente.
export const expandirEstudiosPorCantidad = (estudios = []) =>
	estudios.flatMap((estudio) =>
		Array.from({ length: normalizarCantidadEstudio(estudio?.cantidad) }, () => ({
			...estudio,
			cantidad: 1,
		})),
	);
