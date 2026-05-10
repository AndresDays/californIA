const COLORES_TOP = ["#53B9DB", "#49B2D4", "#106DA0", "#1a7ab8", "#0d5580"];
export const SIN_SUCURSAL_REPORTE = "__sin_sucursal";

const numero = (valor) => Number(valor) || 0;

export const formatoMonedaReporte = (valor) =>
	`$${numero(valor).toLocaleString("es-MX", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;

export const obtenerIdSucursalVenta = (venta) =>
	venta?.id_sucursal ||
	venta?.citas?.id_sucursal ||
	venta?.citas?.sucursales?.id_sucursal ||
	venta?.estudios_venta?.find((estudio) => estudio.id_sucursal)?.id_sucursal ||
	"";

export const calcularSaldoVentaReporte = (venta) =>
	Math.max(numero(venta?.total) - numero(venta?.pago_recibido), 0);

export const calcularMetricasVentas = (ventas = []) => {
	const totalVentas = ventas.reduce((total, venta) => total + numero(venta.total), 0);
	const adeudosPendientes = ventas.reduce(
		(total, venta) => total + calcularSaldoVentaReporte(venta),
		0,
	);

	return {
		totalVentas,
		ordenes: ventas.length,
		ticketPromedio: ventas.length ? totalVentas / ventas.length : 0,
		adeudosPendientes,
		pacientesConSaldo: ventas.filter((venta) => calcularSaldoVentaReporte(venta) > 0)
			.length,
	};
};

export const filtrarVentasReporte = (ventas = [], filtros = {}) => {
	const estudio = (filtros.estudio || "").trim().toLowerCase();

	return ventas.filter((venta) => {
		if (
			filtros.sucursal === SIN_SUCURSAL_REPORTE &&
			obtenerIdSucursalVenta(venta)
		) {
			return false;
		}
		if (
			filtros.sucursal &&
			filtros.sucursal !== SIN_SUCURSAL_REPORTE &&
			String(obtenerIdSucursalVenta(venta)) !== String(filtros.sucursal)
		) {
			return false;
		}
		if (filtros.vendedor && String(venta.id_empleado || "") !== String(filtros.vendedor)) {
			return false;
		}
		if (filtros.formaPago && venta.forma_pago !== filtros.formaPago) return false;
		if (filtros.cliente && String(venta.id_cliente || "") !== String(filtros.cliente)) {
			return false;
		}
		if (filtros.doctor && String(venta.id_doctor || "") !== String(filtros.doctor)) {
			return false;
		}
		if (
			filtros.area &&
			!venta.estudios_venta?.some((item) => item.area === filtros.area)
		) {
			return false;
		}
		if (
			estudio &&
			!venta.estudios_venta?.some((item) =>
				[item.clave_estudio, item.descripcion_estudio]
					.filter(Boolean)
					.join(" ")
					.toLowerCase()
					.includes(estudio),
			)
		) {
			return false;
		}
		return true;
	});
};

export const agruparVentasPorDia = (ventas = []) => {
	const porDia = ventas.reduce((acc, venta) => {
		const fecha = new Date(venta.fecha_venta);
		const key = Number.isNaN(fecha.getTime())
			? "Sin fecha"
			: fecha.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit" });
		acc[key] = (acc[key] || 0) + numero(venta.total);
		return acc;
	}, {});

	return Object.entries(porDia).map(([label, total]) => ({ label, total }));
};

export const agruparEstudiosVendidos = (ventas = []) => {
	const maxTotal = { value: 0 };
	const agrupados = ventas.reduce((acc, venta) => {
		(venta.estudios_venta || []).forEach((estudio) => {
			const name = estudio.descripcion_estudio || estudio.clave_estudio || "Sin estudio";
			if (!acc[name]) acc[name] = { name, count: 0, total: 0 };
			acc[name].count += 1;
			acc[name].total += numero(estudio.precio);
			maxTotal.value = Math.max(maxTotal.value, acc[name].total);
		});
		return acc;
	}, {});

	return Object.values(agrupados)
		.sort((a, b) => b.count - a.count || b.total - a.total)
		.slice(0, 5)
		.map((item, index) => ({
			...item,
			pct: maxTotal.value ? Math.round((item.total / maxTotal.value) * 100) : 0,
			color: COLORES_TOP[index] || COLORES_TOP[COLORES_TOP.length - 1],
		}));
};

export const agruparVentasPorVendedor = (ventas = []) => {
	const agrupados = ventas.reduce((acc, venta) => {
		const id = venta.id_empleado || "sin-vendedor";
		const name = venta.empleados?.nombre || "Sin vendedor";
		if (!acc[id]) acc[id] = { name, amount: 0, orders: 0 };
		acc[id].amount += numero(venta.total);
		acc[id].orders += 1;
		return acc;
	}, {});

	return Object.values(agrupados).sort((a, b) => b.amount - a.amount);
};

export const crearCsvVentas = (ventas = []) => {
	const filas = [
		["Folio", "Fecha", "Paciente", "Cliente", "Forma de pago", "Total", "Pago", "Adeudo"],
		...ventas.map((venta) => [
			venta.folio || "",
			venta.fecha_venta || "",
			venta.pacientes?.nombre || "",
			venta.clientes?.nombre || "Particular",
			venta.forma_pago || "",
			numero(venta.total).toFixed(2),
			numero(venta.pago_recibido).toFixed(2),
			calcularSaldoVentaReporte(venta).toFixed(2),
		]),
	];

	return filas
		.map((fila) =>
			fila
				.map((valor) => `"${String(valor).replaceAll('"', '""')}"`)
				.join(","),
		)
		.join("\n");
};
