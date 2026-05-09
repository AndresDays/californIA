import { useEffect, useState } from "react";
import calendarioIcono from "../../assets/calendarioIcono.png";
import metricasIcono from "../../assets/metricasIcono.png";
import PageLayout from "../../components/page-layout.jsx";
import { useAuth } from "../../context/auth-context";
import { supabase } from "../../lib/supabase-client";
import "./reporte-ventas.css";

const PRODUCTOS_MOCK = [
	{ name: "Biometría Hemática", pct: 78, color: "#53B9DB" },
	{ name: "Química Sanguínea", pct: 64, color: "#49B2D4" },
	{ name: "Uroanálisis", pct: 51, color: "#106DA0" },
	{ name: "Rx Tórax", pct: 43, color: "#1a7ab8" },
	{ name: "Perfil Tiroideo", pct: 35, color: "#0d5580" },
];

const VENDEDORES_MOCK = [
	{ name: "Ana García", amount: "$24,180", badge: "94 órdenes" },
	{ name: "Luis Martínez", amount: "$19,740", badge: "78 órdenes" },
	{ name: "María López", amount: "$16,320", badge: "63 órdenes" },
	{ name: "Carlos Ruiz", amount: "$14,080", badge: "52 órdenes" },
];

const BARS_DATA = [
	3200, 4100, 2800, 5600, 4900, 3700, 6200, 5100, 4400, 7800, 6600, 5300, 4800, 3900,
	5700, 6400, 5900, 4200, 7100, 8400, 6800, 5500, 4600, 7300, 8900, 6100, 4700,
];
const MONTHS_LABELS = [
	"L",
	"M",
	"X",
	"J",
	"V",
	"S",
	"D",
	"L",
	"M",
	"X",
	"J",
	"V",
	"S",
	"D",
	"L",
	"M",
	"X",
	"J",
	"V",
	"S",
	"D",
	"L",
	"M",
	"X",
	"J",
	"V",
	"S",
];

const ReporteVentas = () => {
	const { user } = useAuth();
	const [fechaInicial, setFechaInicial] = useState(
		new Date().toISOString().split("T")[0],
	);
	const [fechaFinal, setFechaFinal] = useState(
		new Date().toISOString().split("T")[0],
	);
	const [sucursalSeleccionada, setSucursalSeleccionada] = useState("");
	const [vendedorSeleccionado, setVendedorSeleccionado] = useState("");
	const [formaPagoSeleccionada, setFormaPagoSeleccionada] = useState("");
	const [areaSeleccionada, setAreaSeleccionada] = useState("");
	const [buscarEstudio, setBuscarEstudio] = useState("");
	const [empresaSeleccionada, setEmpresaSeleccionada] = useState("");
	const [doctorSeleccionado, setDoctorSeleccionado] = useState("");
	const [periodoGrafica, setPeriodoGrafica] = useState("mes");
	const [empleadoData, setEmpleadoData] = useState(null);

	useEffect(() => {
		const fetchEmpleadoData = async () => {
			if (!user?.id) return;
			try {
				const { data: empleado, error } = await supabase
					.from("empleados")
					.select("nombre, rol")
					.eq("auth_uuid", user.id)
					.maybeSingle();
				if (!error && empleado) setEmpleadoData(empleado);
			} catch (error) {
				console.error("Error:", error);
			}
		};
		fetchEmpleadoData();
	}, [user]);

	const maxVal = Math.max(...BARS_DATA);

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
			<div className="rv-wrapper">
				{/* Header */}
				<div className="rv-header">
					<h1 className="rv-title">Reporte de Ventas</h1>
					<div className="rv-header-actions">
						<button className="rv-btn-sm" onClick={() => alert("Exportar a Excel")}>
							Excel
						</button>
						<button className="rv-btn-sm" onClick={() => alert("Exportar a PDF")}>
							PDF
						</button>
						<button className="rv-btn-sm accent" onClick={() => window.print()}>
							Imprimir
						</button>
					</div>
				</div>

				<div className="rv-body">
					{/* Métricas */}
					<div className="rv-metrics">
						<div className="rv-metric">
							<div className="rv-metric-label">Ventas del período</div>
							<div className="rv-metric-value">$84,320</div>
							<div className="rv-metric-sub up">
								<span className="rv-dot up"></span>+12.4% vs período anterior
							</div>
						</div>
						<div className="rv-metric">
							<div className="rv-metric-label">Órdenes</div>
							<div className="rv-metric-value">341</div>
							<div className="rv-metric-sub up">
								<span className="rv-dot up"></span>+8 nuevas hoy
							</div>
						</div>
						<div className="rv-metric">
							<div className="rv-metric-label">Ticket promedio</div>
							<div className="rv-metric-value">$247</div>
							<div className="rv-metric-sub down">
								<span className="rv-dot down"></span>-3.1% vs período anterior
							</div>
						</div>
						<div className="rv-metric">
							<div className="rv-metric-label">Adeudos pendientes</div>
							<div className="rv-metric-value">$6,180</div>
							<div className="rv-metric-sub down">
								<span className="rv-dot down"></span>18 pacientes con saldo
							</div>
						</div>
					</div>

					{/* Filtros */}
					<div className="rv-filters">
						<div className="rv-filter-title">Filtros de reporte</div>
						<div className="rv-filter-row">
							<div className="rv-filter-group">
								<label>Fecha inicial</label>
								<div className="rv-input-mock">
									<img src={calendarioIcono} alt="" className="rv-cal-icon" />
									<input
										type="date"
										value={fechaInicial}
										onChange={(e) => setFechaInicial(e.target.value)}
										className="rv-date-input"
									/>
								</div>
							</div>
							<div className="rv-filter-group">
								<label>Fecha final</label>
								<div className="rv-input-mock">
									<img src={calendarioIcono} alt="" className="rv-cal-icon" />
									<input
										type="date"
										value={fechaFinal}
										onChange={(e) => setFechaFinal(e.target.value)}
										className="rv-date-input"
									/>
								</div>
							</div>
							<div className="rv-divider-v"></div>
							<div className="rv-filter-group">
								<label>Sucursal</label>
								<select
									value={sucursalSeleccionada}
									onChange={(e) => setSucursalSeleccionada(e.target.value)}
									className="rv-select">
									<option value="">Todas</option>
									<option value="matriz">Matriz</option>
									<option value="sucursal1">Sucursal 1</option>
								</select>
							</div>
							<div className="rv-filter-group">
								<label>Vendedor</label>
								<select
									value={vendedorSeleccionado}
									onChange={(e) => setVendedorSeleccionado(e.target.value)}
									className="rv-select">
									<option value="">Todos</option>
									<option value="vendedor1">Vendedor 1</option>
								</select>
							</div>
							<div className="rv-filter-group">
								<label>Forma de pago</label>
								<select
									value={formaPagoSeleccionada}
									onChange={(e) => setFormaPagoSeleccionada(e.target.value)}
									className="rv-select">
									<option value="">Todas</option>
									<option value="efectivo">Efectivo</option>
									<option value="tarjeta">Tarjeta</option>
									<option value="transferencia">Transferencia</option>
								</select>
							</div>
							<div className="rv-filter-group">
								<label>Área</label>
								<select
									value={areaSeleccionada}
									onChange={(e) => setAreaSeleccionada(e.target.value)}
									className="rv-select">
									<option value="">Todas</option>
									<option value="laboratorio">Laboratorio</option>
									<option value="radiologia">Radiología</option>
								</select>
							</div>
							<div className="rv-filter-group">
								<label>Empresa</label>
								<select
									value={empresaSeleccionada}
									onChange={(e) => setEmpresaSeleccionada(e.target.value)}
									className="rv-select">
									<option value="">Todas</option>
									<option value="issste">ISSSTE</option>
									<option value="imss">IMSS</option>
								</select>
							</div>
							<div className="rv-filter-group">
								<label>Doctor</label>
								<select
									value={doctorSeleccionado}
									onChange={(e) => setDoctorSeleccionado(e.target.value)}
									className="rv-select">
									<option value="">Todos</option>
									<option value="doctor1">Doctor 1</option>
								</select>
							</div>
							<div className="rv-filter-group">
								<label>Estudio</label>
								<input
									type="text"
									placeholder="Buscar..."
									value={buscarEstudio}
									onChange={(e) => setBuscarEstudio(e.target.value)}
									className="rv-text-input"
								/>
							</div>
							<button
								className="rv-generar-btn"
								onClick={() => alert("Generando...")}>
								Generar
							</button>
						</div>

						{/* Botones de reporte */}
						<div className="rv-report-btns">
							<button
								className="rv-report-btn"
								onClick={() => alert("Reporte General")}>
								<span className="rv-report-icon">≡</span>
								Reporte General
							</button>
							<button
								className="rv-report-btn"
								onClick={() => alert("Reporte por Estudio")}>
								<span className="rv-report-icon">▦</span>
								Por Estudio
							</button>
							<button
								className="rv-report-btn"
								onClick={() => alert("Reporte Sumatoria")}>
								<span className="rv-report-icon">∑</span>
								Sumatoria
							</button>
						</div>
					</div>

					{/* Grid principal */}
					<div className="rv-main-grid">
						{/* Gráfica */}
						<div className="rv-chart-card">
							<div className="rv-chart-header">
								<div className="rv-chart-title">
									<img src={metricasIcono} alt="" className="rv-metrics-icon" />
									Ventas por día
								</div>
								<div className="rv-period-tabs">
									{["sem", "mes", "ano"].map((p) => (
										<button
											key={p}
											className={`rv-tab ${periodoGrafica === p ? "active" : ""}`}
											onClick={() => setPeriodoGrafica(p)}>
											{p === "sem" ? "Sem" : p === "mes" ? "Mes" : "Año"}
										</button>
									))}
								</div>
							</div>
							<div className="rv-chart-body">
								<div className="rv-y-axis">
									<span>$12k</span>
									<span>$8k</span>
									<span>$4k</span>
									<span>$0</span>
								</div>
								<div className="rv-bars-area">
									{BARS_DATA.map((v, i) => (
										<div key={i} className="rv-bar-wrap">
											<div
												className={`rv-bar ${i === BARS_DATA.length - 5 ? "highlight" : ""}`}
												style={{ height: `${Math.round((v / maxVal) * 100)}%` }}
											/>
											<span className="rv-bar-label">{MONTHS_LABELS[i]}</span>
										</div>
									))}
								</div>
							</div>
						</div>

						{/* Panel lateral */}
						<div className="rv-side-col">
							<div className="rv-side-card">
								<div className="rv-side-title">Estudios más vendidos</div>
								{PRODUCTOS_MOCK.map((p, i) => (
									<div key={i} className="rv-product-row">
										<span
											className="rv-prod-dot"
											style={{ background: p.color }}></span>
										<span className="rv-prod-name">{p.name}</span>
										<div className="rv-prod-bar-wrap">
											<div
												className="rv-prod-bar-fill"
												style={{ width: `${p.pct}%`, background: p.color }}></div>
										</div>
										<span className="rv-prod-pct">{p.pct}%</span>
									</div>
								))}
							</div>
							<div className="rv-side-card">
								<div className="rv-side-title">Ventas por vendedor</div>
								{VENDEDORES_MOCK.map((v, i) => (
									<div key={i} className="rv-vendedor-row">
										<div>
											<div className="rv-vendedor-name">{v.name}</div>
											<div className="rv-vendedor-badge">{v.badge}</div>
										</div>
										<div className="rv-vendedor-amount">{v.amount}</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		</PageLayout>
	);
};

export default ReporteVentas;
