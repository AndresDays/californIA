import { useEffect, useMemo, useState } from "react";
import PageLayout from "../../components/page-layout.jsx";
import { useEmpleadoActual } from "../../hooks/use-empleado-actual";
import { supabase } from "../../lib/supabase-client";
import { useFechaPersistente } from "../../hooks/use-fecha-persistente";
import { MEMBRETE_FALLBACK, cargarMembreteCdc } from "../../utils/membrete-cdc";
import { generarResultadosCombinadosPdf } from "../../utils/reporte-pdf";
import { abrirPdfEnPestana } from "../../utils/abrir-pdf-en-pestana";
import { obtenerDatosQuimico } from "../../utils/datos-quimico";
import { normalizarTextoResultado } from "../../utils/portal-resultados";
import {
	contarEstudiosListos,
	filtrarOrdenesConvenio,
	formatearFechaOrden,
} from "../../utils/resultados-convenio";
import "./resultados-convenio.css";

const hoyMexico = () =>
	new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

const inicioDelMes = () => `${hoyMexico().slice(0, 7)}-01`;

const ResultadosConvenio = () => {
	const { empleadoData, formatRol, getPrimerNombre } = useEmpleadoActual();
	const [desde, setDesde] = useFechaPersistente("resultados-convenio:desde", inicioDelMes());
	const [hasta, setHasta] = useFechaPersistente("resultados-convenio:hasta", hoyMexico());
	const [busqueda, setBusqueda] = useState("");
	const [ordenes, setOrdenes] = useState([]);
	const [cargando, setCargando] = useState(false);
	const [error, setError] = useState("");
	const [detalle, setDetalle] = useState(null);
	const [generandoPdf, setGenerandoPdf] = useState(null);
	const [membreteSrc, setMembreteSrc] = useState(MEMBRETE_FALLBACK);

	useEffect(() => {
		let cancelado = false;
		cargarMembreteCdc().then((src) => {
			if (!cancelado) setMembreteSrc(src);
		});
		return () => {
			cancelado = true;
		};
	}, []);

	// La lista la arma la base: el convenio nunca consulta `ventas` directamente,
	// así que no hay forma de que le lleguen columnas de dinero de la clínica.
	useEffect(() => {
		let cancelado = false;
		const cargar = async () => {
			setCargando(true);
			setError("");
			const { data, error: errorRpc } = await supabase.rpc("ventas_laboratorio_cliente", {
				p_desde: desde || null,
				p_hasta: hasta || null,
			});
			if (cancelado) return;
			setCargando(false);
			if (errorRpc) {
				console.error("Error al cargar las órdenes del convenio:", errorRpc);
				setError("No se pudieron cargar las órdenes. Intenta de nuevo.");
				setOrdenes([]);
				return;
			}
			setOrdenes(Array.isArray(data) ? data : []);
		};
		cargar();
		return () => {
			cancelado = true;
		};
	}, [desde, hasta]);

	const ordenesFiltradas = useMemo(
		() => filtrarOrdenesConvenio(ordenes, busqueda),
		[ordenes, busqueda],
	);

	const abrirDetalle = async (orden) => {
		setDetalle({ orden, cargando: true, datos: null });
		const { data, error: errorRpc } = await supabase.rpc("resultados_venta_cliente", {
			p_id_venta: orden.id_venta,
		});
		if (errorRpc || !data?.encontrado) {
			console.error("Error al cargar los resultados:", errorRpc);
			setDetalle({
				orden,
				cargando: false,
				datos: null,
				error: data?.mensaje || "No se pudieron cargar los resultados.",
			});
			return;
		}
		setDetalle({ orden, cargando: false, datos: data });
	};

	// La pestaña se abre con el clic y se llena después: el navegador bloquea las
	// que se abren cuando el PDF ya terminó de armarse.
	const verPdf = async (orden) => {
		const ventana = window.open("", "_blank");
		setGenerandoPdf(orden.id_venta);
		try {
			const { data, error: errorRpc } = await supabase.rpc("resultados_venta_cliente", {
				p_id_venta: orden.id_venta,
			});
			if (errorRpc || !data?.encontrado) {
				throw new Error(data?.mensaje || errorRpc?.message || "Sin resultados");
			}
			const salida = await generarResultadosCombinadosPdf({
				venta: data.venta,
				estudios: data.estudios || [],
				membreteSrc,
				datosQuimicoSrc: obtenerDatosQuimico(data.venta),
			});
			const url = salida instanceof Blob ? URL.createObjectURL(salida) : salida;
			abrirPdfEnPestana({ url, titulo: `Resultados ${data.venta?.folio || ""}`, ventana });
		} catch (errorPdf) {
			ventana?.close();
			console.error("Error al generar el PDF de resultados:", errorPdf);
			setError("No fue posible abrir el PDF. Puede que los resultados aún no estén validados.");
		} finally {
			setGenerandoPdf(null);
		}
	};

	return (
		<PageLayout
			empleadoData={empleadoData}
			formatRol={formatRol}
			getPrimerNombre={getPrimerNombre}>
			<main className="convenio-page">
				<header className="convenio-header">
					<div>
						<h1>Resultados de laboratorio</h1>
						<p>{empleadoData?.cliente_nombre || empleadoData?.nombre || "Convenio"}</p>
					</div>
					<div className="convenio-filtros">
						<label>
							<span>Desde</span>
							<input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
						</label>
						<label>
							<span>Hasta</span>
							<input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
						</label>
						<label className="convenio-busqueda">
							<span>Buscar</span>
							<input
								type="search"
								value={busqueda}
								placeholder="Paciente o folio..."
								onChange={(e) => setBusqueda(e.target.value)}
							/>
						</label>
					</div>
				</header>

				{error && <div className="convenio-aviso error">{error}</div>}
				{cargando && <div className="convenio-aviso">Cargando órdenes...</div>}
				{!cargando && ordenesFiltradas.length === 0 && !error && (
					<div className="convenio-aviso">No hay órdenes en el periodo consultado.</div>
				)}

				{ordenesFiltradas.length > 0 && (
					<div className="convenio-tabla-scroll">
						<table className="convenio-tabla">
							<thead>
								<tr>
									<th>Folio</th>
									<th>Fecha</th>
									<th>Paciente</th>
									<th>Estudios</th>
									<th>Acciones</th>
								</tr>
							</thead>
							<tbody>
								{ordenesFiltradas.map((orden) => (
									<tr key={orden.id_venta}>
										<td>{orden.folio}</td>
										<td>{formatearFechaOrden(orden.fecha_venta)}</td>
										<td>{orden.paciente}</td>
										<td>
											{contarEstudiosListos(orden)} de {(orden.estudios || []).length} listos
										</td>
										<td>
											<div className="convenio-acciones">
												<button type="button" onClick={() => abrirDetalle(orden)}>
													Ver resultados
												</button>
												<button
													type="button"
													onClick={() => verPdf(orden)}
													disabled={generandoPdf === orden.id_venta}>
													{generandoPdf === orden.id_venta ? "Abriendo..." : "Ver PDF"}
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				{detalle && (
					<>
						<div className="convenio-overlay" onClick={() => setDetalle(null)} />
						<section className="convenio-detalle" role="dialog" aria-label="Resultados de la orden">
							<header>
								<div>
									<h2>Folio {detalle.orden.folio}</h2>
									<p>{detalle.orden.paciente}</p>
								</div>
								<button type="button" onClick={() => setDetalle(null)} aria-label="Cerrar">
									✕
								</button>
							</header>

							{detalle.cargando && <p className="convenio-aviso">Cargando resultados...</p>}
							{detalle.error && <p className="convenio-aviso error">{detalle.error}</p>}

							{!detalle.cargando &&
								!detalle.error &&
								(detalle.datos?.estudios || []).length === 0 && (
									<p className="convenio-aviso">
										Los resultados de esta orden aún no están validados.
									</p>
								)}

							{(detalle.datos?.estudios || []).map((estudio) => (
								<article className="convenio-estudio" key={estudio.id}>
									<h3>{estudio.descripcion}</h3>
									<div className="convenio-analitos">
										<div className="convenio-analito encabezado">
											<span>Analito</span>
											<span>Resultado</span>
											<span>Referencia</span>
										</div>
										{(estudio.analitos || []).map((analito) => (
											<div className="convenio-analito" key={`${estudio.id}-${analito.clave}`}>
												<span>{normalizarTextoResultado(analito.descripcion || analito.clave)}</span>
												<strong>
													{normalizarTextoResultado(analito.resultado || "-")}
													{analito.unidades ? ` ${analito.unidades}` : ""}
												</strong>
												<span>{normalizarTextoResultado(analito.referencia || "")}</span>
											</div>
										))}
									</div>
								</article>
							))}
						</section>
					</>
				)}
			</main>
		</PageLayout>
	);
};

export default ResultadosConvenio;
