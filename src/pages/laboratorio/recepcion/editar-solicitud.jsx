import { Fragment, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import calendarioIcono from "../../../assets/calendarioIcono.png";
import cancelarBtn from "../../../assets/cancelarBtn.png";
import doctorIcono from "../../../assets/doctorIcono.png";
import eliminarIconoV2 from "../../../assets/eliminarIconoV2.png";
import empresaIcono from "../../../assets/empresaIcono.png";
import imprimirIcono from "../../../assets/imprimirIcono.png";
import lupaIcono from "../../../assets/lupaIcono.png";
import muestrasBtn from "../../../assets/muestrasBtn.png";
import pacienteIcono from "../../../assets/pacienteIcono.png";
import ModalMotivoCancelacion from "../../../components/modal-motivo-cancelacion";
import ModalNotificacion from "../../../components/ModalNotificacion";
import PageLayout from "../../../components/page-layout.jsx";
import { useAuth } from "../../../context/auth-context";
import { supabase } from "../../../lib/supabase-client";
import { consultarClientesSeleccionables } from "../../../utils/clientes-seleccionables";
import { invalidarConsultasDeVentas } from "../../../utils/invalidar-consultas-ventas";
import { useBusquedaPersistente } from "../../../hooks/use-busqueda-persistente";
import {
	generarTicketVenta,
	resolverEmpresaTicketReimpresion,
} from "../../../utils/generarTicketVenta";
import { generarEtiquetasOrden } from "../../../utils/generar-etiquetas-orden";
import { esEstudioImagenCaptura } from "../../../utils/captura-row-status";
import {
	EVENTOS_SOLICITUD,
	formatearEventoAuditoria,
	registrarEventoSolicitud,
} from "../../../utils/solicitud-auditoria";
import {
	TIPOS_MOVIMIENTO_PAGO,
	cargarHistorialPagosVenta,
	registrarMovimientoPagoVenta,
} from "../../../utils/pagos-ventas";
import {
	construirDatosTarjeta,
	esPagoConTarjeta,
	normalizarCodigoAprobacion,
	normalizarUltimos4,
	validarPagoTarjeta,
} from "../../../utils/pago-tarjeta";
import {
	esErrorColumnaSchemaCache,
	esErrorTablaInexistente,
} from "../../../utils/supabase-errors";
import { normalizarFolio } from "../../../utils/folios";
import ModalMuestrasPendientes from "../componentes/modal-muestras-pendientes";
import "./editar-solicitud.css";

const EditarSolicitud = () => {
	const queryClient = useQueryClient();
	const { user } = useAuth();

	const [empleadoData, setEmpleadoData] = useState(null);
	const [rangoFecha, setRangoFecha] = useState("hoy");
	const [buscarPaciente, setBuscarPaciente] = useBusquedaPersistente("editar-solicitud:paciente");
	const [ordenes, setOrdenes] = useState([]);
	const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
	const [motivoModificacion, setMotivoModificacion] = useState("");
	const [modalCancelacionAbierto, setModalCancelacionAbierto] = useState(false);
	const [folio, setFolio] = useState("");
	const [clientes, setClientes] = useState([]);
	const [clienteSeleccionado, setClienteSeleccionado] = useState("");
	const [medicoBusqueda, setMedicoBusqueda] = useState("");
	const [medicosEncontrados, setMedicosEncontrados] = useState([]);
	const [medicoSeleccionado, setMedicoSeleccionado] = useState(null);
	const [showBusquedaMedicos, setShowBusquedaMedicos] = useState(false);
	const [recepcionistas, setRecepcionistas] = useState([]);
	const [recepcionistaSeleccionado, setRecepcionistaSeleccionado] = useState("");
	const [buscarEstudio, setBuscarEstudio] = useBusquedaPersistente("editar-solicitud:estudio");
	const [estudiosDisponibles, setEstudiosDisponibles] = useState([]);
	const [estudiosSeleccionados, setEstudiosSeleccionados] = useState([]);
	const [showBusquedaEstudios, setShowBusquedaEstudios] = useState(false);
	const [formaPago, setFormaPago] = useState("efectivo");
	const [tarjetaUltimos4, setTarjetaUltimos4] = useState("");
	const [codigoAprobacion, setCodigoAprobacion] = useState("");
	const [ivaPercent, setIvaPercent] = useState(0);
	const [descuentoPercent, setDescuentoPercent] = useState(0);
	const [subtotal, setSubtotal] = useState(0);
	const [iva, setIva] = useState(0);
	const [totalConIva, setTotalConIva] = useState(0);
	const [descuento, setDescuento] = useState(0);
	const [granTotal, setGranTotal] = useState(0);
	const [abono, setAbono] = useState(0);
	const [adeudo, setAdeudo] = useState(0);
	const [pago, setPago] = useState("");
	const [vendedor, setVendedor] = useState("");
	const [notificacion, setNotificacion] = useState({
		isOpen: false,
		mensaje: "",
		tipo: "exito",
	});
	const [historialPagos, setHistorialPagos] = useState([]);
	const [timelineAuditoria, setTimelineAuditoria] = useState([]);
	const [modalMuestrasPendientesOpen, setModalMuestrasPendientesOpen] =
		useState(false);

	useEffect(() => {
		const fetchEmpleadoData = async () => {
			if (!user?.id) return;
			try {
				const { data: empleado, error } = await supabase
					.from("empleados")
					.select("nombre, rol, auth_uuid")
					.eq("auth_uuid", user.id)
					.maybeSingle();
				if (!error && empleado) {
					setEmpleadoData(empleado);
					setVendedor(empleado.nombre || "");
					if (empleado.rol === "recepcionista")
						setRecepcionistaSeleccionado(empleado.nombre);
				}
			} catch (err) {
				console.error("Error al obtener empleado:", err);
			}
		};
		fetchEmpleadoData();
		cargarRecepcionistas();
	}, [user]);

	useEffect(() => {
		cargarOrdenes();
	}, [rangoFecha]);
	useEffect(() => {
		calcularTotales();
	}, [estudiosSeleccionados, ivaPercent, descuentoPercent, abono, pago]);
	useEffect(() => {
		cargarClientes();
		cargarEstudiosDisponibles();
	}, []);

	const mostrarNotificacion = (mensaje, tipo = "exito") =>
		setNotificacion({ isOpen: true, mensaje, tipo });
	const cerrarNotificacion = () =>
		setNotificacion({ isOpen: false, mensaje: "", tipo: "exito" });

	const cargarRecepcionistas = async () => {
		try {
			const { data, error } = await supabase
				.from("empleados")
				.select("id_empleado, nombre, rol")
				.eq("rol", "recepcionista")
				.order("nombre");
			if (!error) setRecepcionistas(data || []);
		} catch (err) {
			console.error("Error al cargar recepcionistas:", err);
		}
	};

	const obtenerRangoFechas = () => {
		const hoy = new Date();
		const inicio = new Date(hoy);
		const fin = new Date(hoy);
		if (rangoFecha === "hoy") {
			inicio.setHours(0, 0, 0, 0);
			fin.setHours(23, 59, 59, 999);
		} else if (rangoFecha === "semana") {
			const dia = hoy.getDay();
			inicio.setDate(hoy.getDate() - dia);
			inicio.setHours(0, 0, 0, 0);
			fin.setHours(23, 59, 59, 999);
		} else if (rangoFecha === "mes") {
			inicio.setDate(1);
			inicio.setHours(0, 0, 0, 0);
			fin.setHours(23, 59, 59, 999);
		} else if (rangoFecha === "ano") {
			inicio.setMonth(0, 1);
			inicio.setHours(0, 0, 0, 0);
			fin.setHours(23, 59, 59, 999);
		} else return null;
		return { inicio: inicio.toISOString(), fin: fin.toISOString() };
	};

	const cargarOrdenes = async () => {
		try {
			let query = supabase
				.from("ventas")
				.select(
					`
				id_venta, folio, fecha_venta, total, pago_recibido, subtotal, iva, descuento, forma_pago, observaciones, estado, id_cliente, id_empresa, id_doctor,
				empresas (id_empresa, nombre),
				pacientes (id_paciente, nombre, fecha_nacimiento, sexo, telefono, email, rfc),
				estudios_venta (id_estudio_venta, clave_estudio, descripcion_estudio, precio, area, muestra_pendiente)
			`,
				)
				.eq("estado", "activo")
				.order("fecha_venta", { ascending: false })
				.limit(50);
			const rango = obtenerRangoFechas();
			if (rango)
				query = query.gte("fecha_venta", rango.inicio).lte("fecha_venta", rango.fin);
			const { data, error } = await query;
			if (error) throw error;
			setOrdenes(data || []);
		} catch (err) {
			console.error("Error al cargar órdenes:", err);
		}
	};

	// Los convenios dados de baja no se ofrecen, salvo el de la orden que se
	// esta editando: si ese faltara de la lista el select se quedaria en blanco
	// y al guardar la orden perderia su cliente, que es justo lo que no se
	// quiere de una orden ya cobrada.
	const cargarClientes = async (idClienteActual) => {
		try {
			const { data, error } = await consultarClientesSeleccionables({
				incluirId: idClienteActual,
			});
			if (!error) setClientes(data || []);
		} catch (err) {
			console.error("Error al cargar clientes:", err);
		}
	};

	const cargarEstudiosDisponibles = async () => {
		try {
			const { data, error } = await supabase
				.from("estudios_lab_catalogo")
				.select("id, clave, descripcion, area")
				.order("clave");
			if (!error) setEstudiosDisponibles(data || []);
		} catch (err) {
			console.error("Error al cargar estudios:", err);
		}
	};

	const buscarMedicos = async (termino) => {
		if (termino.length < 2) {
			setMedicosEncontrados([]);
			setShowBusquedaMedicos(false);
			return;
		}
		try {
			const { data, error } = await supabase
				.from("doctores")
				.select("id_doctor, nombre")
				.ilike("nombre", `%${termino}%`)
				.limit(8);
			if (!error) {
				setMedicosEncontrados(data || []);
				setShowBusquedaMedicos(data && data.length > 0);
			}
		} catch (err) {
			console.error("Error al buscar médicos:", err);
		}
	};

	const seleccionarMedico = (medico) => {
		setMedicoSeleccionado(medico);
		setMedicoBusqueda(medico.nombre);
		setShowBusquedaMedicos(false);
	};

	const cargarAuditoriaOrden = async (idVenta) => {
		if (!idVenta) {
			setTimelineAuditoria([]);
			return;
		}
		const { data, error } = await supabase
			.from("solicitudes_auditoria")
			.select("*")
			.eq("id_venta", idVenta)
			.order("created_at", { ascending: false });
		if (error) {
			if (!esErrorTablaInexistente(error, "solicitudes_auditoria")) {
				console.warn("No se pudo cargar auditoria de solicitud:", error);
			}
			setTimelineAuditoria([]);
			return;
		}
		setTimelineAuditoria(data || []);
	};

	const cargarHistorialPagosOrden = async (idVenta) => {
		const movimientos = await cargarHistorialPagosVenta(supabase, idVenta);
		setHistorialPagos(movimientos);
	};

	const seleccionarOrden = async (orden) => {
		setOrdenSeleccionada(orden);
		setFolio(orden.folio);
		setMotivoModificacion("");
		setPago("");
		cargarAuditoriaOrden(orden.id_venta);
		cargarHistorialPagosOrden(orden.id_venta);
		// Solo se vuelve a pedir la lista cuando el convenio de la orden no esta
		// en ella, que es el caso de uno dado de baja: lo normal es no gastar la
		// consulta.
		if (
			orden.id_cliente != null &&
			!clientes.some((c) => String(c.id_cliente) === String(orden.id_cliente))
		) {
			await cargarClientes(orden.id_cliente);
		}
		setClienteSeleccionado(orden.id_cliente?.toString() || "");
		setIvaPercent(orden.iva ? (orden.iva / orden.subtotal) * 100 : 0);
		setDescuentoPercent(
			orden.descuento
				? (orden.descuento / (orden.subtotal + (orden.iva || 0))) * 100
				: 0,
		);
		setFormaPago(orden.forma_pago || "efectivo");
		// El abono que se capture es un cobro nuevo: los datos de la tarjeta
		// anterior no se arrastran.
		setTarjetaUltimos4("");
		setCodigoAprobacion("");
		setAbono(parseFloat(orden.pago_recibido) || 0);
		if (orden.id_doctor) {
			try {
				const { data } = await supabase
					.from("doctores")
					.select("id_doctor, nombre")
					.eq("id_doctor", orden.id_doctor)
					.single();
				if (data) {
					setMedicoSeleccionado(data);
					setMedicoBusqueda(data.nombre);
				}
			} catch {}
		} else {
			setMedicoSeleccionado(null);
			setMedicoBusqueda("");
		}
		setEstudiosSeleccionados(
			(orden.estudios_venta || []).map((ev) => ({
				id: ev.id_estudio_venta,
				id_estudio_venta: ev.id_estudio_venta,
				clave: ev.clave_estudio,
				descripcion: ev.descripcion_estudio,
				precio: parseFloat(ev.precio) || 0,
				area: ev.area || "",
				cantidad: 1,
				muestra_pendiente: Boolean(ev.muestra_pendiente),
			})),
		);
	};

	const obtenerPrecioEstudio = async (claveEstudio, nombreCliente) => {
		try {
			if (!nombreCliente) return 150;
			const { data, error } = await supabase
				.from("precios_estudios")
				.select("precio")
				.eq("clave", claveEstudio)
				.eq("cliente", nombreCliente)
				.single();
			if (error) return 150;
			return parseFloat(data.precio);
		} catch {
			return 150;
		}
	};

	const agregarEstudio = async (estudio) => {
		if (estudiosSeleccionados.find((e) => e.clave === estudio.clave)) {
			mostrarNotificacion("Este estudio ya fue agregado", "advertencia");
			return;
		}
		const clienteObj = clientes.find(
			(c) => c.id_cliente.toString() === clienteSeleccionado,
		);
		const precio = await obtenerPrecioEstudio(
			estudio.clave,
			clienteObj?.nombre || "",
		);
		setEstudiosSeleccionados([
			...estudiosSeleccionados,
			{
				id: estudio.id,
				clave: estudio.clave,
				descripcion: estudio.descripcion,
				area: estudio.area || "",
				precio,
				cantidad: 1,
				muestra_pendiente: false,
			},
		]);
		setBuscarEstudio("");
		setShowBusquedaEstudios(false);
	};

	const eliminarEstudio = (clave) =>
		setEstudiosSeleccionados(estudiosSeleccionados.filter((e) => e.clave !== clave));

	const toggleMuestraPendiente = (idEstudio, muestraPendiente) => {
		setEstudiosSeleccionados((prev) =>
			prev.map((estudio) =>
				(estudio.id_estudio_venta || estudio.id || estudio.clave) === idEstudio
					? { ...estudio, muestra_pendiente: muestraPendiente }
					: estudio,
			),
		);
	};

	const calcularTotales = () => {
		const sub = estudiosSeleccionados.reduce(
			(sum, e) => sum + e.precio * e.cantidad,
			0,
		);
		setSubtotal(sub);
		const ivaCalc = sub * (ivaPercent / 100);
		setIva(ivaCalc);
		const totalIva = sub + ivaCalc;
		setTotalConIva(totalIva);
		const desc = totalIva * (descuentoPercent / 100);
		setDescuento(desc);
		const gran = totalIva - desc;
		setGranTotal(gran);
		const adeudoCalc = gran - abono - (parseFloat(pago) || 0);
		setAdeudo(adeudoCalc > 0 ? adeudoCalc : 0);
	};

	const guardarYImprimir = async () => {
		if (!ordenSeleccionada) {
			mostrarNotificacion("Seleccione una orden primero", "advertencia");
			return;
		}
		if (!motivoModificacion.trim()) {
			mostrarNotificacion("Ingrese el motivo de modificación", "advertencia");
			return;
		}
		const pagoNuevoCapturado = parseFloat(pago) || 0;
		const validacionTarjeta = validarPagoTarjeta({
			formaPago,
			ultimos4: tarjetaUltimos4,
			codigoAprobacion,
		});
		if (pagoNuevoCapturado > 0 && !validacionTarjeta.valido) {
			mostrarNotificacion(validacionTarjeta.mensaje, "advertencia");
			return;
		}
		try {
			const totalPagado = abono + (parseFloat(pago) || 0);
			const pagoNuevo = parseFloat(pago) || 0;
			const datosTarjeta = construirDatosTarjeta({
				formaPago,
				ultimos4: tarjetaUltimos4,
				codigoAprobacion,
			});
			const { error: errorVenta } = await supabase
				.from("ventas")
				.update({
					id_cliente: clienteSeleccionado ? parseInt(clienteSeleccionado) : null,
					id_doctor: medicoSeleccionado?.id_doctor || null,
					subtotal,
					iva,
					descuento,
					total: granTotal,
					forma_pago: formaPago,
					...(pagoNuevo > 0 ? datosTarjeta : {}),
					pago_recibido: totalPagado,
					observaciones: motivoModificacion,
					updated_at: new Date().toISOString(),
				})
				.eq("id_venta", ordenSeleccionada.id_venta);
			if (errorVenta) throw errorVenta;
			if (pagoNuevo > 0) {
				await registrarMovimientoPagoVenta(supabase, {
					id_venta: ordenSeleccionada.id_venta,
					folio,
					tipo_movimiento: TIPOS_MOVIMIENTO_PAGO.ABONO,
					monto: pagoNuevo,
					forma_pago: formaPago,
					ultimos4: tarjetaUltimos4,
					codigoAprobacion,
					motivo: motivoModificacion,
					empleado: empleadoData,
					user,
				});
			}
			await registrarEventoSolicitud(supabase, {
				id_venta: ordenSeleccionada.id_venta,
				folio,
				evento: EVENTOS_SOLICITUD.ADEUDO_CAMBIADO,
				descripcion: `Solicitud modificada. Pago acumulado $${Number(totalPagado || 0).toFixed(2)}, adeudo $${Number(adeudo || 0).toFixed(2)}`,
				empleado: empleadoData,
				user,
				detalles: {
					motivo: motivoModificacion,
					total_anterior: ordenSeleccionada.total,
					pago_anterior: ordenSeleccionada.pago_recibido,
					total_nuevo: granTotal,
					pago_nuevo: totalPagado,
					adeudo_nuevo: adeudo,
				},
			});
			await supabase
				.from("estudios_venta")
				.delete()
				.eq("id_venta", ordenSeleccionada.id_venta);
			const estudiosPayload = estudiosSeleccionados.map((est) => ({
				id_venta: ordenSeleccionada.id_venta,
				clave_estudio: est.clave,
				descripcion_estudio: est.descripcion,
				precio: est.precio,
				area: est.area,
				dias_proceso: 1,
				estado_captura: "pendiente",
				muestra_pendiente: Boolean(est.muestra_pendiente),
			}));
			const insertarEstudios = (payload) =>
				supabase.from("estudios_venta").insert(payload);
			let { error: errorEstudios } = await insertarEstudios(estudiosPayload);
			if (
				errorEstudios &&
				esErrorColumnaSchemaCache(errorEstudios, "muestra_pendiente")
			) {
				({ error: errorEstudios } = await insertarEstudios(
					estudiosPayload.map((estudio) => {
						const limpio = { ...estudio };
						delete limpio.muestra_pendiente;
						return limpio;
					}),
				));
			}
			if (errorEstudios) throw errorEstudios;
			// Editar cambia importes y estudios: lo que lee ventas se refresca solo,
			// sin obligar a recargar la pagina.
			invalidarConsultasDeVentas(queryClient);
			mostrarNotificacion("Orden actualizada exitosamente", "exito");
			await cargarAuditoriaOrden(ordenSeleccionada.id_venta);
			await cargarHistorialPagosOrden(ordenSeleccionada.id_venta);
			await cargarOrdenes();
			setTimeout(() => window.print(), 800);
		} catch (err) {
			console.error("Error al guardar:", err);
			mostrarNotificacion("Error al guardar la orden", "error");
		}
	};

	const abrirCancelacionOrden = () => {
		if (!ordenSeleccionada) {
			mostrarNotificacion("Seleccione una orden primero", "advertencia");
			return;
		}
		setModalCancelacionAbierto(true);
	};

	const cancelarOrden = async ({ motivo, categoria, detalle } = {}) => {
		if (!ordenSeleccionada) {
			mostrarNotificacion("Seleccione una orden primero", "advertencia");
			return;
		}
		const motivoCancelacion = (motivo || "").trim();
		if (!motivoCancelacion) {
			mostrarNotificacion("Ingrese el motivo de la cancelación", "advertencia");
			return;
		}
		try {
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
				.eq("id_venta", ordenSeleccionada.id_venta);
			// Si la base aún no tiene la migración del motivo, la cancelación no
			// puede quedarse atorada: se guarda el estado y el motivo se conserva
			// en la auditoría.
			if (
				error &&
				(esErrorColumnaSchemaCache(error, "motivo_cancelacion") ||
					esErrorColumnaSchemaCache(error, "cancelada_en"))
			) {
				({ error } = await supabase
					.from("ventas")
					.update({ estado: "cancelado", updated_at: canceladaEn })
					.eq("id_venta", ordenSeleccionada.id_venta));
			}
			if (error) throw error;
			const pagoActual = parseFloat(ordenSeleccionada.pago_recibido) || 0;
			if (pagoActual > 0) {
				await registrarMovimientoPagoVenta(supabase, {
					id_venta: ordenSeleccionada.id_venta,
					folio,
					tipo_movimiento: TIPOS_MOVIMIENTO_PAGO.CANCELACION,
					monto: pagoActual,
					forma_pago: ordenSeleccionada.forma_pago || formaPago,
					motivo: motivoCancelacion,
					empleado: empleadoData,
					user,
				});
			}
			await registrarEventoSolicitud(supabase, {
				id_venta: ordenSeleccionada.id_venta,
				folio,
				evento: EVENTOS_SOLICITUD.CANCELADA,
				descripcion: `Solicitud cancelada. Motivo: ${motivoCancelacion}`,
				empleado: empleadoData,
				user,
				detalles: {
					motivo: motivoCancelacion,
					categoria: categoria || null,
					detalle: detalle || null,
				},
			});
			// Una orden cancelada sale del reporte y de captura: mismo motivo.
			invalidarConsultasDeVentas(queryClient);
			mostrarNotificacion("Orden cancelada correctamente", "exito");
			setModalCancelacionAbierto(false);
			setOrdenSeleccionada(null);
			setEstudiosSeleccionados([]);
			setHistorialPagos([]);
			setFolio("");
			await cargarOrdenes();
		} catch (err) {
			console.error("Error al cancelar:", err);
			mostrarNotificacion("Error al cancelar la orden", "error");
			throw err;
		}
	};

	const registrarDevolucion = async () => {
		if (!ordenSeleccionada) {
			mostrarNotificacion("Seleccione una orden primero", "advertencia");
			return;
		}
		if (!motivoModificacion.trim()) {
			mostrarNotificacion("Ingrese el motivo de la devolucion", "advertencia");
			return;
		}
		const montoDevolucion = parseFloat(pago) || 0;
		if (montoDevolucion <= 0) {
			mostrarNotificacion("Ingrese el monto a devolver en Pago $", "advertencia");
			return;
		}
		if (montoDevolucion > abono) {
			mostrarNotificacion("La devolucion no puede ser mayor a lo abonado", "advertencia");
			return;
		}
		try {
			const nuevoPagoRecibido = Math.max(abono - montoDevolucion, 0);
			const { error } = await supabase
				.from("ventas")
				.update({
					pago_recibido: nuevoPagoRecibido,
					observaciones: motivoModificacion,
					updated_at: new Date().toISOString(),
				})
				.eq("id_venta", ordenSeleccionada.id_venta);
			if (error) throw error;
			await registrarMovimientoPagoVenta(supabase, {
				id_venta: ordenSeleccionada.id_venta,
				folio,
				tipo_movimiento: TIPOS_MOVIMIENTO_PAGO.DEVOLUCION,
				monto: montoDevolucion,
				forma_pago: formaPago,
				ultimos4: tarjetaUltimos4,
				codigoAprobacion,
				motivo: motivoModificacion,
				empleado: empleadoData,
				user,
			});
			await registrarEventoSolicitud(supabase, {
				id_venta: ordenSeleccionada.id_venta,
				folio,
				evento: EVENTOS_SOLICITUD.ADEUDO_CAMBIADO,
				descripcion: `Devolucion registrada por $${montoDevolucion.toFixed(2)}`,
				empleado: empleadoData,
				user,
				detalles: {
					motivo: motivoModificacion,
					devolucion: montoDevolucion,
					pago_anterior: abono,
					pago_nuevo: nuevoPagoRecibido,
				},
			});
			setAbono(nuevoPagoRecibido);
			setPago("");
			mostrarNotificacion("Devolucion registrada", "exito");
			await cargarHistorialPagosOrden(ordenSeleccionada.id_venta);
			await cargarAuditoriaOrden(ordenSeleccionada.id_venta);
			await cargarOrdenes();
		} catch (err) {
			console.error("Error al registrar devolucion:", err);
			mostrarNotificacion("Error al registrar la devolucion", "error");
		}
	};

	const calcularEdad = (fechaNacimiento) => {
		if (!fechaNacimiento) return "N/A";
		const hoy = new Date();
		const nac = new Date(fechaNacimiento);
		let edad = hoy.getFullYear() - nac.getFullYear();
		const mes = hoy.getMonth() - nac.getMonth();
		if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
		return `${edad} años`;
	};

	const formatFecha = (fecha) => {
		if (!fecha) return "N/A";
		return new Date(fecha).toLocaleDateString("es-MX", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		});
	};

	const ordenesFiltradas = ordenes.filter((o) => {
		if (!buscarPaciente.trim()) return true;
		const term = buscarPaciente.toLowerCase();
		return (
			o.pacientes?.nombre?.toLowerCase().includes(term) ||
			normalizarFolio(o.folio).includes(normalizarFolio(term))
		);
	});

	const estudiosFiltrados = estudiosDisponibles.filter(
		(e) =>
			e.descripcion.toLowerCase().includes(buscarEstudio.toLowerCase()) ||
			e.clave.toLowerCase().includes(buscarEstudio.toLowerCase()),
	);

	const getPrimerNombre = (nombreCompleto) => {
		if (!nombreCompleto) return user?.email?.split("@")[0] || "Usuario";
		return nombreCompleto;
	};

	const formatRol = (rol) => {
		if (!rol) return "Usuario";
		const roles = {
			admin: "Administrador",
			administrador: "Administrador",
			radiologo: "Radiólogo - Director",
			doctor: "Médico",
			medico: "Médico",
			tecnico_radiologia: "Técnico en Radiología",
			tecnico: "Técnico",
			quimico: "Químico",
			recepcionista: "Recepcionista",
			desarrollador: "Desarrollador",
		};
		return roles[rol] || rol;
	};

	const imprimirEtiquetasOrden = async (orden, e) => {
		e?.stopPropagation();
		if (!orden) return;
		// Una sola pestaña: abrir dos hacía que el navegador bloqueara la segunda,
		// y la etiqueta de imagen nunca llegaba a verse.
		const ventanaEtiquetas = window.open("", "_blank");
		try {
			const paciente = orden.pacientes;
			const hoy = new Date();
			const nac = paciente?.fecha_nacimiento ? new Date(paciente.fecha_nacimiento) : null;
			let edadStr = "";
			if (nac) {
				let edad = hoy.getFullYear() - nac.getFullYear();
				const mes = hoy.getMonth() - nac.getMonth();
				if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
				edadStr = `${edad} años`;
			}
			const clavesEstudios = (orden.estudios_venta || [])
				.map(({ clave_estudio }) => clave_estudio)
				.filter(Boolean);
			if (!clavesEstudios.length) {
				ventanaEtiquetas?.close?.();
				mostrarNotificacion("La orden no tiene estudios para etiquetar", "error");
				return;
			}
			const [catalogoLaboratorioResponse, catalogoImagenResponse, doctorResponse] = await Promise.all([
				supabase
					.from("estudios_lab_catalogo")
					.select("clave, tipo_muestra, recipiente")
					.in("clave", clavesEstudios),
				supabase
					.from("estudios_imagen_catalogo")
					.select("clave")
					.in("clave", clavesEstudios),
				orden.id_doctor
					? supabase.from("doctores").select("nombre").eq("id_doctor", orden.id_doctor).maybeSingle()
					: Promise.resolve({ data: null, error: null }),
			]);
			if (catalogoLaboratorioResponse.error) throw catalogoLaboratorioResponse.error;
			if (catalogoImagenResponse.error) throw catalogoImagenResponse.error;
			if (doctorResponse.error) throw doctorResponse.error;
			const catalogoPorClave = new Map(
				(catalogoLaboratorioResponse.data || []).map((estudio) => [estudio.clave, estudio]),
			);
			const clavesImagen = new Set(
				(catalogoImagenResponse.data || []).map((estudio) => estudio.clave),
			);
			const estudiosEtiquetas = (orden.estudios_venta || []).map((estudio) => {
				const estudioCatalogo = catalogoPorClave.get(estudio.clave_estudio);
				return {
					...estudio,
					clave: estudio.clave_estudio,
					descripcion: estudio.descripcion_estudio,
					// El catálogo confirma la imagen, pero si no la encuentra —o no se
					// pudo consultar— la clave y el área también la delatan: sin esto
					// la orden se etiquetaba como laboratorio y no salía nada.
					modulo:
						clavesImagen.has(estudio.clave_estudio) ||
						esEstudioImagenCaptura({
							clave_estudio: estudio.clave_estudio,
							descripcion_estudio: estudio.descripcion_estudio,
							area: estudio.area,
						})
							? "imagen"
							: "laboratorio",
					...estudioCatalogo,
				};
			});
			const { generado } = generarEtiquetasOrden({
				folio: orden.folio,
				ventana: ventanaEtiquetas,
				laboratorio: {
					folio: orden.folio,
					paciente: paciente?.nombre,
					sexo: paciente?.sexo,
					edad: edadStr,
					estudios: estudiosEtiquetas,
				},
				imagen: {
					folio: orden.folio,
					fecha: orden.fecha_venta,
					paciente: paciente?.nombre,
					doctor: doctorResponse.data?.nombre || "",
					estudios: estudiosEtiquetas,
				},
			});
			if (!generado) {
				mostrarNotificacion("No hay estudios con etiquetas configuradas", "error");
			}
		} catch (err) {
			ventanaEtiquetas?.close?.();
			console.error("Error al generar etiquetas:", err);
			mostrarNotificacion("Error al generar las etiquetas", "error");
		}
	};

	const imprimirTicketOrden = async (orden, e) => {
		e.stopPropagation();
		if (!orden) return;
		// La pestaña se abre aquí, con el clic, y hasta después se le manda el
		// PDF: armarlo lleva sus consultas, y para cuando terminaban el navegador
		// ya no reconocía el clic, bloqueaba la pestaña y el ticket terminaba
		// descargándose en lugar de abrirse para imprimir.
		const ventanaTicket = window.open("", "_blank");
		try {
			let nombreDoctor = "";
			if (orden.id_doctor) {
				const { data: doc } = await supabase
					.from("doctores")
					.select("nombre")
					.eq("id_doctor", orden.id_doctor)
					.single();
				if (doc) nombreDoctor = doc.nombre;
			}
			const nombreEmpresaOperativa = resolverEmpresaTicketReimpresion(
				orden.empresas?.nombre,
			);
			const paciente = orden.pacientes;
			const hoy = new Date();
			const nac = paciente?.fecha_nacimiento
				? new Date(paciente.fecha_nacimiento)
				: null;
			let edadStr = "";
			if (nac) {
				let edad = hoy.getFullYear() - nac.getFullYear();
				const mes = hoy.getMonth() - nac.getMonth();
				if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
				edadStr = `${edad} años`;
			}
			const totalNum = parseFloat(orden.total) || 0;
			const pagoNum = parseFloat(orden.pago_recibido) || 0;
			// La reimpresión resuelve el convenio contra el catálogo ya cargado:
			// la orden sólo guarda el id, y sin esto el ticket reimpreso saldría
			// sin el renglón de cliente que sí trae el que se entregó en caja.
			const nombreCliente =
				clientes.find(
					(cliente) => String(cliente.id_cliente) === String(orden.id_cliente),
				)?.nombre || "Particular";
			await generarTicketVenta({
				folio: orden.folio,
				fecha: new Date(orden.fecha_venta),
				paciente: paciente?.nombre || "N/A",
				edad: edadStr,
				doctor: nombreDoctor,
				cliente: nombreCliente,
				empresa: nombreEmpresaOperativa,
				telefono: paciente?.telefono || "",
				email: paciente?.email || "",
				estudios: (orden.estudios_venta || []).map((ev) => ({
					descripcion: ev.descripcion_estudio,
					precio: parseFloat(ev.precio) || 0,
					diasProceso: ev.dias_proceso || 1,
				})),
				subtotal: parseFloat(orden.subtotal) || 0,
				descuento: parseFloat(orden.descuento) || 0,
				total: totalNum,
				abono1: pagoNum,
				abono2: 0,
				adeudo: Math.max(totalNum - pagoNum, 0),
				pagoRecibido: pagoNum,
				cambio: 0,
				formaPago: orden.forma_pago || "efectivo",
				vendedor,
				ventana: ventanaTicket,
			});
			// Las etiquetas no salen de aquí: tienen su propio botón, y sacarlas
			// junto con el ticket obligaba a abrir una segunda pestaña que el
			// navegador bloqueaba, así que también terminaban descargadas.
		} catch (err) {
			ventanaTicket?.close?.();
			console.error("Error al generar ticket:", err);
			mostrarNotificacion("Error al generar el ticket", "error");
		}
	};

	return (
		<PageLayout
			empleadoData={empleadoData}
			formatRol={formatRol}
			getPrimerNombre={getPrimerNombre}>
			<div className="editar-solicitud-wrapper">
				<div className="editar-solicitud-header">
					<h1 className="editar-solicitud-title">Editar Orden</h1>
					<button className="btn-cancelar-orden" onClick={abrirCancelacionOrden}>
						<img
							src={cancelarBtn}
							alt="Cancelar Orden"
							className="icono-cancelar-btn"
						/>
					</button>
				</div>

				<div className="editar-solicitud-content">
					<div className="panel-ordenes">
						<div className="ordenes-controles">
							<div className="buscar-paciente-grupo">
								<img src={lupaIcono} alt="Buscar" className="icono-campo" />
								<input
									type="text"
									placeholder="Buscar por Paciente o Folio..."
									value={buscarPaciente}
									onChange={(e) => setBuscarPaciente(e.target.value)}
									className="input-buscar-paciente-edit"
								/>
							</div>
							<div className="rango-fecha-grupo">
								<img
									src={calendarioIcono}
									alt="Calendario"
									className="icono-campo"
								/>
								<select
									value={rangoFecha}
									onChange={(e) => setRangoFecha(e.target.value)}
									className="select-rango-fecha">
									<option value="hoy">Hoy</option>
									<option value="semana">Esta Semana</option>
									<option value="mes">Este Mes</option>
									<option value="ano">Este Año</option>
									<option value="todos">Todos</option>
								</select>
							</div>
						</div>

						<div className="tabla-ordenes-container">
							<table className="tabla-ordenes">
								<thead>
									<tr>
										<th>Folio</th>
										<th>Nombre</th>
										<th>Edad</th>
										<th>Fecha Alta</th>
										<th>Etiquetas</th>
										<th>Ticket</th>
									</tr>
								</thead>
								<tbody>
									{ordenesFiltradas.length === 0 ? (
										<tr>
											<td colSpan="6" className="sin-ordenes">
												No hay órdenes para mostrar
											</td>
										</tr>
									) : (
										ordenesFiltradas.map((orden) => (
											<tr
												key={orden.id_venta}
												className={
													ordenSeleccionada?.id_venta === orden.id_venta
														? "selected"
														: ""
												}
												onClick={() => seleccionarOrden(orden)}>
												<td className="folio-cell">{orden.folio}</td>
												<td>{orden.pacientes?.nombre || "N/A"}</td>
												<td>{calcularEdad(orden.pacientes?.fecha_nacimiento)}</td>
												<td>{formatFecha(orden.fecha_venta)}</td>
												<td>
													<button
														className="btn-accion-orden"
														onClick={(e) => imprimirEtiquetasOrden(orden, e)}>
														<img
															src={imprimirIcono}
															alt="Etiquetas"
															className="icono-accion-tabla"
														/>
													</button>
												</td>
												<td>
													<button
														className="btn-accion-orden"
														onClick={(e) => imprimirTicketOrden(orden, e)}>
														<img
															src={imprimirIcono}
															alt="Ticket"
															className="icono-accion-tabla"
														/>
													</button>
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
						<div className="ordenes-footer">
							<span>Vendedor: {vendedor || "—"}</span>
						</div>
					</div>

					<div className="panel-detalles-orden">
						<div className="seccion-superior">
							<div className="motivo-modificacion">
								<textarea
									placeholder="Motivo de Modificación de la Orden"
									value={motivoModificacion}
									onChange={(e) => setMotivoModificacion(e.target.value)}
									className="textarea-motivo"
									rows="2"
								/>
							</div>
							<div className="folio-grupo">
								<label>Folio:</label>
								<input
									type="text"
									value={folio}
									readOnly
									className="input-folio-edit folio-highlight"
								/>
							</div>
						</div>

						<div className="campos-orden">
							<div className="campo-icon-grupo">
								<img src={empresaIcono} alt="Empresa" className="icono-campo" />
								<select
									value={clienteSeleccionado}
									onChange={(e) => setClienteSeleccionado(e.target.value)}
									className="select-empresa">
									<option value="">Particular</option>
									{clientes.map((c) => (
										<option key={c.id_cliente} value={c.id_cliente}>
											{c.nombre}
										</option>
									))}
								</select>
							</div>
							<div className="campo-icon-grupo" style={{ position: "relative" }}>
								<img src={doctorIcono} alt="Médico" className="icono-campo" />
								<input
									type="text"
									placeholder="Buscar Médico..."
									value={medicoBusqueda}
									onChange={(e) => {
										setMedicoBusqueda(e.target.value);
										buscarMedicos(e.target.value);
									}}
									className="input-medico"
								/>
								{showBusquedaMedicos && (
									<div className="dropdown-medicos">
										{medicosEncontrados.map((m) => (
											<div
												key={m.id_doctor}
												className="dropdown-medico-item"
												onClick={() => seleccionarMedico(m)}>
												{m.nombre}
											</div>
										))}
									</div>
								)}
							</div>
							<div className="campo-icon-grupo">
								<img
									src={pacienteIcono}
									alt="Recepcionista"
									className="icono-campo"
								/>
								<select
									value={recepcionistaSeleccionado}
									onChange={(e) => setRecepcionistaSeleccionado(e.target.value)}
									className="select-urgencia">
									<option value="">— Recepcionista —</option>
									{recepcionistas.map((r) => (
										<option key={r.id_empleado} value={r.nombre}>
											{r.nombre}
										</option>
									))}
								</select>
							</div>
						</div>

						<div className="lista-precios-section">
							<label className="lista-precios-label">Lista de precios</label>
							<div className="buscar-estudios-row">
								<div
									className="buscar-estudios-grupo"
									style={{ position: "relative" }}>
									<img src={lupaIcono} alt="Buscar" className="icono-campo" />
									<input
										type="text"
										placeholder="Buscar Estudios..."
										value={buscarEstudio}
										onChange={(e) => {
											setBuscarEstudio(e.target.value);
											setShowBusquedaEstudios(e.target.value.length >= 2);
										}}
										className="input-buscar-estudios"
									/>
									{showBusquedaEstudios && buscarEstudio.length >= 2 && (
										<div className="dropdown-estudios">
											{estudiosFiltrados.slice(0, 10).map((est) => (
												<div
													key={est.id}
													className="dropdown-estudio-item"
													onClick={() => agregarEstudio(est)}>
													<strong>{est.clave}</strong> — {est.descripcion}
												</div>
											))}
											{estudiosFiltrados.length === 0 && (
												<div className="dropdown-estudio-item sin-resultados">
													Sin resultados
												</div>
											)}
										</div>
									)}
								</div>
								<button
									type="button"
									className="btn-muestras-pendientes"
									onClick={() => setModalMuestrasPendientesOpen(true)}>
									<img
										src={muestrasBtn}
										alt="Muestras Pendientes"
										className="icono-muestras-btn"
									/>
								</button>
							</div>

							<div className="tabla-estudios-container">
								<table className="tabla-estudios-edit">
									<thead>
										<tr>
											<th>Clave</th>
											<th>Descripción</th>
											<th>Tipo</th>
											<th>Precio</th>
											<th>Borrar</th>
										</tr>
									</thead>
									<tbody>
										{estudiosSeleccionados.length === 0 ? (
											<tr>
												<td colSpan="5" className="sin-estudios-edit">
													{ordenSeleccionada
														? "Sin estudios en esta orden"
														: "Seleccione una orden"}
												</td>
											</tr>
										) : (
											estudiosSeleccionados.map((est) => (
												<Fragment key={est.clave}>
													<tr>
														<td>{est.clave}</td>
														<td>{est.descripcion}</td>
														<td>{est.area || "Estudio"}</td>
														<td>$ {est.precio.toFixed(2)}</td>
														<td>
															<button
																className="btn-borrar-estudio"
																onClick={() => eliminarEstudio(est.clave)}>
																<img
																	src={eliminarIconoV2}
																	alt="Eliminar"
																	className="icono-eliminar"
																/>
															</button>
														</td>
													</tr>
													{est.muestra_pendiente && (
														<tr className="estudio-muestra-pendiente-row">
															<td colSpan="5">
																Muestra pendiente para {est.clave}
															</td>
														</tr>
													)}
												</Fragment>
											))
										)}
									</tbody>
								</table>
							</div>
						</div>

						<div className="totales-section">
							<div className="totales-row-1">
								<div className="campo-total">
									<label>Total $</label>
									<input
										type="text"
										value={subtotal.toFixed(2)}
										readOnly
										className="input-total"
									/>
								</div>
								<div className="campo-total">
									<label>Forma Pago</label>
									<select
										value={formaPago}
										onChange={(e) => setFormaPago(e.target.value)}
										className="select-tipo-pago">
										<option value="efectivo">Efectivo</option>
										<option value="tarjeta_credito">Tarjeta Crédito</option>
										<option value="tarjeta_debito">Tarjeta Débito</option>
										<option value="transferencia">Transferencia</option>
									</select>
								</div>
								{esPagoConTarjeta(formaPago) && (
									<>
										<div className="campo-total">
											<label htmlFor="editar-tarjeta-ultimos4">Últimos 4</label>
											<input
												id="editar-tarjeta-ultimos4"
												type="text"
												inputMode="numeric"
												maxLength={4}
												value={tarjetaUltimos4}
												onChange={(e) =>
													setTarjetaUltimos4(normalizarUltimos4(e.target.value))
												}
												className="input-total"
												placeholder="1234"
											/>
										</div>
										<div className="campo-total">
											<label htmlFor="editar-codigo-aprobacion">Cód. aprobación</label>
											<input
												id="editar-codigo-aprobacion"
												type="text"
												maxLength={12}
												value={codigoAprobacion}
												onChange={(e) =>
													setCodigoAprobacion(
														normalizarCodigoAprobacion(e.target.value),
													)
												}
												className="input-total"
												placeholder="A1B2C3"
											/>
										</div>
									</>
								)}
								<div className="campo-total">
									<label>IVA %</label>
									<input
										type="number"
										value={ivaPercent}
										onChange={(e) => setIvaPercent(parseFloat(e.target.value) || 0)}
										className="input-iva"
									/>
								</div>
								<div className="campo-total">
									<label>Total con IVA $</label>
									<input
										type="text"
										value={totalConIva.toFixed(2)}
										readOnly
										className="input-total-iva"
									/>
								</div>
							</div>
							<div className="totales-row-2">
								<div className="campo-total">
									<label>Desc %</label>
									<input
										type="number"
										value={descuentoPercent}
										onChange={(e) =>
											setDescuentoPercent(parseFloat(e.target.value) || 0)
										}
										className="input-desc"
									/>
								</div>
								<div className="campo-total">
									<label>Desc $</label>
									<input
										type="text"
										value={descuento.toFixed(2)}
										readOnly
										className="input-desc-monto"
									/>
								</div>
								<div className="campo-total gran-total-field">
									<label>Gran Total $</label>
									<input
										type="text"
										value={granTotal.toFixed(2)}
										readOnly
										className="input-gran-total"
									/>
								</div>
								<div className="campo-total">
									<label>Abonó $</label>
									<input
										type="text"
										value={abono.toFixed(2)}
										readOnly
										className="input-abono"
									/>
								</div>
								<div className="campo-total">
									<label>Adeudo $</label>
									<input
										type="text"
										value={adeudo.toFixed(2)}
										readOnly
										className="input-adeudo"
									/>
								</div>
								<div className="campo-total">
									<label>Pago $</label>
									<input
										type="number"
										value={pago}
										onChange={(e) => setPago(e.target.value)}
										className="input-pago"
										placeholder="0.00"
									/>
								</div>
							</div>
						</div>

						<div className="botones-finales">
							<button
								type="button"
								className="btn-devolucion-orden"
								onClick={registrarDevolucion}>
								Devolucion
							</button>
							{/* Era un PNG del diseño anterior, con su propio azul quemado
							    dentro de la imagen: sobre el tema claro desentonaba y no
							    podía seguir ningún color. Ahora es un botón de verdad. */}
							<button
								type="button"
								className="btn-guardar-imprimir"
								onClick={guardarYImprimir}>
								<svg
									className="btn-guardar-imprimir-icono"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.8"
									strokeLinecap="round"
									strokeLinejoin="round"
									aria-hidden="true">
									<path d="M6 9V3h12v6" />
									<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
									<rect x="6" y="14" width="12" height="8" rx="1" />
								</svg>
								Guardar e imprimir
							</button>
						</div>

						<div className="auditoria-section">
							<div className="auditoria-header">
								<h3>Historial de pagos</h3>
								<span>{historialPagos.length} movimientos</span>
							</div>
							<div className="auditoria-lista">
								{!ordenSeleccionada ? (
									<p className="auditoria-empty">Seleccione una orden</p>
								) : historialPagos.length === 0 ? (
									<p className="auditoria-empty">Sin movimientos registrados</p>
								) : (
									historialPagos.map((movimiento) => (
										<div className="auditoria-item" key={movimiento.id_movimiento}>
											<div className="auditoria-dot" />
											<div>
												<strong>
													{movimiento.tipo_movimiento} - $
													{Number(movimiento.monto || 0).toFixed(2)}
												</strong>
												<span>
													{movimiento.forma_pago || "Sin forma de pago"} -{" "}
													{movimiento.actor_nombre || "Usuario"}
												</span>
												<time>
													{movimiento.created_at
														? new Date(movimiento.created_at).toLocaleString("es-MX", {
																dateStyle: "short",
																timeStyle: "short",
															})
														: ""}
												</time>
											</div>
										</div>
									))
								)}
							</div>
						</div>

						<div className="auditoria-section">
							<div className="auditoria-header">
								<h3>Lí­nea de tiempo</h3>
								<span>{timelineAuditoria.length} eventos</span>
							</div>
							<div className="auditoria-lista">
								{!ordenSeleccionada ? (
									<p className="auditoria-empty">Seleccione una orden</p>
								) : timelineAuditoria.length === 0 ? (
									<p className="auditoria-empty">Sin eventos registrados</p>
								) : (
									timelineAuditoria.map((evento) => {
										const item = formatearEventoAuditoria(evento);
										return (
											<div className="auditoria-item" key={evento.id_evento}>
												<div className="auditoria-dot" />
												<div>
													<strong>{item.descripcion}</strong>
													<span>{item.actor}</span>
													<time>{item.fecha}</time>
												</div>
											</div>
										);
									})
								)}
							</div>
						</div>
					</div>
				</div>

				<ModalNotificacion
					isOpen={notificacion.isOpen}
					onClose={cerrarNotificacion}
					mensaje={notificacion.mensaje}
					tipo={notificacion.tipo}
				/>
				<ModalMuestrasPendientes
					isOpen={modalMuestrasPendientesOpen}
					estudios={estudiosSeleccionados}
					onClose={() => setModalMuestrasPendientesOpen(false)}
					onToggleMuestraPendiente={toggleMuestraPendiente}
				/>
				<ModalMotivoCancelacion
					isOpen={modalCancelacionAbierto}
					onClose={() => setModalCancelacionAbierto(false)}
					onConfirmar={cancelarOrden}
					folio={folio}
					paciente={ordenSeleccionada?.pacientes?.nombre || ""}
				/>
			</div>
		</PageLayout>
	);
};

export default EditarSolicitud;
