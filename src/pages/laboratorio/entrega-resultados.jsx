import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import calendarioIcono from "../../assets/calendarioIcono.png";
import checkIcono from "../../assets/checkIcono.png";
import guardarIcono from "../../assets/guardarIcono.png";
import imprimirBtn from "../../assets/imprimirBtn.png";
import imprimirIcono from "../../assets/imprimirIcono.png";
import lupaIcono from "../../assets/lupaIcono.png";
import relojIcono from "../../assets/relojIcono.png";
import ModalNotificacion from "../../components/ModalNotificacion";
import PageLayout from "../../components/page-layout.jsx";
import { useAuth } from "../../context/auth-context";
import { supabase } from "../../lib/supabase-client";
import "./entrega-resultados.css";

const EntregaResultados = () => {
	const { user } = useAuth();
	const navigate = useNavigate();

	const [fechaInicial, setFechaInicial] = useState(
		new Date().toISOString().split("T")[0],
	);
	const [fechaFinal, setFechaFinal] = useState(
		new Date().toISOString().split("T")[0],
	);
	const [buscarFolio, setBuscarFolio] = useState("");
	const [buscarNombre, setBuscarNombre] = useState("");
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
			const { data, error } = await supabase
				.from("ventas")
				.select(
					`
				id_venta, folio, fecha_venta, estado, total, pago_recibido,
				pacientes ( id_paciente, nombre, fecha_nacimiento, sexo, tipo ),
				estudios_venta ( id_estudio_venta, estado_validacion, entregado )
			`,
				)
				.gte("fecha_venta", `${fechaInicial}T00:00:00`)
				.lte("fecha_venta", `${fechaFinal}T23:59:59`)
				.eq("estado", "activo")
				.order("fecha_venta", { ascending: false });
			if (error) throw error;
			setVentas(data || []);
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
				.order("id_estudio_venta");
			if (error) throw error;
			setEstudiosVenta(data || []);
		} catch (error) {
			console.error("Error al cargar estudios:", error);
			setEstudiosVenta([]);
		}
	};

	const marcarComoEntregado = async (idEstudioVenta) => {
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
			if (ventaSeleccionada) await cargarEstudiosVenta(ventaSeleccionada.id_venta);
			await cargarVentas();
		} catch (error) {
			console.error("Error:", error);
			mostrarNotificacion("Error al marcar como entregado", "error");
		}
	};

	const imprimir = () => {
		if (!ventaSeleccionada) {
			mostrarNotificacion("Por favor seleccione un paciente", "advertencia");
			return;
		}
		window.print();
	};
	const enviarEmail = () => {
		if (!ventaSeleccionada) {
			mostrarNotificacion("Por favor seleccione un paciente", "advertencia");
			return;
		}
		mostrarNotificacion("Función de envío por email en desarrollo", "info");
	};
	const enviarWhatsApp = () => {
		if (!ventaSeleccionada) {
			mostrarNotificacion("Por favor seleccione un paciente", "advertencia");
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

	const calcularEstadoPago = (total, pagoRecibido) => {
		const totalNum = parseFloat(total) || 0;
		const pagoNum = parseFloat(pagoRecibido) || 0;
		return pagoNum >= totalNum ? "Pagado" : "Saldo Pendiente";
	};

	const calcularSaldo = (total, pagoRecibido) => {
		const saldo = (parseFloat(total) || 0) - (parseFloat(pagoRecibido) || 0);
		return saldo > 0 ? saldo.toFixed(2) : "0.00";
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

	const ventasFiltradas = ventas.filter((venta) => {
		const matchNombre =
			buscarNombre === "" ||
			venta.pacientes?.nombre.toLowerCase().includes(buscarNombre.toLowerCase());
		const matchFolio =
			buscarFolio === "" ||
			venta.folio.toLowerCase().includes(buscarFolio.toLowerCase());
		return matchNombre && matchFolio;
	});

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
					<h1 className="entrega-titulo">Entrega de Resultados</h1>
				</div>

				<div className="filtros-section">
					<div className="filtros-row">
						<div className="filtro-fecha">
							<img
								src={calendarioIcono}
								alt="Calendario"
								className="icono-calendario"
							/>
							<label>Fecha Inicial:</label>
							<input
								type="date"
								value={fechaInicial}
								onChange={(e) => setFechaInicial(e.target.value)}
								className="input-fecha"
							/>
						</div>
						<div className="filtro-fecha">
							<img
								src={calendarioIcono}
								alt="Calendario"
								className="icono-calendario"
							/>
							<label>Fecha Final:</label>
							<input
								type="date"
								value={fechaFinal}
								onChange={(e) => setFechaFinal(e.target.value)}
								className="input-fecha"
							/>
						</div>

						{/* Buscador con lupa integrada */}
						<div className="filtro-busqueda-lupa">
							<img src={lupaIcono} alt="Lupa" className="icono-lupa-inline" />
							<input
								type="text"
								placeholder="Buscar por Folio..."
								value={buscarFolio}
								onChange={(e) => setBuscarFolio(e.target.value)}
								className="input-busqueda-con-lupa"
							/>
						</div>

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
						<select
							value={idioma}
							onChange={(e) => setIdioma(e.target.value)}
							className="select-idioma">
							<option value="español">Español</option>
							<option value="english">English</option>
						</select>
						<button className="btn-imprimir-img" onClick={imprimir}>
							<img src={imprimirBtn} alt="Imprimir" className="icono-btn-imprimir" />
						</button>
						<button className="btn-action-entrega" onClick={enviarEmail}>
							Enviar por e-mail
						</button>
						<button className="btn-action-entrega" onClick={enviarWhatsApp}>
							Enviar por WhatsApp
						</button>
					</div>
				</div>

				<div className="entrega-content">
					<div className="panel-busqueda-nombre">
						<label>Buscar Por Nombre</label>
						<input
							type="text"
							placeholder="Nombre del paciente..."
							value={buscarNombre}
							onChange={(e) => setBuscarNombre(e.target.value)}
							className="input-buscar-nombre"
						/>
						<div className="tabla-pacientes-container">
							<table className="tabla-pacientes-entrega">
								<thead>
									<tr>
										<th>Folio</th>
										<th>Nombre</th>
										<th>Edad</th>
										<th>Sexo</th>
										<th>Empresa</th>
										<th>Lote</th>
									</tr>
								</thead>
								<tbody>
									{ventasFiltradas.map((venta) => (
										<tr
											key={venta.id_venta}
											className={
												ventaSeleccionada?.id_venta === venta.id_venta
													? "selected"
													: ""
											}
											onClick={() => seleccionarVenta(venta)}>
											<td>{venta.folio}</td>
											<td>{venta.pacientes?.nombre || "N/A"}</td>
											<td>{calcularEdad(venta.pacientes?.fecha_nacimiento)}</td>
											<td>{venta.pacientes?.sexo || "N/A"}</td>
											<td>
												{venta.pacientes?.tipo === "cliente"
													? "Cliente"
													: "Particular"}
											</td>
											<td>
												<input type="checkbox" className="checkbox-lote" />
											</td>
										</tr>
									))}
									{ventasFiltradas.length === 0 && (
										<tr>
											<td colSpan="6" className="no-data">
												No hay pacientes para mostrar
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
						<div className="info-registros">
							Mostrando registros del 1 al 6 de un total de {ventasFiltradas.length}
						</div>
					</div>

					<div className="panel-detalles-entrega">
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
						<div className="historial-impresiones">
							<h3>Historial de Impresiones</h3>
							<p className="texto-descargado">
								Descargados el Día: {new Date().toLocaleDateString("es-MX")} Hora:{" "}
								{new Date().toLocaleTimeString("es-MX", {
									hour: "2-digit",
									minute: "2-digit",
								})}
							</p>
						</div>
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
												Seleccione un paciente para ver sus estudios
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
															className={`badge-saldo ${calcularEstadoPago(ventaSeleccionada.total, ventaSeleccionada.pago_recibido) === "Pagado" ? "pagado" : "pendiente"}`}>
															{calcularEstadoPago(
																ventaSeleccionada.total,
																ventaSeleccionada.pago_recibido,
															) === "Pagado"
																? "Pagado"
																: `$${calcularSaldo(ventaSeleccionada.total, ventaSeleccionada.pago_recibido)}`}
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
