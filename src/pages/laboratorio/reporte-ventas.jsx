import { useMemo, useState } from "react";
import calendarioIcono from "../../assets/calendarioIcono.png";
import metricasIcono from "../../assets/metricasIcono.png";
import PageLayout from "../../components/page-layout.jsx";
import { useAuth } from "../../context/auth-context";
import { useCatalogosReporte, useReporteVentas } from "../../hooks/use-reporte-ventas";
import {
	agruparEstudiosVendidos,
	agruparVentasPorDia,
	agruparVentasPorVendedor,
	calcularMetricasVentas,
	calcularSaldoVentaReporte,
	filtrarVentasReporte,
	formatoMonedaReporte,
	obtenerIdSucursalVenta,
	SIN_SUCURSAL_REPORTE,
} from "../../utils/reporte-ventas";
import { exportarExcel, exportarPDF } from "../../utils/exportar-tabla";
import "./reporte-ventas.css";

const hoyMexico = () =>
	new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

const inicioMesMexico = () => {
	const fecha = new Date(`${hoyMexico()}T00:00:00`);
	fecha.setDate(1);
	return fecha.toISOString().split("T")[0];
};

const ReporteVentas = () => {
	const [fechaInicial, setFechaInicial] = useState(inicioMesMexico());
	const [fechaFinal, setFechaFinal] = useState(hoyMexico());
	const [sucursalSeleccionada, setSucursalSeleccionada] = useState("");
	const [vendedorSeleccionado, setVendedorSeleccionado] = useState("");
	const [formaPagoSeleccionada, setFormaPagoSeleccionada] = useState("");
	const [areaSeleccionada, setAreaSeleccionada] = useState("");
	const [buscarEstudio, setBuscarEstudio] = useState("");
	const [empresaSeleccionada, setEmpresaSeleccionada] = useState("");
	const [doctorSeleccionado, setDoctorSeleccionado] = useState("");
	const [periodoGrafica, setPeriodoGrafica] = useState("mes");
	const [tipoReporte, setTipoReporte] = useState("general");
	const { empleadoData } = useAuth();

	const {
		data: ventas = [],
		isLoading: cargando,
		error: errorQuery,
		refetch: refrescarVentas,
	} = useReporteVentas({ fechaInicial, fechaFinal });

	const { data: catalogos } = useCatalogosReporte();
	const sucursales = catalogos?.sucursales ?? [];
	const vendedores = catalogos?.vendedores ?? [];
	const clientes   = catalogos?.clientes   ?? [];
	const doctores   = catalogos?.doctores   ?? [];
	const areas      = catalogos?.areas      ?? [];

	const errorReporte = errorQuery?.message ?? "";

	const ventasFiltradas = useMemo(
		() =>
			filtrarVentasReporte(ventas, {
				sucursal: sucursalSeleccionada,
				vendedor: vendedorSeleccionado,
				formaPago: formaPagoSeleccionada,
				area: areaSeleccionada,
				cliente: empresaSeleccionada,
				doctor: doctorSeleccionado,
				estudio: buscarEstudio,
			}),
		[
			ventas,
			sucursalSeleccionada,
			vendedorSeleccionado,
			formaPagoSeleccionada,
			areaSeleccionada,
			empresaSeleccionada,
			doctorSeleccionado,
			buscarEstudio,
		],
	);

	const metricas = useMemo(
		() => calcularMetricasVentas(ventasFiltradas),
		[ventasFiltradas],
	);
	const ventasPorDia = useMemo(
		() => agruparVentasPorDia(ventasFiltradas),
		[ventasFiltradas],
	);
	const estudiosTop = useMemo(
		() => agruparEstudiosVendidos(ventasFiltradas),
		[ventasFiltradas],
	);
	const ventasPorVendedor = useMemo(
		() => agruparVentasPorVendedor(ventasFiltradas),
		[ventasFiltradas],
	);
	const ventasSinSucursal = useMemo(
		() => ventas.filter((venta) => !obtenerIdSucursalVenta(venta)).length,
		[ventas],
	);
	const maxVal = Math.max(...ventasPorDia.map((item) => item.total), 1);

	const setPeriodo = (periodo) => {
		setPeriodoGrafica(periodo);
		const fin = new Date(`${hoyMexico()}T00:00:00`);
		const inicio = new Date(fin);
		if (periodo === "sem") inicio.setDate(fin.getDate() - 6);
		if (periodo === "mes") inicio.setDate(1);
		if (periodo === "ano") {
			inicio.setMonth(0);
			inicio.setDate(1);
		}
		setFechaInicial(inicio.toISOString().split("T")[0]);
		setFechaFinal(fin.toISOString().split("T")[0]);
	};

	const colsVentas = ["Folio", "Fecha", "Paciente", "Estudios", "Vendedor", "Forma Pago", "Total", "Pagado", "Saldo", "Sucursal"];
	const filasVentas = () =>
		ventasFiltradas.map((v) => {
			const saldo = calcularSaldoVentaReporte(v);
			return [
				v.folio || v.id_venta || "",
				v.fecha_venta ? new Date(v.fecha_venta).toLocaleDateString("es-MX") : "",
				v.pacientes?.nombre || v.nombre_paciente || "",
				(v.estudios_venta || []).map((e) => e.descripcion_estudio || e.clave_estudio).join(", "),
				v.actor_nombre || v.empleado_nombre || "",
				v.forma_pago || "",
				`$${Number(v.total || 0).toFixed(2)}`,
				`$${Number(v.pago_recibido || 0).toFixed(2)}`,
				`$${Number(saldo || 0).toFixed(2)}`,
				v.sucursal || v.sucursales?.nombre || "",
			];
		});

	const descargarExcel = () => {
		exportarExcel(colsVentas, filasVentas(), `reporte-ventas-${fechaInicial}-${fechaFinal}`);
	};

	const descargarPDF = () => {
		exportarPDF(
			`Reporte de Ventas  ${fechaInicial} – ${fechaFinal}`,
			colsVentas,
			filasVentas(),
			`reporte-ventas-${fechaInicial}-${fechaFinal}`,
		);
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

	const renderReporte = () => {
		if (cargando) return <div className="rv-empty-state">Cargando reporte...</div>;
		if (ventasFiltradas.length === 0) {
			return <div className="rv-empty-state">No hay ventas para los filtros seleccionados.</div>;
		}

		if (tipoReporte === "estudio") {
			return (
				<div className="rv-table-wrap">
					<table className="rv-table">
						<thead>
							<tr>
								<th>Estudio</th>
								<th>Órdenes</th>
								<th>Total</th>
							</tr>
						</thead>
						<tbody>
							{estudiosTop.map((estudio) => (
								<tr key={estudio.name}>
									<td>{estudio.name}</td>
									<td>{estudio.count}</td>
									<td>{formatoMonedaReporte(estudio.total)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			);
		}

		if (tipoReporte === "sumatoria") {
			return (
				<div className="rv-table-wrap">
					<table className="rv-table">
						<thead>
							<tr>
								<th>Concepto</th>
								<th>Órdenes</th>
								<th>Total</th>
							</tr>
						</thead>
						<tbody>
							{ventasPorVendedor.map((vendedor) => (
								<tr key={vendedor.name}>
									<td>{vendedor.name}</td>
									<td>{vendedor.orders}</td>
									<td>{formatoMonedaReporte(vendedor.amount)}</td>
								</tr>
							))}
							<tr>
								<td>Todos los vendedores</td>
								<td>{metricas.ordenes}</td>
								<td>{formatoMonedaReporte(metricas.totalVentas)}</td>
							</tr>
						</tbody>
					</table>
				</div>
			);
		}

		return (
			<div className="rv-table-wrap">
				<table className="rv-table">
					<thead>
						<tr>
							<th>Folio</th>
							<th>Fecha</th>
							<th>Paciente</th>
							<th>Cliente</th>
							<th>Sucursal</th>
							<th>Pago</th>
							<th>Total</th>
							<th>Adeudo</th>
						</tr>
					</thead>
					<tbody>
						{ventasFiltradas.map((venta) => (
							<tr key={venta.id_venta}>
								<td>{venta.folio}</td>
								<td>{new Date(venta.fecha_venta).toLocaleDateString("es-MX")}</td>
								<td>{venta.pacientes?.nombre || "Sin paciente"}</td>
								<td>{venta.clientes?.nombre || "Particular"}</td>
								<td>{venta.sucursal || venta.citas?.sucursales?.nombre || "Sin sucursal"}</td>
								<td>{venta.forma_pago || "-"}</td>
								<td>{formatoMonedaReporte(venta.total)}</td>
								<td>{formatoMonedaReporte(calcularSaldoVentaReporte(venta))}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		);
	};

	return (
		<PageLayout
			empleadoData={empleadoData}
			formatRol={formatRol}
			getPrimerNombre={getPrimerNombre}>
			<div className="rv-wrapper">
				<div className="rv-header">
					<h1 className="rv-title">Reporte de Ventas</h1>
					<div className="rv-header-actions">
						<button className="rv-btn-sm" onClick={descargarExcel}>
							Excel
						</button>
						<button className="rv-btn-sm" onClick={descargarPDF}>
							PDF
						</button>
						<button className="rv-btn-sm accent" onClick={() => window.print()}>
							Imprimir
						</button>
					</div>
				</div>

				<div className="rv-body">
					{errorReporte && <div className="rv-error">{errorReporte}</div>}

					<div className="rv-metrics">
						<div className="rv-metric">
							<div className="rv-metric-label">Ventas del período</div>
							<div className="rv-metric-value">
								{formatoMonedaReporte(metricas.totalVentas)}
							</div>
							<div className="rv-metric-sub up">
								<span className="rv-dot up"></span>
								{ventasFiltradas.length} ventas filtradas
							</div>
						</div>
						<div className="rv-metric">
							<div className="rv-metric-label">Órdenes</div>
							<div className="rv-metric-value">{metricas.ordenes}</div>
							<div className="rv-metric-sub up">
								<span className="rv-dot up"></span>
								{ventas.length} ventas cargadas
							</div>
						</div>
						<div className="rv-metric">
							<div className="rv-metric-label">Ticket promedio</div>
							<div className="rv-metric-value">
								{formatoMonedaReporte(metricas.ticketPromedio)}
							</div>
							<div className="rv-metric-sub up">
								<span className="rv-dot up"></span>
								Promedio del filtro actual
							</div>
						</div>
						<div className="rv-metric">
							<div className="rv-metric-label">Adeudos pendientes</div>
							<div className="rv-metric-value">
								{formatoMonedaReporte(metricas.adeudosPendientes)}
							</div>
							<div className="rv-metric-sub down">
								<span className="rv-dot down"></span>
								{metricas.pacientesConSaldo} ventas con saldo
							</div>
						</div>
					</div>

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
									{sucursales.map((sucursal) => (
										<option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>
											{sucursal.nombre}
										</option>
									))}
									{ventasSinSucursal > 0 && (
										<option value={SIN_SUCURSAL_REPORTE}>
											Sin sucursal ({ventasSinSucursal})
										</option>
									)}
								</select>
							</div>
							<div className="rv-filter-group">
								<label>Vendedor</label>
								<select
									value={vendedorSeleccionado}
									onChange={(e) => setVendedorSeleccionado(e.target.value)}
									className="rv-select">
									<option value="">Todos</option>
									{vendedores.map((vendedor) => (
										<option key={vendedor.id_empleado} value={vendedor.id_empleado}>
											{vendedor.nombre}
										</option>
									))}
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
									{areas.map((area) => (
										<option key={area.id_area} value={area.nombre}>
											{area.nombre}
										</option>
									))}
								</select>
							</div>
							<div className="rv-filter-group">
								<label>Cliente</label>
								<select
									value={empresaSeleccionada}
									onChange={(e) => setEmpresaSeleccionada(e.target.value)}
									className="rv-select">
									<option value="">Todos</option>
									{clientes.map((cliente) => (
										<option key={cliente.id_cliente} value={cliente.id_cliente}>
											{cliente.nombre}
										</option>
									))}
								</select>
							</div>
							<div className="rv-filter-group">
								<label>Doctor</label>
								<select
									value={doctorSeleccionado}
									onChange={(e) => setDoctorSeleccionado(e.target.value)}
									className="rv-select">
									<option value="">Todos</option>
									{doctores.map((doctor) => {
										const idDoctor = doctor.id_doctor || doctor.id_empleado;
										return (
											<option key={idDoctor} value={idDoctor}>
												{doctor.nombre}
											</option>
										);
									})}
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
							<button className="rv-generar-btn" onClick={refrescarVentas}>
								Generar
							</button>
						</div>

						<div className="rv-report-btns">
							<button
								className={`rv-report-btn ${tipoReporte === "general" ? "active" : ""}`}
								onClick={() => setTipoReporte("general")}>
								<span className="rv-report-icon">≡</span>
								Reporte General
							</button>
							<button
								className={`rv-report-btn ${tipoReporte === "estudio" ? "active" : ""}`}
								onClick={() => setTipoReporte("estudio")}>
								<span className="rv-report-icon">▦</span>
								Por Estudio
							</button>
							<button
								className={`rv-report-btn ${tipoReporte === "sumatoria" ? "active" : ""}`}
								onClick={() => setTipoReporte("sumatoria")}>
								<span className="rv-report-icon">∑</span>
								Sumatoria
							</button>
						</div>
					</div>

					<div className="rv-main-grid">
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
											onClick={() => setPeriodo(p)}>
											{p === "sem" ? "Sem" : p === "mes" ? "Mes" : "Año"}
										</button>
									))}
								</div>
							</div>
							<div className="rv-chart-body">
								<div className="rv-y-axis">
									<span>{formatoMonedaReporte(maxVal)}</span>
									<span>{formatoMonedaReporte(maxVal / 2)}</span>
									<span>$0</span>
								</div>
								<div className="rv-bars-area">
									{ventasPorDia.map((item) => (
										<div key={item.label} className="rv-bar-wrap">
											<div
												className="rv-bar highlight"
												style={{ height: `${Math.max((item.total / maxVal) * 100, 4)}%` }}
												title={formatoMonedaReporte(item.total)}
											/>
											<span className="rv-bar-label">{item.label}</span>
										</div>
									))}
									{ventasPorDia.length === 0 && (
										<div className="rv-empty-chart">Sin ventas para graficar</div>
									)}
								</div>
							</div>
							{renderReporte()}
						</div>

						<div className="rv-side-col">
							<div className="rv-side-card">
								<div className="rv-side-title">Estudios más vendidos</div>
								{estudiosTop.map((p) => (
									<div key={p.name} className="rv-product-row">
										<span className="rv-prod-dot" style={{ background: p.color }}></span>
										<span className="rv-prod-name">{p.name}</span>
										<div className="rv-prod-bar-wrap">
											<div
												className="rv-prod-bar-fill"
												style={{ width: `${p.pct}%`, background: p.color }}></div>
										</div>
										<span className="rv-prod-pct">{p.count}</span>
									</div>
								))}
								{estudiosTop.length === 0 && (
									<div className="rv-empty-state small">Sin estudios</div>
								)}
							</div>
							<div className="rv-side-card">
								<div className="rv-side-title">Ventas por vendedor</div>
								{ventasPorVendedor.map((v) => (
									<div key={v.name} className="rv-vendedor-row">
										<div>
											<div className="rv-vendedor-name">{v.name}</div>
											<div className="rv-vendedor-badge">{v.orders} órdenes</div>
										</div>
										<div className="rv-vendedor-amount">
											{formatoMonedaReporte(v.amount)}
										</div>
									</div>
								))}
								{ventasPorVendedor.length === 0 && (
									<div className="rv-empty-state small">Sin vendedores</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</PageLayout>
	);
};

export default ReporteVentas;
