import { useEffect, useMemo, useState } from "react";
import calendarioIcono from "../../assets/calendarioIcono.png";
import PageLayout from "../../components/page-layout.jsx";
import { useAuth } from "../../context/auth-context";
import { useCatalogosReporte, useReporteVentas } from "../../hooks/use-reporte-ventas";
import { useFechaPersistente } from "../../hooks/use-fecha-persistente";
import { supabase } from "../../lib/supabase-client";
import {
	construirCortesDesdeTransacciones,
	construirCortesEmpleados,
	construirTransaccionesCorte,
	construirTransaccionesCortePorArea,
} from "../../utils/cortes-admin";
import { GRUPOS_REPORTE_POR_AREA } from "../../utils/reporte-ventas";
import { construirDocumentoCortes } from "../../utils/cortes-dia-print";
import {
	formatearMontoCajaPorForma,
	limitarMontoCajaADosDecimales,
} from "../../utils/cierre-caja";
import { normalizarRolPermisos } from "../../utils/role-permissions";
import { crearRangoFechaMexico } from "../../utils/fecha-mexico";
import "./cortes-dia.css";

const hoyMexico = () =>
	new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

const formatoMoneda = (valor) =>
	`$${limitarMontoCajaADosDecimales(valor).toLocaleString("es-MX", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;

const formatoHora = (fecha) => {
	const date = new Date(fecha);
	if (Number.isNaN(date.getTime())) return "--:--";
	return date.toLocaleTimeString("es-MX", {
		hour: "2-digit",
		minute: "2-digit",
	});
};

const puedeVerCortes = (rol) =>
	["admin", "administrador", "desarrollador"].includes(normalizarRolPermisos(rol));

const CortesDia = () => {
	const { user, empleadoData, loading, empleadoLoading } = useAuth();
	const [fecha, setFecha] = useFechaPersistente("cortes-dia", hoyMexico());
	const [sucursalSeleccionada, setSucursalSeleccionada] = useState("");
	const [formaPagoSeleccionada, setFormaPagoSeleccionada] = useState("");
	const [areaImpresionSeleccionada, setAreaImpresionSeleccionada] = useState("laboratorio");
	const [movimientos, setMovimientos] = useState([]);
	const [cargandoMovimientos, setCargandoMovimientos] = useState(false);
	const [errorMovimientos, setErrorMovimientos] = useState("");
	const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState("");
	const [transaccionDetalle, setTransaccionDetalle] = useState(null);

	const { data: ventas = [], isLoading: cargandoVentas } = useReporteVentas({
		fechaInicial: fecha,
		fechaFinal: fecha,
	});
	const { data: catalogos } = useCatalogosReporte();
	const sucursales = catalogos?.sucursales ?? [];
	const doctores = catalogos?.doctores ?? [];

	useEffect(() => {
		const cargarMovimientos = async () => {
			setCargandoMovimientos(true);
			setErrorMovimientos("");
			try {
				const rango = crearRangoFechaMexico(fecha);
				let query = supabase
					.from("movimientos_pago_venta")
					.select("*")
					.gte("created_at", rango.inicio)
					.lt("created_at", rango.fin)
					.order("created_at", { ascending: false });

				if (sucursalSeleccionada) {
					query = query.eq("id_sucursal", sucursalSeleccionada);
				}
				if (formaPagoSeleccionada) {
					query = query.ilike("forma_pago", `%${formaPagoSeleccionada}%`);
				}

				const { data, error } = await query;
				if (error) throw error;
				setMovimientos(data || []);
			} catch (error) {
				console.error("Error al cargar cortes del dia:", error);
				setErrorMovimientos(error.message || "No se pudieron cargar los cortes.");
				setMovimientos([]);
			} finally {
				setCargandoMovimientos(false);
			}
		};

		cargarMovimientos();
	}, [fecha, sucursalSeleccionada, formaPagoSeleccionada]);

	const transacciones = useMemo(
		() => construirTransaccionesCorte({ movimientos, ventas }),
		[movimientos, ventas],
	);

	const cortes = useMemo(
		() => construirCortesEmpleados({ movimientos, ventas }),
		[movimientos, ventas],
	);

	const corteActual = useMemo(() => {
		if (cortes.length === 0) return null;
		return (
			cortes.find((corte) => String(corte.empleadoKey) === String(empleadoSeleccionado)) ||
			cortes[0]
		);
	}, [cortes, empleadoSeleccionado]);

	const transaccionesEmpleado = useMemo(() => {
		if (!corteActual) return [];
		return transacciones.filter(
			(tx) => String(tx.empleadoKey) === String(corteActual.empleadoKey),
		);
	}, [corteActual, transacciones]);

	const totalesGenerales = useMemo(
		() =>
			cortes.reduce(
				(acc, corte) => ({
					efectivo: acc.efectivo + corte.efectivo,
					tarjeta: acc.tarjeta + corte.tarjeta,
					transferencia: acc.transferencia + corte.transferencia,
					credito: acc.credito + corte.credito,
					total: acc.total + corte.total,
					transacciones: acc.transacciones + corte.transacciones,
				}),
				{
					efectivo: 0,
					tarjeta: 0,
					transferencia: 0,
					credito: 0,
					total: 0,
					transacciones: 0,
				},
			),
		[cortes],
	);

	const doctorPorId = useMemo(() => {
		const mapa = new Map();
		doctores.forEach((doctor) => {
			const id = doctor.id_doctor || doctor.id_empleado;
			if (id) mapa.set(String(id), doctor.nombre);
		});
		return mapa;
	}, [doctores]);

	const imprimirCortes = (cortesAImprimir) => {
		if (cortesAImprimir.length === 0) return;
		const sucursal = sucursales.find(
			(item) => String(item.id_sucursal) === String(sucursalSeleccionada),
		)?.nombre || "Todas las sucursales";
		const empleados = new Set(cortesAImprimir.map((corte) => String(corte.empleadoKey)));
		const transaccionesPorArea = construirTransaccionesCortePorArea({ movimientos, ventas });

		GRUPOS_REPORTE_POR_AREA.filter((grupo) => grupo.id === areaImpresionSeleccionada).forEach((grupo) => {
			const transaccionesGrupo = (transaccionesPorArea[grupo.id] || []).filter((tx) =>
				empleados.has(String(tx.empleadoKey)),
			);
			if (transaccionesGrupo.length === 0) return;
			const cortesGrupo = construirCortesDesdeTransacciones(transaccionesGrupo);
			const ventana = window.open("", "_blank");
			if (!ventana) return;

			ventana.document.write(construirDocumentoCortes({
				fecha,
				sucursal,
				cortes: cortesGrupo,
				transacciones: transaccionesGrupo,
				titulo: `Corte de Caja — ${grupo.nombre}`,
			}));
			ventana.document.close();
			ventana.focus();
			ventana.print();
		});
	};

	const getPrimerNombre = (nombreCompleto) =>
		nombreCompleto || user?.email?.split("@")[0] || "Usuario";

	const formatRol = (rol) => {
		const roles = {
			admin: "Administrador",
			administrador: "Administrador",
			desarrollador: "Desarrollador",
			recepcionista: "Recepcionista",
			quimico: "Químico",
			tecnico: "Técnico",
			tecnico_radiologia: "Técnico en Radiología",
			medico: "Médico",
		};
		return roles[normalizarRolPermisos(rol)] || rol || "Usuario";
	};

	if (loading || empleadoLoading) {
		return (
			<PageLayout empleadoData={empleadoData} formatRol={formatRol} getPrimerNombre={getPrimerNombre}>
				<div className="cortes-wrapper">
					<div className="cortes-loading-page">Cargando cortes...</div>
				</div>
			</PageLayout>
		);
	}

	if (!puedeVerCortes(empleadoData?.rol)) {
		return (
			<PageLayout empleadoData={empleadoData} formatRol={formatRol} getPrimerNombre={getPrimerNombre}>
				<div className="cortes-wrapper">
					<div className="cortes-empty">
						<h1>Cortes del día</h1>
						<p>Esta vista está disponible solo para administradores.</p>
					</div>
				</div>
			</PageLayout>
		);
	}

	return (
		<PageLayout empleadoData={empleadoData} formatRol={formatRol} getPrimerNombre={getPrimerNombre}>
			<div className="cortes-wrapper">
				<div className="cortes-header">
					<div>
						<h1>Cortes del día</h1>
						<p>Supervisión de transacciones por empleado</p>
					</div>
					<div className="cortes-filtros">
						<button
							className="cortes-print-button"
							onClick={() => imprimirCortes(cortes)}
							disabled={cortes.length === 0}>
							Imprimir todos los cortes
						</button>
						<label>
							<img src={calendarioIcono} alt="" />
							<input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
						</label>
						<select
							value={sucursalSeleccionada}
							onChange={(e) => setSucursalSeleccionada(e.target.value)}>
							<option value="">Todas las sucursales</option>
							{sucursales.map((sucursal) => (
								<option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>
									{sucursal.nombre}
								</option>
							))}
						</select>
						<select value={areaImpresionSeleccionada} onChange={(e) => setAreaImpresionSeleccionada(e.target.value)}>
							{GRUPOS_REPORTE_POR_AREA.map((grupo) => <option key={grupo.id} value={grupo.id}>{grupo.nombre}</option>)}
						</select>
						<select
							value={formaPagoSeleccionada}
							onChange={(e) => setFormaPagoSeleccionada(e.target.value)}>
							<option value="">Todas las formas</option>
							<option value="efectivo">Efectivo</option>
							<option value="tarjeta">Tarjeta</option>
							<option value="transfer">Transferencia</option>
							<option value="credito">Crédito</option>
						</select>
					</div>
				</div>

				<div className="cortes-metricas">
					<div><span>Total</span><strong>{formatoMoneda(totalesGenerales.total)}</strong></div>
					<div><span>Efectivo</span><strong>{formatoMoneda(totalesGenerales.efectivo)}</strong></div>
					<div><span>Tarjeta</span><strong>{formatoMoneda(totalesGenerales.tarjeta)}</strong></div>
					<div><span>Transferencia</span><strong>{formatoMoneda(totalesGenerales.transferencia)}</strong></div>
					<div><span>Transacciones</span><strong>{totalesGenerales.transacciones}</strong></div>
				</div>

				{errorMovimientos && <div className="cortes-error">{errorMovimientos}</div>}

				<div className="cortes-layout">
					<aside className="cortes-empleados">
						<div className="cortes-panel-title">Empleados</div>
						{cargandoMovimientos || cargandoVentas ? (
							<div className="cortes-loading">Cargando cortes...</div>
						) : cortes.length === 0 ? (
							<div className="cortes-empty-small">Sin movimientos</div>
						) : (
							cortes.map((corte) => (
								<button
									key={corte.empleadoKey}
									className={`cortes-empleado ${String(corteActual?.empleadoKey) === String(corte.empleadoKey) ? "activo" : ""}`}
									onClick={() => setEmpleadoSeleccionado(corte.empleadoKey)}>
									<span>{corte.empleadoNombre}</span>
									<strong>{formatoMoneda(corte.total)}</strong>
									<small>{corte.transacciones} transacciones</small>
								</button>
							))
						)}
					</aside>

					<section className="cortes-detalle">
						<div className="cortes-detalle-header">
							<div>
								<h2>{corteActual?.empleadoNombre || "Selecciona un empleado"}</h2>
								<p>{fecha}</p>
							</div>
							{corteActual && (
								<div className="cortes-empleado-acciones">
									<button
										className="cortes-print-button"
										onClick={() => imprimirCortes([corteActual])}>
										Imprimir corte de {corteActual.empleadoNombre}
									</button>
									<div className="cortes-empleado-totales">
										<span>Efectivo {formatoMoneda(corteActual.efectivo)}</span>
										<span>Tarjeta {formatoMoneda(corteActual.tarjeta)}</span>
										<span>Transfer {formatoMoneda(corteActual.transferencia)}</span>
										<strong>Total {formatoMoneda(corteActual.total)}</strong>
									</div>
								</div>
							)}
						</div>

						<div className="cortes-tabla-wrap">
							<table className="cortes-tabla">
								<thead>
									<tr>
										<th>Hora</th>
										<th>Folio</th>
										<th>Paciente</th>
										<th>Tipo</th>
										<th>Pago</th>
										<th>Monto</th>
										<th>Sucursal</th>
										<th></th>
									</tr>
								</thead>
								<tbody>
									{transaccionesEmpleado.map((tx) => (
										<tr key={tx.id_movimiento || `${tx.id_venta}-${tx.created_at}`}>
											<td>{formatoHora(tx.created_at)}</td>
											<td>{tx.folio || "-"}</td>
											<td>{tx.paciente}</td>
											<td><span className={`cortes-chip ${tx.monto < 0 ? "egreso" : ""}`}>{tx.tipo}</span></td>
											<td>{tx.forma_pago || "-"}</td>
											<td>{formatoMoneda(tx.monto)}</td>
											<td>{tx.sucursal || tx.venta?.sucursal || "-"}</td>
											<td>
												<button className="cortes-link" onClick={() => setTransaccionDetalle(tx)}>
													Ver detalle
												</button>
											</td>
										</tr>
									))}
									{corteActual && transaccionesEmpleado.length === 0 && (
										<tr>
											<td colSpan="8" className="cortes-empty-row">Sin transacciones para este empleado.</td>
										</tr>
									)}
									{!corteActual && !cargandoMovimientos && !cargandoVentas && (
										<tr>
											<td colSpan="8" className="cortes-empty-row">No hay cortes registrados para esta fecha.</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</section>
				</div>
			</div>

			{transaccionDetalle && (
				<div className="cortes-modal-overlay" onClick={() => setTransaccionDetalle(null)}>
					<div className="cortes-modal" onClick={(e) => e.stopPropagation()}>
						<div className="cortes-modal-header">
							<div>
								<h2>Detalle de estudio</h2>
								<p>{transaccionDetalle.empleadoNombre} · {formatoHora(transaccionDetalle.created_at)}</p>
							</div>
							<button
								className="cortes-modal-close"
								onClick={() => setTransaccionDetalle(null)}
								aria-label="Cerrar">
								×
							</button>
						</div>

						<div className="cortes-modal-summary">
							<div>
								<span>Folio</span>
								<strong>{transaccionDetalle.folio || "Movimiento manual"}</strong>
							</div>
							<div>
								<span>Paciente</span>
								<strong>{transaccionDetalle.paciente}</strong>
							</div>
							<div>
								<span>Monto</span>
								<strong>{formatoMoneda(transaccionDetalle.monto)}</strong>
							</div>
						</div>

						<div className="cortes-modal-grid">
							<div><span>Cliente</span><strong>{transaccionDetalle.cliente}</strong></div>
							<div><span>Doctor</span><strong>{doctorPorId.get(String(transaccionDetalle.venta?.id_doctor || "")) || transaccionDetalle.doctor || "-"}</strong></div>
							<div><span>Forma de pago</span><strong>{transaccionDetalle.forma_pago || "-"}</strong></div>
							<div><span>Total venta</span><strong>{formatoMoneda(transaccionDetalle.totalVenta)}</strong></div>
							<div><span>Pagado</span><strong>{formatoMoneda(transaccionDetalle.pagoVenta)}</strong></div>
							<div><span>Cambio</span><strong>{formatoMoneda(transaccionDetalle.cambio)}</strong></div>
							<div><span>Adeudo</span><strong>{formatoMoneda(transaccionDetalle.adeudo)}</strong></div>
						</div>

						{transaccionDetalle.referencia && (
							<div className="cortes-referencia">
								<span>Referencia / concepto</span>
								<p>{transaccionDetalle.referencia}</p>
							</div>
						)}

						<div className="cortes-estudios">
							<h3>Estudios</h3>
							{transaccionDetalle.estudios.length === 0 ? (
								<p>Este movimiento no tiene estudios asociados.</p>
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
										{transaccionDetalle.estudios.map((estudio) => (
											<tr key={estudio.id_estudio_venta || estudio.clave_estudio}>
												<td>{estudio.clave_estudio || "-"}</td>
												<td>{estudio.descripcion_estudio || "-"}</td>
												<td>{estudio.area || "-"}</td>
												<td>{formatoMoneda(estudio.precio)}</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
						</div>

					</div>
				</div>
			)}
		</PageLayout>
	);
};

export default CortesDia;
