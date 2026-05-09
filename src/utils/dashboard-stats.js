export const calcularIngresosVentasPagadas = (
	ventas = [],
	inicioMes,
	finMes,
) =>
	ventas.reduce((total, venta) => {
		if (venta.estado !== "activo") return total;
		if (venta.fecha_venta < inicioMes || venta.fecha_venta >= finMes) return total;

		const totalVenta = parseFloat(venta.total) || 0;
		const pagoRecibido = parseFloat(venta.pago_recibido) || 0;

		if (pagoRecibido < totalVenta) return total;

		return total + totalVenta;
	}, 0);
