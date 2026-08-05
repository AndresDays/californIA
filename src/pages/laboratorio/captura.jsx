import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import calendarioIcono from "../../assets/calendarioIcono.png";
import checkIcono from "../../assets/checkIconoVerde.png";
import guardarIcono from "../../assets/guardarIcono.png";
import relojIcono from "../../assets/relojIconoAmarillo.png";
import ModalNotificacion from "../../components/ModalNotificacion";
import PageLayout from "../../components/page-layout.jsx";
import { useAuth } from "../../context/auth-context";
import { supabase } from "../../lib/supabase-client";
import { useBusquedaPersistente } from "../../hooks/use-busqueda-persistente";
import { useFechaPersistente } from "../../hooks/use-fecha-persistente";
import { cargarRadiologiaParaCaptura, useCaptura, useCatalogosCaptura } from "../../hooks/use-captura";
import {
	CAPTURA_FILTROS_ESTADO,
	aplicarEstadoRadiologiaACaptura,
	contarVentasPorEstadoCaptura,
	esEstudioImagenCaptura,
	filtrarVentasPorEstadoCaptura,
	obtenerClaseEstadoCapturaVenta,
	obtenerEstadoCapturaVenta,
	tieneMuestrasPendientes,
} from "../../utils/captura-row-status";
import {
	calcularSaldoVenta,
	obtenerClaseAdeudoVenta,
	tieneAdeudoVenta,
} from "../../utils/venta-payment-status";
import { crearNotificacion } from "../../utils/notificaciones";
import {
	obtenerEstadoSolicitud,
	obtenerMetaEstadoSolicitud,
} from "../../utils/solicitud-estado";
import {
	EVENTOS_SOLICITUD,
	registrarEventoSolicitud,
} from "../../utils/solicitud-auditoria";
import { generarResultadosPortalPdf } from "../../utils/reporte-pdf";
import { MEMBRETE_B64 } from "../radiologia/pages/reporte-radiologia-template";
import "./captura.css";

const Captura = () => {
	const { user } = useAuth();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const [fechaInicial, setFechaInicial] = useFechaPersistente(
		"captura:inicio",
		new Date().toISOString().split("T")[0],
	);
	const [fechaFinal, setFechaFinal] = useFechaPersistente(
		"captura:fin",
		new Date().toISOString().split("T")[0],
	);
	const [buscarEstudio, setBuscarEstudio] = useBusquedaPersistente("captura:estudio");
	const [buscarPaciente, setBuscarPaciente] = useBusquedaPersistente("captura:paciente");
	const [clienteFiltro, setClienteFiltro] = useState("");
	const [areaFiltro, setAreaFiltro] = useState("");
	const [filtroEstadoCaptura, setFiltroEstadoCaptura] = useState("todos");
	const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
	const [idioma, setIdioma] = useState("español");
	const [mediaPagina, setMediaPagina] = useState(false);
	const [imprimirEncabezado, setImprimirEncabezado] = useState(true);
	const [observaciones, setObservaciones] = useState("");
	const [resultados, setResultados] = useState([]);
	const [empleadoData, setEmpleadoData] = useState(null);
	const [notificacion, setNotificacion] = useState({
		isOpen: false,
		mensaje: "",
		tipo: "exito",
	});

	useState(() => {
		const fetchEmpleadoData = async () => {
			if (!user?.id) return;
			try {
				const { data: empleado, error } = await supabase
					.from("empleados")
					.select("nombre, rol")
					.eq("auth_uuid", user.id)
					.maybeSingle();
				if (error) {
					console.error("Error al obtener empleado:", error);
					return;
				}
				if (empleado) setEmpleadoData(empleado);
			} catch (error) {
				console.error("Error al obtener datos del empleado:", error);
			}
		};
		fetchEmpleadoData();
	}, [user]);

	const { data: ventas = [] } = useCaptura({ fechaInicial, fechaFinal });
	const { data: catalogosData } = useCatalogosCaptura();
	const clientes = catalogosData?.clientes ?? [];
	const areas = catalogosData?.areas ?? [];

	const mostrarNotificacion = (mensaje, tipo = "exito") =>
		setNotificacion({ isOpen: true, mensaje, tipo });
	const cerrarNotificacion = () =>
		setNotificacion({ isOpen: false, mensaje: "", tipo: "exito" });
	const abrirSelectorFecha = (event) => {
		if (typeof event.currentTarget.showPicker === "function") {
			event.currentTarget.showPicker();
		}
	};

	const refrescarVentas = () => {
		queryClient.invalidateQueries({ queryKey: ['captura', fechaInicial, fechaFinal] });
	};

	const seleccionarVenta = (venta) => {
		setVentaSeleccionada(venta);
		setObservaciones("");
		cargarResultados(venta.id_venta, venta);
	};

	const cargarResultados = async (idVenta, ventaBase = ventaSeleccionada) => {
		try {
			const { data: estudiosVenta, error: errorEstudios } = await supabase
				.from("estudios_venta")
				.select("*")
				.eq("id_venta", idVenta);
			if (errorEstudios) throw errorEstudios;
			const estudiosRadiologia = await cargarRadiologiaParaCaptura({
				idsVentas: [idVenta].filter(Boolean),
				idsEstudiosVenta: (estudiosVenta || [])
					.map((estudio) => estudio.id_estudio_venta)
					.filter(Boolean),
				idsPacientes: [ventaBase?.pacientes?.id_paciente].filter(Boolean),
			});
			const estudiosVentaConRadiologia = aplicarEstadoRadiologiaACaptura(
				estudiosVenta || [],
				estudiosRadiologia,
			);
			const estudiosConAnalitos = await Promise.all(
				estudiosVentaConRadiologia.map(async (estudio) => {
					const { data: relacionesAnalitos, error: errorRelaciones } = await supabase
						.from("estudio_analitos")
						.select("*")
						.eq("clave_estudio", estudio.clave_estudio)
						.order("orden", { ascending: true });
					if (errorRelaciones || !relacionesAnalitos?.length)
						return { ...estudio, analitos: [] };
					const analitosConDetalles = await Promise.all(
						relacionesAnalitos.map(async (relacion) => {
							const { data: analitoDetalle, error: errorDetalle } = await supabase
								.from("analitos")
								.select("*")
								.eq("id_analito", relacion.id_analito)
								.single();
							if (errorDetalle) return null;
							let resultadoGuardado = "";
							if (estudio.resultados) {
								try {
									const resultadosJSON = JSON.parse(estudio.resultados);
									resultadoGuardado = resultadosJSON[analitoDetalle.clave] || "";
								} catch (e) {}
							}
							return {
								id_estudio_analito: relacion.id_estudio_analito,
								id_analito: analitoDetalle.id_analito,
								clave: analitoDetalle.clave,
								descripcion: analitoDetalle.descripcion,
								unidades: analitoDetalle.unidad || "",
								referencia:
									analitoDetalle.tipo_resultado === "Subtitulo"
										? ""
										: analitoDetalle.vr_bajo != null &&
											  analitoDetalle.vr_alto != null
											? `${analitoDetalle.vr_bajo} - ${analitoDetalle.vr_alto}`
											: analitoDetalle.vr_bajo != null
												? `>${analitoDetalle.vr_bajo}`
												: analitoDetalle.referencia || "",
								tipo_resultado: analitoDetalle.tipo_resultado || "Numerico",
								resultado: resultadoGuardado,
								orden: relacion.orden,
							};
						}),
					);
					return {
						...estudio,
						analitos: analitosConDetalles.filter((a) => a !== null),
					};
				}),
			);
			setResultados(estudiosConAnalitos);
		} catch (error) {
			console.error("Error al cargar resultados:", error);
			setResultados([]);
		}
	};

	const actualizarResultado = (idEstudio, idAnalito, valor) => {
		setResultados(
			resultados.map((estudio) => {
				if (estudio.id_estudio_venta === idEstudio) {
					return {
						...estudio,
						analitos: estudio.analitos.map((analito) =>
							analito.id_analito === idAnalito
								? { ...analito, resultado: valor }
								: analito,
						),
					};
				}
				return estudio;
			}),
		);
	};

	const guardarCaptura = async () => {
		if (!ventaSeleccionada) {
			mostrarNotificacion("Por favor seleccione un paciente", "advertencia");
			return;
		}
		try {
			for (const estudio of resultados) {
				if (esEstudioImagenCaptura(estudio)) continue;
				if (estudio.muestra_pendiente) continue;
				const hayResultados = estudio.analitos.some(
					(a) => a.resultado && a.resultado.trim() !== "",
				);
				if (!hayResultados) continue;
				const resultadosJSON = estudio.analitos.reduce((acc, analito) => {
					if (analito.resultado && analito.resultado.trim() !== "")
						acc[analito.clave] = analito.resultado;
					return acc;
				}, {});
				const { error } = await supabase
					.from("estudios_venta")
					.update({
						resultados: JSON.stringify(resultadosJSON),
						estado_captura: "completado",
						estado_validacion: "guardado",
						updated_at: new Date().toISOString(),
					})
					.eq("id_estudio_venta", estudio.id_estudio_venta);
				if (error) throw error;
			}
			await registrarEventoSolicitud(supabase, {
				id_venta: ventaSeleccionada.id_venta,
				folio: ventaSeleccionada.folio,
				evento: EVENTOS_SOLICITUD.CAPTURADA,
				descripcion: "Resultados capturados y guardados",
				empleado: empleadoData,
				user,
			});
			mostrarNotificacion("Resultados guardados exitosamente", "exito");
			refrescarVentas();
			if (ventaSeleccionada) await cargarResultados(ventaSeleccionada.id_venta);
		} catch (error) {
			console.error("Error al guardar:", error);
			mostrarNotificacion("Error al guardar los resultados", "error");
		}
	};

	const validarCaptura = async () => {
		if (!ventaSeleccionada) {
			mostrarNotificacion("Por favor seleccione un paciente", "advertencia");
			return;
		}
		if (tieneMuestrasPendientes(resultados)) {
			mostrarNotificacion(
				"Hay estudios con muestra pendiente. Edita la solicitud y quita la marca antes de validar.",
				"advertencia",
			);
			return;
		}
		try {
			const actualizadoEn = new Date().toISOString();
			const idsRadiologiaParaEntrega = [];
			const idsEstudiosImagenVenta = [];

			for (const estudio of resultados) {
				if (esEstudioImagenCaptura(estudio)) {
					if (estudio.estado_validacion === "guardado") {
						if (estudio.radiologia_id_estudio) {
							idsRadiologiaParaEntrega.push(estudio.radiologia_id_estudio);
						}
						if (estudio.id_estudio_venta) {
							idsEstudiosImagenVenta.push(estudio.id_estudio_venta);
						}
					}
					continue;
				}
				const { error } = await supabase
					.from("estudios_venta")
					.update({
						estado_captura: "completado",
						estado_validacion: "validado",
						updated_at: actualizadoEn,
					})
					.eq("id_estudio_venta", estudio.id_estudio_venta);
				if (error) throw error;
			}
			if (idsEstudiosImagenVenta.length > 0) {
				const { error: errorEstudiosImagen } = await supabase
					.from("estudios_venta")
					.update({
						estado_captura: "completado",
						estado_validacion: "validado",
						updated_at: actualizadoEn,
					})
					.in("id_estudio_venta", idsEstudiosImagenVenta);
				if (errorEstudiosImagen) throw errorEstudiosImagen;
			}
			if (idsRadiologiaParaEntrega.length > 0) {
				const { error: errorRadiologia } = await supabase
					.from("estudios_radiologia")
					.update({
						listo_entrega: true,
						updated_at: actualizadoEn,
					})
					.in("id_estudio", idsRadiologiaParaEntrega);
				if (errorRadiologia) throw errorRadiologia;
			}
			await registrarEventoSolicitud(supabase, {
				id_venta: ventaSeleccionada.id_venta,
				folio: ventaSeleccionada.folio,
				evento: EVENTOS_SOLICITUD.VALIDADA,
				descripcion: "Estudios validados y liberados para entrega",
				empleado: empleadoData,
				user,
				detalles: {
					estudios_imagen_liberados: idsRadiologiaParaEntrega.length,
					estudios_laboratorio_validados:
						resultados.length - idsEstudiosImagenVenta.length,
				},
			});
			await crearNotificacion(supabase, {
				titulo: "Resultados de laboratorio listos",
				mensaje: `${ventaSeleccionada.pacientes?.nombre || "Paciente"} · Folio ${ventaSeleccionada.folio}`,
				tipo: "entrega",
				canal_destino: "entrega",
				entidad_tipo: "venta",
				entidad_id: ventaSeleccionada.id_venta,
				id_venta: ventaSeleccionada.id_venta,
				id_sucursal: empleadoData?.id_sucursal || null,
				sucursal: empleadoData?.sucursal || "",
				action_path: "/entrega-resultados",
			});
			mostrarNotificacion("Estudios validados exitosamente", "exito");
			refrescarVentas();
			if (ventaSeleccionada) await cargarResultados(ventaSeleccionada.id_venta);
		} catch (error) {
			console.error("Error al validar:", error);
			mostrarNotificacion("Error al validar los estudios", "error");
		}
	};

	const invalidarCaptura = async () => {
		if (!ventaSeleccionada) {
			mostrarNotificacion("Por favor seleccione un paciente", "advertencia");
			return;
		}
		try {
			const idsRadiologiaParaRetirar = [];
			for (const estudio of resultados) {
				if (esEstudioImagenCaptura(estudio)) {
					if (estudio.radiologia_id_estudio) {
						idsRadiologiaParaRetirar.push(estudio.radiologia_id_estudio);
					}
					const { error } = await supabase
						.from("estudios_venta")
						.update({
							estado_validacion: "guardado",
							updated_at: new Date().toISOString(),
						})
						.eq("id_estudio_venta", estudio.id_estudio_venta);
					if (error) throw error;
					continue;
				}
				const { error } = await supabase
					.from("estudios_venta")
					.update({
						estado_validacion: "guardado",
						updated_at: new Date().toISOString(),
					})
					.eq("id_estudio_venta", estudio.id_estudio_venta);
				if (error) throw error;
			}
			if (idsRadiologiaParaRetirar.length > 0) {
				const { error: errorRadiologia } = await supabase
					.from("estudios_radiologia")
					.update({
						listo_entrega: false,
						updated_at: new Date().toISOString(),
					})
					.in("id_estudio", idsRadiologiaParaRetirar);
				if (errorRadiologia) throw errorRadiologia;
			}
			mostrarNotificacion("Estudios invalidados exitosamente", "exito");
			refrescarVentas();
			if (ventaSeleccionada) await cargarResultados(ventaSeleccionada.id_venta);
		} catch (error) {
			console.error("Error al invalidar:", error);
			mostrarNotificacion("Error al invalidar los estudios", "error");
		}
	};

	const vistaPrevia = async () => {
		if (!ventaSeleccionada) {
			mostrarNotificacion("Por favor seleccione un paciente", "advertencia");
			return;
		}
		try {
			const url = await generarResultadosPortalPdf({
				venta: {
					...ventaSeleccionada,
					paciente: ventaSeleccionada.pacientes?.nombre,
					fecha_nacimiento: ventaSeleccionada.pacientes?.fecha_nacimiento,
					sexo: ventaSeleccionada.pacientes?.sexo,
				},
				estudios: resultados.map((estudio) => ({
					tipo: esEstudioImagenCaptura(estudio) ? "imagen" : "laboratorio",
					descripcion: estudio.descripcion_estudio || estudio.descripcion || estudio.clave_estudio,
					reporte: estudio.radiologia_reporte || "Sin reporte disponible.",
					analitos: estudio.analitos || [],
					estado_validacion: estudio.estado_validacion,
				})),
				membreteSrc: `data:image/jpeg;base64,${MEMBRETE_B64}`,
				modoVistaPrevia: true,
			});
			window.open(url, "_blank", "noopener,noreferrer");
		} catch (error) {
			console.error("Error al generar vista previa:", error);
			mostrarNotificacion("No fue posible generar la vista previa", "error");
		}
	};

	const imprimir = () => {
		if (!ventaSeleccionada) {
			mostrarNotificacion("Por favor seleccione un paciente", "advertencia");
			return;
		}
		if (tieneAdeudoVenta(ventaSeleccionada)) {
			mostrarNotificacion(
				`No se pueden imprimir resultados con adeudo de $${calcularSaldoVenta(ventaSeleccionada).toFixed(2)}. Edita la solicitud y liquida el monto completo.`,
				"advertencia",
			);
			return;
		}
		window.print();
	};

	const calcularEdad = (fechaNacimiento) => {
		if (!fechaNacimiento) return "N/A";
		const hoy = new Date();
		const nacimiento = new Date(fechaNacimiento);
		let edad = hoy.getFullYear() - nacimiento.getFullYear();
		const mes = hoy.getMonth() - nacimiento.getMonth();
		if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
		return edad;
	};

	const formatHora = (fecha) => {
		if (!fecha) return "N/A";
		return new Date(fecha).toLocaleTimeString("es-MX", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: true,
		});
	};

	const obtenerIconoEstado = (estadoValidacion) => {
		switch (estadoValidacion) {
			case "guardado":
				return (
					<img src={guardarIcono} alt="Guardado" className="icono-estado-img" />
				);
			case "validado":
				return <img src={checkIcono} alt="Validado" className="icono-estado-img" />;
			default:
				return (
					<img src={relojIcono} alt="En captura" className="icono-estado-img" />
				);
		}
	};

	const obtenerTextoEstadoVenta = (estado) => {
		const textos = {
			pendiente: "Pendiente",
			guardado: "Guardado",
			validado: "Validado",
		};
		return textos[estado] || "Pendiente";
	};

	const renderEstadoSolicitud = (venta) => {
		const meta = obtenerMetaEstadoSolicitud(obtenerEstadoSolicitud(venta));
		return (
			<span className={`badge-estado-solicitud ${meta.className}`}>
				{meta.label}
			</span>
		);
	};

	const limpiarFiltros = () => {
		const hoy = new Date().toISOString().split("T")[0];
		setFechaInicial(hoy);
		setFechaFinal(hoy);
		setBuscarEstudio("");
		setBuscarPaciente("");
		setClienteFiltro("");
		setAreaFiltro("");
		setFiltroEstadoCaptura("todos");
	};

	const ventasPorBusqueda = ventas.filter((venta) => {
		const matchPaciente =
			buscarPaciente === "" ||
			venta.pacientes?.nombre.toLowerCase().includes(buscarPaciente.toLowerCase());
		const matchFolio =
			buscarEstudio === "" ||
			venta.folio.toLowerCase().includes(buscarEstudio.toLowerCase());
		const matchCliente =
			clienteFiltro === "" ||
			venta.clientes?.id_cliente?.toString() === clienteFiltro.toString();
		const matchArea =
			areaFiltro === "" ||
			venta.estudios_venta?.some((estudio) => estudio.area === areaFiltro);
		return matchPaciente && matchFolio && matchCliente && matchArea;
	});
	const conteosEstadoCaptura = contarVentasPorEstadoCaptura(ventasPorBusqueda);
	const ventasFiltradas = filtrarVentasPorEstadoCaptura(
		ventasPorBusqueda,
		filtroEstadoCaptura,
	);
	const estadoVentaSeleccionada = ventaSeleccionada
		? obtenerEstadoCapturaVenta(ventaSeleccionada.estudios_venta)
		: "pendiente";
	const saldoVentaSeleccionada = calcularSaldoVenta(ventaSeleccionada || {});

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

	return (
		<PageLayout
			empleadoData={empleadoData}
			formatRol={formatRol}
			getPrimerNombre={getPrimerNombre}>
			<div className="captura-wrapper">
				<div className="filtros-section">
					<div className="filtros-card">
						<div className="filtros-card-header">
							<div>
								<span>Filtros de captura</span>
								<p>Fecha, folio, paciente y clasificación</p>
							</div>
							<button
								type="button"
								className="btn-limpiar-filtros"
								onClick={limpiarFiltros}>
								Limpiar
							</button>
						</div>
						<div className="filtros-grid">
							<div className="filtro-grupo filtro-grupo-fechas">
								<div className="filtro-grupo-label">
									<img
										src={calendarioIcono}
										alt=""
										className="icono-calendario"
									/>
									<span>Rango</span>
								</div>
								<label className="filtro-control">
									<span>Inicio</span>
									<input
										type="date"
										value={fechaInicial}
										onChange={(e) => setFechaInicial(e.target.value)}
										onClick={abrirSelectorFecha}
										className="input-fecha"
									/>
								</label>
								<label className="filtro-control">
									<span>Fin</span>
									<input
										type="date"
										value={fechaFinal}
										onChange={(e) => setFechaFinal(e.target.value)}
										onClick={abrirSelectorFecha}
										className="input-fecha"
									/>
								</label>
							</div>
							<div className="filtro-grupo filtro-grupo-busqueda">
								<span className="filtro-grupo-label">Búsqueda rápida</span>
								<input
									type="text"
									placeholder="Folio"
									value={buscarEstudio}
									onChange={(e) => setBuscarEstudio(e.target.value)}
									className="input-busqueda"
								/>
								<input
									type="text"
									placeholder="Paciente"
									value={buscarPaciente}
									onChange={(e) => setBuscarPaciente(e.target.value)}
									className="input-busqueda"
								/>
							</div>
							<div className="filtro-grupo filtro-grupo-selects">
								<span className="filtro-grupo-label">Clasificación</span>
								<select
									value={clienteFiltro}
									onChange={(e) => setClienteFiltro(e.target.value)}
									className="select-filtro">
									<option value="">Clientes ({clientes.length})</option>
									{clientes.map((c) => (
										<option key={c.id_cliente} value={c.id_cliente}>
											{c.nombre}
										</option>
									))}
								</select>
								<select
									value={areaFiltro}
									onChange={(e) => setAreaFiltro(e.target.value)}
									className="select-filtro">
									<option value="">Áreas ({areas.length})</option>
									{areas.map((a) => (
										<option key={a.id_area} value={a.nombre}>
											{a.nombre}
										</option>
									))}
								</select>
							</div>
						</div>
					</div>
				</div>

				<div className="captura-content">
					<div className="panel-pacientes">
						<div className="panel-header-pacientes">
							<h2>Lista de Pacientes</h2>
						</div>
						<div className="pacientes-controls">
							<div className="badge-pac">
								#Pac <span className="badge-numero">{ventasFiltradas.length}</span>
							</div>
							<div className="estado-captura-tabs" aria-label="Filtrar captura">
								{CAPTURA_FILTROS_ESTADO.map((filtro) => (
									<button
										key={filtro.id}
										type="button"
										className={`estado-captura-tab estado-${filtro.id} ${filtroEstadoCaptura === filtro.id ? "active" : ""}`}
										onClick={() => setFiltroEstadoCaptura(filtro.id)}>
										<span>{filtro.label}</span>
										<strong>{conteosEstadoCaptura[filtro.id]}</strong>
									</button>
								))}
							</div>
						</div>
						<div className="tabla-pacientes-container">
							<table className="tabla-pacientes">
								<thead>
									<tr>
										<th>Folio</th>
										<th>Estado</th>
										<th>Nombre</th>
										<th>Edad</th>
										<th>Sexo</th>
										<th>Sucursal</th>
										<th>Cliente</th>
										<th>Hora</th>
									</tr>
								</thead>
								<tbody>
									{ventasFiltradas.map((venta) => {
										const claseEstado = obtenerClaseEstadoCapturaVenta(
											venta.estudios_venta,
										);
										const claseAdeudo = obtenerClaseAdeudoVenta(venta);
										return (
											<tr
												key={venta.id_venta}
												className={`${claseEstado} ${claseAdeudo} ${ventaSeleccionada?.id_venta === venta.id_venta ? "selected" : ""}`}
												onClick={() => seleccionarVenta(venta)}>
												<td>{venta.folio}</td>
												<td>{renderEstadoSolicitud(venta)}</td>
												<td>{venta.pacientes?.nombre || "N/A"}</td>
												<td>{calcularEdad(venta.pacientes?.fecha_nacimiento)}</td>
												<td>{venta.pacientes?.sexo || "N/A"}</td>
												<td>Principal</td>
												<td>{venta.clientes?.nombre || "Particular"}</td>
												<td>{formatHora(venta.fecha_venta)}</td>
											</tr>
										);
									})}
									{ventasFiltradas.length === 0 && (
										<tr>
											<td colSpan="8" className="no-data">
												No hay pacientes para mostrar
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</div>

					<div className="panel-captura panel-captura-fill panel-captura-match-height">
					<div className="panel-header-captura panel-header-captura-compact">
							<div>
								<h2>Área de Captura</h2>
								{ventaSeleccionada ? (
									<p>
										{ventaSeleccionada.pacientes?.nombre || "Paciente sin nombre"} · Folio{" "}
										{ventaSeleccionada.folio}
									</p>
								) : (
									<p>Seleccione un paciente para trabajar sus resultados</p>
								)}
							</div>
							{ventaSeleccionada && (
								<div className="captura-header-meta">
									<span className={`badge-estado-fila estado-${estadoVentaSeleccionada}`}>
										{obtenerTextoEstadoVenta(estadoVentaSeleccionada)}
									</span>
									{saldoVentaSeleccionada > 0 && (
										<span className="badge-adeudo-captura">
											Adeudo ${saldoVentaSeleccionada.toFixed(2)}
										</span>
									)}
									<span>{resultados.length} estudios</span>
								</div>
							)}
						</div>
						<div className="captura-controls captura-controls-compact">
							<button className="btn-vista-previa" onClick={vistaPrevia}>
								Vista previa
							</button>
							<select
								value={idioma}
								onChange={(e) => setIdioma(e.target.value)}
								className="select-idioma">
								<option value="español">Español</option>
								<option value="english">English</option>
							</select>
							<label className="checkbox-inline">
								<input
									type="checkbox"
									checked={mediaPagina}
									onChange={(e) => setMediaPagina(e.target.checked)}
								/>
								Media Página
							</label>
							<label className="checkbox-inline">
								<input
									type="checkbox"
									checked={imprimirEncabezado}
									onChange={(e) => setImprimirEncabezado(e.target.checked)}
								/>
								Imprimir Encabezado y Pie de Página
							</label>
							<button className="btn-vista-previa btn-imprimir" onClick={imprimir}>
								Imprimir
							</button>
						</div>

						<div className="observaciones-section observaciones-inline">
							<label>Observaciones</label>
							<textarea
								value={observaciones}
								onChange={(e) => setObservaciones(e.target.value)}
								className="textarea-observaciones"
								rows="3"
								placeholder="Observaciones del estudio..."
							/>
						</div>

						<div className="tabla-resultados-container">
							<table className="tabla-resultados">
								<thead>
									<tr>
										<th>Clave</th>
										<th>Descripción</th>
										<th>Resultado</th>
										<th>Unidades</th>
										<th>Referencia</th>
									</tr>
								</thead>
								<tbody>
									{resultados.length === 0 ? (
										<tr>
											<td colSpan="5" className="no-data">
												Seleccione un paciente para capturar resultados
											</td>
										</tr>
									) : (
										resultados.map((estudio) => (
											<React.Fragment key={estudio.id_estudio_venta}>
												<tr
													className={`fila-estudio ${
														estudio.muestra_pendiente
															? "fila-estudio-muestra-pendiente"
															: ""
													}`}>
													<td colSpan="5" className="nombre-estudio">
														<div className="estudio-header">
															<span
																className={`estudio-icono-estado estado-${estudio.estado_validacion || "captura"}`}>
																{obtenerIconoEstado(
																	estudio.estado_validacion || "captura",
																)}
															</span>
															<span className="estudio-titulo">
																Estudio: {estudio.descripcion_estudio}
															</span>
															<span
																className={`badge-estado estado-${estudio.estado_validacion || "captura"}`}>
																{estudio.estado_validacion === "captura"
																	? "En Captura"
																	: estudio.estado_validacion === "guardado"
																		? "Guardado"
																		: estudio.estado_validacion === "validado"
																			? "Validado"
																			: "En Captura"}
															</span>
															{estudio.muestra_pendiente && (
																<span className="badge-muestra-pendiente">
																	Muestra pendiente
																</span>
															)}
														</div>
													</td>
												</tr>
												{estudio.muestra_pendiente && (
													<tr className="fila-aviso-muestra-pendiente">
														<td colSpan="5">
															Este estudio espera muestra. Quita la marca en
															Editar solicitud cuando ya se reciba.
														</td>
													</tr>
												)}
												{estudio.analitos && estudio.analitos.length > 0 ? (
													estudio.analitos
														.filter(
															(analito) => analito.tipo_resultado !== "Subtitulo",
														)
														.map((analito) => (
															<tr
																key={`${estudio.id_estudio_venta}-${analito.id_analito}`}
																className="fila-analito">
																<td>{analito.clave}</td>
																<td>{analito.descripcion}</td>
																<td>
																	{analito.tipo_resultado === "Numerico" ? (
																		<input
																			type="text"
																			value={analito.resultado}
																			onChange={(e) =>
																				actualizarResultado(
																					estudio.id_estudio_venta,
																					analito.id_analito,
																					e.target.value,
																				)
																			}
																			className="input-resultado"
																			placeholder="Ingrese resultado"
																			disabled={
																				estudio.estado_validacion === "validado" ||
																				estudio.muestra_pendiente
																			}
																		/>
																	) : analito.tipo_resultado === "Subtitulo" ? (
																		<span className="subtitulo-texto">
																			{analito.descripcion}
																		</span>
																	) : (
																		<textarea
																			value={analito.resultado}
																			onChange={(e) =>
																				actualizarResultado(
																					estudio.id_estudio_venta,
																					analito.id_analito,
																					e.target.value,
																				)
																			}
																			className="textarea-resultado"
																			placeholder="Ingrese texto"
																			rows="2"
																			disabled={
																				estudio.estado_validacion === "validado" ||
																				estudio.muestra_pendiente
																			}
																		/>
																	)}
																</td>
																<td>{analito.unidades}</td>
																<td>
																	{analito.referencia
																		.split(/<br\s*\/?>/i)
																		.map((linea, i, arr) => (
																			<span key={i}>
																				{linea}
																				{i < arr.length - 1 && <br />}
																			</span>
																		))}
																</td>
															</tr>
														))
												) : (
													<tr>
														<td colSpan="6" className="no-data-mini">
															Este estudio no tiene analitos configurados
														</td>
													</tr>
												)}
											</React.Fragment>
										))
									)}
								</tbody>
							</table>
						</div>

						{ventaSeleccionada && (
							<div className="captura-actions">
								<button
									className="btn-guardar-captura"
									onClick={guardarCaptura}
									disabled={resultados.every(
										(e) => e.estado_validacion === "validado",
									)}>
									Guardar Captura
								</button>
								<button
									className="btn-validar-captura"
									onClick={validarCaptura}
									disabled={resultados.every(
										(e) => e.estado_validacion === "captura",
									)}>
									Validar Estudios
								</button>
								<button
									className="btn-invalidar-captura"
									onClick={invalidarCaptura}
									disabled={resultados.every(
										(e) => e.estado_validacion !== "validado",
									)}>
									Invalidar Estudios
								</button>
							</div>
						)}
					</div>
				</div>

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

export default Captura;
