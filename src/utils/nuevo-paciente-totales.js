export const calcularTotalesNuevoPaciente = (
	estudios = [],
	descuentoPercent = 0,
) => {
	const subtotal = estudios.reduce(
		(suma, estudio) =>
			suma +
			(Number(estudio.precio) || 0) * (Number(estudio.cantidad) || 0),
		0,
	);
	const descuento = subtotal * ((Number(descuentoPercent) || 0) / 100);

	return { subtotal, descuento, total: subtotal - descuento };
};
