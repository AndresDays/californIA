import { calcularSaldoVentaReporte } from "./reporte-ventas";
import {
	TIPOS_MOVIMIENTO_PAGO,
	registrarMovimientoPagoVenta,
} from "./pagos-ventas";
import {
	EVENTOS_SOLICITUD,
	registrarEventoSolicitud,
} from "./solicitud-auditoria";
import { construirDatosTarjeta, validarPagoTarjeta } from "./pago-tarjeta";
import { esErrorColumnaInexistente } from "./supabase-errors";

const numero = (valor) => {
	const monto = Number.parseFloat(valor);
	return Number.isFinite(monto) ? monto : 0;
};

export const validarAbonoVenta = ({ venta, monto, formaPago, ultimos4, codigoAprobacion } = {}) => {
	const importe = numero(monto);
	const saldo = calcularSaldoVentaReporte(venta);

	if (saldo <= 0) return { valido: false, mensaje: "Este folio no tiene adeudo" };
	if (importe <= 0) return { valido: false, mensaje: "Capture el monto a cobrar" };
	if (importe > saldo) {
		return { valido: false, mensaje: "El monto no puede ser mayor al adeudo" };
	}

	const tarjeta = validarPagoTarjeta({ formaPago, ultimos4, codigoAprobacion });
	if (!tarjeta.valido) return tarjeta;

	return { valido: true, mensaje: "" };
};

// Cobrar el adeudo desde el reporte hace lo mismo que el abono de editar
// solicitud: actualiza la venta, deja el movimiento de caja y el evento en la
// auditoría del folio.
export const registrarAbonoVenta = async (
	supabase,
	{
		venta,
		monto,
		formaPago = "efectivo",
		ultimos4 = "",
		codigoAprobacion = "",
		motivo = "Cobro de adeudo",
		empleado = {},
		user = {},
	} = {},
) => {
	const validacion = validarAbonoVenta({
		venta,
		monto,
		formaPago,
		ultimos4,
		codigoAprobacion,
	});
	if (!validacion.valido) throw new Error(validacion.mensaje);

	const importe = numero(monto);
	const pagoAcumulado = numero(venta.pago_recibido) + importe;
	const adeudo = Math.max(numero(venta.total) - pagoAcumulado, 0);
	const datosTarjeta = construirDatosTarjeta({
		formaPago,
		ultimos4,
		codigoAprobacion,
	});

	const cambios = {
		pago_recibido: pagoAcumulado,
		forma_pago: formaPago,
		updated_at: new Date().toISOString(),
		...datosTarjeta,
	};

	let { error } = await supabase
		.from("ventas")
		.update(cambios)
		.eq("id_venta", venta.id_venta);

	// La base sin la migración de tarjeta no impide cobrar: los datos quedan en
	// el movimiento de pago.
	if (
		error &&
		(esErrorColumnaInexistente(error, "tarjeta_ultimos4") ||
			esErrorColumnaInexistente(error, "codigo_aprobacion"))
	) {
		const sinTarjeta = { ...cambios };
		delete sinTarjeta.tarjeta_ultimos4;
		delete sinTarjeta.codigo_aprobacion;
		({ error } = await supabase
			.from("ventas")
			.update(sinTarjeta)
			.eq("id_venta", venta.id_venta));
	}
	if (error) throw error;

	await registrarMovimientoPagoVenta(supabase, {
		id_venta: venta.id_venta,
		folio: venta.folio,
		tipo_movimiento: TIPOS_MOVIMIENTO_PAGO.ABONO,
		monto: importe,
		forma_pago: formaPago,
		ultimos4,
		codigoAprobacion,
		motivo,
		id_sucursal: venta.id_sucursal ?? null,
		sucursal: venta.sucursal || "",
		empleado,
		user,
	});

	await registrarEventoSolicitud(supabase, {
		id_venta: venta.id_venta,
		folio: venta.folio,
		evento: adeudo > 0 ? EVENTOS_SOLICITUD.ADEUDO_CAMBIADO : EVENTOS_SOLICITUD.COBRADA,
		descripcion:
			adeudo > 0
				? `Abono de $${importe.toFixed(2)} desde el reporte de ventas. Adeudo $${adeudo.toFixed(2)}`
				: `Adeudo liquidado con $${importe.toFixed(2)} desde el reporte de ventas`,
		empleado,
		user,
		detalles: {
			motivo,
			forma_pago: formaPago,
			...datosTarjeta,
			abono: importe,
			pago_anterior: numero(venta.pago_recibido),
			pago_nuevo: pagoAcumulado,
			adeudo_nuevo: adeudo,
		},
	});

	return { pagoRecibido: pagoAcumulado, adeudo };
};
