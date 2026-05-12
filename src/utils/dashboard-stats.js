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

const numero = (valor) => Number(valor) || 0;

const normalizarTexto = (valor = "") =>
	String(valor)
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase();

export const esEstudioRadiologiaDashboard = (estudio = {}) => {
	const texto = normalizarTexto(
		`${estudio.clave_estudio || ""} ${estudio.descripcion_estudio || ""} ${estudio.area || ""}`,
	);
	return (
		/^(rm|rx|tac|us|ec|uo|vet)-/.test(texto) ||
		/\b(rm|rx|tac|us)\b|radiologia|imagen|rayos|ultrasonido|ultrasonografia|tomografia|resonancia|mastografia|contrastados|veterinaria/.test(
			texto,
		)
	);
};

export const calcularIngresosPorAreaVentasPagadas = (ventas = []) =>
	ventas.reduce(
		(acumulado, venta) => {
			if (venta.estado !== "activo") return acumulado;

			const totalVenta = numero(venta.total);
			const pagoRecibido = numero(venta.pago_recibido);
			if (pagoRecibido < totalVenta) return acumulado;

			const estudios = venta.estudios_venta || [];
			if (estudios.length === 0) {
				acumulado.laboratorio += totalVenta;
				acumulado.total += totalVenta;
				return acumulado;
			}

			const base = estudios.reduce(
				(sumas, estudio) => {
					const precio = numero(estudio.precio);
					if (esEstudioRadiologiaDashboard(estudio)) {
						sumas.radiologia += precio;
					} else {
						sumas.laboratorio += precio;
					}
					return sumas;
				},
				{ radiologia: 0, laboratorio: 0 },
			);
			const sumaBase = base.radiologia + base.laboratorio;
			const factor = sumaBase > 0 ? totalVenta / sumaBase : 1;

			acumulado.radiologia += base.radiologia * factor;
			acumulado.laboratorio += base.laboratorio * factor;
			acumulado.total += totalVenta;
			return acumulado;
		},
		{ radiologia: 0, laboratorio: 0, total: 0 },
	);
