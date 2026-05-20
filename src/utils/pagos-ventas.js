import { esErrorTablaInexistente } from "./supabase-errors";

export const TIPOS_MOVIMIENTO_PAGO = {
	PAGO_INICIAL: "pago_inicial",
	ABONO: "abono",
	DEVOLUCION: "devolucion",
	CANCELACION: "cancelacion",
	AJUSTE: "ajuste",
};

const numero = (valor) => {
	const monto = Number.parseFloat(valor);
	return Number.isFinite(monto) ? monto : 0;
};

const obtenerActor = (empleado = {}, user = {}) => ({
	actor_nombre: empleado?.nombre || user?.email || "Usuario",
	actor_rol: empleado?.rol || null,
	actor_auth_uuid: user?.id || empleado?.auth_uuid || null,
});

export const registrarMovimientoPagoVenta = async (
	supabase,
	{
		id_venta,
		folio,
		tipo_movimiento,
		monto,
		forma_pago,
		referencia = "",
		motivo = "",
		id_sucursal = null,
		sucursal = "",
		empleado = {},
		user = {},
	} = {},
) => {
	const montoNormalizado = numero(monto);
	if (!supabase || !id_venta || !tipo_movimiento || montoNormalizado <= 0) return null;

	const payload = {
		id_venta,
		folio,
		tipo_movimiento,
		monto: montoNormalizado,
		forma_pago,
		referencia,
		motivo,
		id_sucursal,
		sucursal,
		...obtenerActor(empleado, user),
	};

	const { error } = await supabase.from("movimientos_pago_venta").insert(payload);
	if (error) {
		if (!esErrorTablaInexistente(error, "movimientos_pago_venta")) {
			console.warn("No se pudo registrar movimiento de pago:", error);
		}
		return error;
	}
	return null;
};

export const cargarHistorialPagosVenta = async (supabase, idVenta) => {
	if (!supabase || !idVenta) return [];
	const { data, error } = await supabase
		.from("movimientos_pago_venta")
		.select("*")
		.eq("id_venta", idVenta)
		.order("created_at", { ascending: false });

	if (error) {
		if (!esErrorTablaInexistente(error, "movimientos_pago_venta")) {
			console.warn("No se pudo cargar historial de pagos:", error);
		}
		return [];
	}
	return data || [];
};

export const movimientoSumaCaja = (movimiento = {}) => {
	const monto = numero(movimiento.monto);
	if (
		[TIPOS_MOVIMIENTO_PAGO.DEVOLUCION, TIPOS_MOVIMIENTO_PAGO.CANCELACION].includes(
			movimiento.tipo_movimiento,
		)
	) {
		return -monto;
	}
	return monto;
};

export const resumirMovimientosCaja = (movimientos = []) => {
	const base = {
		efectivo: 0,
		tarjeta: 0,
		transferencia: 0,
		credito: 0,
		cancelaciones: 0,
		adeudos: 0,
		total: 0,
	};

	return movimientos.reduce((resumen, movimiento) => {
		const importe = movimientoSumaCaja(movimiento);
		const formaPago = String(movimiento.forma_pago || "").toLowerCase();
		if (movimiento.tipo_movimiento === TIPOS_MOVIMIENTO_PAGO.CANCELACION) {
			resumen.cancelaciones += numero(movimiento.monto);
		}
		if (formaPago.includes("efectivo")) resumen.efectivo += importe;
		else if (formaPago.includes("tarjeta")) resumen.tarjeta += importe;
		else if (formaPago.includes("transfer")) resumen.transferencia += importe;
		else if (formaPago.includes("credito") || formaPago.includes("crédito")) {
			resumen.credito += importe;
		}
		resumen.total += importe;
		return resumen;
	}, base);
};

export const puedeAutorizarEntregaConAdeudo = (empleado = {}) =>
	["admin", "administrador", "desarrollador"].includes(
		String(empleado?.rol || "").toLowerCase(),
	);
