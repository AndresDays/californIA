import { sumarPreciosFinales } from "./precio-final";

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

// Lo que se cobra sale a pesos cerrados, y se cierra renglón por renglón antes
// de sumar: así el total de la orden es exactamente lo que suman sus renglones
// y, cuando la orden se parte en folios, la suma de los folios es el total.
// Redondear sólo al final dejaría descuadres de un peso entre lo que muestra la
// tabla y lo que se cobra.
export const calcularTotalesNuevoPaciente = (
	estudios = [],
	descuentoPercent = 0,
) => {
	const importes = estudios.map(
		(estudio) =>
			(Number(estudio.precio) || 0) * normalizarCantidadEstudio(estudio.cantidad),
	);

	const subtotal = sumarPreciosFinales(importes);
	const total = sumarPreciosFinales(
		importes.map((importe) => aplicarDescuentoPorcentaje(importe, descuentoPercent)),
	);

	// El descuento es la diferencia y no el porcentaje calculado aparte: así los
	// tres números de la pantalla cuadran entre sí.
	return { subtotal, descuento: subtotal - total, total };
};

// Lo que le queda a un renglón con el descuento de la orden aplicado, sin
// cerrar a pesos: el cierre lo hace quien lo va a cobrar o a mostrar, para que
// una sola regla decida los centavos.
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
