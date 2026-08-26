import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ModalNotificacion from "../../components/ModalNotificacion";
import PageLayout from "../../components/page-layout.jsx";
import SearchAutocomplete from "../../components/search-autocomplete.jsx";
import { useAuth } from "../../context/auth-context";
import { useEmpleadoActual } from "../../hooks/use-empleado-actual";
import { supabase } from "../../lib/supabase-client";
import { useBusquedaPersistente } from "../../hooks/use-busqueda-persistente";
import {
	limpiarBorradorPersistente,
	useCampoPersistente,
	useModalPersistente,
} from "../../hooks/use-campo-persistente";
import {
	construirEstudioCatalogoUnificado,
	construirEstudioSeleccionado,
	dividirEstudiosCita,
	encontrarEstudioCatalogo,
	filtrarEstudiosCatalogo,
	resolverCodigoTipoRadiologia,
	resolverEmpresaOperativaCatalogo,
	resolverModalidadDesdeTipo,
	tipoEstudioEsImagen,
} from "../../utils/cita-nuevo-paciente";
import { CITA_ESTADOS } from "../../utils/cita-lifecycle";
import { imprimirComprobantesVenta } from "../../utils/imprimir-comprobantes-venta";
import {
	formatearDoctorBusqueda,
	formatearPacienteBusqueda,
} from "../../utils/nuevo-paciente-busqueda";
import { obtenerColumnaSchemaCacheFaltante } from "../../utils/supabase-errors";
import { cargarReglasConvenio } from "../../utils/convenios-facturacion";
import {
	cargarPreciosCliente,
	resolverClavesConPrecio,
} from "../../utils/precios-cliente";
import { formatearFechaHoraMexicoLocal } from "../../utils/fecha-mexico";
import {
	construirFolio,
	empresaDeSerie,
	SERIE_LABORATORIO,
	SERIE_POR_DEFECTO,
	separarFolio,
} from "../../utils/folios";
import {
	agruparPartesPorEmpresa,
	dividirOrdenPorSerie,
	esOrdenMixta,
	prorratearPago,
	validarPagosPorSerie,
} from "../../utils/orden-por-serie";
import {
	construirDatosTarjeta,
	esPagoConTarjeta,
	normalizarCodigoAprobacion,
	normalizarUltimos4,
	validarPagoTarjeta,
} from "../../utils/pago-tarjeta";

const CLAVE_BORRADOR = "california:nuevo-paciente:borrador";
// Los datos capturados del paciente sobreviven a que el navegador descarte la
// página al cambiar de pestaña o de app; se limpian al registrar la solicitud.
const BORRADOR = "nuevo-paciente:";
const leerBorrador = () => {
	try { return JSON.parse(sessionStorage.getItem(CLAVE_BORRADOR) || "{}"); } catch { return {}; }
};
import {
	EVENTOS_SOLICITUD,
	registrarEventoSolicitud,
} from "../../utils/solicitud-auditoria";
import {
	agregarSucursalEmpleadoPayload,
	resolverSucursalEmpleado,
} from "../../utils/sucursal-empleado";
import { crearNotificaciones } from "../../utils/notificaciones";
import { obtenerResumenPagoNuevoPaciente } from "../../utils/nuevo-paciente-resumen";
import { calcularTotalesNuevoPaciente } from "../../utils/nuevo-paciente-totales";
import {
	TIPOS_MOVIMIENTO_PAGO,
	registrarMovimientoPagoVenta,
} from "../../utils/pagos-ventas";
import {
	generarCodigoTurno,
	obtenerRangoDiaLocalISO,
	resolverDestinoTurnoDesdeEstudios,
	TURNO_DESTINOS,
} from "../../utils/turnos-pacientes";
import {
	calcularPagoAplicadoVenta,
	normalizarPagoRecibido,
} from "../../utils/venta-payment-status";
import {
	esEmailValido,
	esTelefono10Digitos,
	normalizarPorcentaje,
	normalizarTelefono10,
} from "../../utils/form-validations";
import ModalAgregarDoctor from "./componentes/modal-agregar-doctor";
import {
	actualizarDoctorConAuthentication,
	crearDoctorConAuthentication,
} from "../../utils/doctores-auth";
import ModalAgregarPaciente from "./componentes/modal-agregar-paciente";
import ModalConfirmarEliminacion from "../../components/ModalConfirmarEliminacion.jsx";
import {
	buscarDuplicadoRegistro,
	crearMensajeRegistroDuplicado,
} from "../../utils/duplicados-registro.js";
import ModalBuscarCotizacion from "./componentes/modal-buscar-cotizacion";
import ModalMuestrasPendientes from "./componentes/modal-muestras-pendientes";
import ModalDetalleEstudio from "./componentes/modal-detalle-estudio";
import "./nuevo-paciente.css";

import cotizacionesBtn from "../../assets/cotizacionesBtn.png";
import doctorIcono from "../../assets/doctorIcono.png";
import eliminarIcono from "../../assets/eliminarIconoV2.png";
import muestrasBtn from "../../assets/muestrasBtn.png";
import pacientesIcono from "../../assets/pacientesIcono.png";
import warningV1 from "../../assets/warningV1.png";

const normalizarTextoEstudio = (valor = "") =>
	String(valor)
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase();

const esEstudioRadiologia = (estudio = {}) => {
	if (estudio.modulo === "imagen" || estudio.requiere_imagen === true) return true;
	const texto = normalizarTextoEstudio(
		`${estudio.area || ""} ${estudio.modalidad || ""} ${estudio.descripcion || ""} ${estudio.descripcion_estudio || ""} ${estudio.clave || ""} ${estudio.clave_estudio || ""}`,
	);
	return (
		/radiologia|imagen|rayos|ultrasonido|ultrasonografia|tomografia|resonancia|mastografia|contrastados|veterinaria/.test(
			texto,
		) || /\b(rx|usg|tac|rm)\b/.test(texto)
	);
};

const NuevoPaciente = () => {
	const { user, signOut } = useAuth();
	const { empleadoData, formatRol, getPrimerNombre } = useEmpleadoActual();
	const navigate = useNavigate();
	const location = useLocation();
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef(null);
	const citaPrecargadaRef = useRef(null);
	const tipoEstudioPendienteRef = useRef(leerBorrador().tipoEstudioSeleccionado || "");

	// Si el navegador descarta la página, el modal se reabre con lo capturado en
	// lugar de dejar al usuario en la solicitud creyendo que perdió el alta.
	const [modalAgregarPacienteOpen, setModalAgregarPacienteOpen] =
		useModalPersistente("modal-paciente:abierto:nuevo-paciente");
	const [modalAgregarDoctorOpen, setModalAgregarDoctorOpen] =
		useModalPersistente("modal-doctor:abierto:nuevo-paciente");
	const [duplicadoPendiente, setDuplicadoPendiente] = useState(null);
	const [modalBuscarCotizacionOpen, setModalBuscarCotizacionOpen] = useState(false);
	const [modalMuestrasPendientesOpen, setModalMuestrasPendientesOpen] =
		useState(false);
	const [notificacion, setNotificacion] = useState({
		isOpen: false,
		mensaje: "",
		tipo: "exito",
	});

	const [buscarPaciente, setBuscarPaciente] = useBusquedaPersistente("nuevo-paciente:paciente");
	const [pacientesEncontrados, setPacientesEncontrados] = useState([]);
	const [pacienteSeleccionado, setPacienteSeleccionado] = useCampoPersistente(`${BORRADOR}pacienteSeleccionado`, null);
	const [showBusquedaPacientes, setShowBusquedaPacientes] = useState(false);

	const [nombreCompleto, setNombreCompleto] = useCampoPersistente(`${BORRADOR}nombreCompleto`, "");
	const [edad, setEdad] = useCampoPersistente(`${BORRADOR}edad`, "");
	const [sexo, setSexo] = useCampoPersistente(`${BORRADOR}sexo`, "");
	const [telefono, setTelefono] = useCampoPersistente(`${BORRADOR}telefono`, "");
	const [correo, setCorreo] = useCampoPersistente(`${BORRADOR}correo`, "");
	const [rfc, setRfc] = useCampoPersistente(`${BORRADOR}rfc`, "");

	const [doctorBusqueda, setDoctorBusqueda] = useCampoPersistente(`${BORRADOR}doctorBusqueda`, "");
	const [doctoresEncontrados, setDoctoresEncontrados] = useState([]);
	const [doctorSeleccionado, setDoctorSeleccionado] = useCampoPersistente(`${BORRADOR}doctorSeleccionado`, null);
	const [showBusquedaDoctores, setShowBusquedaDoctores] = useState(false);

	const [observaciones, setObservaciones] = useCampoPersistente(`${BORRADOR}observaciones`, "");

	const [clienteSeleccionado, setClienteSeleccionado] = useState(() => leerBorrador().clienteSeleccionado || "");
	const [clientes, setClientes] = useState([]);

	const [empresaSeleccionada, setEmpresaSeleccionada] = useState(() => leerBorrador().empresaSeleccionada || "");
	const [empresas, setEmpresas] = useState([]);

	const [tipoEstudioSeleccionado, setTipoEstudioSeleccionado] = useState(() => leerBorrador().tipoEstudioSeleccionado || "");
	const [tiposEstudio, setTiposEstudio] = useState([]);

	const [buscarEstudio, setBuscarEstudio] = useBusquedaPersistente("nuevo-paciente:estudio");
	const [estudiosDisponibles, setEstudiosDisponibles] = useState([]);
	const [estudiosSeleccionados, setEstudiosSeleccionados] = useState(() => leerBorrador().estudiosSeleccionados || []);
	const [estudioDetalle, setEstudioDetalle] = useState(null);
	const [preciosCliente, setPreciosCliente] = useState(null);
	const [reglasConvenio, setReglasConvenio] = useState([]);
	const [pagosPorSerie, setPagosPorSerie] = useCampoPersistente(`${BORRADOR}pagosPorSerie`, {});
	const [showBusquedaEstudios, setShowBusquedaEstudios] = useState(false);
	const [catalogoImagenError, setCatalogoImagenError] = useState("");
	const [buscandoImagen, setBuscandoImagen] = useState(false);

	const [subtotal, setSubtotal] = useState(0);
	const [descuentoPercent, setDescuentoPercent] = useCampoPersistente(`${BORRADOR}descuentoPercent`, 0);
	const [descuento, setDescuento] = useState(0);
	const [granTotal, setGranTotal] = useState(0);
	const [pagoRecibido, setPagoRecibido] = useCampoPersistente(`${BORRADOR}pagoRecibido`, "");
	const [cambio, setCambio] = useState(0);

	const [formaPago, setFormaPago] = useCampoPersistente(`${BORRADOR}formaPago`, "efectivo");
	const [tarjetaUltimos4, setTarjetaUltimos4] = useCampoPersistente(`${BORRADOR}tarjetaUltimos4`, "");
	const [codigoAprobacion, setCodigoAprobacion] = useCampoPersistente(`${BORRADOR}codigoAprobacion`, "");
	const [agregarASalaEspera, setAgregarASalaEspera] = useCampoPersistente(`${BORRADOR}agregarASalaEspera`, true);
	const [destinoTurno, setDestinoTurno] = useCampoPersistente(`${BORRADOR}destinoTurno`, "");
	const [destinoTurnoManual, setDestinoTurnoManual] = useCampoPersistente(`${BORRADOR}destinoTurnoManual`, false);
	const [prioridadTurno, setPrioridadTurno] = useCampoPersistente(`${BORRADOR}prioridadTurno`, "0");

	const citaIdDesdeDashboard =
		location.state?.citaId ||
		new URLSearchParams(location.search).get("citaId");
	const idCitaPrecargada = citaIdDesdeDashboard
		? parseInt(citaIdDesdeDashboard, 10)
		: null;

	const mostrarNotificacion = (mensaje, tipo = "exito") =>
		setNotificacion({ isOpen: true, mensaje, tipo });

	const cerrarNotificacion = () =>
		setNotificacion((prev) => ({ ...prev, isOpen: false }));

	const handleTelefonoChange = (valor) => {
		setTelefono(normalizarTelefono10(valor));
	};

	const handleDescuentoPercentChange = (valor) => {
		setDescuentoPercent(normalizarPorcentaje(valor));
	};

	useEffect(() => {
		cargarClientes();
		cargarEmpresas();
		cargarEstudiosDisponibles();
	}, []);

	// La orden se parte por serie para el cobro y el ticket: A y B facturan por
	// su empresa y C es el laboratorio de CDC.
	const partesOrden = dividirOrdenPorSerie({
		estudios: estudiosSeleccionados,
		reglasConvenio,
		descuentoPercent,
	});
	const ordenMixta = esOrdenMixta(partesOrden);

	useEffect(() => {
		calcularTotales();
	}, [estudiosSeleccionados, descuentoPercent, pagoRecibido]);

	// El cobro de una orden mixta arranca prorrateado a proporción del total de
	// cada serie; queda editable para cuando el paciente sólo paga una parte.
	useEffect(() => {
		if (!ordenMixta) {
			setPagosPorSerie({});
			return;
		}
		setPagosPorSerie(
			prorratearPago(partesOrden, calcularPagoAplicadoVenta(granTotal, normalizarPagoRecibido(pagoRecibido))),
		);
	}, [ordenMixta, granTotal, pagoRecibido, estudiosSeleccionados, descuentoPercent]);

	useEffect(() => {
		sessionStorage.setItem(CLAVE_BORRADOR, JSON.stringify({ clienteSeleccionado, empresaSeleccionada, tipoEstudioSeleccionado, estudiosSeleccionados }));
	}, [clienteSeleccionado, empresaSeleccionada, tipoEstudioSeleccionado, estudiosSeleccionados]);

	useEffect(() => {
		if (!destinoTurnoManual) {
			setDestinoTurno(resolverDestinoTurnoDesdeEstudios(estudiosSeleccionados));
		}
	}, [estudiosSeleccionados, destinoTurnoManual]);

	// Las claves con precio del cliente acotan la búsqueda de estudios: un
	// convenio sólo ofrece lo que tiene pactado.
	useEffect(() => {
		let cancelado = false;
		const nombreCliente = clientes.find(
			(cli) => cli.id_cliente?.toString() === clienteSeleccionado?.toString(),
		)?.nombre;

		if (!clienteSeleccionado || !nombreCliente) {
			setPreciosCliente(null);
			setReglasConvenio([]);
			return undefined;
		}

		cargarPreciosCliente(supabase, nombreCliente).then((precios) => {
			if (!cancelado) setPreciosCliente(precios);
		});

		// La matriz del convenio define a qué empresa se factura cada modalidad,
		// y con eso la serie del folio.
		cargarReglasConvenio(supabase, clienteSeleccionado).then((reglas) => {
			if (!cancelado) setReglasConvenio(reglas);
		});

		return () => {
			cancelado = true;
		};
	}, [clienteSeleccionado, clientes]);

	useEffect(() => {
		if (empresaSeleccionada) {
			cargarTiposEstudio(parseInt(empresaSeleccionada));
		} else {
			setTiposEstudio([]);
		}
	}, [empresaSeleccionada]);

	useEffect(() => {
		if (!citaIdDesdeDashboard || estudiosDisponibles.length === 0) return;
		if (citaPrecargadaRef.current === citaIdDesdeDashboard) return;

		citaPrecargadaRef.current = citaIdDesdeDashboard;
		cargarCitaDesdeDashboard(citaIdDesdeDashboard);
	}, [citaIdDesdeDashboard, estudiosDisponibles]);

	// El consecutivo lo reserva la base: calcularlo aquí hacía que dos cajas
	// capturando al mismo tiempo pidieran el mismo folio y la venta chocara
	// contra la restricción de único.
	const generarFolio = async (serie = SERIE_POR_DEFECTO) => {
		try {
			const { data, error } = await supabase.rpc("siguiente_folio", {
				p_serie: serie,
			});
			if (error) throw error;
			if (data) return data;
		} catch (error) {
			console.warn("Folio sin consecutivo en base, se calcula localmente:", error);
		}

		// Base sin la migración del consecutivo: se sigue calculando aquí para no
		// dejar a recepción sin poder cobrar.
		try {
			const { data, error } = await supabase
				.from("ventas")
				.select("folio")
				.like("folio", `${serie}%`)
				.order("folio", { ascending: false })
				.limit(1);

			if (error) throw error;

			const ultimo = data?.[0]?.folio ? separarFolio(data[0].folio).consecutivo : null;
			return construirFolio(serie, Number.isFinite(ultimo) ? ultimo + 1 : 1);
		} catch (error) {
			console.error("Error al generar folio:", error);
			return construirFolio(serie, 1);
		}
	};

	const crearTurnoDesdeSolicitud = async ({
		idPaciente,
		idCita,
		nombrePaciente,
		estudios,
		fechaProgramada,
	}) => {
		const rangoHoy = obtenerRangoDiaLocalISO(new Date());

		const { count, error: errorConteo } = await supabase
			.from("turnos_pacientes")
			.select("id_turno", { count: "exact", head: true })
			.gte("fecha_programada", rangoHoy.inicio)
			.lte("fecha_programada", rangoHoy.fin);

		if (errorConteo) throw errorConteo;

		const destinoSugerido =
			destinoTurno.trim() || resolverDestinoTurnoDesdeEstudios(estudios);
		const { error } = await supabase.from("turnos_pacientes").insert({
			id_paciente: idPaciente,
			id_cita: idCita || null,
			codigo_turno: generarCodigoTurno((count || 0) + 1),
			nombre_paciente: nombrePaciente,
			area: destinoSugerido,
			destino: destinoSugerido,
			prioridad: Number(prioridadTurno) || 0,
			fecha_programada: fechaProgramada,
			creado_por: user?.id || null,
		});

		if (error) throw error;
	};

	const guardarYPagar = async () => {
		if (!nombreCompleto.trim()) {
			globalThis.mostrarNotificacion("Por favor ingrese el nombre del paciente", "advertencia");
			return;
		}

		if (telefono && !esTelefono10Digitos(telefono)) {
			globalThis.mostrarNotificacion("El teléfono debe contener exactamente 10 dígitos numéricos", "advertencia");
			return;
		}

		if (correo.trim() && !esEmailValido(correo)) {
			globalThis.mostrarNotificacion("Por favor ingrese un correo válido", "advertencia");
			return;
		}

		if (Number(descuentoPercent) > 100) {
			globalThis.mostrarNotificacion("El descuento no puede ser mayor al 100%", "advertencia");
			setDescuentoPercent(100);
			return;
		}

		if (estudiosSeleccionados.length === 0) {
			globalThis.mostrarNotificacion("Por favor agregue al menos un estudio", "advertencia");
			return;
		}

		if (!empresaActual?.id_empresa || !empresaActual.nombre) {
			globalThis.mostrarNotificacion("Seleccione una empresa antes de registrar la venta", "advertencia");
			return;
		}

		if (ordenMixta) {
			const cobroPorSerie = validarPagosPorSerie(partesOrden, pagosPorSerie);
			if (!cobroPorSerie.valido) {
				globalThis.mostrarNotificacion(cobroPorSerie.mensaje, "advertencia");
				return;
			}
		}

		const pagoTarjeta = validarPagoTarjeta({
			formaPago,
			ultimos4: tarjetaUltimos4,
			codigoAprobacion,
		});
		if (normalizarPagoRecibido(pagoRecibido) > 0 && !pagoTarjeta.valido) {
			globalThis.mostrarNotificacion(pagoTarjeta.mensaje, "advertencia");
			return;
		}
		const ventanaTicket = window.open("", "_blank");
		const ventanaEtiquetasLaboratorio = window.open("", "_blank");
		const ventanaEtiquetasImagen = window.open("", "_blank");

		try {
			const pagoNormalizado = normalizarPagoRecibido(pagoRecibido);
			const datosTarjetaVenta = construirDatosTarjeta({
				formaPago,
				ultimos4: tarjetaUltimos4,
				codigoAprobacion,
			});
			const pagoAplicado = calcularPagoAplicadoVenta(granTotal, pagoNormalizado);
			const cambioVenta = Math.max(pagoNormalizado - granTotal, 0);
			let idPaciente = pacienteSeleccionado?.id_paciente;

			if (!idPaciente) {
				const { data: nuevoPaciente, error: errorPaciente } = await supabase
					.from("pacientes")
					.insert([
						{
							nombre: nombreCompleto,
							telefono: telefono,
							email: correo,
							sexo: sexo,
							edad: parseInt(edad) || null,
							rfc: rfc || null,
							tipo: clienteSeleccionado ? "cliente" : "particular",
						},
					])
					.select()
					.single();

				if (errorPaciente) throw errorPaciente;
				idPaciente = nuevoPaciente.id_paciente;
			}

			const { data: empleado } = await supabase
				.from("empleados")
				.select("id_empleado, nombre, rol, auth_uuid, sucursal")
				.eq("auth_uuid", user.id)
				.single();
			const { data: sucursalesCatalogo } = await supabase
				.from("sucursales")
				.select("id_sucursal, nombre");
			const sucursalEmpleado = resolverSucursalEmpleado(
				empleado,
				sucursalesCatalogo || [],
			);

			// Una visita puede tocar las dos empresas: cada serie se guarda como su
			// propia venta, con su folio, su cobro y su ticket, y todas quedan
			// enlazadas por folio_grupo para el portal de resultados.
			const pagosPorParte = ordenMixta
				? partesOrden.reduce(
						(pagos, parte) => ({
							...pagos,
							[parte.serie]: normalizarPagoRecibido(pagosPorSerie[parte.serie]),
						}),
						{},
					)
				: { [partesOrden[0].serie]: pagoAplicado };
			const folioGrupo = ordenMixta
				? `G${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`
				: null;

			const ahora = new Date();

			const idEmpresaDeSerie = (serie) => {
				const empresaSerie = empresaDeSerie(serie);
				const empresaCatalogo = empresas.find(
					(emp) => resolverEmpresaOperativaCatalogo(emp.nombre) === empresaSerie,
				);
				return empresaCatalogo?.id_empresa || empresaActual.id_empresa;
			};

			const registrarVentaDeParte = async (parte) => {
				const folioParte = await generarFolio(parte.serie);
				const pagoParte = Math.min(
					normalizarPagoRecibido(pagosPorParte[parte.serie]),
					parte.total,
				);
				const cambioParte = parte.serie === partesOrden[0].serie ? cambioVenta : 0;

				const ventaPayload = agregarSucursalEmpleadoPayload(
					{
						folio: folioParte,
						folio_grupo: folioGrupo,
						id_paciente: idPaciente,
						id_doctor:
							doctorSeleccionado?.id_doctor || doctorSeleccionado?.id_empleado || null,
						id_cliente: clienteSeleccionado ? parseInt(clienteSeleccionado) : null,
						id_empresa: idEmpresaDeSerie(parte.serie),
						id_empleado: empleado?.id_empleado || null,
						fecha_venta: ahora.toISOString(),
						subtotal: parte.subtotal,
						iva: 0,
						descuento: parte.descuento,
						total: parte.total,
						forma_pago: formaPago,
						...datosTarjetaVenta,
						pago_recibido: pagoParte,
						cambio: cambioParte,
						observaciones: observaciones,
						estado: "activo",
						...(idCitaPrecargada ? { id_cita: idCitaPrecargada } : {}),
					},
					sucursalEmpleado,
				);

				const insertarVenta = (payload) =>
					supabase.from("ventas").insert([payload]).select().single();

				let { data: venta, error: errorVenta } = await insertarVenta(ventaPayload);
				let ventaPayloadFallback = { ...ventaPayload };

				// Se reintenta quitando la columna que la base todavía no tiene, sea
				// cual sea de las opcionales: parar en la primera dejaría la venta sin
				// guardar en un ambiente sin migrar.
				while (errorVenta) {
					const columna = obtenerColumnaSchemaCacheFaltante(errorVenta);
					if (
						![
							"id_sucursal",
							"sucursal",
							"id_cita",
							"tarjeta_ultimos4",
							"codigo_aprobacion",
							"folio_grupo",
						].includes(columna)
					) {
						break;
					}
					delete ventaPayloadFallback[columna];
					({ data: venta, error: errorVenta } = await insertarVenta(
						ventaPayloadFallback,
					));
				}

				if (errorVenta) throw errorVenta;

				if (pagoParte > 0) {
					await registrarMovimientoPagoVenta(supabase, {
						id_venta: venta.id_venta,
						folio: folioParte,
						tipo_movimiento: TIPOS_MOVIMIENTO_PAGO.PAGO_INICIAL,
						monto: pagoParte,
						forma_pago: formaPago,
						ultimos4: tarjetaUltimos4,
						codigoAprobacion,
						motivo: "Pago inicial de solicitud",
						id_sucursal: sucursalEmpleado.id_sucursal,
						sucursal: sucursalEmpleado.sucursal,
						empleado: empleadoData || empleado,
						user,
					});
				}

				const adeudoParte = Math.max(parte.total - pagoParte, 0);
				await registrarEventoSolicitud(supabase, {
					id_venta: venta.id_venta,
					folio: folioParte,
					evento: EVENTOS_SOLICITUD.CREADA,
					descripcion: `Solicitud creada con ${parte.estudios.length} estudio(s)`,
					empleado,
					user,
					detalles: {
						serie: parte.serie,
						empresa: parte.empresa,
						folio_grupo: folioGrupo,
						total: parte.total,
						pago_recibido: pagoParte,
						adeudo: adeudoParte,
					},
				});
				await registrarEventoSolicitud(supabase, {
					id_venta: venta.id_venta,
					folio: folioParte,
					evento: EVENTOS_SOLICITUD.COBRADA,
					descripcion: `Pago registrado por $${Number(pagoParte || 0).toFixed(2)}`,
					empleado,
					user,
					detalles: {
						forma_pago: formaPago,
						...datosTarjetaVenta,
						total: parte.total,
						pago_recibido: pagoParte,
						adeudo: adeudoParte,
					},
				});

				const estudiosParaInsertar = parte.estudios.map((est) =>
					agregarSucursalEmpleadoPayload(
						{
							id_venta: venta.id_venta,
							clave_estudio: est.clave,
							descripcion_estudio: est.descripcion,
							precio: est.precio,
							area: est.area,
							dias_proceso: est.diasProceso || 1,
							estado_captura: "pendiente",
							muestra_pendiente: Boolean(est.muestra_pendiente),
						},
						sucursalEmpleado,
					),
				);

				const insertarEstudios = (payload) =>
					supabase
						.from("estudios_venta")
						.insert(payload)
						.select("id_estudio_venta, id_venta, clave_estudio, descripcion_estudio, area");
				let { data: estudiosGuardados, error: errorEstudios } =
					await insertarEstudios(estudiosParaInsertar);
				let estudiosPayloadFallback = estudiosParaInsertar;

				while (errorEstudios) {
					const columna = obtenerColumnaSchemaCacheFaltante(errorEstudios);
					if (!["id_sucursal", "sucursal", "muestra_pendiente"].includes(columna)) {
						break;
					}
					estudiosPayloadFallback = estudiosPayloadFallback.map((estudio) => {
						const limpio = { ...estudio };
						delete limpio[columna];
						return limpio;
					});
					({ data: estudiosGuardados, error: errorEstudios } =
						await insertarEstudios(estudiosPayloadFallback));
				}

				if (errorEstudios) throw errorEstudios;

				const estudiosRadiologiaParaInsertar = (estudiosGuardados || [])
					.filter(esEstudioRadiologia)
					.map((estudio) =>
						agregarSucursalEmpleadoPayload(
							{
								id_venta: venta.id_venta,
								id_estudio_venta: estudio.id_estudio_venta,
								id_paciente: idPaciente,
								id_tecnico: null,
								tipo_estudio: resolverCodigoTipoRadiologia(estudio),
								descripcion: estudio.descripcion_estudio,
								fecha_estudio: formatearFechaHoraMexicoLocal(ahora),
								estado: "POR ASIGNAR",
								listo_entrega: false,
								entregado: false,
							},
							sucursalEmpleado,
						),
					);

				if (estudiosRadiologiaParaInsertar.length > 0) {
					const insertarEstudiosRadiologia = (payload) =>
						supabase.from("estudios_radiologia").insert(payload);
					let { error: errorRadiologia } = await insertarEstudiosRadiologia(
						estudiosRadiologiaParaInsertar,
					);
					let radiologiaPayloadFallback = estudiosRadiologiaParaInsertar;

					while (errorRadiologia) {
						const columna = obtenerColumnaSchemaCacheFaltante(errorRadiologia);
						if (
							![
								"id_sucursal",
								"sucursal",
								"id_venta",
								"id_estudio_venta",
								"listo_entrega",
								"entregado",
							].includes(columna)
						) {
							break;
						}
						radiologiaPayloadFallback = radiologiaPayloadFallback.map((estudio) => {
							const limpio = { ...estudio };
							delete limpio[columna];
							return limpio;
						});
						({ error: errorRadiologia } = await insertarEstudiosRadiologia(
							radiologiaPayloadFallback,
						));
					}

					if (errorRadiologia) throw errorRadiologia;
				}

				const estudiosLaboratorioGuardados = (estudiosGuardados || []).filter(
					(estudio) => !esEstudioRadiologia(estudio),
				);
				await crearNotificaciones(
					supabase,
					[
						estudiosLaboratorioGuardados.length > 0 && {
							titulo: "Nueva solicitud en captura",
							mensaje: `${nombreCompleto} · Folio ${folioParte} · ${estudiosLaboratorioGuardados.length} estudio(s)`,
							tipo: "captura",
							canal_destino: "captura",
							entidad_tipo: "venta",
							entidad_id: venta.id_venta,
							id_venta: venta.id_venta,
							id_sucursal: sucursalEmpleado?.id_sucursal || null,
							sucursal: sucursalEmpleado?.sucursal || "",
							action_path: "/captura",
						},
						estudiosRadiologiaParaInsertar.length > 0 && {
							titulo: "Nuevo estudio de imagen",
							mensaje: `${nombreCompleto} · Folio ${folioParte} · ${estudiosRadiologiaParaInsertar.length} estudio(s)`,
							tipo: "radiologia",
							canal_destino: "radiologia",
							entidad_tipo: "venta",
							entidad_id: venta.id_venta,
							id_venta: venta.id_venta,
							id_sucursal: sucursalEmpleado?.id_sucursal || null,
							sucursal: sucursalEmpleado?.sucursal || "",
							action_path: "/radiologia",
						},
					].filter(Boolean),
				);

				return {
					parte,
					folio: folioParte,
					venta,
					pago: pagoParte,
					estudiosGuardados: estudiosGuardados || [],
				};
			};

			const ventasRegistradas = [];
			for (const parte of partesOrden) {
				ventasRegistradas.push(await registrarVentaDeParte(parte));
			}

			const folio = ventasRegistradas.map((registro) => registro.folio).join(" · ");
			if (idCitaPrecargada) {
				const { error: errorCita } = await supabase
					.from("citas")
					.update({
						estado: CITA_ESTADOS.EN_PROCESO,
					})
					.eq("id_cita", idCitaPrecargada);

				if (errorCita) throw errorCita;
			}

			// Un turno por orden: cada venta entra a su área con sus estudios.
			let turnoCreado = false;
			let errorTurno = "";
			if (agregarASalaEspera) {
				for (const registro of ventasRegistradas) {
					try {
						await crearTurnoDesdeSolicitud({
							idPaciente,
							idCita: idCitaPrecargada,
							nombrePaciente: nombreCompleto,
							estudios: registro.estudiosGuardados.length
								? registro.estudiosGuardados
								: registro.parte.estudios,
							fechaProgramada: ahora.toISOString(),
						});
						turnoCreado = true;
					} catch (error) {
						console.error("Error al crear turno:", error);
						errorTurno = error.message;
					}
				}
			}

			// La venta ya quedó registrada: si algo falla al armar el ticket o las
			// etiquetas se avisa, pero no se tira el flujo ni se cierra lo que sí
			// alcanzó a abrirse.
			// El ticket es uno por empresa fiscal —las series de CDC salen juntas—
			// y los dos van en el mismo PDF para que sea una sola impresión.
			const nombreEmpresaFiscal = (empresa) =>
				empresas.find((emp) => resolverEmpresaOperativaCatalogo(emp.nombre) === empresa)
					?.nombre || empresaActual.nombre;

			const ticketsPorEmpresa = agruparPartesPorEmpresa(partesOrden).map((grupo) => {
				const registros = ventasRegistradas.filter(
					(registro) => registro.parte.empresa === grupo.empresa,
				);
				const estudiosEmpresa = registros.flatMap((registro) => registro.parte.estudios);
				const pagoEmpresa = registros.reduce((suma, registro) => suma + registro.pago, 0);
				return {
					folio: registros.map((registro) => registro.folio).join(" · "),
					fecha: new Date(),
					paciente: nombreCompleto,
					empresa: nombreEmpresaFiscal(grupo.empresa),
					telefono,
					email: correo,
					estudios: estudiosEmpresa,
					subtotal: grupo.subtotal,
					descuento: grupo.descuento,
					total: grupo.total,
					pagoRecibido: pagoEmpresa,
					cambio: registros.some((registro) => registro.parte.serie === partesOrden[0].serie)
						? cambioVenta
						: 0,
					formaPago,
					tarjetaUltimos4: datosTarjetaVenta.tarjeta_ultimos4 || "",
					codigoAprobacion: datosTarjetaVenta.codigo_aprobacion || "",
					observaciones,
					vendedor: empleadoData?.nombre || getPrimerNombre(),
				};
			});
			ticketsPorEmpresa[0].ventana = ventanaTicket;

			const registroLaboratorio = ventasRegistradas.find(
				(registro) => registro.parte.serie === SERIE_LABORATORIO,
			);
			const registrosImagen = ventasRegistradas.filter(
				(registro) => registro.parte.serie !== SERIE_LABORATORIO,
			);

			const impresion = await imprimirComprobantesVenta({
				tickets: ticketsPorEmpresa,
				etiquetasLaboratorio: registroLaboratorio
					? {
							folio: registroLaboratorio.folio,
							paciente: nombreCompleto,
							sexo,
							edad: edad ? `${edad} años` : "",
							estudios: registroLaboratorio.parte.estudios,
							ventana: ventanaEtiquetasLaboratorio,
						}
					: null,
				etiquetasImagen: registrosImagen.length
					? {
							paciente: nombreCompleto,
							doctor: doctorSeleccionado?.nombre || "",
							grupos: registrosImagen.map((registro) => ({
								folio: registro.folio,
								estudios: registro.parte.estudios,
							})),
							ventana: ventanaEtiquetasImagen,
						}
					: null,
			});

			if (!registroLaboratorio) ventanaEtiquetasLaboratorio?.close?.();
			if (!registrosImagen.length) ventanaEtiquetasImagen?.close?.();

			globalThis.mostrarNotificacion(
				`¡Venta registrada exitosamente!\nFolio: ${folio}${
					turnoCreado
						? "\nTurno agregado a sala de espera."
						: errorTurno
							? `\nNo se pudo crear el turno: ${errorTurno}`
							: ""
				}${impresion.error ? `\n${impresion.error}` : ""}`,
				impresion.error ? "advertencia" : undefined,
			);
			limpiarFormulario();
			navigate("/captura");
		} catch (error) {
			ventanaTicket?.close?.();
			ventanaEtiquetasLaboratorio?.close?.();
			ventanaEtiquetasImagen?.close?.();
			console.error("Error al guardar:", error);
			globalThis.mostrarNotificacion("Error al guardar la venta: " + error.message, "error");
		}
	};

	const cargarClientes = async () => {
		try {
			const { data, error } = await supabase
				.from("clientes")
				.select("id_cliente, nombre")
				.order("nombre");

			if (error) throw error;
			setClientes(data || []);
		} catch (error) {
			console.error("Error al cargar clientes:", error);
		}
	};

	const cargarEmpresas = async () => {
		try {
			const { data, error } = await supabase
				.from("empresas")
				.select("id_empresa, nombre")
				.order("nombre");

			if (error) throw error;
			setEmpresas(data || []);
		} catch (error) {
			console.error("Error al cargar empresas:", error);
		}
	};

	const cargarTiposEstudio = async (idEmpresa = null) => {
		try {
			if (!idEmpresa) {
				setTiposEstudio([]);
				return;
			}

			const { data, error } = await supabase
				.from("empresa_tipos_estudio")
				.select(
					`
					id_tipo_estudio,
					tipos_estudio (
						id_tipo_estudio,
						nombre
					)
				`,
				)
				.eq("id_empresa", idEmpresa)
				.order("tipos_estudio(nombre)");

			if (error) throw error;

			const tiposFiltrados = data.map((item) => ({
				id_tipo_estudio: item.tipos_estudio.id_tipo_estudio,
				nombre: item.tipos_estudio.nombre,
			}));

			setTiposEstudio(tiposFiltrados || []);
			const tipoPendiente = tipoEstudioPendienteRef.current;
			if (tipoPendiente && tiposFiltrados.some((tipo) => tipo.id_tipo_estudio?.toString() === tipoPendiente)) {
				setTipoEstudioSeleccionado(tipoPendiente);
			}
			tipoEstudioPendienteRef.current = "";
		} catch (error) {
			console.error("Error al cargar tipos de estudio:", error);
			setTiposEstudio([]);
		}
	};

	const cargarEstudiosDisponibles = async () => {
		try {
			const { data: estudiosLab, error } = await supabase
				.from("estudios_lab_catalogo")
				.select("id, clave, descripcion, area, tipo_muestra, recipiente, metodo, tecnica, equipo, condiciones_paciente, etiquetas_extra, dias_proceso")
				.order("clave");

			if (error) throw error;

			const estudiosLaboratorio = (estudiosLab || []).map((estudio) =>
				construirEstudioCatalogoUnificado(estudio, "laboratorio"),
			);

			const { data: estudiosImagen, error: errorImagen } = await supabase
				.from("estudios_imagen_catalogo")
				.select(
					"id, id_empresa, clave, descripcion, empresa_operativa, modalidad, area, region_anatomica, requiere_contraste, requiere_interpretacion, dias_proceso, preparacion, duracion_minutos",
				)
				.eq("activo", true)
				.order("clave");

			if (errorImagen) {
				console.warn("No se pudo cargar catálogo de imagen:", errorImagen);
				setCatalogoImagenError(
					"No se pudo cargar el catalogo de imagen. Revisa que las migraciones esten aplicadas.",
				);
				setEstudiosDisponibles(estudiosLaboratorio);
				return;
			}
			setCatalogoImagenError("");

			const estudiosImagenFormateados = (estudiosImagen || []).map((estudio) =>
				construirEstudioCatalogoUnificado(estudio, "imagen"),
			);

			setEstudiosDisponibles([
				...estudiosLaboratorio,
				...estudiosImagenFormateados,
			]);
		} catch (error) {
			console.error("Error al cargar estudios:", error);
		}
	};

	const buscarEstudiosImagenDirecto = async () => {
		const empresaOperativa = resolverEmpresaOperativaCatalogo(
			empresaActual?.nombre || "",
		);
		const modalidad = resolverModalidadDesdeTipo(tipoEstudioActual?.nombre || "");

		if (!empresaOperativa || !modalidad || modalidad === "laboratorio") return;

		setBuscandoImagen(true);
		try {
			const termino = buscarEstudio.trim();
			let query = supabase
				.from("estudios_imagen_catalogo")
				.select(
					"id, id_empresa, clave, descripcion, empresa_operativa, modalidad, area, region_anatomica, requiere_contraste, requiere_interpretacion, dias_proceso, preparacion, duracion_minutos",
				)
				.eq("activo", true)
				.eq("modalidad", modalidad);

			if (empresaActual?.id_empresa) {
				query = query.eq("id_empresa", empresaActual.id_empresa);
			} else {
				query = query.eq("empresa_operativa", empresaOperativa);
			}

			if (termino.length >= 2) {
				query = query.or(`clave.ilike.%${termino}%,descripcion.ilike.%${termino}%`);
			}

			const { data, error } = await query.order("clave").limit(25);
			if (error) throw error;

			const nuevos = (data || []).map((estudio) =>
				construirEstudioCatalogoUnificado(estudio, "imagen"),
			);
			setCatalogoImagenError("");
			if (nuevos.length === 0) return;

			setEstudiosDisponibles((prev) => {
				const claves = new Set(prev.map((estudio) => estudio.clave));
				return [
					...prev,
					...nuevos.filter((estudio) => !claves.has(estudio.clave)),
				];
			});
		} catch (error) {
			console.error("Error al buscar estudios de imagen:", error);
			setCatalogoImagenError(
				"No se pudo consultar el catalogo de imagen para este tipo de estudio.",
			);
		} finally {
			setBuscandoImagen(false);
		}
	};

	const obtenerPrecioEstudio = async (claveEstudio, nombreCliente) => {
		try {
			if (!nombreCliente) {
				console.log("No hay cliente seleccionado, usando precio por defecto");
				return 150;
			}

			const { data, error } = await supabase
				.from("precios_estudios")
				.select("precio")
				.eq("clave", claveEstudio)
				.eq("cliente", nombreCliente)
				.single();

			if (error) {
				console.log(
					`No se encontró precio para ${claveEstudio} - ${nombreCliente}, usando precio por defecto`,
				);
				return 150;
			}

			console.log(
				`Precio encontrado para ${claveEstudio} - ${nombreCliente}: $${data.precio}`,
			);
			return parseFloat(data.precio);
		} catch (error) {
			console.error("Error al obtener precio:", error);
			return 150;
		}
	};

	const buscarPacientes = async (termino) => {
		if (termino.length < 2) {
			setPacientesEncontrados([]);
			setShowBusquedaPacientes(false);
			return;
		}

		try {
			const { data, error } = await supabase
				.from("pacientes")
				.select("*")
				.or(
					`nombre.ilike.%${termino}%,apellido_paterno.ilike.%${termino}%,apellido_materno.ilike.%${termino}%,telefono.ilike.%${termino}%`,
				)
				.order("nombre")
				.limit(10);

			if (error) throw error;

			setPacientesEncontrados(data || []);
			setShowBusquedaPacientes(true);
		} catch (error) {
			console.error("Error al buscar pacientes:", error);
			setPacientesEncontrados([]);
			setShowBusquedaPacientes(false);
		}
	};

	const buscarPacientesAsync = useCallback(async (termino) => {
		const { data, error } = await supabase
			.from("pacientes")
			.select("*")
			.or(`nombre.ilike.%${termino}%,apellido_paterno.ilike.%${termino}%,apellido_materno.ilike.%${termino}%,telefono.ilike.%${termino}%`)
			.order("nombre")
			.limit(10);
		if (error) throw error;
		return data || [];
	}, []);

	// Los datos de la orden anterior no se arrastran al paciente que se acaba de
	// elegir: cada paciente empieza su propia orden. No aplica cuando el
	// paciente viene de un alta, de una cita o de una cotización, porque ahí la
	// captura de la orden ya está hecha o se llena enseguida.
	const limpiarDatosOrden = () => {
		setDoctorSeleccionado(null);
		setDoctorBusqueda("");
		setObservaciones("");
		setClienteSeleccionado("");
		setEmpresaSeleccionada("");
		setTipoEstudioSeleccionado("");
		setEstudiosSeleccionados([]);
		setBuscarEstudio("");
		setShowBusquedaEstudios(false);
		setPagoRecibido("");
		setDescuentoPercent(0);
		setFormaPago("efectivo");
		setTarjetaUltimos4("");
		setCodigoAprobacion("");
		setAgregarASalaEspera(true);
		setDestinoTurno("");
		setDestinoTurnoManual(false);
		setPrioridadTurno("0");
	};

	const seleccionarPaciente = (paciente, { limpiarOrden = false } = {}) => {
		if (limpiarOrden) limpiarDatosOrden();
		setPacienteSeleccionado(paciente);
		setNombreCompleto(paciente.nombre);
		setTelefono(normalizarTelefono10(paciente.telefono || ""));
		setCorreo(paciente.email || "");
		setEdad(paciente.edad?.toString() || "");
		setSexo(paciente.sexo || "");
		setRfc(paciente.rfc || "");
		setBuscarPaciente(paciente.nombre);
		setShowBusquedaPacientes(false);
	};

	const handleGuardarPacienteModal = async (pacienteData, isEditMode) => {
		const insertarPaciente = async () => {
			const { data, error } = await supabase
				.from("pacientes")
				.insert([pacienteData])
				.select()
				.single();

			if (error) throw error;
			globalThis.mostrarNotificacion("Paciente guardado correctamente");
			seleccionarPaciente(data);
		};

		try {
			if (isEditMode) {
				const { error } = await supabase
					.from("pacientes")
					.update({
						nombre: pacienteData.nombre,
						apellido_paterno: pacienteData.apellido_paterno,
						apellido_materno: pacienteData.apellido_materno,
						primer_nombre: pacienteData.primer_nombre,
						fecha_nacimiento: pacienteData.fecha_nacimiento,
						edad: pacienteData.edad,
						sexo: pacienteData.sexo,
						direccion: pacienteData.direccion,
						cedula: pacienteData.cedula,
						condicion_especial: pacienteData.condicion_especial,
						email: pacienteData.email,
						pais: pacienteData.pais,
						telefono: pacienteData.telefono,
						rfc: pacienteData.rfc,
						updated_at: new Date().toISOString(),
					})
					.eq("id_paciente", pacienteData.id);

				if (error) throw error;
				globalThis.mostrarNotificacion("Paciente actualizado correctamente");
			} else {
				const duplicado = await buscarDuplicadoRegistro({
					supabase,
					tabla: "pacientes",
					registro: pacienteData,
					idCampo: "id_paciente",
				});
				if (duplicado) {
					setDuplicadoPendiente({
						mensaje: crearMensajeRegistroDuplicado({ tipo: "paciente", duplicado }),
						onConfirm: insertarPaciente,
					});
					return;
				}

				await insertarPaciente();
			}
		} catch (error) {
			console.error("Error al guardar paciente:", error);
			globalThis.mostrarNotificacion("Error al guardar paciente: " + error.message, "error");
		}
	};

	const handleGuardarDoctorModal = async (doctorData, isEditMode) => {
		const insertarDoctor = async () => {
			const data = await crearDoctorConAuthentication(supabase, doctorData);
			globalThis.mostrarNotificacion("Doctor guardado correctamente");
			seleccionarDoctor(data.doctor || data);
		};

		try {
			if (isEditMode) {
				await actualizarDoctorConAuthentication(supabase, doctorData);
				globalThis.mostrarNotificacion("Doctor actualizado correctamente");
			} else {
				const duplicado = await buscarDuplicadoRegistro({
					supabase,
					tabla: "doctores",
					registro: doctorData,
					idCampo: "id_doctor",
				});
				if (duplicado) {
					setDuplicadoPendiente({
						mensaje: crearMensajeRegistroDuplicado({ tipo: "doctor", duplicado }),
						onConfirm: insertarDoctor,
					});
					return;
				}

				await insertarDoctor();
			}
		} catch (error) {
			console.error("Error al guardar doctor:", error);
			globalThis.mostrarNotificacion("Error al guardar doctor: " + error.message, "error");
		}
	};

	const buscarDoctores = async (termino) => {
		if (termino.length < 2) {
			setDoctoresEncontrados([]);
			setShowBusquedaDoctores(false);
			return;
		}

		try {
			const { data, error } = await supabase
				.from("doctores")
				.select("*")
				.or(`nombre.ilike.%${termino}%,apellido_paterno.ilike.%${termino}%`)
				.order("nombre")
				.limit(10);

			if (error) throw error;
			setDoctoresEncontrados(data || []);
			setShowBusquedaDoctores(true);
		} catch (error) {
			console.error("Error al buscar doctores:", error);
			setDoctoresEncontrados([]);
			setShowBusquedaDoctores(false);
		}
	};

	const buscarDoctoresAsync = useCallback(async (termino) => {
		const { data, error } = await supabase
			.from("doctores")
			.select("*")
			.or(`nombre.ilike.%${termino}%,apellido_paterno.ilike.%${termino}%`)
			.order("nombre")
			.limit(10);
		if (error) throw error;
		return data || [];
	}, []);

	const seleccionarDoctor = (doctor) => {
		setDoctorSeleccionado(doctor);
		setDoctorBusqueda(doctor.nombre);
		setShowBusquedaDoctores(false);
	};

	const filtrarEstudios = (termino) => {
		if (termino.length < 2) {
			setShowBusquedaEstudios(false);
			return;
		}

		setShowBusquedaEstudios(true);
	};

	const agregarEstudio = async (estudio) => {
		if (estudiosSeleccionados.find((e) => e.clave === estudio.clave)) {
			globalThis.mostrarNotificacion("Este estudio ya fue agregado", "advertencia");
			return;
		}

		const clienteObj = clientes.find(
			(cli) => cli.id_cliente.toString() === clienteSeleccionado.toString(),
		);
		const nombreCliente = clienteObj ? clienteObj.nombre : "";

		const precioEstudio = await obtenerPrecioEstudio(estudio.clave, nombreCliente);

		const estudioConPrecio = {
			...estudio,
			precio: precioEstudio,
			cantidad: 1,
			diasProceso: estudio.diasProceso || estudio.dias_proceso || 1,
			cliente: nombreCliente || "Sin cliente",
			muestra_pendiente: false,
		};

		setEstudiosSeleccionados([...estudiosSeleccionados, estudioConPrecio]);
		setBuscarEstudio("");
		setShowBusquedaEstudios(false);
	};

	const eliminarEstudio = (id) => {
		setEstudiosSeleccionados(estudiosSeleccionados.filter((e) => e.id !== id));
	};

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
		const { subtotal: sub, descuento: desc, total: gran } =
			calcularTotalesNuevoPaciente(estudiosSeleccionados, descuentoPercent);
		setSubtotal(sub);
		setDescuento(desc);
		setGranTotal(gran);

		const camb = normalizarPagoRecibido(pagoRecibido) - gran;
		setCambio(camb > 0 ? camb : 0);
	};

	const handleSeleccionarCotizacion = async (cotizacion) => {
		try {
			setNombreCompleto(cotizacion.nombre_paciente);

			if (cotizacion.id_cliente) {
				setClienteSeleccionado(cotizacion.id_cliente.toString());
			}

			const clienteObj = clientes.find(
				(cli) => cli.id_cliente === cotizacion.id_cliente,
			);
			const nombreCliente = clienteObj ? clienteObj.nombre : "";

			const estudios =
				typeof cotizacion.estudios === "string"
					? JSON.parse(cotizacion.estudios)
					: cotizacion.estudios;

			const estudiosCompletos = await Promise.all(
				estudios.map(async (est) => {
					const estudioCatalogo = estudiosDisponibles.find(
						(e) => e.clave === est.clave,
					);

					if (estudioCatalogo) {
						return {
							...estudioCatalogo,
							precio: est.precio,
							cantidad: 1,
							diasProceso: 1,
							cliente: nombreCliente || "Sin cliente",
							muestra_pendiente: Boolean(est.muestra_pendiente),
						};
					}
					return null;
				}),
			);

			setEstudiosSeleccionados(estudiosCompletos.filter((e) => e !== null));

			if (cotizacion.descuento_porcentaje) {
				setDescuentoPercent(
					normalizarPorcentaje(parseFloat(cotizacion.descuento_porcentaje)),
				);
			}

			mostrarNotificacion("Datos de cotización cargados exitosamente", "exito");
		} catch (error) {
			console.error("Error al cargar cotización:", error);
			mostrarNotificacion("Error al cargar los datos de la cotización", "error");
		}
	};

	const cargarCitaDesdeDashboard = async (idCita) => {
		try {
			const { data: cita, error } = await supabase
				.from("citas")
				.select(
					`
					id_cita,
					id_paciente,
					id_cliente,
					id_empresa,
					id_tipo_estudio,
					nombre_paciente,
					telefono_paciente,
					tipo_estudio,
					monto,
					pacientes (*),
					clientes (id_cliente, nombre),
					empresas (id_empresa, nombre),
					tipos_estudio (id_tipo_estudio, nombre)
				`,
				)
				.eq("id_cita", idCita)
				.single();

			if (error) throw error;

			if (cita.pacientes) {
				seleccionarPaciente(cita.pacientes);
			} else {
				const nombrePaciente = cita.nombre_paciente || "";
				const telefonoPaciente = normalizarTelefono10(cita.telefono_paciente || "");
				const { data: pacienteExistente } = telefonoPaciente
					? await supabase
						.from("pacientes")
						.select("id_paciente, nombre, telefono, email, sexo, edad, rfc")
						.eq("telefono", telefonoPaciente)
						.maybeSingle()
					: { data: null };
				if (pacienteExistente) seleccionarPaciente(pacienteExistente);
				else setPacienteSeleccionado(null);
				setNombreCompleto(nombrePaciente);
				setTelefono(telefonoPaciente);
				setBuscarPaciente(nombrePaciente);
			}

			const clienteId = cita.id_cliente ? cita.id_cliente.toString() : "";
			const empresaId = cita.id_empresa ? cita.id_empresa.toString() : "";
			const tipoEstudioId = cita.id_tipo_estudio
				? cita.id_tipo_estudio.toString()
				: "";

			tipoEstudioPendienteRef.current = tipoEstudioId;
			setClienteSeleccionado(clienteId);
			setEmpresaSeleccionada(empresaId);
			if (!empresaId) setTipoEstudioSeleccionado(tipoEstudioId);

			const nombreCliente =
				cita.clientes?.nombre ||
				clientes.find((cli) => cli.id_cliente?.toString() === clienteId)?.nombre ||
				"";

			const estudiosCita = dividirEstudiosCita(cita.tipo_estudio);
			const estudiosNoEncontrados = [];
			const estudiosDesdeCita = await Promise.all(
				estudiosCita.map(async (estudioCita) => {
					const estudioCatalogo = encontrarEstudioCatalogo(
						estudioCita,
						estudiosDisponibles,
					);

					if (!estudioCatalogo) {
						estudiosNoEncontrados.push(estudioCita);
						return null;
					}

					const precio = await obtenerPrecioEstudio(estudioCatalogo.clave, nombreCliente);
					return construirEstudioSeleccionado({
						estudioCatalogo,
						precio,
						nombreCliente,
					});
				}),
			);

			setEstudiosSeleccionados(
				estudiosDesdeCita
					.filter(Boolean)
					.map((estudio) => ({ ...estudio, muestra_pendiente: false })),
			);
			setBuscarEstudio("");
			setShowBusquedaEstudios(false);

			if (estudiosNoEncontrados.length > 0) {
				mostrarNotificacion(
					`Cita cargada, pero no se encontraron estos estudios: ${estudiosNoEncontrados.join(", ")}`,
					"advertencia",
				);
				return;
			}

			mostrarNotificacion("Cita cargada en nuevo paciente", "exito");
		} catch (error) {
			console.error("Error al cargar cita:", error);
			mostrarNotificacion("Error al cargar la cita en nuevo paciente", "error");
			citaPrecargadaRef.current = null;
		}
	};

	const limpiarFormulario = () => {
		setPacienteSeleccionado(null);
		setNombreCompleto("");
		setEdad("");
		setSexo("");
		setTelefono("");
		setCorreo("");
		setRfc("");
		setDoctorSeleccionado(null);
		setDoctorBusqueda("");
		setObservaciones("");
		setClienteSeleccionado("");
		setEmpresaSeleccionada("");
		setTipoEstudioSeleccionado("");
		setEstudiosSeleccionados([]);
		sessionStorage.removeItem(CLAVE_BORRADOR);
		limpiarBorradorPersistente(BORRADOR);
		// La solicitud quedó registrada: los modales de alta tampoco tienen nada
		// pendiente que recuperar.
		limpiarBorradorPersistente("modal-paciente:");
		limpiarBorradorPersistente("modal-doctor:");
		setBuscarPaciente("");
		setBuscarEstudio("");
		setPagoRecibido("");
		setDescuentoPercent(0);
		setFormaPago("efectivo");
		setTarjetaUltimos4("");
		setCodigoAprobacion("");
		setAgregarASalaEspera(true);
		setDestinoTurno("");
		setDestinoTurnoManual(false);
		setPrioridadTurno("0");
	};

	// Mientras el catálogo termina de cargar, un select con una selección que
	// todavía no tiene su <option> se ve vacío y parece que se perdió la
	// captura: se pinta una opción temporal con el valor recuperado.
	const opcionPendiente = (valor, lista, campoId) =>
		valor &&
		!lista.some((item) => String(item[campoId]) === String(valor)) && (
			<option value={valor}>Recuperando selección…</option>
		);

	const clienteActual = clientes.find(
		(cli) => cli.id_cliente?.toString() === clienteSeleccionado?.toString(),
	);
	const empresaActual = empresas.find(
		(emp) => emp.id_empresa?.toString() === empresaSeleccionada?.toString(),
	);
	const tipoEstudioActual = tiposEstudio.find(
		(tipo) =>
			tipo.id_tipo_estudio?.toString() === tipoEstudioSeleccionado?.toString(),
	);
	// Se resuelve contra el catálogo cargado: si el tarifario del cliente no
	// cruza con ninguna clave, no se filtra nada en lugar de dejar la búsqueda
	// vacía.
	const clavesConPrecio = resolverClavesConPrecio(
		preciosCliente,
		estudiosDisponibles,
	);
	const filtrosCatalogo = {
		estudios: estudiosDisponibles,
		busqueda: buscarEstudio,
		empresaId: empresaSeleccionada,
		empresaNombre: empresaActual?.nombre || "",
		tipoNombre: tipoEstudioActual?.nombre || "",
		reglasConvenio,
	};
	const estudiosConPrecio = filtrarEstudiosCatalogo({
		...filtrosCatalogo,
		clavesConPrecio,
	});
	// Si el convenio no tiene precio para lo que se está buscando, se ofrece el
	// catálogo avisando que ese estudio no está en su tarifario: dejar la
	// búsqueda vacía impedía capturar la solicitud.
	const estudiosSinFiltroPrecio = filtrarEstudiosCatalogo(filtrosCatalogo);
	const mostrandoEstudiosSinPrecio =
		Boolean(clavesConPrecio?.size) &&
		estudiosConPrecio.length === 0 &&
		estudiosSinFiltroPrecio.length > 0;
	const estudiosFiltrados = mostrandoEstudiosSinPrecio
		? estudiosSinFiltroPrecio
		: estudiosConPrecio;

	useEffect(() => {
		if (!showBusquedaEstudios || buscarEstudio.trim().length < 2) return;
		if (!tipoEstudioEsImagen(tipoEstudioActual?.nombre || "")) return;
		if (estudiosFiltrados.length > 0) return;

		buscarEstudiosImagenDirecto();
	}, [
		showBusquedaEstudios,
		buscarEstudio,
		empresaSeleccionada,
		tipoEstudioSeleccionado,
		estudiosFiltrados.length,
	]);

	const resumenPago = obtenerResumenPagoNuevoPaciente(granTotal, pagoRecibido);
	const limpiarPacienteSeleccionado = () => {
		setPacienteSeleccionado(null);
		setBuscarPaciente("");
		setNombreCompleto("");
		setTelefono("");
		setCorreo("");
		setEdad("");
		setSexo("");
		setRfc("");
	};

	const handleLogout = async () => {
		await signOut();
		navigate("/login");
	};

	return (
		<PageLayout
			empleadoData={empleadoData}
			formatRol={formatRol}
			getPrimerNombre={getPrimerNombre}>
			<div className="nuevo-paciente-wrapper">

				<main className="page-main">
					{idCitaPrecargada && (
						<div className="source-banner">
							<span>Cargado desde cita #{idCitaPrecargada}</span>
						</div>
					)}

					<div className="content-grid">
						<div className="patient-column">
							<section className="form-section form-section-cliente">
								<h2 className="section-title">Paciente</h2>

								<div className="search-container">
									<SearchAutocomplete
										buscar={buscarPacientesAsync}
										onSeleccionar={(pac) =>
											pac && seleccionarPaciente(pac, { limpiarOrden: true })
										}
										getLabel={(pac) => pac?.nombre ?? ''}
										placeholder="Buscar por nombre o teléfono"
										value={pacienteSeleccionado}
										noOptionsText="Sin coincidencias — prueba con otro nombre"
										renderOpcion={(pac) => {
											const detalles = formatearPacienteBusqueda(pac);
											return (
												<div style={{ width: '100%' }}>
													<div style={{ fontWeight: 600, color: 'white', fontSize: '0.88rem' }}>{pac.nombre}</div>
													{detalles.length > 0 && (
														<div style={{ fontSize: '0.75rem', color: 'rgba(83,185,219,0.75)', marginTop: '2px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
															{detalles.map((d) => <span key={d}>{d}</span>)}
														</div>
													)}
												</div>
											);
										}}
										className="search-input-autocomplete"
									/>
									<button
										className="btn-search btn-search-paciente"
										onClick={() => setModalAgregarPacienteOpen(true)}
										title="Agregar nuevo paciente">
										<img src={pacientesIcono} alt="Paciente" className="btn-icon" />
									</button>
								</div>

								{pacienteSeleccionado && (
									<div className="selected-entity-card">
										<div>
											<strong>{pacienteSeleccionado.nombre}</strong>
											<span>
												{[
													pacienteSeleccionado.edad
														? `${pacienteSeleccionado.edad} años`
														: "",
													pacienteSeleccionado.sexo || "",
													pacienteSeleccionado.telefono || "",
												]
													.filter(Boolean)
													.join(" · ")}
											</span>
										</div>
										<button
											type="button"
											onClick={limpiarPacienteSeleccionado}>
											Cambiar
										</button>
									</div>
								)}

								<div className="form-group">
									<label>Nombre Completo</label>
									<input
										type="text"
										value={nombreCompleto}
										onChange={(e) => setNombreCompleto(e.target.value)}
										className="form-input"
										placeholder="Nombre completo del paciente"
									/>
								</div>

								<div className="form-row">
									<div className="form-group">
										<label>Edad</label>
										<input
											type="number"
											value={edad}
											onChange={(e) => setEdad(e.target.value)}
											className="form-input"
											placeholder="Edad"
										/>
									</div>

									<div className="form-group">
										<label>Sexo</label>
										<select
											value={sexo}
											onChange={(e) => setSexo(e.target.value)}
											className="form-select">
											<option value="">Seleccionar</option>
											<option value="masculino">Masculino</option>
											<option value="femenino">Femenino</option>
											<option value="otro">Otro</option>
											<option value="prefiero_no_decirlo">Prefiero no decirlo</option>
										</select>
									</div>
								</div>

								<div className="form-group">
									<label>Teléfono</label>
									<input
										type="tel"
										value={telefono}
										onChange={(e) => handleTelefonoChange(e.target.value)}
										className="form-input"
										maxLength="10"
										inputMode="numeric"
										placeholder="Número de teléfono"
									/>
								</div>

								<div className="form-group">
									<label>Correo</label>
									<input
										type="email"
										value={correo}
										onChange={(e) => setCorreo(e.target.value)}
										className="form-input"
										placeholder="correo@ejemplo.com"
									/>
								</div>

								<div className="form-group">
									<label>RFC</label>
									<input
										type="text"
										value={rfc}
										onChange={(e) => setRfc(e.target.value.toUpperCase())}
										className="form-input"
										placeholder="RFC (opcional)"
										maxLength="13"
									/>
								</div>
							</section>

							<section className="form-section">
								<h2 className="section-title">Doctor</h2>

								<div className="search-container">
									<SearchAutocomplete
										buscar={buscarDoctoresAsync}
										onSeleccionar={(doc) => doc && seleccionarDoctor(doc)}
										getLabel={(doc) => doc ? formatearDoctorBusqueda(doc).nombre : ''}
										placeholder="Buscar doctor"
										value={doctorSeleccionado}
										noOptionsText="Sin coincidencias"
										renderOpcion={(doc) => {
											const { nombre, detalles } = formatearDoctorBusqueda(doc);
											return (
												<div style={{ width: '100%' }}>
													<div style={{ fontWeight: 600, color: 'white', fontSize: '0.88rem' }}>{nombre}</div>
													{detalles.length > 0 && (
														<div style={{ fontSize: '0.75rem', color: 'rgba(83,185,219,0.75)', marginTop: '2px' }}>
															{detalles.join(' · ')}
														</div>
													)}
												</div>
											);
										}}
										className="search-input-autocomplete"
									/>
									<button
										className="btn-search btn-search-doctor"
										onClick={() => setModalAgregarDoctorOpen(true)}
										title="Agregar nuevo doctor">
										<img src={doctorIcono} alt="Doctor" className="btn-icon" />
									</button>
								</div>

								{doctorSeleccionado && (
									<div className="selected-entity-card">
										<div>
											<strong>
												{formatearDoctorBusqueda(doctorSeleccionado).nombre}
											</strong>
											<span>
												{formatearDoctorBusqueda(doctorSeleccionado).detalles.join(
													" · ",
												)}
											</span>
										</div>
										<button
											type="button"
											onClick={() => {
												setDoctorSeleccionado(null);
												setDoctorBusqueda("");
											}}>
											Cambiar
										</button>
									</div>
								)}
							</section>

							<section className="form-section">
								<h2 className="section-title">Observaciones</h2>
								<textarea
									value={observaciones}
									onChange={(e) => setObservaciones(e.target.value)}
									className="form-textarea"
									rows="3"
									placeholder="Observaciones adicionales..."
								/>
							</section>
						</div>

						<div className="study-column">
							<div className="top-controls">
								<div className="form-group-inline">
									<label>Empresa</label>
									<select
										value={empresaSeleccionada}
										onChange={(e) => setEmpresaSeleccionada(e.target.value)}
										className="form-select">
										<option value="">Selecciona una Empresa</option>
										{opcionPendiente(empresaSeleccionada, empresas, "id_empresa")}
										{empresas.map((emp) => (
											<option key={emp.id_empresa} value={emp.id_empresa}>
												{emp.nombre}
											</option>
										))}
									</select>
								</div>

								<div className="action-buttons">
									<button
										type="button"
										className="btn-img-action"
										onClick={() => setModalMuestrasPendientesOpen(true)}>
										<img
											src={muestrasBtn}
											alt="Muestras Pendientes"
											className="btn-action-img"
										/>
									</button>
									<button
										className="btn-img-action"
										onClick={() => setModalBuscarCotizacionOpen(true)}>
										<img
											src={cotizacionesBtn}
											alt="Cotizaciones"
											className="btn-action-img"
										/>
									</button>
								</div>
							</div>

							<div className="selects-adicionales">
								<div className="form-group-inline">
									<label>Clientes</label>
									<select
										value={clienteSeleccionado}
										onChange={(e) => setClienteSeleccionado(e.target.value)}
										className="form-select"
										disabled={!empresaSeleccionada}>
										<option value="">
											{empresaSeleccionada
												? "Selecciona un Cliente"
												: "Primero selecciona una Empresa"}
										</option>
										{opcionPendiente(clienteSeleccionado, clientes, "id_cliente")}
										{clientes.map((cli) => (
											<option key={cli.id_cliente} value={cli.id_cliente}>
												{cli.nombre}
											</option>
										))}
									</select>
								</div>

								<div className="form-group-inline">
									<label>Tipo Estudio</label>
									<select
										value={tipoEstudioSeleccionado}
										onChange={(e) => setTipoEstudioSeleccionado(e.target.value)}
										className="form-select"
										disabled={!empresaSeleccionada}>
										<option value="">
											{empresaSeleccionada
												? "Selecciona Tipo de Estudio"
												: "Primero selecciona una Empresa"}
										</option>
										{opcionPendiente(
											tipoEstudioSeleccionado,
											tiposEstudio,
											"id_tipo_estudio",
										)}
										{tiposEstudio.map((tipo) => (
											<option
												key={tipo.id_tipo_estudio}
												value={tipo.id_tipo_estudio}>
												{tipo.nombre}
											</option>
										))}
									</select>
								</div>
							</div>

							<section className="estudios-section">
								<div className="section-title-row">
									<h2 className="section-title">Estudios</h2>
									<span>{estudiosSeleccionados.length} seleccionados</span>
								</div>

								{!clienteSeleccionado && (
									<div className="alert-empresa-requerida">
										<img
											src={warningV1}
											alt="Advertencia"
											className="warning-icon"
										/>
										<span>
											{empresaSeleccionada
												? "Primero selecciona un cliente para buscar estudios"
												: "Primero selecciona una empresa y un cliente para buscar estudios"}
										</span>
									</div>
								)}

								{clienteSeleccionado && clavesConPrecio?.size > 0 && (
									<p
										className={
											mostrandoEstudiosSinPrecio
												? "nota-precios-cliente nota-precios-cliente-aviso"
												: "nota-precios-cliente"
										}>
										{mostrandoEstudiosSinPrecio
											? `${clienteActual?.nombre || "El cliente"} no tiene precio registrado para estos estudios: se cobrarán al precio por defecto.`
											: `Sólo se muestran los estudios con precio registrado para ${clienteActual?.nombre || "el cliente"}.`}
									</p>
								)}

								<div className="search-container" style={{ position: "relative" }}>
									<input
										type="text"
										placeholder={
											clienteSeleccionado
												? "Buscar Estudios..."
												: "Selecciona un cliente primero"
										}
										value={buscarEstudio}
										onChange={(e) => {
											if (clienteSeleccionado) {
												setBuscarEstudio(e.target.value);
												filtrarEstudios(e.target.value);
											}
										}}
										className="search-input-full"
										disabled={!clienteSeleccionado}
									/>

									{showBusquedaEstudios &&
										buscarEstudio.length >= 2 &&
										clienteSeleccionado && (
											<div className="search-results-estudios">
												{estudiosFiltrados.length > 0 ? (
													estudiosFiltrados.map((est) => (
														<div
															key={est.id}
															className="search-result-item"
															onClick={() => agregarEstudio(est)}>
															<strong>{est.clave}</strong> - {est.descripcion}
														</div>
													))
												) : (
													<div className="search-result-empty">
														{buscandoImagen
															? "Buscando estudios de imagen..."
															: catalogoImagenError ||
															"No hay estudios que coincidan con ese filtro"}
													</div>
												)}
											</div>
										)}
								</div>

								<div className="estudios-table-container">
									<table className="estudios-table">
										<thead>
											<tr>
												<th>Clave</th>
												<th>Descripción</th>
												<th>Cliente</th>
												<th>Precio</th>
												<th>Borrar</th>
											</tr>
										</thead>
										<tbody>
											{estudiosSeleccionados.map((est) => (
												<Fragment key={est.id}>
													<tr>
														<td>{est.clave}</td>
													<td>
														<button
															type="button"
															className="btn-detalle-estudio"
															aria-label={`Ver detalle de ${est.descripcion}`}
															onClick={() => setEstudioDetalle(est)}>
															{est.descripcion}
														</button>
													</td>
														<td>{est.cliente}</td>
														<td>${est.precio.toFixed(2)}</td>
														<td>
															<button
																className="btn-delete"
																aria-label={`Eliminar estudio ${est.clave}`}
																onClick={() => eliminarEstudio(est.id)}>
																<img
																	src={eliminarIcono}
																	alt=""
																	className="btn-delete-icon"
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
											))}
											{estudiosSeleccionados.length === 0 && (
												<tr>
													<td colSpan="5" className="empty-message"></td>
												</tr>
											)}
										</tbody>
									</table>
								</div>
							</section>
						</div>

						<aside className="summary-column" aria-label="Resumen de solicitud">
							<section className="totales-section">
								<div className="summary-header">
									<h2 className="section-title">Resumen</h2>
									<span className={`payment-status ${resumenPago.estado}`}>
										{resumenPago.etiqueta}
									</span>
								</div>

								<div className="request-summary-card">
									<div>
										<span>Paciente</span>
										<strong>{nombreCompleto || "Sin paciente"}</strong>
									</div>
									<div>
										<span>Cliente</span>
										<strong>
											{clientes.find(
												(cli) =>
													cli.id_cliente.toString() ===
													clienteSeleccionado.toString(),
											)?.nombre || "Particular"}
										</strong>
									</div>
									<div>
										<span>Estudios</span>
										<strong>{estudiosSeleccionados.length}</strong>
									</div>
								</div>

								<div className="totales-grid">
									<div className="total-item">
										<label>Total</label>
										<input
											type="text"
											value={`$${subtotal.toFixed(2)}`}
											readOnly
											className="total-input"
										/>
									</div>

								</div>

								<div className="pago-grid">
									<div className="pago-item">
										<label>Forma Pago</label>
										<select
											value={formaPago}
											onChange={(e) => setFormaPago(e.target.value)}
											className="form-select">
											<option value="efectivo">Efectivo</option>
											<option value="tarjeta_debito">Tarjeta Debito</option>
											<option value="tarjeta_credito">Tarjeta Credito</option>
											<option value="transferencia">Transferencia</option>
											<option value="credito">Crédito</option>
										</select>
									</div>

									<div className="pago-item">
										<label>Desc %</label>
										<input
											type="number"
											value={descuentoPercent}
											onChange={(e) => handleDescuentoPercentChange(e.target.value)}
											className="form-input-small"
											min="0"
											max="100"
										/>
									</div>
								</div>

								{esPagoConTarjeta(formaPago) && (
									<div className="pago-grid pago-grid-tarjeta">
										<div className="pago-item">
											<label htmlFor="tarjeta-ultimos4">Últimos 4 dígitos</label>
											<input
												id="tarjeta-ultimos4"
												type="text"
												inputMode="numeric"
												maxLength={4}
												value={tarjetaUltimos4}
												onChange={(e) =>
													setTarjetaUltimos4(normalizarUltimos4(e.target.value))
												}
												className="form-input-small"
												placeholder="1234"
											/>
										</div>

										<div className="pago-item">
											<label htmlFor="codigo-aprobacion">Código de aprobación</label>
											<input
												id="codigo-aprobacion"
												type="text"
												maxLength={12}
												value={codigoAprobacion}
												onChange={(e) =>
													setCodigoAprobacion(
														normalizarCodigoAprobacion(e.target.value),
													)
												}
												className="form-input-small"
												placeholder="Ej. A1B2C3"
											/>
										</div>
									</div>
								)}

								<div className="final-totales">
									<div className="final-item">
										<label>Desc</label>
										<input
											type="text"
											value={`$${descuento.toFixed(2)}`}
											readOnly
											className="total-input"
										/>
									</div>

									<div className="final-item">
										<label>Gran Total</label>
										<input
											type="text"
											value={`$${granTotal.toFixed(2)}`}
											readOnly
											className="total-input-grand"
										/>
									</div>

									<div className="final-item">
										<label>Pago</label>
										<input
											type="number"
											value={pagoRecibido}
											onChange={(e) =>
												setPagoRecibido(
													e.target.value === ""
														? ""
														: parseFloat(e.target.value) || 0,
												)
											}
											className="form-input-pago"
											placeholder="Paga con"
										/>
									</div>
								</div>

								{ordenMixta && (
									<div className="cobro-por-serie">
										<p className="cobro-por-serie-titulo">
											Esta orden factura por {partesOrden.length} folios: el cobro
											va prorrateado y se puede ajustar.
										</p>
										{partesOrden.map((parte) => (
											<div key={parte.serie} className="cobro-serie-fila">
												<div className="cobro-serie-datos">
													<span className="cobro-serie-etiqueta">
														Serie {parte.serie} · {parte.empresa}
													</span>
													<span className="cobro-serie-total">
														Total ${parte.total.toFixed(2)}
													</span>
												</div>
												<input
													type="number"
													min="0"
													step="0.01"
													className="form-input-small"
													aria-label={`Pago de la serie ${parte.serie}`}
													value={pagosPorSerie[parte.serie] ?? ""}
													onChange={(e) =>
														setPagosPorSerie({
															...pagosPorSerie,
															[parte.serie]:
																e.target.value === "" ? "" : parseFloat(e.target.value) || 0,
														})
													}
												/>
											</div>
										))}
									</div>
								)}

								{cambio > 0 && (
									<div className="cambio-display">
										<strong>Cambio:</strong> ${cambio.toFixed(2)}
									</div>
								)}
							</section>

							<section className="turno-sala-section">
								<label className="turno-sala-toggle">
									<input
										type="checkbox"
										checked={agregarASalaEspera}
										onChange={(e) => setAgregarASalaEspera(e.target.checked)}
									/>
									<span>
										<strong>Agregar a sala de espera</strong>
										<small>Se creara el turno al guardar la solicitud</small>
									</span>
								</label>

								{agregarASalaEspera && (
									<div className="turno-sala-controls">
										<div className="form-group">
											<label>Destino inicial</label>
											<select
												value={destinoTurno || "Laboratorio"}
												onChange={(e) => {
													setDestinoTurnoManual(true);
													setDestinoTurno(e.target.value);
												}}
												className="form-select">
												{TURNO_DESTINOS.map((destino) => (
													<option key={destino} value={destino} label={destino}>
														{destino}
													</option>
												))}
											</select>
										</div>
										<div className="form-group">
											<label>Prioridad</label>
											<select
												value={prioridadTurno}
												onChange={(e) => setPrioridadTurno(e.target.value)}
												className="form-select">
												<option value="0">Normal</option>
												<option value="1">Preferente</option>
												<option value="2">Urgente</option>
											</select>
										</div>
									</div>
								)}
							</section>

							<div className="action-buttons-final">
								<button className="btn-guardar-img" onClick={guardarYPagar}>
									<span className="btn-guardar-label">{resumenPago.accion}</span>
								</button>
							</div>
						</aside>
					</div>
				</main>

				<ModalAgregarPaciente
					isOpen={modalAgregarPacienteOpen}
					onClose={() => setModalAgregarPacienteOpen(false)}
					onGuardar={handleGuardarPacienteModal}
				/>

				<ModalAgregarDoctor
					isOpen={modalAgregarDoctorOpen}
					onClose={() => setModalAgregarDoctorOpen(false)}
					onSave={handleGuardarDoctorModal}
				/>

				<ModalConfirmarEliminacion
					isOpen={Boolean(duplicadoPendiente)}
					onClose={() => setDuplicadoPendiente(null)}
					onConfirm={() => duplicadoPendiente?.onConfirm?.()}
					titulo="Registro duplicado"
					mensaje={duplicadoPendiente?.mensaje}
					textoConfirmar="Agregar de todos modos"
					textoCancelar="Cancelar"
					mostrarAdvertencia={false}
				/>

				<ModalBuscarCotizacion
					isOpen={modalBuscarCotizacionOpen}
					onClose={() => setModalBuscarCotizacionOpen(false)}
					onSeleccionar={handleSeleccionarCotizacion}
					onNotificar={mostrarNotificacion}
				/>

				<ModalMuestrasPendientes
					isOpen={modalMuestrasPendientesOpen}
					estudios={estudiosSeleccionados}
					onClose={() => setModalMuestrasPendientesOpen(false)}
					onToggleMuestraPendiente={toggleMuestraPendiente}
				/>

				<ModalDetalleEstudio
					estudio={estudioDetalle}
					onClose={() => setEstudioDetalle(null)}
				/>

				<ModalNotificacion
					isOpen={notificacion.isOpen}
					onClose={cerrarNotificacion}
					mensaje={notificacion.mensaje}
					tipo={notificacion.tipo}
				/>
			</div>
		</PageLayout>
	);
};

export default NuevoPaciente;
