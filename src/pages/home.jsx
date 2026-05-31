import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useAuth } from '../context/auth-context';
import { supabase } from '../lib/supabase-client';
import { CITA_ESTADOS, CITA_ESTADOS_DASHBOARD } from '../utils/cita-lifecycle';
import {
	calcularIngresosPorAreaVentasPagadas,
	calcularIngresosVentasPagadas,
} from '../utils/dashboard-stats';
import { esDashboardRayosX, esQuimico, esRecepcionista } from '../utils/role-permissions';
import './CalifornIA.css';

const Dashboard = () => {
	const { user, empleadoData: empleadoContext } = useAuth();
	const [empleadoData, setEmpleadoData] = useState(empleadoContext || null);
	const [stats, setStats] = useState({
		totalPacientes: 0,
		citasHoy: 0,
		estudiosRealizados: 0,
		ingresos: 0,
	});
	const [bandejasTrabajo, setBandejasTrabajo] = useState({
		capturaPendiente: 0,
		capturaGuardada: 0,
		radiologiaSubir: 0,
		radiologiaInterpretar: 0,
		entregaLista: 0,
	});
	const [bandejasLoading, setBandejasLoading] = useState(true);
	const [pacientesProximos, setPacientesProximos] = useState([]);
	const [estadisticasSemanales, setEstadisticasSemanales] = useState([]);
	const [modalNuevaCitaOpen, setModalNuevaCitaOpen] = useState(false);
	const [modalEditarCitaOpen, setModalEditarCitaOpen] = useState(false);
	const [citaEditando, setCitaEditando] = useState(null);
	const [tipoGrafica, setTipoGrafica] = useState("ingresos");
	const [vistaGrafica, setVistaGrafica] = useState("semana");
	const [sucursalFiltro, setSucursalFiltro] = useState("");
	const [sucursales, setSucursales] = useState([]);

	const navigate = useNavigate();

	useEffect(() => {
		if (empleadoContext) setEmpleadoData(empleadoContext);
	}, [empleadoContext]);

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
		cargarEstadisticas();
		cargarPacientesProximos();
		cargarSucursales();
		cargarEstadisticasSemanales();
	}, [user]);

	useEffect(() => {
		cargarEstadisticasSemanales();
	}, [vistaGrafica, sucursalFiltro]);

	useEffect(() => {
		cargarBandejasTrabajo();
	}, []);

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

	const cargarBandejasTrabajo = async () => {
		setBandejasLoading(true);
		try {
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
					supabase
						.from("estudios_radiologia")
						.select("id_estudio", { count: "exact", head: true })
						.in("estado", ["POR ASIGNAR", "ASIGNADO"]),
				),
				obtenerConteo(
					supabase
						.from("estudios_radiologia")
						.select("id_estudio", { count: "exact", head: true })
						.in("estado", ["EN PROCESO"]),
				),
				obtenerConteo(
					supabase
						.from("estudios_venta")
						.select("id_estudio_venta", { count: "exact", head: true })
						.eq("estado_validacion", "validado")
						.eq("entregado", false),
				),
				obtenerConteo(
					supabase
						.from("estudios_radiologia")
						.select("id_estudio", { count: "exact", head: true })
						.eq("listo_entrega", true),
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
		}
	};

	const cargarEstadisticas = async () => {
		try {
			const { count: totalPac } = await supabase
				.from("pacientes")
				.select("*", { count: "exact", head: true });
			const ahora = new Date();
			const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
			const { count: citasHoy } = await supabase
				.from("citas")
				.select("*", { count: "exact", head: true })
				.gte("fecha_estudio", hoy)
				.lt("fecha_estudio", `${hoy}T23:59:59`)
				.not("estado", "eq", "cancelada");
			const { data: citasCompletadas } = await supabase
				.from("citas")
				.select("tipo_estudio, fecha_estudio")
				.in("estado", [CITA_ESTADOS.LISTA_ENTREGA, CITA_ESTADOS.ENTREGADA]);
			const ahoraCompleto = new Date();
			const horaActualStr = `${ahoraCompleto.getFullYear()}-${String(ahoraCompleto.getMonth() + 1).padStart(2, "0")}-${String(ahoraCompleto.getDate()).padStart(2, "0")}T${String(ahoraCompleto.getHours()).padStart(2, "0")}:${String(ahoraCompleto.getMinutes()).padStart(2, "0")}:00`;
			const totalEstudiosRealizados =
				citasCompletadas?.reduce((total, cita) => {
					if (cita.fecha_estudio > horaActualStr) return total;
					if (cita.tipo_estudio) {
						const estudios = cita.tipo_estudio
							.split(",")
							.map((e) => e.trim())
							.filter((e) => e);
						return total + (estudios.length > 0 ? estudios.length : 1);
					}
					return total + 1;
				}, 0) || 0;
			const inicioMes = new Date();
			inicioMes.setDate(1);
			inicioMes.setHours(0, 0, 0, 0);
			const finMes = new Date();
			finMes.setMonth(finMes.getMonth() + 1);
			finMes.setDate(1);
			finMes.setHours(0, 0, 0, 0);
			const inicioMesStr = `${inicioMes.getFullYear()}-${String(inicioMes.getMonth() + 1).padStart(2, "0")}-01T00:00:00`;
			const finMesStr = `${finMes.getFullYear()}-${String(finMes.getMonth() + 1).padStart(2, "0")}-01T00:00:00`;
			const { data: ventasMes } = await supabase
				.from("ventas")
				.select("fecha_venta, estado, total, pago_recibido")
				.eq("estado", "activo")
				.gte("fecha_venta", inicioMesStr)
				.lt("fecha_venta", finMesStr);
			const ingresosMes = calcularIngresosVentasPagadas(
				ventasMes || [],
				inicioMesStr,
				finMesStr,
			);
			setStats({
				totalPacientes: totalPac || 0,
				citasHoy: citasHoy || 0,
				estudiosRealizados: totalEstudiosRealizados,
				ingresos: ingresosMes,
			});
		} catch (error) {
			console.error("Error al cargar estadísticas:", error);
		}
	};

	const cargarPacientesProximos = async () => {
		try {
			const ahora = new Date();
			const horaLocal = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}T${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}:00`;
			const { data, error } = await supabase
				.from("citas")
				.select(
					`
        id_cita, fecha_estudio, estado, tipo_estudio, monto,
        id_sucursal, nombre_paciente, telefono_paciente,
        pacientes (nombre, telefono, id_paciente),
        sucursales (id_sucursal, nombre),
        clientes (id_cliente, nombre),
        empresas (id_empresa, nombre),
        tipos_estudio (id_tipo_estudio, nombre)
      `,
				)
				.gte("fecha_estudio", horaLocal)
				.in("estado", CITA_ESTADOS_DASHBOARD)
				.order("fecha_estudio", { ascending: true })
				.limit(5);
			if (error) throw error;
			setPacientesProximos(data || []);
		} catch (error) {
			console.error("Error al cargar pacientes próximos:", error);
		}
	};

	const cargarSucursales = async () => {
		try {
			const { data, error } = await supabase
				.from("sucursales")
				.select("id_sucursal, nombre")
				.order("nombre");
			if (error) throw error;
			setSucursales(data || []);
		} catch (error) {
			console.error("Error al cargar sucursales:", error);
		}
	};

	const cargarEstadisticasSemanales = async () => {
		try {
			let queryCitas = supabase
				.from("citas")
				.select("fecha_estudio, tipo_estudio, id_sucursal, estado");
			if (sucursalFiltro) queryCitas = queryCitas.eq("id_sucursal", sucursalFiltro);
			const hoy = new Date();
			let inicio, fin, labels, numPeriodos;
			if (vistaGrafica === "semana") {
				const diaSemana = hoy.getDay();
				inicio = new Date(hoy);
				inicio.setDate(hoy.getDate() - diaSemana);
				inicio.setHours(0, 0, 0, 0);
				fin = new Date(inicio);
				fin.setDate(inicio.getDate() + 7);
				labels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
				numPeriodos = 7;
			} else if (vistaGrafica === "mes") {
				inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
				fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
				const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
				numPeriodos = Math.ceil(ultimoDiaMes.getDate() / 7);
				labels = Array.from({ length: numPeriodos }, (_, i) => `Sem ${i + 1}`);
			} else {
				inicio = new Date(hoy.getFullYear(), 0, 1);
				fin = new Date(hoy.getFullYear() + 1, 0, 1);
				labels = [
					"Ene",
					"Feb",
					"Mar",
					"Abr",
					"May",
					"Jun",
					"Jul",
					"Ago",
					"Sep",
					"Oct",
					"Nov",
					"Dic",
				];
				numPeriodos = 12;
			}
			const fmt = (d) =>
				`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T00:00:00`;
			queryCitas = queryCitas
				.gte("fecha_estudio", fmt(inicio))
				.lt("fecha_estudio", fmt(fin));
			let queryVentas = supabase
				.from("ventas")
				.select(
					`
						fecha_venta, estado, total, pago_recibido, id_sucursal, sucursal,
						estudios_venta ( clave_estudio, descripcion_estudio, precio, area, id_sucursal, sucursal )
					`,
				)
				.eq("estado", "activo")
				.gte("fecha_venta", fmt(inicio))
				.lt("fecha_venta", fmt(fin));
			if (sucursalFiltro) queryVentas = queryVentas.eq("id_sucursal", sucursalFiltro);
			const [respuestaCitas, respuestaVentas] = await Promise.all([
				queryCitas,
				queryVentas,
			]);
			if (respuestaCitas.error) throw respuestaCitas.error;
			if (respuestaVentas.error) throw respuestaVentas.error;
			const citas = respuestaCitas.data || [];
			const ventas = respuestaVentas.data || [];
			const cR = new Array(numPeriodos).fill(0),
				cL = new Array(numPeriodos).fill(0);
			const iR = new Array(numPeriodos).fill(0),
				iL = new Array(numPeriodos).fill(0);
			citas.forEach((est) => {
				if (est.estado === "cancelada") return;
				const f = new Date(est.fecha_estudio);
				let idx =
					vistaGrafica === "semana"
						? f.getDay()
						: vistaGrafica === "mes"
							? Math.floor((f.getDate() - 1) / 7)
							: f.getMonth();
				const tipo = est.tipo_estudio?.toLowerCase() || "";
				if (
					tipo.includes("radio") ||
					tipo.includes("rayos") ||
					tipo.includes("rx")
				) {
					cR[idx]++;
				} else {
					cL[idx]++;
				}
			});
			ventas.forEach((venta) => {
				const f = new Date(venta.fecha_venta);
				if (Number.isNaN(f.getTime())) return;
				const idx =
					vistaGrafica === "semana"
						? f.getDay()
						: vistaGrafica === "mes"
							? Math.floor((f.getDate() - 1) / 7)
							: f.getMonth();
				const ingresos = calcularIngresosPorAreaVentasPagadas([venta]);
				iR[idx] += ingresos.radiologia;
				iL[idx] += ingresos.laboratorio;
			});
			setEstadisticasSemanales(
				labels.map((label, i) => {
					let esActual =
						vistaGrafica === "semana"
							? i === hoy.getDay()
							: vistaGrafica === "mes"
								? i === Math.floor((hoy.getDate() - 1) / 7)
								: i === hoy.getMonth();
					return {
						label,
						radiologia: cR[i],
						laboratorio: cL[i],
						total: cR[i] + cL[i],
						ingresosRadiologia: iR[i],
						ingresosLaboratorio: iL[i],
						ingresosTotal: iR[i] + iL[i],
						esActual,
					};
				}),
			);
		} catch (error) {
			console.error("Error al cargar estadísticas semanales:", error);
		}
	};

	const handleCitaCreada = () => {
		cargarEstadisticas();
		cargarPacientesProximos();
		cargarEstadisticasSemanales();
	};

	const cargarCitaEnNuevoPaciente = (cita) => {
		navigate(`/nuevo-paciente?citaId=${cita.id_cita}`, {
			state: { citaId: cita.id_cita },
		});
	};

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
			titulo: "Radiologo",
			descripcion: "Pendientes de interpretar",
			conteo: bandejasTrabajo.radiologiaInterpretar,
			ruta: "/radiologia",
			roles: ["radiologo"],
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
									{bandejasLoading ? "..." : totalTareasRol} tareas
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
										<strong>{bandejasLoading ? "..." : bandeja.conteo}</strong>
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
