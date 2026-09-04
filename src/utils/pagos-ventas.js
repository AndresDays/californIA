import { esErrorColumnaInexistente, esErrorTablaInexistente } from "./supabase-errors";
import { construirDatosTarjeta, describirPagoTarjeta } from "./pago-tarjeta";

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
		ultimos4 = "",
		codigoAprobacion = "",
		empleado = {},
		user = {},
	} = {},
) => {
	const montoNormalizado = numero(monto);
	if (!supabase || !id_venta || !tipo_movimiento || montoNormalizado <= 0) return null;

	const datosTarjeta = construirDatosTarjeta({
		formaPago: forma_pago,
		ultimos4,
		codigoAprobacion,
	});
	const referenciaTarjeta = describirPagoTarjeta({
		ultimos4: datosTarjeta.tarjeta_ultimos4,
		codigoAprobacion: datosTarjeta.codigo_aprobacion,
	});

	const payload = {
		id_venta,
		folio,
		tipo_movimiento,
		monto: montoNormalizado,
		forma_pago,
		referencia: referencia || referenciaTarjeta,
		motivo,
		id_sucursal,
		sucursal,
		...datosTarjeta,
		...obtenerActor(empleado, user),
	};

	const insertar = (datos) => supabase.from("movimientos_pago_venta").insert(datos);

	let { error } = await insertar(payload);
	// Si la base todavía no tiene la migración de tarjeta, el movimiento no se
	// pierde: los datos ya viajan en `referencia`.
	if (
		error &&
		(esErrorColumnaInexistente(error, "tarjeta_ultimos4") ||
			esErrorColumnaInexistente(error, "codigo_aprobacion"))
	) {
		const sinTarjeta = { ...payload };
		delete sinTarjeta.tarjeta_ultimos4;
		delete sinTarjeta.codigo_aprobacion;
		({ error } = await insertar(sinTarjeta));
	}
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

// A qué renglón del corte va cada forma de pago.
//
// La forma se guarda como texto libre y ha cambiado de escritura con los años:
// hay "tarjeta", "tarjeta_debito", "Tarjeta Crédito" con acento y sin él. La
// clasificación se hace en un solo lugar para que el corte de caja y el reporte
// de ventas no acaben sumando distinto lo mismo.
//
// Una tarjeta que no dice si es de crédito cuenta como débito, que es la lectura
// prudente: es la forma más común en mostrador y el total de bancos no cambia
// de cualquier manera.
export const clasificarFormaPago = (formaPago = "") => {
	const forma = String(formaPago || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim()
		.toLowerCase();

	if (!forma) return "otro";
	if (forma.includes("efectivo")) return "efectivo";
	if (forma.includes("transfer")) return "transferencia";
	if (forma.includes("credito")) return "tarjeta_credito";
	if (forma.includes("tarjeta")) return "tarjeta_debito";
	return "otro";
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
