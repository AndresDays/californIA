import {
	TIPOS_MOVIMIENTO_PAGO,
	registrarMovimientoPagoVenta,
} from "./pagos-ventas";
import {
	EVENTOS_SOLICITUD,
	registrarEventoSolicitud,
} from "./solicitud-auditoria";
import { esErrorColumnaSchemaCache } from "./supabase-errors";

const numero = (valor) => {
	const monto = Number.parseFloat(valor);
	return Number.isFinite(monto) ? monto : 0;
};

export const validarCancelacionVenta = ({ venta, motivo } = {}) => {
	if (!venta) return { valido: false, mensaje: "Seleccione una orden primero" };
	if (!(motivo || "").trim()) {
		return { valido: false, mensaje: "Ingrese el motivo de la cancelación" };
	}
	return { valido: true, mensaje: "" };
};

// Cancelar desde el reporte de ventas hace lo mismo que el botón de cancelar de
// editar solicitud: deja la venta en "cancelado", devuelve a caja lo que ya se
// había pagado y registra el evento en la auditoría del folio.
export const cancelarVenta = async (
	supabase,
	{
		venta,
		folio,
		motivo,
		categoria = null,
		detalle = null,
		formaPago = "efectivo",
		empleado = {},
		user = {},
	} = {},
) => {
	const validacion = validarCancelacionVenta({ venta, motivo });
	if (!validacion.valido) throw new Error(validacion.mensaje);

	const motivoCancelacion = motivo.trim();
	const folioVenta = folio || venta.folio;
	const canceladaEn = new Date().toISOString();
	const cambiosVenta = {
		estado: "cancelado",
		updated_at: canceladaEn,
		motivo_cancelacion: motivoCancelacion,
		cancelada_en: canceladaEn,
	};

	let { error } = await supabase
		.from("ventas")
		.update(cambiosVenta)
		.eq("id_venta", venta.id_venta);
	// Si la base aún no tiene la migración del motivo, la cancelación no puede
	// quedarse atorada: se guarda el estado y el motivo se conserva en la
	// auditoría.
	if (
		error &&
		(esErrorColumnaSchemaCache(error, "motivo_cancelacion") ||
			esErrorColumnaSchemaCache(error, "cancelada_en"))
	) {
		({ error } = await supabase
			.from("ventas")
			.update({ estado: "cancelado", updated_at: canceladaEn })
			.eq("id_venta", venta.id_venta));
	}
	if (error) throw error;

	const pagoActual = numero(venta.pago_recibido);
	if (pagoActual > 0) {
		await registrarMovimientoPagoVenta(supabase, {
			id_venta: venta.id_venta,
			folio: folioVenta,
			tipo_movimiento: TIPOS_MOVIMIENTO_PAGO.CANCELACION,
			monto: pagoActual,
			forma_pago: venta.forma_pago || formaPago,
			motivo: motivoCancelacion,
			empleado,
			user,
		});
	}

	await registrarEventoSolicitud(supabase, {
		id_venta: venta.id_venta,
		folio: folioVenta,
		evento: EVENTOS_SOLICITUD.CANCELADA,
		descripcion: `Solicitud cancelada. Motivo: ${motivoCancelacion}`,
		empleado,
		user,
		detalles: {
			motivo: motivoCancelacion,
			categoria: categoria || null,
			detalle: detalle || null,
		},
	});

	return { motivo: motivoCancelacion, canceladaEn };
};
