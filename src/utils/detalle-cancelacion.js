// El detalle de una solicitud cancelada, para el aviso de la campana.
//
// Antes el aviso llevaba a Editar solicitud, que sólo lista órdenes activas: la
// orden cancelada no aparecía ahí y quien recibía el aviso se quedaba mirando
// una lista sin lo que venía a ver. Ahora el aviso abre el detalle de esa orden
// en un modal.
//
// La carga y el formateo van aquí y no dentro del componente para poder
// probarlos: qué se pide a la base, qué pasa si la orden ya no existe y cómo se
// arma cada renglón son justo las partes que se rompen en silencio.

import { esErrorTablaInexistente } from "./supabase-errors";
import { EVENTOS_SOLICITUD } from "./solicitud-auditoria";

const SELECT_VENTA = `
	id_venta, folio, fecha_venta, estado, subtotal, descuento, total,
	pago_recibido, forma_pago, observaciones, motivo_cancelacion, cancelada_en,
	empresas (nombre),
	clientes (nombre),
	pacientes (nombre, fecha_nacimiento, telefono),
	estudios_venta (id_estudio_venta, clave_estudio, descripcion_estudio, precio, area)
`;

export const cargarDetalleCancelacion = async (supabase, idVenta) => {
	if (!supabase || !idVenta) return { detalle: null, error: null };

	const { data: venta, error } = await supabase
		.from("ventas")
		.select(SELECT_VENTA)
		.eq("id_venta", idVenta)
		.maybeSingle();

	if (error) return { detalle: null, error };
	if (!venta) return { detalle: null, error: null };

	// Quién canceló no está en `ventas`: vive en la auditoría. Si la tabla no
	// existe todavía, el detalle se muestra sin ese dato en vez de fallar.
	let actor = null;
	const { data: eventos, error: errorAuditoria } = await supabase
		.from("solicitudes_auditoria")
		.select("evento, actor_nombre, actor_rol, created_at, detalles")
		.eq("id_venta", idVenta)
		.eq("evento", EVENTOS_SOLICITUD.CANCELADA)
		.order("created_at", { ascending: false })
		.limit(1);

	if (errorAuditoria) {
		if (!esErrorTablaInexistente(errorAuditoria, "solicitudes_auditoria")) {
			console.warn("No se pudo leer quien cancelo la orden:", errorAuditoria);
		}
	} else {
		actor = eventos?.[0] || null;
	}

	return { detalle: { venta, actor }, error: null };
};

const pesos = (valor) =>
	`$${(Number(valor) || 0).toLocaleString("es-MX", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;

const fechaHora = (valor) => {
	if (!valor) return "";
	const fecha = new Date(valor);
	if (Number.isNaN(fecha.getTime())) return "";
	return fecha.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
};

export const calcularEdadDetalle = (fechaNacimiento) => {
	if (!fechaNacimiento) return "";
	const nacimiento = new Date(fechaNacimiento);
	if (Number.isNaN(nacimiento.getTime())) return "";
	const hoy = new Date();
	let edad = hoy.getFullYear() - nacimiento.getFullYear();
	const mes = hoy.getMonth() - nacimiento.getMonth();
	if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad -= 1;
	return edad >= 0 ? `${edad} años` : "";
};

// Lo que se pinta, ya resuelto. Un renglón sin valor no se incluye: media
// pantalla de "N/A" no informa de nada.
export const formatearDetalleCancelacion = (detalle) => {
	if (!detalle?.venta) return null;
	const { venta, actor } = detalle;
	const paciente = venta.pacientes || {};

	const edad = calcularEdadDetalle(paciente.fecha_nacimiento);
	const datos = [
		["Folio", venta.folio],
		["Paciente", paciente.nombre],
		["Edad", edad],
		["Teléfono", paciente.telefono],
		["Convenio", venta.clientes?.nombre || "Particular"],
		["Empresa", venta.empresas?.nombre],
		["Fecha de la orden", fechaHora(venta.fecha_venta)],
		["Forma de pago", venta.forma_pago],
	].filter(([, valor]) => Boolean(valor));

	const cancelacion = [
		// Un motivo de solo espacios es tan vacio como uno nulo: sin el recorte,
		// el bloque salia con un hueco en blanco donde va el dato por el que se
		// abre este modal.
		["Motivo", String(venta.motivo_cancelacion || "").trim() || "Sin motivo capturado"],
		["Canceló", actor?.actor_nombre],
		["Rol", actor?.actor_rol],
		["Fecha de cancelación", fechaHora(venta.cancelada_en || actor?.created_at)],
	].filter(([, valor]) => Boolean(valor));

	const estudios = (venta.estudios_venta || []).map((estudio) => ({
		id: estudio.id_estudio_venta,
		clave: estudio.clave_estudio || "",
		descripcion: estudio.descripcion_estudio || "",
		area: estudio.area || "",
		precio: pesos(estudio.precio),
	}));

	// El importe pagado es lo que importa de una cancelación: si hay dinero
	// recibido, alguien tiene que devolverlo.
	const pagado = Number(venta.pago_recibido) || 0;

	return {
		titulo: `Solicitud cancelada · ${venta.folio || "s/folio"}`,
		datos,
		cancelacion,
		estudios,
		totales: [
			["Subtotal", pesos(venta.subtotal)],
			["Descuento", pesos(venta.descuento)],
			["Total", pesos(venta.total)],
			["Pagado", pesos(pagado)],
		],
		hayPagoPorDevolver: pagado > 0,
		observaciones: venta.observaciones || "",
		sigueCancelada: String(venta.estado || "").toLowerCase() === "cancelado",
	};
};
