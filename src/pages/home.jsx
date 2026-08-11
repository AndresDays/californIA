import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCitasProximasDashboard, useEstadisticasSemanales, useStatsDashboard } from '../hooks/use-dashboard';
import { useSucursales } from '../hooks/use-sucursales';
import calendarioIcono from '../assets/calendarioIcono.png';
import dineroIcono from '../assets/dineroIcono.png';
import editarIcono from '../assets/editarIcono.png';
import entregaIcono from '../assets/entregaIcono.png';
import estudiosIcono from '../assets/estudiosIcono.png';
import californIA from '../assets/logoCalifornIA.png';
import nuevaCitaBtn from '../assets/nuevaCitaBtn.png';
import nuevoPacienteIcono from '../assets/nuevoPacienteIcono.png';
import pacientesIcono from '../assets/pacientesIcono.png';
import RadBtn from '../assets/radBtn.png';
import EditarCitaModal from '../components/editar-cita-modal';
import NuevaCitaModal from '../components/nueva-cita-modal';
import '../components/nueva-cita-modal.css';
import PageLayout from '../components/page-layout';
import { useEmpleadoActual } from '../hooks/use-empleado-actual';
import { supabase } from '../lib/supabase-client';
import { esDashboardRayosX, esDoctorExternoPermisos, esQuimico, esRecepcionista } from '../utils/role-permissions';
import './CalifornIA.css';

const Dashboard = () => {
	const { empleadoData, formatRol, getPrimerNombre } = useEmpleadoActual();
	// — estados primero —
	const [bandejasTrabajo, setBandejasTrabajo] = useState({
		capturaPendiente: 0,
		capturaGuardada: 0,
		radiologiaSubir: 0,
		radiologiaInterpretar: 0,
		entregaLista: 0,
	});
	const [bandejasLoading, setBandejasLoading] = useState(true);
	const [bandejasInicialesCargadas, setBandejasInicialesCargadas] = useState(false);
	const [modalNuevaCitaOpen, setModalNuevaCitaOpen] = useState(false);
	const [modalEditarCitaOpen, setModalEditarCitaOpen] = useState(false);
	const [citaEditando, setCitaEditando] = useState(null);
	const [tipoGrafica, setTipoGrafica] = useState("ingresos");
	const [vistaGrafica, setVistaGrafica] = useState("semana");
	const [sucursalFiltro, setSucursalFiltro] = useState("");

	// — hooks de React Query (después de los useState que usan como parámetros) —
	const { data: stats = { totalPacientes: 0, citasHoy: 0, estudiosRealizados: 0, ingresos: 0 } } = useStatsDashboard();
	const { data: pacientesProximos = [] } = useCitasProximasDashboard();
	const { data: estadisticasSemanales = [] } = useEstadisticasSemanales({ vistaGrafica, sucursalFiltro });
	const { data: sucursales = [] } = useSucursales();

	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const debounceRef = useRef(null);

	const normalizarRol = (rol = "") =>
		String(rol)
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.trim()
			.toLowerCase()
			.replace(/\s+/g, "_");

	const obtenerConteo = async (consulta) => {
		const { count, error } = await consulta;
		if (error) throw error;
		return count || 0;
	};

	const cargarBandejasTrabajo = useCallback(async () => {
		setBandejasLoading(true);
		try {
			const rolActual = normalizarRol(empleadoData?.rol);
			const esDoctorExterno = esDoctorExternoPermisos(rolActual);
			const idDoctorExterno = empleadoData?.id_doctor || null;
			const limitarDoctorExterno = (consulta) => {
				if (!esDoctorExterno) return consulta;
				return consulta.eq("id_doctor", idDoctorExterno || -1);
			};

			const resultados = await Promise.allSettled([
				obtenerConteo(
					supabase
						.from("estudios_venta")
						.select("id_estudio_venta", { count: "exact", head: true })
						.eq("estado_validacion", "captura"),
				),
				obtenerConteo(
					supabase
						.from("estudios_venta")
						.select("id_estudio_venta", { count: "exact", head: true })
						.eq("estado_validacion", "guardado"),
				),
				obtenerConteo(
					limitarDoctorExterno(supabase
						.from("estudios_radiologia")
						.select("id_estudio", { count: "exact", head: true })
						.in("estado", ["POR ASIGNAR", "ASIGNADO"])),
				),
				obtenerConteo(
					limitarDoctorExterno(supabase
						.from("estudios_radiologia")
						.select("id_estudio", { count: "exact", head: true })
						.in("estado", ["EN PROCESO"])),
				),
				obtenerConteo(
					supabase
						.from("estudios_venta")
						.select("id_estudio_venta", { count: "exact", head: true })
						.eq("estado_validacion", "validado")
						.eq("entregado", false),
				),
				obtenerConteo(
					limitarDoctorExterno(supabase
						.from("estudios_radiologia")
						.select("id_estudio", { count: "exact", head: true })
						.eq("listo_entrega", true)),
				),
			]);
			const valor = (index) =>
				resultados[index].status === "fulfilled" ? resultados[index].value : 0;
			setBandejasTrabajo({
				capturaPendiente: valor(0),
				capturaGuardada: valor(1),
				radiologiaSubir: valor(2),
				radiologiaInterpretar: valor(3),
				entregaLista: valor(4) + valor(5),
			});
		} catch (error) {
			console.error("Error al cargar bandejas de trabajo:", error);
		} finally {
			setBandejasLoading(false);
			setBandejasInicialesCargadas(true);
		}
	}, [empleadoData?.id_doctor, empleadoData?.rol]);

	const cargarBandejasDespues = useCallback(() => {
		clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => cargarBandejasTrabajo(), 400);
	}, [cargarBandejasTrabajo]);

	useEffect(() => {
		cargarBandejasTrabajo();
	}, [cargarBandejasTrabajo]);

	useEffect(() => {
		const canal = supabase
			.channel('bandejas-trabajo')
			.on('postgres_changes', { event: '*', schema: 'public', table: 'estudios_venta' }, cargarBandejasDespues)
			.on('postgres_changes', { event: '*', schema: 'public', table: 'estudios_radiologia' }, cargarBandejasDespues)
			.subscribe();

		return () => {
			clearTimeout(debounceRef.current);
			supabase.removeChannel(canal);
		};
	}, [cargarBandejasDespues]);

	const handleCitaCreada = () => {
		queryClient.invalidateQueries({ queryKey: ['citas'] });
		queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
		queryClient.invalidateQueries({ queryKey: ['dashboard-citas-proximas'] });
		queryClient.invalidateQueries({ queryKey: ['dashboard-estadisticas'] });
	};

	const cargarCitaEnNuevoPaciente = (cita) => {
		navigate(`/nuevo-paciente?citaId=${cita.id_cita}`, {
			state: { citaId: cita.id_cita },
		});
	};

	const formatFecha = (f) =>
		new Date(f).toLocaleDateString("es-MX", {
			day: "2-digit",
			month: "short",
			year: "numeric",
		});
	const formatHora = (f) =>
		new Date(f).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
	const getNombrePaciente = (cita) =>
		cita.pacientes?.nombre || cita.nombre_paciente || "Sin nombre";
	const rolEmpleado = normalizarRol(empleadoData?.rol);
	const esRolRecepcionista = esRecepcionista(rolEmpleado);
	const esRolDashboardRayosX = esDashboardRayosX(rolEmpleado);
	const esRolDoctorExterno = esDoctorExternoPermisos(rolEmpleado);
	const esDashboardRestringido =
		esRolRecepcionista || esQuimico(rolEmpleado) || esRolDashboardRayosX;
	const mostrarModuloRadiologia = !esDashboardRestringido || esRolDashboardRayosX;
	const mostrarAccionesRapidas = !esRolDashboardRayosX;
	const puedeVerIngresos = !esDashboardRestringido;
	const tipoGraficaActual = puedeVerIngresos ? tipoGrafica : "pacientes";
	const esAdmin =
		!rolEmpleado ||
		["admin", "administrador", "desarrollador"].includes(rolEmpleado);
	const bandejasPorRol = [
		{
			id: "captura-pendiente",
			titulo: "Captura",
			descripcion: "Pendientes de capturar",
			conteo: bandejasTrabajo.capturaPendiente,
			ruta: "/captura",
			roles: ["quimico", "capturista", "recepcionista"],
		},
		{
			id: "captura-validar",
			titulo: "Validacion",
			descripcion: "Guardados por revisar",
			conteo: bandejasTrabajo.capturaGuardada,
			ruta: "/captura",
			roles: ["quimico", "capturista"],
		},
		{
			id: "radiologia-subir",
			titulo: "Radiologia",
			descripcion: "Pendientes de tomar/subir",
			conteo: bandejasTrabajo.radiologiaSubir,
			ruta: "/radiologia",
			roles: ["tecnico", "tecnico_radiologia"],
		},
		{
			id: "radiologo-interpretar",
			titulo: esRolDoctorExterno ? "Rayos X" : "Radiologo",
			descripcion: esRolDoctorExterno ? "Estudios asignados" : "Pendientes de interpretar",
			conteo: bandejasTrabajo.radiologiaInterpretar,
			ruta: "/radiologia",
			roles: ["radiologo", "doctor_externo", "medico_externo", "doctor_particular", "medico_particular", "institucion_externa"],
		},
		{
			id: "entrega-lista",
			titulo: "Entrega",
			descripcion: "Listos para entregar",
			conteo: bandejasTrabajo.entregaLista,
			ruta: "/entrega-resultados",
			roles: ["recepcionista", "entrega"],
		},
	];
	const bandejasVisibles = esAdmin
		? bandejasPorRol
		: bandejasPorRol.filter((bandeja) => bandeja.roles.includes(rolEmpleado));
	const totalTareasRol = bandejasVisibles.reduce(
		(total, bandeja) => total + bandeja.conteo,
		0,
	);
	const mostrarCargaInicialBandejas = bandejasLoading && !bandejasInicialesCargadas;

	return (
		<div className="dashboard-container">
			<PageLayout
				empleadoData={empleadoData}
				formatRol={formatRol}
				getPrimerNombre={getPrimerNombre}>
				<main className="dashboard-main">
					<div className="dashboard-content-wrapper">
						<div className="content-header">
							<div>
								<h1 className="welcome-title">
									Bienvenido,{" "}
									{empleadoData ? getPrimerNombre(empleadoData.nombre) : "Usuario"}
								</h1>
								<p className="welcome-subtitle">
									Aquí está lo que está pasando en las clínicas hoy
								</p>
							</div>
							<button
								className="btn-new-appointment"
								onClick={() => setModalNuevaCitaOpen(true)}>
								<img
									src={nuevaCitaBtn}
									alt="Nueva Cita"
									className="btn-new-appointment-img"
								/>
							</button>
						</div>

						<div className="stats-grid">
							<div className="stat-card">
								<div className="stat-icon patients">
									<img
										src={pacientesIcono}
										alt="Pacientes"
										className="stat-icon-img"
									/>
								</div>
								<div className="stat-content">
									<p className="stat-label">Total Pacientes</p>
									<h2 className="stat-value">{stats.totalPacientes}</h2>
									<p className="stat-change positive">+12.5% vs mes anterior</p>
								</div>
							</div>
							<div className="stat-card">
								<div className="stat-icon appointments">
									<img src={calendarioIcono} alt="Citas" className="stat-icon-img" />
								</div>
								<div className="stat-content">
									<p className="stat-label">Citas Hoy</p>
									<h2 className="stat-value">{stats.citasHoy}</h2>
									<p className="stat-change neutral">Agenda del día</p>
								</div>
							</div>
							<div className="stat-card">
								<div className="stat-icon studies">
									<img
										src={estudiosIcono}
										alt="Estudios"
										className="stat-icon-img"
									/>
								</div>
								<div className="stat-content">
									<p className="stat-label">Estudios Realizados</p>
									<h2 className="stat-value">{stats.estudiosRealizados}</h2>
									<p className="stat-change positive">+8.2% esta semana</p>
								</div>
							</div>
							<div
								className={`stat-card ${puedeVerIngresos ? "clickable" : ""}`}
								onClick={() => {
									if (!puedeVerIngresos) return;
									setTipoGrafica(
										tipoGrafica === "pacientes" ? "ingresos" : "pacientes",
									);
								}}>
								<div className="stat-icon revenue">
									<img
										src={tipoGraficaActual === "pacientes" ? pacientesIcono : dineroIcono}
										alt="stat"
										className="stat-icon-img"
									/>
								</div>
								<div className="stat-content">
									<p className="stat-label">
										{tipoGraficaActual === "pacientes"
											? "Pacientes de Hoy"
											: "Ingresos del Mes"}
									</p>
									<h2 className="stat-value">
										{tipoGraficaActual === "pacientes"
											? stats.citasHoy
											: stats.ingresos >= 1000
												? `$${(stats.ingresos / 1000).toFixed(1)}k`
												: `$${stats.ingresos.toFixed(0)}`}
									</h2>
									<p className="stat-change positive">
										{tipoGraficaActual === "pacientes"
											? "Agenda del dia"
											: "Ventas pagadas del mes"}
									</p>
								</div>
							</div>
						</div>

						<section
							className="workbench-section"
							aria-labelledby="workbench-title">
							<div className="workbench-header">
								<div>
									<h2 id="workbench-title">Centro de trabajo</h2>
									<p>
										{esAdmin
											? "Vista general de pendientes por area"
											: `Bandejas para ${formatRol(empleadoData?.rol)}`}
									</p>
								</div>
								<span className="workbench-total">
									{mostrarCargaInicialBandejas ? "..." : totalTareasRol} tareas
								</span>
							</div>
							<div className="workbench-grid">
								{bandejasVisibles.map((bandeja) => (
									<button
										type="button"
										key={bandeja.id}
										className="workbench-card"
										onClick={() => navigate(bandeja.ruta)}>
										<span className="workbench-card-label">{bandeja.titulo}</span>
										<strong>{mostrarCargaInicialBandejas ? "..." : bandeja.conteo}</strong>
										<span>{bandeja.descripcion}</span>
									</button>
								))}
							</div>
						</section>

						<div className="main-content-grid">
							<div className="quick-access-section">
								<h3
									className="section-title"
									id={esDashboardRestringido && mostrarAccionesRapidas ? "quick-actions-title" : undefined}>
									{esDashboardRestringido && mostrarAccionesRapidas
										? "Acciones rápidas"
										: "Módulos Principales"}
								</h3>
								{mostrarModuloRadiologia && (
									<div className="modules-grid">
										<button
										type="button"
										className="module-card module-card-primary radiology"
										aria-label="Abrir Radiología"
										onClick={() => navigate("/radiologia")}>
										<img src={RadBtn} alt="Radiología" className="module-btn-img" />
										</button>
									</div>
								)}
								{mostrarAccionesRapidas && (
									<div
										className="quick-actions-panel"
										role="group"
										aria-labelledby="quick-actions-title">
										{!esDashboardRestringido && (
											<h4 className="quick-actions-title" id="quick-actions-title">
												Acciones rápidas
											</h4>
										)}
										<div className="quick-actions-grid">
											<button
												type="button"
												className="quick-action-card"
												onClick={() => setModalNuevaCitaOpen(true)}>
												<img src={calendarioIcono} alt="" className="quick-action-icon" />
												<span>Nueva cita</span>
											</button>
											<button
												type="button"
												className="quick-action-card"
												onClick={() => navigate("/nuevo-paciente")}>
												<img src={nuevoPacienteIcono} alt="" className="quick-action-icon" />
												<span>Nuevo paciente</span>
											</button>
											<button
												type="button"
												className="quick-action-card"
												onClick={() => navigate("/editar-solicitud")}>
												<img src={editarIcono} alt="" className="quick-action-icon" />
												<span>Editar solicitud</span>
											</button>
											<button
												type="button"
												className="quick-action-card"
												onClick={() => navigate("/entrega-resultados")}>
												<img src={entregaIcono} alt="" className="quick-action-icon" />
												<span>Entrega</span>
											</button>
										</div>
									</div>
								)}
								<div className="logo-container">
									<img
										src={californIA}
										alt="CalifornIA"
										className="california-logo"
									/>
								</div>
							</div>

							<div className="appointments-section">
								<div className="section-header">
									<h3 className="section-title">
										{tipoGraficaActual === "pacientes"
											? "Estadísticas de Pacientes"
											: "Estadísticas de Ingresos"}
									</h3>
									<div className="chart-controls">
										<div className="view-toggle">
											<button
												className={`toggle-btn ${vistaGrafica === "semana" ? "active" : ""}`}
												onClick={() => setVistaGrafica("semana")}>
												Semana
											</button>
											<button
												className={`toggle-btn ${vistaGrafica === "mes" ? "active" : ""}`}
												onClick={() => setVistaGrafica("mes")}>
												Mes
											</button>
											<button
												className={`toggle-btn ${vistaGrafica === "ano" ? "active" : ""}`}
												onClick={() => setVistaGrafica("ano")}>
												Año
											</button>
										</div>
										<select
											value={sucursalFiltro}
											onChange={(e) => setSucursalFiltro(e.target.value)}
											className="sucursal-filter">
											<option value="">Todas las sucursales</option>
											{sucursales.map((s) => (
												<option key={s.id_sucursal} value={s.id_sucursal}>
													{s.nombre}
												</option>
											))}
										</select>
									</div>
								</div>

								<div className="chart-container">
									{tipoGraficaActual === "pacientes" ? (
										<div className="chart-bars">
											{estadisticasSemanales.map((stat, index) => {
												const maxTotal = Math.max(
													...estadisticasSemanales.map((s) => s.total),
													1,
												);
												return (
													<div key={index} className="chart-bar-wrapper">
														<div className="chart-bar-container">
															<div className="chart-bar-stack">
																{stat.laboratorio > 0 && (
																	<div
																		className={`chart-bar laboratorio ${stat.esActual ? "current" : ""}`}
																		style={{
																			height: `${(stat.laboratorio / maxTotal) * 100}%`,
																		}}>
																		<span className="bar-value">
																			{stat.laboratorio}
																		</span>
																	</div>
																)}
																{stat.radiologia > 0 && (
																	<div
																		className={`chart-bar radiologia ${stat.esActual ? "current" : ""}`}
																		style={{
																			height: `${(stat.radiologia / maxTotal) * 100}%`,
																		}}>
																		<span className="bar-value">
																			{stat.radiologia}
																		</span>
																	</div>
																)}
															</div>
														</div>
														<div
															className={`chart-label ${stat.esActual ? "current" : ""}`}>
															{stat.label}
															{stat.esActual && (
																<span className="current-indicator">●</span>
															)}
														</div>
													</div>
												);
											})}
										</div>
									) : (
										<div className="line-chart">
											<svg className="line-chart-svg" viewBox="0 0 800 300">
												{[0, 1, 2, 3, 4].map((i) => (
													<line
														key={i}
														x1="40"
														y1={40 + i * 50}
														x2="780"
														y2={40 + i * 50}
														stroke="rgba(73,178,212,0.1)"
														strokeWidth="1"
													/>
												))}
												{(() => {
													const maxI = Math.max(
														...estadisticasSemanales.map((s) =>
															Math.max(
																s.ingresosRadiologia,
																s.ingresosLaboratorio,
																s.ingresosTotal,
															),
														),
														1,
													);
													const W = 740,
														H = 220,
														P = 40,
														step = W / Math.max(estadisticasSemanales.length - 1, 1);
													const getY = (v) => P + H - (v / maxI) * H;
													const pathR = estadisticasSemanales
														.map(
															(s, i) =>
																`${i === 0 ? "M" : "L"} ${P + i * step} ${getY(s.ingresosRadiologia)}`,
														)
														.join(" ");
													const pathL = estadisticasSemanales
														.map(
															(s, i) =>
																`${i === 0 ? "M" : "L"} ${P + i * step} ${getY(s.ingresosLaboratorio)}`,
														)
														.join(" ");
													const pathT = estadisticasSemanales
														.map(
															(s, i) =>
																`${i === 0 ? "M" : "L"} ${P + i * step} ${getY(s.ingresosTotal)}`,
														)
														.join(" ");
													return (
														<>
															<path
																d={pathT}
																fill="none"
																stroke="#53B9DB"
																strokeWidth="3"
																strokeLinecap="round"
																strokeLinejoin="round"
															/>
															<path
																d={pathR}
																fill="none"
																stroke="#106DA0"
																strokeWidth="2.5"
																strokeLinecap="round"
																strokeLinejoin="round"
															/>
															<path
																d={pathL}
																fill="none"
																stroke="#49B2D4"
																strokeWidth="2.5"
																strokeLinecap="round"
																strokeLinejoin="round"
															/>
															{estadisticasSemanales.map((s, i) => (
																<g key={i}>
																	<circle
																		cx={P + i * step}
																		cy={getY(s.ingresosTotal)}
																		r="5"
																		fill="#53B9DB"
																		stroke="white"
																		strokeWidth="2"
																	/>
																	<circle
																		cx={P + i * step}
																		cy={getY(s.ingresosRadiologia)}
																		r="4"
																		fill="#106DA0"
																		stroke="white"
																		strokeWidth="2"
																	/>
																	<circle
																		cx={P + i * step}
																		cy={getY(s.ingresosLaboratorio)}
																		r="4"
																		fill="#49B2D4"
																		stroke="white"
																		strokeWidth="2"
																	/>
																</g>
															))}
															{estadisticasSemanales.map((s, i) => (
																<text
																	key={i}
																	x={P + i * step}
																	y="280"
																	textAnchor="middle"
																	fill={
																		s.esActual ? "#53B9DB" : "rgba(255,255,255,0.7)"
																	}
																	fontSize="12"
																	fontWeight={s.esActual ? "700" : "400"}>
																	{s.label}
																</text>
															))}
														</>
													);
												})()}
											</svg>
										</div>
									)}
									<div className="chart-legend">
										{tipoGraficaActual === "pacientes" ? (
											<>
												<div className="legend-item">
													<div className="legend-color radiologia" />
													<span>
														Radiología (
														{estadisticasSemanales.reduce(
															(s, x) => s + x.radiologia,
															0,
														)}
														)
													</span>
												</div>
												<div className="legend-item">
													<div className="legend-color laboratorio" />
													<span>
														Laboratorio (
														{estadisticasSemanales.reduce(
															(s, x) => s + x.laboratorio,
															0,
														)}
														)
													</span>
												</div>
											</>
										) : (
											<>
												<div className="legend-item">
													<div className="legend-color line-radiologia" />
													<span>
														Radiología ($
														{estadisticasSemanales
															.reduce((s, x) => s + x.ingresosRadiologia, 0)
															.toLocaleString()}
														)
													</span>
												</div>
												<div className="legend-item">
													<div className="legend-color line-laboratorio" />
													<span>
														Laboratorio ($
														{estadisticasSemanales
															.reduce((s, x) => s + x.ingresosLaboratorio, 0)
															.toLocaleString()}
														)
													</span>
												</div>
												<div className="legend-item">
													<div className="legend-color line-total" />
													<span>
														Total ($
														{estadisticasSemanales
															.reduce((s, x) => s + x.ingresosTotal, 0)
															.toLocaleString()}
														)
													</span>
												</div>
											</>
										)}
										<div className="legend-item">
											<div className="legend-color current" />
											<span>
												{vistaGrafica === "semana"
													? "Hoy"
													: vistaGrafica === "mes"
														? "Semana actual"
														: "Mes actual"}
											</span>
										</div>
									</div>
								</div>
							</div>
						</div>

						<div className="recent-patients-section">
							<div className="section-header">
								<h3 className="section-title">Próximas Citas</h3>
								<button className="btn-see-more">Ver todas</button>
							</div>
							<div className="patients-table-container">
								<table className="patients-table">
									<thead>
										<tr>
											<th>Paciente</th>
											<th>Sucursal</th>
											<th>Estudio</th>
											<th>Hora</th>
											<th>Precio</th>
											<th>Acciones</th>
										</tr>
									</thead>
									<tbody>
										{pacientesProximos.length > 0 ? (
											pacientesProximos.map((cita) => (
												<tr key={cita.id_cita}>
													<td>
														<div className="patient-cell">
															<div className="patient-avatar">
																{getNombrePaciente(cita).charAt(0)}
															</div>
															<span>{getNombrePaciente(cita)}</span>
														</div>
													</td>
													<td>
														<span className="sucursal-value">
															{cita.sucursales?.nombre || "Sin sucursal"}
														</span>
													</td>
													<td>
														<span className="estudio-value">
															{cita.tipo_estudio || "Sin especificar"}
														</span>
													</td>
													<td>
														<div className="time-cell">
															<span className="time-value">
																{formatHora(cita.fecha_estudio)}
															</span>
															<span className="date-value">
																{formatFecha(cita.fecha_estudio)}
															</span>
														</div>
													</td>
													<td>
														<span className="price-value">
															${Number(cita.monto || 0).toFixed(2)}
														</span>
													</td>
													<td>
														<div className="cita-actions">
															<button
																className="btn-load-cita"
																onClick={() => cargarCitaEnNuevoPaciente(cita)}
																title="Cargar en nuevo paciente"
																aria-label={`Cargar cita de ${getNombrePaciente(cita)} en nuevo paciente`}>
																<img
																	src={nuevoPacienteIcono}
																	alt=""
																	className="btn-cita-action-icon"
																/>
															</button>
															<button
																className="btn-edit-cita"
																onClick={() => {
																	setCitaEditando(cita);
																	setModalEditarCitaOpen(true);
																}}
																title="Editar cita"
																aria-label={`Editar cita de ${getNombrePaciente(cita)}`}>
																<img
																	src={editarIcono}
																	alt=""
																	className="btn-cita-action-icon"
																/>
															</button>
														</div>
													</td>
												</tr>
											))
										) : (
											<tr>
												<td colSpan="6" className="empty-cell">
													No hay citas próximas programadas
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</main>

				<footer className="dashboard-footer">
					<p className="footer-disclaimer">
						La información generada por CalifornIA tiene únicamente fines de apoyo
						clínico. Cualquier resultado debe interpretarse como orientación y
						validarse por un especialista.
					</p>
				</footer>
			</PageLayout>

			<NuevaCitaModal
				isOpen={modalNuevaCitaOpen}
				onClose={() => setModalNuevaCitaOpen(false)}
				onCitaCreada={handleCitaCreada}
			/>
			<EditarCitaModal
				isOpen={modalEditarCitaOpen}
				onClose={() => {
					setModalEditarCitaOpen(false);
					setCitaEditando(null);
				}}
				cita={citaEditando}
				onCitaActualizada={handleCitaCreada}
			/>
		</div>
	);
};

export default Dashboard;
