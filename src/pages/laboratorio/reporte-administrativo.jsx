import { useEffect, useMemo, useState } from "react";
import calendarioIcono from "../../assets/calendarioIcono.png";
import metricasIcono from "../../assets/metricasIcono.png";
import PageLayout from "../../components/page-layout.jsx";
import { useAuth } from "../../context/auth-context";
import { supabase } from "../../lib/supabase-client";
import {
	agruparEstudiosMasVendidosAdmin,
	agruparIngresosPorSucursal,
	agruparPorArea,
	agruparRemitentesAdmin,
	calcularPendientesPorEtapa,
	calcularResumenAdministrativo,
	formatoDuracionHoras,
	formatoMonedaAdmin,
} from "../../utils/reporte-administrativo";
import "./reporte-administrativo.css";

const SELECT_VENTAS_ADMIN = `
	id_venta, folio, fecha_venta, estado, total, pago_recibido, id_cliente, id_doctor, id_sucursal, sucursal,
	clientes ( id_cliente, nombre ),
	citas ( id_cita, id_sucursal, sucursales ( id_sucursal, nombre ) ),
	estudios_venta (
		id_estudio_venta, clave_estudio, descripcion_estudio, precio, area,
		estado_validacion, entregado, muestra_pendiente, id_sucursal, sucursal
	)
`;

const hoyMexico = () =>
	new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

const inicioMesMexico = () => {
	const fecha = new Date(`${hoyMexico()}T00:00:00`);
	fecha.setDate(1);
	return fecha.toISOString().split("T")[0];
};

const formatRol = (rol) => {
	if (!rol) return "Usuario";
	const roles = {
		admin: "Administrador",
		administrador: "Administrador",
		radiologo: "Radiologo - Director",
		doctor: "Medico",
		medico: "Medico",
		tecnico_radiologia: "Tecnico en Radiologia",
		tecnico: "Tecnico",
		quimico: "Quimico",
		recepcionista: "Recepcionista",
		desarrollador: "Desarrollador",
	};
	return roles[rol] || rol;
};

const ReporteAdministrativo = () => {
	const { user } = useAuth();
	const [fechaInicial, setFechaInicial] = useState(inicioMesMexico());
	const [fechaFinal, setFechaFinal] = useState(hoyMexico());
	const [sucursalSeleccionada, setSucursalSeleccionada] = useState("");
	const [empleadoData, setEmpleadoData] = useState(null);
	const [ventas, setVentas] = useState([]);
	const [estudiosRadiologia, setEstudiosRadiologia] = useState([]);
	const [eventosAuditoria, setEventosAuditoria] = useState([]);
	const [sucursales, setSucursales] = useState([]);
	const [doctores, setDoctores] = useState([]);
	const [clientes, setClientes] = useState([]);
	const [cargando, setCargando] = useState(false);
	const [errorReporte, setErrorReporte] = useState("");

	useEffect(() => {
		const fetchEmpleadoData = async () => {
			if (!user?.id) return;
			const { data } = await supabase
				.from("empleados")
				.select("nombre, rol")
				.eq("auth_uuid", user.id)
				.maybeSingle();
			if (data) setEmpleadoData(data);
		};
		fetchEmpleadoData();
		cargarCatalogos();
	}, [user]);

	useEffect(() => {
		cargarReporte();
	}, [fechaInicial, fechaFinal]);

	const cargarCatalogos = async () => {
		const [sucursalesResp, doctoresResp, clientesResp] = await Promise.all([
			supabase.from("sucursales").select("id_sucursal, nombre").order("nombre"),
			supabase.from("doctores").select("*").order("nombre"),
			supabase.from("clientes").select("id_cliente, nombre").order("nombre"),
		]);
		if (!sucursalesResp.error) setSucursales(sucursalesResp.data || []);
		if (!doctoresResp.error) setDoctores(doctoresResp.data || []);
		if (!clientesResp.error) setClientes(clientesResp.data || []);
	};

	const cargarReporte = async () => {
		setCargando(true);
		setErrorReporte("");
		try {
			let ventasQuery = supabase
				.from("ventas")
				.select(SELECT_VENTAS_ADMIN)
				.eq("estado", "activo")
				.gte("fecha_venta", `${fechaInicial}T00:00:00`)
				.lte("fecha_venta", `${fechaFinal}T23:59:59`)
				.order("fecha_venta", { ascending: false });
			let radiologiaQuery = supabase
				.from("estudios_radiologia")
				.select("id_estudio, id_venta, estado, listo_entrega, entregado, fecha_estudio, id_sucursal")
				.gte("fecha_estudio", `${fechaInicial}T00:00:00`)
				.lte("fecha_estudio", `${fechaFinal}T23:59:59`);

			if (sucursalSeleccionada) {
				ventasQuery = ventasQuery.eq("id_sucursal", sucursalSeleccionada);
				radiologiaQuery = radiologiaQuery.eq("id_sucursal", sucursalSeleccionada);
			}

			const [ventasResp, radiologiaResp, auditoriaResp] = await Promise.all([
				ventasQuery,
				radiologiaQuery,
				supabase
					.from("solicitudes_auditoria")
					.select("id_venta, evento, created_at")
					.gte("created_at", `${fechaInicial}T00:00:00`)
					.lte("created_at", `${fechaFinal}T23:59:59`)
					.order("created_at", { ascending: true }),
			]);

			if (ventasResp.error) throw ventasResp.error;
			if (radiologiaResp.error) throw radiologiaResp.error;
			if (auditoriaResp.error) throw auditoriaResp.error;
			setVentas(ventasResp.data || []);
			setEstudiosRadiologia(radiologiaResp.data || []);
			setEventosAuditoria(auditoriaResp.data || []);
		} catch (error) {
			console.error("Error al cargar reporte administrativo:", error);
			setErrorReporte(error.message || "No se pudo cargar el reporte administrativo");
			setVentas([]);
			setEstudiosRadiologia([]);
			setEventosAuditoria([]);
		} finally {
			setCargando(false);
		}
	};

	const resumen = useMemo(
		() => calcularResumenAdministrativo(ventas, estudiosRadiologia, eventosAuditoria),
		[ventas, estudiosRadiologia, eventosAuditoria],
	);
	const productividadArea = useMemo(() => agruparPorArea(ventas), [ventas]);
	const pendientesEtapa = useMemo(
		() => calcularPendientesPorEtapa(ventas, estudiosRadiologia),
		[ventas, estudiosRadiologia],
	);
	const ingresosSucursal = useMemo(
		() => agruparIngresosPorSucursal(ventas, sucursales),
		[ventas, sucursales],
	);
	const estudiosTop = useMemo(
		() => agruparEstudiosMasVendidosAdmin(ventas, 8),
		[ventas],
	);
	const remitentes = useMemo(
		() => agruparRemitentesAdmin(ventas, doctores, clientes),
		[ventas, doctores, clientes],
	);
	const maxEtapas = Math.max(...pendientesEtapa.map((etapa) => etapa.total), 1);
	const maxSucursal = Math.max(...ingresosSucursal.map((item) => item.ingreso), 1);

	const getPrimerNombre = (nombreCompleto) =>
		nombreCompleto || user?.email?.split("@")[0] || "Usuario";

	return (
		<PageLayout
			empleadoData={empleadoData}
			formatRol={formatRol}
			getPrimerNombre={getPrimerNombre}>
			<div className="ra-wrapper">
				<header className="ra-header">
					<div>
						<h1 className="ra-title">Reporte Administrativo</h1>
						<p>Operacion, productividad, adeudos e indicadores de entrega</p>
					</div>
					<button className="ra-btn accent" onClick={cargarReporte}>
						Actualizar
					</button>
				</header>

				<main className="ra-body">
					{errorReporte && <div className="ra-error">{errorReporte}</div>}

					<section className="ra-filters">
						<div className="ra-filter-group">
							<label>Fecha inicial</label>
							<div className="ra-input">
								<img src={calendarioIcono} alt="" />
								<input
									type="date"
									value={fechaInicial}
									onChange={(e) => setFechaInicial(e.target.value)}
								/>
							</div>
						</div>
						<div className="ra-filter-group">
							<label>Fecha final</label>
							<div className="ra-input">
								<img src={calendarioIcono} alt="" />
								<input
									type="date"
									value={fechaFinal}
									onChange={(e) => setFechaFinal(e.target.value)}
								/>
							</div>
						</div>
						<div className="ra-filter-group">
							<label>Sucursal</label>
							<select
								value={sucursalSeleccionada}
								onChange={(e) => setSucursalSeleccionada(e.target.value)}>
								<option value="">Todas</option>
								{sucursales.map((sucursal) => (
									<option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>
										{sucursal.nombre}
									</option>
								))}
							</select>
						</div>
						<button className="ra-btn" onClick={cargarReporte}>
							Generar
						</button>
					</section>

					{cargando ? (
						<div className="ra-empty">Cargando reporte...</div>
					) : (
						<>
							<section className="ra-metrics">
								<div className="ra-metric">
									<span>Ingresos</span>
									<strong>{formatoMonedaAdmin(resumen.totalIngresos)}</strong>
									<small>{resumen.totalVentas} ventas</small>
								</div>
								<div className="ra-metric">
									<span>Adeudos</span>
									<strong>{formatoMonedaAdmin(resumen.totalAdeudos)}</strong>
									<small>Saldo pendiente</small>
								</div>
								<div className="ra-metric">
									<span>Estudios</span>
									<strong>{resumen.totalEstudios}</strong>
									<small>Vendidos en periodo</small>
								</div>
								<div className="ra-metric">
									<span>Pendientes</span>
									<strong>{resumen.pendientes}</strong>
									<small>Por etapa operativa</small>
								</div>
							</section>

							<section className="ra-grid">
								<div className="ra-card">
									<div className="ra-card-title">
										<img src={metricasIcono} alt="" />
										Productividad por area
									</div>
									<table className="ra-table">
										<thead>
											<tr>
												<th>Area</th>
												<th>Estudios</th>
												<th>Ingreso</th>
											</tr>
										</thead>
										<tbody>
											{productividadArea.map((area) => (
												<tr key={area.nombre}>
													<td>{area.nombre}</td>
													<td>{area.estudios}</td>
													<td>{formatoMonedaAdmin(area.ingreso)}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>

								<div className="ra-card">
									<div className="ra-card-title">Estudios pendientes por etapa</div>
									<div className="ra-bars">
										{pendientesEtapa.map((etapa) => (
											<div className="ra-bar-row" key={etapa.id}>
												<span>{etapa.label}</span>
												<div className="ra-bar-track">
													<div
														className="ra-bar-fill"
														style={{ width: `${(etapa.total / maxEtapas) * 100}%` }}
													/>
												</div>
												<strong>{etapa.total}</strong>
											</div>
										))}
									</div>
								</div>

								<div className="ra-card">
									<div className="ra-card-title">Ingresos por sucursal</div>
									<div className="ra-bars">
										{ingresosSucursal.map((sucursal) => (
											<div className="ra-bar-row" key={sucursal.nombre}>
												<span>{sucursal.nombre}</span>
												<div className="ra-bar-track">
													<div
														className="ra-bar-fill alt"
														style={{ width: `${(sucursal.ingreso / maxSucursal) * 100}%` }}
													/>
												</div>
												<strong>{formatoMonedaAdmin(sucursal.ingreso)}</strong>
											</div>
										))}
									</div>
								</div>

								<div className="ra-card">
									<div className="ra-card-title">Tiempos promedio</div>
									<div className="ra-time-list">
										{resumen.tiemposPromedio.map((tiempo) => (
											<div className="ra-time-row" key={tiempo.id}>
												<span>{tiempo.label}</span>
												<strong>{formatoDuracionHoras(tiempo.promedio)}</strong>
												<small>{tiempo.muestras} muestras</small>
											</div>
										))}
									</div>
								</div>

								<div className="ra-card">
									<div className="ra-card-title">Estudios mas vendidos</div>
									<table className="ra-table">
										<thead>
											<tr>
												<th>Estudio</th>
												<th>Cant.</th>
												<th>Ingreso</th>
											</tr>
										</thead>
										<tbody>
											{estudiosTop.map((estudio) => (
												<tr key={estudio.nombre}>
													<td>
														<span className="ra-dot" style={{ background: estudio.color }} />
														{estudio.nombre}
													</td>
													<td>{estudio.cantidad}</td>
													<td>{formatoMonedaAdmin(estudio.ingreso)}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>

								<div className="ra-card">
									<div className="ra-card-title">Doctores que mas mandan</div>
									<table className="ra-table compact">
										<tbody>
											{remitentes.doctores.map((doctor) => (
												<tr key={doctor.nombre}>
													<td>{doctor.nombre}</td>
													<td>{doctor.ordenes} ordenes</td>
													<td>{formatoMonedaAdmin(doctor.ingreso)}</td>
												</tr>
											))}
										</tbody>
									</table>
									<div className="ra-card-title secondary">Clientes que mas mandan</div>
									<table className="ra-table compact">
										<tbody>
											{remitentes.clientes.map((cliente) => (
												<tr key={cliente.nombre}>
													<td>{cliente.nombre}</td>
													<td>{cliente.ordenes} ordenes</td>
													<td>{formatoMonedaAdmin(cliente.ingreso)}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</section>
						</>
					)}
				</main>
			</div>
		</PageLayout>
	);
};

export default ReporteAdministrativo;
