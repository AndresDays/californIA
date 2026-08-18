import { GRUPOS_REPORTE_POR_AREA, partirVentasPorArea } from "./reporte-ventas";

const numero = (valor) => {
	const monto = Number.parseFloat(valor);
	return Number.isFinite(monto) ? monto : 0;
};

const esEgreso = (movimiento = {}) =>
	String(movimiento.motivo || "").includes("egreso") ||
	["devolucion", "cancelacion"].includes(String(movimiento.tipo_movimiento || ""));

const claveFormaPago = (formaPago = "") => {
	const forma = String(formaPago || "").toLowerCase();
	if (forma.includes("efectivo")) return "efectivo";
	if (forma.includes("tarjeta")) return "tarjeta";
	if (forma.includes("transfer")) return "transferencia";
	if (forma.includes("credito") || forma.includes("crédito")) return "credito";
	return "otros";
};

const tipoTransaccion = (movimiento = {}) => {
	if (movimiento.motivo === "apertura_caja") return "apertura";
	if (movimiento.motivo === "movimiento_manual_ingreso") return "ingreso manual";
	if (movimiento.motivo === "movimiento_manual_egreso") return "egreso";
	if (String(movimiento.tipo_movimiento || "").includes("cancel")) return "cancelacion";
	if (movimiento.id_venta) return "venta";
	return movimiento.tipo_movimiento || "movimiento";
};

export const construirTransaccionesCorte = ({ movimientos = [], ventas = [] } = {}) => {
	const ventasPorId = new Map(ventas.map((venta) => [String(venta.id_venta), venta]));

	return movimientos.filter((movimiento) => movimiento.motivo !== "apertura_caja").map((movimiento) => {
		const venta = movimiento.id_venta
			? ventasPorId.get(String(movimiento.id_venta))
			: null;
		const signo = esEgreso(movimiento) ? -1 : 1;
		const monto = numero(movimiento.monto) * signo;

		return {
			...movimiento,
			venta,
			monto,
			tipo: tipoTransaccion(movimiento),
			empleadoKey:
				movimiento.actor_auth_uuid ||
				venta?.id_empleado ||
				movimiento.actor_nombre ||
				"sin-empleado",
			empleadoNombre:
				movimiento.actor_nombre ||
				venta?.empleados?.nombre ||
				"Sin empleado",
			paciente: venta?.pacientes?.nombre || "Sin paciente",
			totalVenta: numero(venta?.total),
			pagoVenta: numero(venta?.pago_recibido),
			cambio: numero(venta?.cambio),
			adeudo: Math.max(numero(venta?.total) - numero(venta?.pago_recibido), 0),
			estudios: venta?.estudios_venta || [],
			cliente: venta?.clientes?.nombre || "Particular",
			doctor: venta?.doctores?.nombre || "",
		};
	});
};

export const construirCortesEmpleados = ({ movimientos = [], ventas = [] } = {}) => {
	const transacciones = construirTransaccionesCorte({ movimientos, ventas });
	return construirCortesDesdeTransacciones(transacciones);
};

export const construirCortesDesdeTransacciones = (transacciones = []) => {
	const agrupados = new Map();

	transacciones.forEach((tx) => {
		if (!agrupados.has(tx.empleadoKey)) {
			agrupados.set(tx.empleadoKey, {
				empleadoKey: tx.empleadoKey,
				empleadoNombre: tx.empleadoNombre,
				efectivo: 0,
				tarjeta: 0,
				transferencia: 0,
				credito: 0,
				otros: 0,
				total: 0,
				transacciones: 0,
			});
		}

		const corte = agrupados.get(tx.empleadoKey);
		const forma = claveFormaPago(tx.forma_pago);
		corte[forma] += tx.monto;
		corte.total += tx.monto;
		corte.transacciones += 1;
	});

	return [...agrupados.values()].sort((a, b) => b.total - a.total);
};

const redondearMoneda = (valor) => Math.round((numero(valor) + Number.EPSILON) * 100) / 100;

export const construirTransaccionesCortePorArea = ({ movimientos = [], ventas = [] } = {}) => {
	const ventasPorArea = partirVentasPorArea(ventas);
	const fragmentosPorVenta = new Map();
	GRUPOS_REPORTE_POR_AREA.forEach(({ id }) => {
		(ventasPorArea[id] || []).forEach((venta) => {
			const clave = String(venta.id_venta);
			if (!fragmentosPorVenta.has(clave)) fragmentosPorVenta.set(clave, []);
			fragmentosPorVenta.get(clave).push(venta);
		});
	});

	const resultado = Object.fromEntries(
		GRUPOS_REPORTE_POR_AREA.map(({ id }) => [id, []]),
	);

	movimientos
		.filter((movimiento) => movimiento.id_venta && movimiento.motivo !== "apertura_caja")
		.forEach((movimiento) => {
			const fragmentos = fragmentosPorVenta.get(String(movimiento.id_venta)) || [];
			const transaccionBase = construirTransaccionesCorte({
				movimientos: [movimiento],
				ventas,
			})[0];
			let montoAcumulado = 0;
			fragmentos.forEach((fragmento, index) => {
				const monto = index === fragmentos.length - 1
					? redondearMoneda(transaccionBase.monto - montoAcumulado)
					: redondearMoneda(transaccionBase.monto * fragmento.proporcionAreaReporte);
				montoAcumulado = redondearMoneda(montoAcumulado + monto);
				resultado[fragmento.areaReporte].push({
					...transaccionBase,
					venta: fragmento,
					monto,
					totalVenta: numero(fragmento.total),
					pagoVenta: numero(fragmento.pago_recibido),
					adeudo: numero(fragmento.saldo_reporte),
					estudios: fragmento.estudios_venta,
					areaReporte: fragmento.areaReporte,
				});
			});
		});

	return resultado;
};
