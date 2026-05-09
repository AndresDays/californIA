import { useEffect, useState } from "react";
import calendarioIcono from "../../assets/calendarioIcono.png";
import checkIcono from "../../assets/checkIcono.png";
import enviarEmailBtn from "../../assets/enviarEmailBtn.png";
import enviarWppBtn from "../../assets/enviarWppBtn.png";
import guardarIcono from "../../assets/guardarIcono.png";
import imprimirBtn from "../../assets/ImprimirBtn.png";
import imprimirIcono from "../../assets/imprimirIcono.png";
import lupaIcono from "../../assets/lupaIcono.png";
import relojIcono from "../../assets/relojIcono.png";
import ModalNotificacion from "../../components/ModalNotificacion";
import PageLayout from "../../components/page-layout.jsx";
import { useAuth } from "../../context/auth-context";
import { supabase } from "../../lib/supabase-client";
import {
	calcularPendientesEntrega,
	calcularSaldoEntrega,
	filtrarVentasEntrega,
	tieneSaldoPendiente,
} from "../../utils/entrega-resultados";
import { obtenerClaseAdeudoVenta } from "../../utils/venta-payment-status";
import "./entrega-resultados.css";

const SELECT_VENTAS = `
	id_venta, folio, fecha_venta, estado, total, pago_recibido,
	pacientes ( id_paciente, nombre, fecha_nacimiento, sexo, tipo ),
	clientes ( id_cliente, nombre ),
	estudios_venta ( id_estudio_venta, estado_validacion, entregado )
`;

const formatearFechaMexico = (fecha = new Date()) => {
	const partes = new Intl.DateTimeFormat("es-MX", {
		timeZone: "America/Mexico_City",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(fecha);
	const valores = Object.fromEntries(partes.map((parte) => [parte.type, parte.value]));
	return `${valores.year}-${valores.month}-${valores.day}`;
};

const EntregaResultados = () => {
	const { user } = useAuth();

	const [fechaInicial, setFechaInicial] = useState(
		formatearFechaMexico(),
	);
	const [fechaFinal, setFechaFinal] = useState(
		formatearFechaMexico(),
	);
	const [busquedaEntrega, setBusquedaEntrega] = useState("");
	const [ventas, setVentas] = useState([]);
	const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
	const [estudiosVenta, setEstudiosVenta] = useState([]);
	const [idioma, setIdioma] = useState("español");
	const [mediaPagina, setMediaPagina] = useState(false);
	const [imprimirEncabezado, setImprimirEncabezado] = useState(true);
	const [observacionesEntrega, setObservacionesEntrega] = useState("");
	const [empleadoData, setEmpleadoData] = useState(null);
	const [notificacion, setNotificacion] = useState({
		isOpen: false,
		mensaje: "",
		tipo: "exito",
	});

	useEffect(() => {
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
				console.error("Error:", error);
			}
		};
		fetchEmpleadoData();
	}, [user]);

	useEffect(() => {
		cargarVentas();
	}, [fechaInicial, fechaFinal]);

	const mostrarNotificacion = (mensaje, tipo = "exito") =>
		setNotificacion({ isOpen: true, mensaje, tipo });
	const cerrarNotificacion = () =>
		setNotificacion({ isOpen: false, mensaje: "", tipo: "exito" });

	const cargarVentas = async () => {
		try {
			const { data: estudiosValidados, error: errorEstudios } = await supabase
				.from("estudios_venta")
				.select("id_estudio_venta, id_venta, estado_validacion, entregado")
				.eq("estado_validacion", "validado");

			if (errorEstudios) throw errorEstudios;

			const idsVentasListas = [
				...new Set(
					(estudiosValidados || [])
						.filter((estudio) => estudio.id_venta && !estudio.entregado)
						.map((estudio) => estudio.id_venta),
				),
			];

			if (idsVentasListas.length === 0) {
				setVentas([]);
				return;
			}

			const { data, error } = await supabase
				.from("ventas")
				.select(SELECT_VENTAS)
				.in("id_venta", idsVentasListas)
				.eq("estado", "activo")
				.order("fecha_venta", { ascending: false });

			if (error) throw error;
			const ventasListasEntrega = (data || []).filter((venta) =>
				formatearFechaMexico(new Date(venta.fecha_venta)) >= fechaInicial &&
				formatearFechaMexico(new Date(venta.fecha_venta)) <= fechaFinal &&
				venta.estudios_venta?.some(
					(estudio) =>
						estudio.estado_validacion === "validado" && !estudio.entregado,
				),
			);
			setVentas(ventasListasEntrega);
		} catch (error) {
			console.error("Error al cargar ventas:", error);
			setVentas([]);
		}
	};

	const seleccionarVenta = async (venta) => {
		setVentaSeleccionada(venta);
		setObservacionesEntrega("");
		await cargarEstudiosVenta(venta.id_venta);
	};

	const cargarEstudiosVenta = async (idVenta) => {
		try {
			const { data, error } = await supabase
				.from("estudios_venta")
				.select("*")
				.eq("id_venta", idVenta)
				.eq("estado_validacion", "validado")
				.order("id_estudio_venta");
			if (error) throw error;
			const estudiosPendientesEntrega = (data || []).filter(
				(estudio) => !estudio.entregado,
			);
			setEstudiosVenta(estudiosPendientesEntrega);
			return estudiosPendientesEntrega;
		} catch (error) {
			console.error("Error al cargar estudios:", error);
			setEstudiosVenta([]);
			return [];
		}
	};

	const actualizarDespuesDeEntrega = async () => {
		if (ventaSeleccionada) {
			const estudiosRestantes = await cargarEstudiosVenta(
				ventaSeleccionada.id_venta,
			);
			if (estudiosRestantes.length === 0) {
				setVentaSeleccionada(null);
				setEstudiosVenta([]);
			}
		}
		await cargarVentas();
	};

	const bloquearSiTieneAdeudo = (accion) => {
		if (!ventaSeleccionada || !tieneSaldoPendiente(ventaSeleccionada)) {
			return false;
		}
		mostrarNotificacion(
			`No se puede ${accion} con adeudo de $${calcularSaldoEntrega(ventaSeleccionada).toFixed(2)}. Edita la solicitud y liquida el monto completo.`,
			"advertencia",
		);
		return true;
	};

	const marcarComoEntregado = async (idEstudioVenta) => {
		if (bloquearSiTieneAdeudo("entregar resultados")) {
			return;
		}

		try {
			const { error } = await supabase
				.from("estudios_venta")
				.update({
					entregado: true,
					fecha_entrega: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				})
				.eq("id_estudio_venta", idEstudioVenta);
			if (error) throw error;
			mostrarNotificacion("Estudio marcado como entregado", "exito");
			await actualizarDespuesDeEntrega();
		} catch (error) {
			console.error("Error:", error);
			mostrarNotificacion("Error al marcar como entregado", "error");
		}
	};

	const marcarTodosComoEntregados = async () => {
		if (!ventaSeleccionada || estudiosVenta.length === 0) {
			mostrarNotificacion("Seleccione un paciente con estudios pendientes", "advertencia");
			return;
		}
		if (bloquearSiTieneAdeudo("entregar resultados")) {
			return;
		}

		try {
			const idsEstudios = estudiosVenta.map((estudio) => estudio.id_estudio_venta);
			const { error } = await supabase
				.from("estudios_venta")
				.update({
					entregado: true,
					fecha_entrega: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				})
				.in("id_estudio_venta", idsEstudios);
			if (error) throw error;
			mostrarNotificacion("Todos los estudios fueron marcados como entregados", "exito");
			await actualizarDespuesDeEntrega();
		} catch (error) {
			console.error("Error:", error);
			mostrarNotificacion("Error al entregar todos los estudios", "error");
		}
	};

	const imprimir = () => {
		if (!ventaSeleccionada) {
			mostrarNotificacion("Por favor seleccione un paciente", "advertencia");
			return;
		}
		if (bloquearSiTieneAdeudo("imprimir resultados")) {
			return;
		}
		window.print();
	};
	const enviarEmail = () => {
		if (!ventaSeleccionada) {
			mostrarNotificacion("Por favor seleccione un paciente", "advertencia");
			return;
		}
		if (bloquearSiTieneAdeudo("enviar resultados por email")) {
			return;
		}
		mostrarNotificacion("Función de envío por email en desarrollo", "info");
	};
	const enviarWhatsApp = () => {
		if (!ventaSeleccionada) {
			mostrarNotificacion("Por favor seleccione un paciente", "advertencia");
			return;
		}
		if (bloquearSiTieneAdeudo("enviar resultados por WhatsApp")) {
			return;
		}
		mostrarNotificacion("Función de envío por WhatsApp en desarrollo", "info");
	};

	const calcularEdad = (fechaNacimiento) => {
		if (!fechaNacimiento) return "N/A";
		const hoy = new Date();
		const nacimiento = new Date(fechaNacimiento);
		let edad = hoy.getFullYear() - nacimiento.getFullYear();
		const mes = hoy.getMonth() - nacimiento.getMonth();
		if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
		return `${edad} años`;
	};

	const obtenerIconoEstado = (estadoValidacion) => {
		switch (estadoValidacion) {
			case "guardado":
				return (
					<img src={imprimirIcono} alt="Guardado" className="icono-estado-img" />
				);
			case "validado":
				return <img src={checkIcono} alt="Validado" className="icono-estado-img" />;
			default:
				return (
					<img src={relojIcono} alt="En Captura" className="icono-estado-img" />
				);
		}
	};

	const obtenerTextoEstado = (estadoValidacion) => {
		switch (estadoValidacion) {
			case "guardado":
				return "Guardado";
			case "validado":
				return "Validado";
			default:
				return "En Captura";
		}
	};

	const limpiarFiltros = () => {
		const hoy = formatearFechaMexico();
		setFechaInicial(hoy);
		setFechaFinal(hoy);
		setBusquedaEntrega("");
	};

	const ventasFiltradas = filtrarVentasEntrega(ventas, busquedaEntrega);
	const totalEstudiosPendientes = ventasFiltradas.reduce(
		(total, venta) => total + calcularPendientesEntrega(venta.estudios_venta),
		0,
	);
	const saldoVentaSeleccionada = calcularSaldoEntrega(ventaSeleccionada || {});

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
			<div className="entrega-wrapper">
				<div className="entrega-header-section">
					<h1 className="entrega-titulo">Resultados listos para entregar</h1>
				</div>

				<div className="entrega-filtros-section">
					<div className="entrega-filtros-card">
						<div className="entrega-filtros-header">
							<div>
								<span>Filtros de entrega</span>
								<p>Fecha, folio, paciente o cliente</p>
							</div>
							<button
								type="button"
								className="btn-limpiar-entrega"
								onClick={limpiarFiltros}>
								Limpiar
							</button>
						</div>
						<div className="entrega-filtros-grid">
							<div className="entrega-filtro-grupo entrega-filtro-fechas">
								<div className="entrega-filtro-label">
									<img src={calendarioIcono} alt="" className="icono-calendario" />
									<span>Rango</span>
								</div>
								<label className="entrega-filtro-control">
									<span>Inicio</span>
									<input
										type="date"
										value={fechaInicial}
										onChange={(e) => setFechaInicial(e.target.value)}
										className="input-fecha"
									/>
								</label>
								<label className="entrega-filtro-control">
									<span>Fin</span>
									<input
										type="date"
										value={fechaFinal}
										onChange={(e) => setFechaFinal(e.target.value)}
										className="input-fecha"
									/>
								</label>
							</div>
							<div className="entrega-filtro-grupo entrega-filtro-busqueda">
								<span className="entrega-filtro-label">Búsqueda rápida</span>
								<div className="filtro-busqueda-lupa">
									<img src={lupaIcono} alt="" className="icono-lupa-inline" />
									<input
										type="text"
										placeholder="Folio, paciente o cliente"
										value={busquedaEntrega}
										onChange={(e) => setBusquedaEntrega(e.target.value)}
										className="input-busqueda-con-lupa"
									/>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className="entrega-content">
					<div className="panel-busqueda-nombre">
						<div className="entrega-status-summary">
							<span className="status-dot-entrega" />
							<strong>{ventasFiltradas.length}</strong>
							<span>pacientes listos</span>
							<strong>{totalEstudiosPendientes}</strong>
							<span>estudios pendientes</span>
						</div>
						<div className="tabla-pacientes-container">
							<table className="tabla-pacientes-entrega">
								<thead>
									<tr>
										<th>Folio</th>
										<th>Nombre</th>
										<th>Cliente</th>
										<th>Estudios</th>
										<th>Saldo</th>
									</tr>
								</thead>
								<tbody>
									{ventasFiltradas.map((venta) => {
										const estudiosPendientes = calcularPendientesEntrega(
											venta.estudios_venta,
										);
										const saldo = calcularSaldoEntrega(venta);
										const claseAdeudo = obtenerClaseAdeudoVenta(venta);
										return (
											<tr
												key={venta.id_venta}
												className={`${ventaSeleccionada?.id_venta === venta.id_venta ? "selected" : ""} ${claseAdeudo}`}
												onClick={() => seleccionarVenta(venta)}>
												<td>{venta.folio}</td>
												<td>
													<strong>{venta.pacientes?.nombre || "N/A"}</strong>
													<span className="paciente-meta-entrega">
														{calcularEdad(venta.pacientes?.fecha_nacimiento)} ·{" "}
														{venta.pacientes?.sexo || "N/A"}
													</span>
												</td>
												<td>{venta.clientes?.nombre || "Particular"}</td>
												<td>
													<span className="badge-estudios-pendientes">
														{estudiosPendientes}
													</span>
												</td>
												<td>
													<span
														className={`badge-saldo ${saldo > 0 ? "pendiente" : "pagado"}`}>
														{saldo > 0 ? `$${saldo.toFixed(2)}` : "Pagado"}
													</span>
												</td>
											</tr>
										);
									})}
									{ventasFiltradas.length === 0 && (
										<tr>
											<td colSpan="5" className="no-data">
												No hay resultados validados pendientes de entrega
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
						<div className="info-registros">
							Mostrando {ventasFiltradas.length} pacientes listos para entrega
						</div>
					</div>

					<div className="panel-detalles-entrega">
						<div className="entrega-selected-header">
							<div>
								<h2>Resultados listos para entregar</h2>
								<p>
									{ventaSeleccionada
										? `${ventaSeleccionada.pacientes?.nombre || "Paciente sin nombre"} · Folio ${ventaSeleccionada.folio} · ${ventaSeleccionada.clientes?.nombre || "Particular"}`
										: "Seleccione un paciente para revisar y entregar resultados"}
								</p>
							</div>
							<span className="badge-listo-entrega">
								{estudiosVenta.length} pendientes
							</span>
						</div>
						{ventaSeleccionada && (
							<div className="entrega-action-bar">
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
									Encabezado y pie
								</label>
								<button className="btn-imprimir-img" onClick={imprimir}>
									<img
										src={imprimirBtn}
										alt="Imprimir"
										className="icono-btn-imprimir"
									/>
								</button>
								<button className="btn-action-entrega" onClick={enviarEmail}>
									E-mail
								</button>
								<button className="btn-action-entrega" onClick={enviarWhatsApp}>
									WhatsApp
								</button>
								<button
									className="btn-entregar-todos"
									onClick={marcarTodosComoEntregados}>
									Entregar todos
								</button>
								<span
									className={`badge-saldo ${saldoVentaSeleccionada > 0 ? "pendiente" : "pagado"}`}>
									{saldoVentaSeleccionada > 0
										? `Saldo $${saldoVentaSeleccionada.toFixed(2)}`
										: "Pagado"}
								</span>
							</div>
						)}
						<div className="observaciones-entrega-section">
							<label>Observaciones de Entrega</label>
							<textarea
								value={observacionesEntrega}
								onChange={(e) => setObservacionesEntrega(e.target.value)}
								className="textarea-observaciones-entrega"
								rows="3"
								placeholder="Observaciones de entrega..."
							/>
							<button className="btn-guardar-observaciones">
								<img src={guardarIcono} alt="Guardar" className="icono-guardar" />
							</button>
						</div>
						{ventaSeleccionada && (
							<div className="historial-impresiones">
								<h3>Estado de entrega</h3>
								<p className="texto-descargado">
									{estudiosVenta.length} estudios validados pendientes de entregar.
								</p>
							</div>
						)}
						<div className="tabla-estudios-container">
							<table className="tabla-estudios-entrega">
								<thead>
									<tr>
										<th>Clave</th>
										<th>Estudio</th>
										<th>Icono</th>
										<th>Estatus</th>
										<th>Saldo</th>
										<th>Entregar</th>
									</tr>
								</thead>
								<tbody>
									{estudiosVenta.length === 0 ? (
										<tr>
											<td colSpan="6" className="no-data">
												Seleccione un paciente con resultados listos para entregar
											</td>
										</tr>
									) : (
										estudiosVenta.map((estudio) => (
											<tr key={estudio.id_estudio_venta}>
												<td>{estudio.clave_estudio}</td>
												<td>{estudio.descripcion_estudio}</td>
												<td>
													{obtenerIconoEstado(
														estudio.estado_validacion || "captura",
													)}
												</td>
												<td>
													<span
														className={`badge-estado-estudio estado-${estudio.estado_validacion || "captura"}`}>
														{obtenerTextoEstado(
															estudio.estado_validacion || "captura",
														)}
													</span>
												</td>
												<td>
													{ventaSeleccionada ? (
														<span
															className={`badge-saldo ${saldoVentaSeleccionada === 0 ? "pagado" : "pendiente"}`}>
															{saldoVentaSeleccionada === 0
																? "Pagado"
																: `$${saldoVentaSeleccionada.toFixed(2)}`}
														</span>
													) : (
														"-"
													)}
												</td>
												<td>
													{estudio.entregado ? (
														<span className="badge-entregado">Entregado</span>
													) : (
														<button
															className="btn-entregar"
															onClick={() =>
																marcarComoEntregado(estudio.id_estudio_venta)
															}>
															Entregar
														</button>
													)}
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
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

export default EntregaResultados;
