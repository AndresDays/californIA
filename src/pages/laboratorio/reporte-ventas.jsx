import { useEffect, useMemo, useState } from "react";
import calendarioIcono from "../../assets/calendarioIcono.png";
import metricasIcono from "../../assets/metricasIcono.png";
import PageLayout from "../../components/page-layout.jsx";
import ModalNotificacion from "../../components/ModalNotificacion";
import { useAuth } from "../../context/auth-context";
import { supabase } from "../../lib/supabase-client";
import { registrarAbonoVenta } from "../../utils/abono-venta";
import {
	esPagoConTarjeta,
	normalizarCodigoAprobacion,
	normalizarUltimos4,
} from "../../utils/pago-tarjeta";
import { useEmpleadoActual } from "../../hooks/use-empleado-actual";
import { useCatalogosReporte, useReporteVentas } from "../../hooks/use-reporte-ventas";
import { useBusquedaPersistente } from "../../hooks/use-busqueda-persistente";
import { useFechaPersistente } from "../../hooks/use-fecha-persistente";
import {
	agruparEstudiosVendidos,
	agruparVentasPorDia,
	agruparVentasPorVendedor,
	calcularMetricasVentas,
	calcularSaldoVentaReporte,
	filtrarVentasReporte,
	formatoMonedaReporte,
	GRUPOS_REPORTE_POR_AREA,
	obtenerIdSucursalVenta,
	partirVentasPorArea,
	SIN_SUCURSAL_REPORTE,
} from "../../utils/reporte-ventas";
import { exportarExcel, exportarPDF } from "../../utils/exportar-tabla";
import {
	COLUMNAS_TABLA_VENTAS,
	copiarTextoAlPortapapeles,
	filaTablaVenta,
	tablaVentasComoTexto,
} from "../../utils/tabla-reporte-ventas";
import "./reporte-ventas.css";

const hoyMexico = () =>
	new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

const inicioMesMexico = () => {
	const fecha = new Date(`${hoyMexico()}T00:00:00`);
	fecha.setDate(1);
	return fecha.toISOString().split("T")[0];
};

const ReporteVentas = () => {
	const [fechaInicial, setFechaInicial] = useFechaPersistente("reporte-ventas:inicio", inicioMesMexico());
	const [fechaFinal, setFechaFinal] = useFechaPersistente("reporte-ventas:fin", hoyMexico());
	const [sucursalSeleccionada, setSucursalSeleccionada] = useState("");
	const [vendedorSeleccionado, setVendedorSeleccionado] = useState("");
	const [formaPagoSeleccionada, setFormaPagoSeleccionada] = useState("");
	const [areaSeleccionada, setAreaSeleccionada] = useState("");
	const [buscarEstudio, setBuscarEstudio] = useBusquedaPersistente("reporte-ventas:estudio");
	const [empresaSeleccionada, setEmpresaSeleccionada] = useState("");
	const [doctorSeleccionado, setDoctorSeleccionado] = useState("");
	const [periodoGrafica, setPeriodoGrafica] = useState("mes");
	const [tipoReporte, setTipoReporte] = useState("general");
	const [areaSalidaSeleccionada, setAreaSalidaSeleccionada] = useState("laboratorio");
	const [ventaDetalle, setVentaDetalle] = useState(null);
	const [montoAbono, setMontoAbono] = useState("");
	const [formaPagoAbono, setFormaPagoAbono] = useState("efectivo");
	const [ultimos4Abono, setUltimos4Abono] = useState("");
	const [codigoAprobacionAbono, setCodigoAprobacionAbono] = useState("");
	const [cobrandoAdeudo, setCobrandoAdeudo] = useState(false);
	const [notificacion, setNotificacion] = useState({ isOpen: false, mensaje: "", tipo: "exito" });
	const { empleadoData, formatRol, getPrimerNombre } = useEmpleadoActual();
	const { user } = useAuth();

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
	const empresas   = catalogos?.empresas   ?? [];

	const errorReporte = errorQuery?.message ?? "";

	// Las ventas guardadas antes de que el reporte trajera la relación con
	// doctores sólo tienen el id, así que se resuelve con el catálogo.
	const doctorPorId = useMemo(
		() => new Map(doctores.map((doctor) => [String(doctor.id_doctor), doctor.nombre])),
		[doctores],
	);

	const nombreDoctorVenta = (venta) =>
		venta?.doctores?.nombre || doctorPorId.get(String(venta?.id_doctor || "")) || "-";

	const empresaPorId = useMemo(
		() => new Map(empresas.map((empresa) => [String(empresa.id_empresa), empresa.nombre])),
		[empresas],
	);

	const nombreEmpresaVenta = (venta) =>
		venta?.empresas?.nombre || empresaPorId.get(String(venta?.id_empresa || "")) || "-";

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
	const ventasPorArea = useMemo(
		() => {
			const estudioBuscado = buscarEstudio.trim().toLowerCase();
			return Object.fromEntries(
				Object.entries(partirVentasPorArea(ventasFiltradas)).map(([grupo, ventasGrupo]) => [
					grupo,
					ventasGrupo.filter((venta) => {
						if (
							areaSeleccionada &&
							!venta.estudios_venta?.some((estudio) => estudio.area === areaSeleccionada)
						) return false;
						if (
							estudioBuscado &&
							!venta.estudios_venta?.some((estudio) =>
								[estudio.clave_estudio, estudio.descripcion_estudio]
									.filter(Boolean)
									.join(" ")
									.toLowerCase()
									.includes(estudioBuscado),
							)
						) return false;
						return true;
					}),
				]),
			);
		},
		[ventasFiltradas, areaSeleccionada, buscarEstudio],
	);

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

	// Excel y PDF salen con las mismas columnas que se ven en pantalla.
	const colsVentas = COLUMNAS_TABLA_VENTAS;
	const filasVentas = (ventasAExportar) =>
		ventasAExportar.map((venta) => filaTablaVenta(venta, { nombreDoctor: nombreDoctorVenta }));

	const descargarExcel = () => {
		GRUPOS_REPORTE_POR_AREA.filter((grupo) => grupo.id === areaSalidaSeleccionada).forEach((grupo) => {
			const ventasGrupo = ventasPorArea[grupo.id] || [];
			if (ventasGrupo.length === 0) return;
			exportarExcel(
				colsVentas,
				filasVentas(ventasGrupo),
				`reporte-ventas-${fechaInicial}-${fechaFinal}-${grupo.archivo}`,
			);
		});
	};

	const descargarPDF = () => {
		GRUPOS_REPORTE_POR_AREA.filter((grupo) => grupo.id === areaSalidaSeleccionada).forEach((grupo) => {
			const ventasGrupo = ventasPorArea[grupo.id] || [];
			if (ventasGrupo.length === 0) return;
			exportarPDF(
				`Reporte de Ventas ${fechaInicial} – ${fechaFinal} — ${grupo.nombre}`,
				colsVentas,
				filasVentas(ventasGrupo),
				`reporte-ventas-${fechaInicial}-${fechaFinal}-${grupo.archivo}`,
			);
		});
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
							{COLUMNAS_TABLA_VENTAS.map((columna) => (
								<th key={columna}>{columna}</th>
							))}
						</tr>
					</thead>
					<tbody>
						{ventasFiltradas.map((venta) => {
							// El folio se pinta como botón para abrir el detalle; el resto del
							// renglón sale de la misma definición que se copia y se exporta.
							const [, ...celdas] = filaTablaVenta(venta, { nombreDoctor: nombreDoctorVenta });
							return (
								<tr key={venta.id_venta}>
									<td>
										<button
											type="button"
											className="rv-folio-link"
											onClick={() => setVentaDetalle(venta)}
											title="Ver detalle del folio">
											{venta.folio}
										</button>
									</td>
									{celdas.map((celda, indice) => (
										<td key={COLUMNAS_TABLA_VENTAS[indice + 1]}>{celda}</td>
									))}
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		);
	};

	const saldoVentaDetalle = ventaDetalle
		? calcularSaldoVentaReporte(ventaDetalle)
		: 0;

	// Al abrir un folio el cobro arranca con el adeudo completo, que es lo que
	// se cobra la mayoría de las veces.
	useEffect(() => {
		if (!ventaDetalle) return;
		const saldo = calcularSaldoVentaReporte(ventaDetalle);
		setMontoAbono(saldo > 0 ? String(saldo) : "");
		setFormaPagoAbono(ventaDetalle.forma_pago || "efectivo");
		setUltimos4Abono("");
		setCodigoAprobacionAbono("");
	}, [ventaDetalle]);

	const mostrarNotificacion = (mensaje, tipo = "exito") =>
		setNotificacion({ isOpen: true, mensaje, tipo });

	// Seleccionar la tabla con el mouse deja fuera el folio, que es un botón, y
	// arrastra los saltos de renglón: se copia con tabuladores para que al pegar
	// en Excel cada dato caiga en su celda.
	const copiarTabla = async () => {
		const texto = tablaVentasComoTexto(ventasFiltradas, { nombreDoctor: nombreDoctorVenta });
		const copiado = await copiarTextoAlPortapapeles(texto);
		mostrarNotificacion(
			copiado
				? `Se copiaron ${ventasFiltradas.length} renglones al portapapeles`
				: "No se pudo copiar la tabla",
			copiado ? "exito" : "error",
		);
	};

	const cobrarAdeudo = async () => {
		if (!ventaDetalle) return;
		setCobrandoAdeudo(true);
		try {
			const { pagoRecibido, adeudo } = await registrarAbonoVenta(supabase, {
				venta: ventaDetalle,
				monto: montoAbono,
				formaPago: formaPagoAbono,
				ultimos4: ultimos4Abono,
				codigoAprobacion: codigoAprobacionAbono,
				motivo: "Cobro de adeudo desde el reporte de ventas",
				empleado: empleadoData,
				user,
			});
			mostrarNotificacion(
				adeudo > 0
					? `Abono registrado. Adeudo restante ${formatoMonedaReporte(adeudo)}`
					: "Adeudo liquidado correctamente",
			);
			// El folio abierto refleja el cobro sin esperar a que vuelva la consulta.
			setVentaDetalle((actual) =>
				actual ? { ...actual, pago_recibido: pagoRecibido, forma_pago: formaPagoAbono } : actual,
			);
			await refrescarVentas();
		} catch (error) {
			console.error("Error al cobrar el adeudo:", error);
			mostrarNotificacion(error.message || "No se pudo registrar el cobro", "advertencia");
		} finally {
			setCobrandoAdeudo(false);
		}
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
						<select value={areaSalidaSeleccionada} onChange={(e) => setAreaSalidaSeleccionada(e.target.value)} className="rv-btn-sm">
							{GRUPOS_REPORTE_POR_AREA.map((grupo) => <option key={grupo.id} value={grupo.id}>{grupo.nombre}</option>)}
						</select>
						<button className="rv-btn-sm" onClick={copiarTabla}>
							Copiar tabla
						</button>
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

			{ventaDetalle && (
				<div className="rv-modal-overlay" onClick={() => setVentaDetalle(null)}>
					<div className="rv-modal" onClick={(evento) => evento.stopPropagation()}>
						<div className="rv-modal-header">
							<div>
								<h2>Detalle del folio</h2>
								<p>
									{new Date(ventaDetalle.fecha_venta).toLocaleString("es-MX")} ·{" "}
									{ventaDetalle.empleados?.nombre || "Sin vendedor"}
								</p>
							</div>
							<button
								className="rv-modal-close"
								onClick={() => setVentaDetalle(null)}
								aria-label="Cerrar">
								×
							</button>
						</div>

						<div className="rv-modal-summary">
							<div>
								<span>Folio</span>
								<strong>{ventaDetalle.folio || "-"}</strong>
							</div>
							<div>
								<span>Paciente</span>
								<strong>{ventaDetalle.pacientes?.nombre || "Sin paciente"}</strong>
							</div>
							<div>
								<span>Total</span>
								<strong>{formatoMonedaReporte(ventaDetalle.total)}</strong>
							</div>
						</div>

						<div className="rv-modal-cuerpo">
						<div className="rv-modal-grid">
							<div><span>Celular</span><strong>{ventaDetalle.pacientes?.telefono || "-"}</strong></div>
							<div><span>Correo</span><strong>{ventaDetalle.pacientes?.email || "-"}</strong></div>
							<div><span>Edad</span><strong>{ventaDetalle.pacientes?.edad ? `${ventaDetalle.pacientes.edad} años` : "-"}</strong></div>
							<div><span>Sexo</span><strong>{ventaDetalle.pacientes?.sexo || "-"}</strong></div>
							<div><span>Empresa</span><strong>{nombreEmpresaVenta(ventaDetalle)}</strong></div>
							<div><span>Cliente</span><strong>{ventaDetalle.clientes?.nombre || "Particular"}</strong></div>
							<div><span>Doctor</span><strong>{nombreDoctorVenta(ventaDetalle)}</strong></div>
							<div><span>Sucursal</span><strong>{ventaDetalle.sucursal || ventaDetalle.citas?.sucursales?.nombre || "Sin sucursal"}</strong></div>
							<div><span>Vendedor</span><strong>{ventaDetalle.empleados?.nombre || "-"}</strong></div>
							<div><span>Forma de pago</span><strong>{ventaDetalle.forma_pago || "-"}</strong></div>
							<div><span>Subtotal</span><strong>{formatoMonedaReporte(ventaDetalle.subtotal)}</strong></div>
							<div><span>Descuento</span><strong>{formatoMonedaReporte(ventaDetalle.descuento)}</strong></div>
							<div><span>Pagado</span><strong>{formatoMonedaReporte(ventaDetalle.pago_recibido)}</strong></div>
							<div><span>Cambio</span><strong>{formatoMonedaReporte(ventaDetalle.cambio)}</strong></div>
							<div><span>Adeudo</span><strong>{formatoMonedaReporte(calcularSaldoVentaReporte(ventaDetalle))}</strong></div>
						</div>

						{saldoVentaDetalle > 0 ? (
							<div className="rv-modal-cobro">
								<h3>Cobrar adeudo</h3>
								<p className="rv-cobro-saldo">
									Adeudo actual: <strong>{formatoMonedaReporte(saldoVentaDetalle)}</strong>
								</p>
								<div className="rv-cobro-campos">
									<label>
										<span>Monto</span>
										<input
											type="number"
											min="0"
											step="0.01"
											value={montoAbono}
											onChange={(evento) => setMontoAbono(evento.target.value)}
											disabled={cobrandoAdeudo}
										/>
									</label>
									<label>
										<span>Forma de pago</span>
										<select
											value={formaPagoAbono}
											onChange={(evento) => setFormaPagoAbono(evento.target.value)}
											disabled={cobrandoAdeudo}>
											<option value="efectivo">Efectivo</option>
											<option value="tarjeta_debito">Tarjeta Débito</option>
											<option value="tarjeta_credito">Tarjeta Crédito</option>
											<option value="transferencia">Transferencia</option>
										</select>
									</label>
									{esPagoConTarjeta(formaPagoAbono) && (
										<>
											<label>
												<span>Últimos 4</span>
												<input
													type="text"
													inputMode="numeric"
													maxLength={4}
													value={ultimos4Abono}
													onChange={(evento) =>
														setUltimos4Abono(normalizarUltimos4(evento.target.value))
													}
													disabled={cobrandoAdeudo}
													placeholder="1234"
												/>
											</label>
											<label>
												<span>Cód. aprobación</span>
												<input
													type="text"
													maxLength={12}
													value={codigoAprobacionAbono}
													onChange={(evento) =>
														setCodigoAprobacionAbono(
															normalizarCodigoAprobacion(evento.target.value),
														)
													}
													disabled={cobrandoAdeudo}
													placeholder="A1B2C3"
												/>
											</label>
										</>
									)}
								</div>
								<div className="rv-cobro-acciones">
									<button
										type="button"
										className="rv-btn-sm"
										onClick={() => setMontoAbono(String(saldoVentaDetalle))}
										disabled={cobrandoAdeudo}>
										Liquidar todo
									</button>
									<button
										type="button"
										className="rv-btn-cobrar"
										onClick={cobrarAdeudo}
										disabled={cobrandoAdeudo}>
										{cobrandoAdeudo ? "Registrando..." : "Registrar cobro"}
									</button>
								</div>
							</div>
						) : (
							<div className="rv-modal-cobro rv-modal-cobro-liquidado">
								Este folio no tiene adeudo pendiente.
							</div>
						)}

						{ventaDetalle.observaciones && (
							<div className="rv-modal-observaciones">
								<span>Observaciones</span>
								<p>{ventaDetalle.observaciones}</p>
							</div>
						)}

						<div className="rv-modal-estudios">
							<h3>Estudios</h3>
							{(ventaDetalle.estudios_venta || []).length === 0 ? (
								<p>Este folio no tiene estudios registrados.</p>
							) : (
								<table>
									<thead>
										<tr>
											<th>Clave</th>
											<th>Estudio</th>
											<th>Área</th>
											<th>Precio</th>
										</tr>
									</thead>
									<tbody>
										{(ventaDetalle.estudios_venta || []).map((estudio) => (
											<tr key={estudio.id_estudio_venta || estudio.clave_estudio}>
												<td>{estudio.clave_estudio || "-"}</td>
												<td>{estudio.descripcion_estudio || "-"}</td>
												<td>{estudio.area || "-"}</td>
												<td>{formatoMonedaReporte(estudio.precio)}</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
						</div>
						</div>
					</div>
				</div>
			)}

			<ModalNotificacion
				isOpen={notificacion.isOpen}
				onClose={() => setNotificacion((actual) => ({ ...actual, isOpen: false }))}
				mensaje={notificacion.mensaje}
				tipo={notificacion.tipo}
			/>
		</PageLayout>
	);
};

export default ReporteVentas;
