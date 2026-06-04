import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ModalNotificacion from "../../components/ModalNotificacion";
import PageLayout from "../../components/page-layout.jsx";
import SearchAutocomplete from "../../components/search-autocomplete.jsx";
import { useAuth } from "../../context/auth-context";
import { supabase } from "../../lib/supabase-client";
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
import { generarTicketVenta } from "../../utils/generarTicketVenta";
import {
	formatearDoctorBusqueda,
	formatearPacienteBusqueda,
} from "../../utils/nuevo-paciente-busqueda";
import {
	esErrorColumnaSchemaCache,
	obtenerColumnaSchemaCacheFaltante,
} from "../../utils/supabase-errors";
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
import { normalizarPagoRecibido } from "../../utils/venta-payment-status";
import {
	esEmailValido,
	esTelefono10Digitos,
	normalizarPorcentaje,
	normalizarTelefono10,
} from "../../utils/form-validations";
import ModalAgregarDoctor from "./componentes/modal-agregar-doctor";
import ModalAgregarPaciente from "./componentes/modal-agregar-paciente";
import ModalBuscarCotizacion from "./componentes/modal-buscar-cotizacion";
import ModalMuestrasPendientes from "./componentes/modal-muestras-pendientes";
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
	const { user } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef(null);
	const citaPrecargadaRef = useRef(null);
	const tipoEstudioPendienteRef = useRef("");

	const [modalAgregarPacienteOpen, setModalAgregarPacienteOpen] = useState(false);
	const [modalAgregarDoctorOpen, setModalAgregarDoctorOpen] = useState(false);
	const [modalBuscarCotizacionOpen, setModalBuscarCotizacionOpen] = useState(false);
	const [modalMuestrasPendientesOpen, setModalMuestrasPendientesOpen] =
		useState(false);
	const [notificacion, setNotificacion] = useState({
		isOpen: false,
		mensaje: "",
		tipo: "exito",
	});

	const [buscarPaciente, setBuscarPaciente] = useState("");
	const [pacientesEncontrados, setPacientesEncontrados] = useState([]);
	const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
	const [showBusquedaPacientes, setShowBusquedaPacientes] = useState(false);

	const [nombreCompleto, setNombreCompleto] = useState("");
	const [edad, setEdad] = useState("");
	const [sexo, setSexo] = useState("");
	const [telefono, setTelefono] = useState("");
	const [correo, setCorreo] = useState("");
	const [rfc, setRfc] = useState("");

	const [doctorBusqueda, setDoctorBusqueda] = useState("");
	const [doctoresEncontrados, setDoctoresEncontrados] = useState([]);
	const [doctorSeleccionado, setDoctorSeleccionado] = useState(null);
	const [showBusquedaDoctores, setShowBusquedaDoctores] = useState(false);

	const [observaciones, setObservaciones] = useState("");

	const [clienteSeleccionado, setClienteSeleccionado] = useState("");
	const [clientes, setClientes] = useState([]);

	const [empresaSeleccionada, setEmpresaSeleccionada] = useState("");
	const [empresas, setEmpresas] = useState([]);

	const [tipoEstudioSeleccionado, setTipoEstudioSeleccionado] = useState("");
	const [tiposEstudio, setTiposEstudio] = useState([]);

	const [buscarEstudio, setBuscarEstudio] = useState("");
	const [estudiosDisponibles, setEstudiosDisponibles] = useState([]);
	const [estudiosSeleccionados, setEstudiosSeleccionados] = useState([]);
	const [showBusquedaEstudios, setShowBusquedaEstudios] = useState(false);
	const [catalogoImagenError, setCatalogoImagenError] = useState("");
	const [buscandoImagen, setBuscandoImagen] = useState(false);

	const [subtotal, setSubtotal] = useState(0);
	const [ivaPercent, setIvaPercent] = useState(16);
	const [iva, setIva] = useState(0);
	const [totalConIva, setTotalConIva] = useState(0);
	const [descuentoPercent, setDescuentoPercent] = useState(0);
	const [descuento, setDescuento] = useState(0);
	const [granTotal, setGranTotal] = useState(0);
	const [pagoRecibido, setPagoRecibido] = useState("");
	const [cambio, setCambio] = useState(0);

	const [formaPago, setFormaPago] = useState("efectivo");
	const [agregarASalaEspera, setAgregarASalaEspera] = useState(true);
	const [destinoTurno, setDestinoTurno] = useState("");
	const [destinoTurnoManual, setDestinoTurnoManual] = useState(false);
	const [prioridadTurno, setPrioridadTurno] = useState("0");

	const [empleadoData, setEmpleadoData] = useState(null);
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
		const fetchEmpleadoData = async () => {
			if (!user?.id) return;

			try {
				const { data: empleado, error } = await supabase
					.from("empleados")
					.select("nombre, rol, sucursal")
					.eq("auth_uuid", user.id)
					.maybeSingle();

				if (error) {
					console.error("Error al obtener empleado:", error);
					return;
				}

				if (empleado) {
					setEmpleadoData(empleado);
				}
			} catch (error) {
				console.error("Error al obtener datos del empleado:", error);
			}
		};

		fetchEmpleadoData();
	}, [user]);

	useEffect(() => {
		cargarClientes();
		cargarEmpresas();
		cargarVendedor();
		cargarEstudiosDisponibles();
	}, []);

	useEffect(() => {
		calcularTotales();
	}, [estudiosSeleccionados, ivaPercent, descuentoPercent, pagoRecibido]);

	useEffect(() => {
		if (!destinoTurnoManual) {
			setDestinoTurno(resolverDestinoTurnoDesdeEstudios(estudiosSeleccionados));
		}
	}, [estudiosSeleccionados, destinoTurnoManual]);

	useEffect(() => {
		if (empresaSeleccionada) {
			cargarTiposEstudio(parseInt(empresaSeleccionada));
		} else {
			setTiposEstudio([]);
		}
		setTipoEstudioSeleccionado(tipoEstudioPendienteRef.current || "");
		tipoEstudioPendienteRef.current = "";
	}, [empresaSeleccionada]);

	useEffect(() => {
		if (!citaIdDesdeDashboard || estudiosDisponibles.length === 0) return;
		if (citaPrecargadaRef.current === citaIdDesdeDashboard) return;

		citaPrecargadaRef.current = citaIdDesdeDashboard;
		cargarCitaDesdeDashboard(citaIdDesdeDashboard);
	}, [citaIdDesdeDashboard, estudiosDisponibles]);

	const generarFolio = async () => {
		const hoy = new Date();
		const dia = String(hoy.getDate()).padStart(2, "0");
		const mes = String(hoy.getMonth() + 1).padStart(2, "0");
		const ano = String(hoy.getFullYear()).slice(-2);

		const prefijo = `${dia}${mes}${ano}`;

		try {
			const { data, error } = await supabase
				.from("ventas")
				.select("folio")
				.like("folio", `${prefijo}%`)
				.order("folio", { ascending: false })
				.limit(1);

			if (error) throw error;

			let numeroConsecutivo = 1;

			if (data && data.length > 0) {
				const ultimoFolio = data[0].folio;
				const ultimoNumero = parseInt(ultimoFolio.slice(-4));
				numeroConsecutivo = ultimoNumero + 1;
			}

			const folioCompleto = `${prefijo}${String(numeroConsecutivo).padStart(4, "0")}`;
			return folioCompleto;
		} catch (error) {
			console.error("Error al generar folio:", error);
			return `${prefijo}0001`;
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
			alert("Por favor ingrese el nombre del paciente");
			return;
		}

		if (telefono && !esTelefono10Digitos(telefono)) {
			alert("El teléfono debe contener exactamente 10 dígitos numéricos");
			return;
		}

		if (correo.trim() && !esEmailValido(correo)) {
			alert("Por favor ingrese un correo válido");
			return;
		}

		if (Number(descuentoPercent) > 100) {
			alert("El descuento no puede ser mayor al 100%");
			setDescuentoPercent(100);
			return;
		}

		if (estudiosSeleccionados.length === 0) {
			alert("Por favor agregue al menos un estudio");
			return;
		}

		try {
			const pagoNormalizado = normalizarPagoRecibido(pagoRecibido);
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
				.select("id_empleado, sucursal")
				.eq("auth_uuid", user.id)
				.single();
			const { data: sucursalesCatalogo } = await supabase
				.from("sucursales")
				.select("id_sucursal, nombre");
			const sucursalEmpleado = resolverSucursalEmpleado(
				empleado,
				sucursalesCatalogo || [],
			);

			const folio = await generarFolio();

			const ahora = new Date();

			const fechaMexico = new Date(
				ahora.toLocaleString("en-US", { timeZone: "America/Mexico_City" }),
			);

			const ventaPayload = agregarSucursalEmpleadoPayload(
				{
					folio: folio,
					id_paciente: idPaciente,
					id_doctor:
						doctorSeleccionado?.id_doctor || doctorSeleccionado?.id_empleado || null,
					id_cliente: clienteSeleccionado ? parseInt(clienteSeleccionado) : null,
					id_empleado: empleado?.id_empleado || null,
					fecha_venta: fechaMexico.toISOString(),
					subtotal: subtotal,
					iva: iva,
					descuento: descuento,
					total: granTotal,
					forma_pago: formaPago,
					pago_recibido: pagoNormalizado,
					cambio: cambioVenta,
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

			for (const columna of ["id_sucursal", "sucursal", "id_cita"]) {
				if (!errorVenta || !esErrorColumnaSchemaCache(errorVenta, columna)) break;
				delete ventaPayloadFallback[columna];
				({ data: venta, error: errorVenta } = await insertarVenta(
					ventaPayloadFallback,
				));
			}

			if (errorVenta) throw errorVenta;
			if (pagoNormalizado > 0) {
				await registrarMovimientoPagoVenta(supabase, {
					id_venta: venta.id_venta,
					folio,
					tipo_movimiento: TIPOS_MOVIMIENTO_PAGO.PAGO_INICIAL,
					monto: pagoNormalizado,
					forma_pago: formaPago,
					motivo: "Pago inicial de solicitud",
					id_sucursal: sucursalEmpleado.id_sucursal,
					sucursal: sucursalEmpleado.sucursal,
					empleado: empleadoData || empleado,
					user,
				});
			}
			await registrarEventoSolicitud(supabase, {
				id_venta: venta.id_venta,
				folio,
				evento: EVENTOS_SOLICITUD.CREADA,
				descripcion: `Solicitud creada con ${estudiosSeleccionados.length} estudio(s)`,
				empleado,
				user,
				detalles: {
					total: granTotal,
					pago_recibido: pagoNormalizado,
					adeudo: Math.max(granTotal - pagoNormalizado, 0),
				},
			});
			await registrarEventoSolicitud(supabase, {
				id_venta: venta.id_venta,
				folio,
				evento: EVENTOS_SOLICITUD.COBRADA,
				descripcion: `Pago registrado por $${Number(pagoNormalizado || 0).toFixed(2)}`,
				empleado,
				user,
				detalles: {
					forma_pago: formaPago,
					total: granTotal,
					pago_recibido: pagoNormalizado,
					adeudo: Math.max(granTotal - pagoNormalizado, 0),
				},
			});

			const estudiosParaInsertar = estudiosSeleccionados.map((est) =>
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
				if (
					!["id_sucursal", "sucursal", "muestra_pendiente"].includes(columna)
				) {
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
							fecha_estudio: fechaMexico.toISOString(),
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
						mensaje: `${nombreCompleto} · Folio ${folio} · ${estudiosLaboratorioGuardados.length} estudio(s)`,
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
						mensaje: `${nombreCompleto} · Folio ${folio} · ${estudiosRadiologiaParaInsertar.length} estudio(s)`,
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

			if (idCitaPrecargada) {
				const { error: errorCita } = await supabase
					.from("citas")
					.update({
						estado: CITA_ESTADOS.EN_PROCESO,
					})
					.eq("id_cita", idCitaPrecargada);

				if (errorCita) throw errorCita;
			}

			let turnoCreado = false;
			let errorTurno = "";
			if (agregarASalaEspera) {
				try {
					await crearTurnoDesdeSolicitud({
						idPaciente,
						idCita: idCitaPrecargada,
						nombrePaciente: nombreCompleto,
						estudios: estudiosGuardados || estudiosSeleccionados,
						fechaProgramada: fechaMexico.toISOString(),
					});
					turnoCreado = true;
				} catch (error) {
					console.error("Error al crear turno:", error);
					errorTurno = error.message;
				}
			}

			await generarTicketVenta({
				folio,
				fecha: new Date(),
				paciente: nombreCompleto,
				estudios: estudiosSeleccionados,
				subtotal,
				iva,
				descuento,
				total: granTotal,
				pagoRecibido: pagoNormalizado,
				cambio: cambioVenta,
				formaPago,
				observaciones,
			});

			alert(
				`¡Venta registrada exitosamente!\nFolio: ${folio}${
					turnoCreado
						? "\nTurno agregado a sala de espera."
						: errorTurno
							? `\nNo se pudo crear el turno: ${errorTurno}`
							: ""
				}`,
			);
			limpiarFormulario();
			navigate("/captura");
		} catch (error) {
			console.error("Error al guardar:", error);
			alert("Error al guardar la venta: " + error.message);
		}
	};

	const cargarVendedor = async () => {
		if (!user) return;

		try {
			const { data: perfil } = await supabase
				.from("empleados")
				.select("nombre")
				.eq("auth_uuid", user.id)
				.single();

			if (perfil) {
				setVendedor(perfil.nombre || user.email);
			}
		} catch (error) {
			console.error("Error al cargar vendedor:", error);
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
		} catch (error) {
			console.error("Error al cargar tipos de estudio:", error);
			setTiposEstudio([]);
		}
	};

	const cargarEstudiosDisponibles = async () => {
		try {
			const { data: estudiosLab, error } = await supabase
				.from("estudios_lab_catalogo")
				.select("id, clave, descripcion, area, dias_proceso")
				.order("clave");

			if (error) throw error;

			const estudiosLaboratorio = (estudiosLab || []).map((estudio) =>
				construirEstudioCatalogoUnificado(estudio, "laboratorio"),
			);

			const { data: estudiosImagen, error: errorImagen } = await supabase
				.from("estudios_imagen_catalogo")
				.select(
					"id, id_empresa, clave, descripcion, empresa_operativa, modalidad, area, region_anatomica, requiere_contraste, requiere_interpretacion, dias_proceso",
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
					"id, id_empresa, clave, descripcion, empresa_operativa, modalidad, area, region_anatomica, requiere_contraste, requiere_interpretacion, dias_proceso",
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

	const seleccionarPaciente = (paciente) => {
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
				alert("Paciente actualizado correctamente");
			} else {
				const { data, error } = await supabase
					.from("pacientes")
					.insert([pacienteData])
					.select()
					.single();

				if (error) throw error;
				alert("Paciente guardado correctamente");

				seleccionarPaciente(data);
			}
		} catch (error) {
			console.error("Error al guardar paciente:", error);
			alert("Error al guardar paciente: " + error.message);
		}
	};

	const handleGuardarDoctorModal = async (doctorData, isEditMode) => {
		try {
			if (isEditMode) {
				const { error } = await supabase
					.from("doctores")
					.update({
						nombre: doctorData.nombre,
						apellido_paterno: doctorData.apellido_paterno,
						apellido_materno: doctorData.apellido_materno,
						primer_nombre: doctorData.primer_nombre,
						fecha_nacimiento: doctorData.fecha_nacimiento,
						edad: doctorData.edad,
						sexo: doctorData.sexo,
						email: doctorData.email,
						telefono: doctorData.telefono,
						usuario: doctorData.usuario,
						contrasena: doctorData.contrasena,
						rol: doctorData.rol,
						activo: doctorData.activo,
						updated_at: new Date().toISOString(),
					})
					.eq("id_empleado", doctorData.id);

				if (error) throw error;
				alert("Doctor actualizado correctamente");
			} else {
				const { data, error } = await supabase
					.from("doctores")
					.insert([doctorData])
					.select()
					.single();

				if (error) throw error;
				alert("Doctor guardado correctamente");

				seleccionarDoctor(data);
			}
		} catch (error) {
			console.error("Error al guardar doctor:", error);
			alert("Error al guardar doctor: " + error.message);
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
			alert("Este estudio ya fue agregado");
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
		const sub = estudiosSeleccionados.reduce(
			(sum, est) => sum + est.precio * est.cantidad,
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
				setPacienteSeleccionado(null);
				setNombreCompleto(nombrePaciente);
				setTelefono(normalizarTelefono10(cita.telefono_paciente || ""));
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
		setBuscarPaciente("");
		setBuscarEstudio("");
		setPagoRecibido("");
		setDescuentoPercent(0);
		setAgregarASalaEspera(true);
		setDestinoTurno("");
		setDestinoTurnoManual(false);
		setPrioridadTurno("0");
	};

	const empresaActual = empresas.find(
		(emp) => emp.id_empresa?.toString() === empresaSeleccionada?.toString(),
	);
	const tipoEstudioActual = tiposEstudio.find(
		(tipo) =>
			tipo.id_tipo_estudio?.toString() === tipoEstudioSeleccionado?.toString(),
	);
	const estudiosFiltrados = filtrarEstudiosCatalogo({
		estudios: estudiosDisponibles,
		busqueda: buscarEstudio,
		empresaId: empresaSeleccionada,
		empresaNombre: empresaActual?.nombre || "",
		tipoNombre: tipoEstudioActual?.nombre || "",
	});

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
		const { signOut } = useAuth();
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
										onSeleccionar={(pac) => pac && seleccionarPaciente(pac)}
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
									<label>Clientes</label>
									<select
										value={clienteSeleccionado}
										onChange={(e) => setClienteSeleccionado(e.target.value)}
										className="form-select">
										<option value="">Selecciona un Cliente</option>
										{clientes.map((cli) => (
											<option key={cli.id_cliente} value={cli.id_cliente}>
												{cli.nombre}
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
									<label>Empresa</label>
									<select
										value={empresaSeleccionada}
										onChange={(e) => setEmpresaSeleccionada(e.target.value)}
										className="form-select">
										<option value="">Selecciona una Empresa</option>
										{empresas.map((emp) => (
											<option key={emp.id_empresa} value={emp.id_empresa}>
												{emp.nombre}
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
										<span>Primero selecciona un cliente para buscar estudios</span>
									</div>
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
												<th>Días Proceso</th>
												<th>Borrar</th>
											</tr>
										</thead>
										<tbody>
											{estudiosSeleccionados.map((est) => (
												<Fragment key={est.id}>
													<tr>
														<td>{est.clave}</td>
														<td>{est.descripcion}</td>
														<td>{est.cliente}</td>
														<td>${est.precio.toFixed(2)}</td>
														<td>{est.diasProceso} días</td>
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
															<td colSpan="6">
																Muestra pendiente para {est.clave}
															</td>
														</tr>
													)}
												</Fragment>
											))}
											{estudiosSeleccionados.length === 0 && (
												<tr>
													<td colSpan="6" className="empty-message"></td>
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

									<div className="total-item">
										<label>IVA %</label>
										<input
											type="number"
											value={ivaPercent}
											onChange={(e) =>
												setIvaPercent(parseFloat(e.target.value) || 0)
											}
											className="total-input-small"
										/>
									</div>

									<div className="total-item">
										<label>Total+IVA</label>
										<input
											type="text"
											value={`$${totalConIva.toFixed(2)}`}
											readOnly
											className="total-input-highlight"
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
