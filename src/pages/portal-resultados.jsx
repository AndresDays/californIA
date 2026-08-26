import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import logo from "../assets/CalifornIA.png";
import { supabase } from "../lib/supabase-client";
import { MEMBRETE_FALLBACK, cargarMembreteCdc } from "../utils/membrete-cdc";
import {
	normalizarTextoResultado,
	normalizarTelefonoPortal,
} from "../utils/portal-resultados";
import {
	crearNombreArchivoReporte,
	generarReportePdf,
	generarResultadosCombinadosPdf,
} from "../utils/reporte-pdf";
import { obtenerDatosQuimico } from "../utils/datos-quimico";
import { htmlReporteRadiologiaParaEditor } from "../utils/reporte-radiologia-html";
import { abrirPdfEnPestana } from "../utils/abrir-pdf-en-pestana";
import "./portal-resultados.css";
import { normalizarFolioConsulta } from "../utils/folios";

const formatearFecha = (fecha) => {
	if (!fecha) return "-";
	return new Date(fecha).toLocaleDateString("es-MX", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	});
};

const calcularEdad = (fechaNacimiento) => {
	if (!fechaNacimiento) return "";
	const hoy = new Date();
	const nacimiento = new Date(fechaNacimiento);
	let edad = hoy.getFullYear() - nacimiento.getFullYear();
	const mes = hoy.getMonth() - nacimiento.getMonth();
	if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
	return `${edad} anos`;
};

	const obtenerAnalitoTexto = (analito) => {
	const partes = [
		normalizarTextoResultado(analito.descripcion || analito.clave),
		normalizarTextoResultado(analito.resultado || "-"),
		normalizarTextoResultado(analito.referencia || ""),
	].filter(Boolean);
	return partes.join(" - ");
};

const obtenerAnalitoCampos = (analito) => ({
	analito: normalizarTextoResultado(analito.descripcion || analito.clave || "-"),
	resultado: normalizarTextoResultado(analito.resultado || "-"),
	referencia: normalizarTextoResultado(analito.referencia || "-"),
});

const PortalResultados = () => {
	const [searchParams] = useSearchParams();
	const [folio, setFolio] = useState(searchParams.get("folio") || "");
	const [telefono, setTelefono] = useState(searchParams.get("telefono") || "");
	const [cargando, setCargando] = useState(false);
	const [resultado, setResultado] = useState(null);
	const [error, setError] = useState("");
	const [generandoPdf, setGenerandoPdf] = useState(false);
	const [membreteSrc, setMembreteSrc] = useState(MEMBRETE_FALLBACK);

	const venta = resultado?.venta || null;
	const estudios = resultado?.estudios || [];
	useEffect(() => {
		let cancelado = false;
		cargarMembreteCdc().then((src) => {
			if (!cancelado) setMembreteSrc(src);
		});
		return () => {
			cancelado = true;
		};
	}, []);

	useEffect(() => {
		document.title = "Resultados";
		if (folio && telefono) buscarResultados();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// El folio del ticket trae la letra de la empresa: se normaliza para que
	// escribirlo en minúsculas o con guion no impida encontrar los resultados.
	const folioConsulta = normalizarFolioConsulta(folio);

	const buscarResultados = async (event) => {
		event?.preventDefault();
		setError("");
		setResultado(null);

		if (!folioConsulta || !normalizarTelefonoPortal(telefono)) {
			setError("Captura folio y telefono para consultar resultados.");
			return;
		}

		setCargando(true);
		const { data, error: rpcError } = await supabase.functions.invoke("portal-resultados", {
			body: { p_folio: folioConsulta, p_telefono: telefono },
		});
		setCargando(false);

		if (rpcError) {
			console.error("Error al consultar portal de resultados:", rpcError);
			setError(
				rpcError.message ||
					"No fue posible consultar resultados. Intenta de nuevo.",
			);
			return;
		}

		setResultado(data);
		if (!data?.encontrado) setError(data?.mensaje || "No encontramos resultados.");
	};

	const estudioImagen = estudios.find((estudio) => estudio.tipo === "imagen") || null;

	const verEstudio = () => {
		if (!estudioImagen) return;
		const params = new URLSearchParams({ folio: folioConsulta, telefono });
		window.open(`/visor-paciente/${estudioImagen.id}?${params.toString()}`, "_blank", "noopener,noreferrer");
	};

	// Los datos de quien firmó la interpretación viven en el estudio, no en el
	// listado; se piden al portal antes de armar el PDF.
	const obtenerRadiologo = async (idEstudio) => {
		try {
			const { data } = await supabase.functions.invoke("portal-resultados", {
				body: { p_folio: folioConsulta, p_telefono: telefono, p_id_estudio: String(idEstudio) },
			});
			return data?.radiologo || null;
		} catch (errorRadiologo) {
			console.error("No fue posible obtener la firma del radiólogo:", errorRadiologo);
			return null;
		}
	};

	// El PDF tarda en generarse: la pestaña se abre con el clic y se llena
	// después, porque el navegador bloquea las que se abren ya sin el gesto.
	const verPdf = async () => {
		const ventana = window.open("", "_blank");
		setGenerandoPdf(true);
		setError("");
		try {
			if (estudioImagen) {
				await generarReportePdf({
					nombrePaciente: venta?.paciente || "",
					reporteTexto: htmlReporteRadiologiaParaEditor(estudioImagen.reporte),
					membreteSrc,
					firma: await obtenerRadiologo(estudioImagen.id),
					nombreArchivo: crearNombreArchivoReporte(venta?.paciente),
					imprimir: true,
					ventana,
				});
				return;
			}
			const salida = await generarResultadosCombinadosPdf({
				venta,
				estudios,
				membreteSrc,
				datosQuimicoSrc: obtenerDatosQuimico(venta),
			});
			const url = salida instanceof Blob ? URL.createObjectURL(salida) : salida;
			abrirPdfEnPestana({ url, titulo: `Resultados ${venta?.folio || ""}`, ventana });
		} catch (errorPdf) {
			ventana?.close();
			console.error("Error al generar el PDF de resultados:", errorPdf);
			setError("No fue posible abrir el PDF de resultados. Intenta de nuevo.");
		} finally {
			setGenerandoPdf(false);
		}
	};

	return (
		<div className="portal-resultados">
			<header className="portal-header">
				<img src={logo} alt="Centro Diagnostico California" />
				<div>
					<h1>Resultados</h1>
					<p>Consulta por folio y telefono del paciente</p>
				</div>
			</header>

			<main className="portal-main">
				<section className="portal-consulta">
					<form onSubmit={buscarResultados} className="portal-form">
						<label>
							<span>Folio</span>
							<input
								value={folio}
								onChange={(event) => setFolio(event.target.value)}
								placeholder="Ej. 1105260004"
								autoComplete="off"
							/>
						</label>
						<label>
							<span>Telefono</span>
							<input
								value={telefono}
								onChange={(event) => setTelefono(event.target.value)}
								placeholder="10 digitos"
								inputMode="tel"
								autoComplete="tel"
							/>
						</label>
						<button type="submit" disabled={cargando}>
							{cargando ? "Buscando..." : "Consultar"}
						</button>
					</form>
					{error && <div className="portal-alerta">{error}</div>}
				</section>

				{resultado?.encontrado && !resultado?.autorizado && (
					<section className="portal-bloqueado">
						<h2>Entrega pendiente</h2>
						<p>{resultado.mensaje}</p>
						<strong>Saldo: ${Number(resultado.saldo || 0).toFixed(2)}</strong>
					</section>
				)}

				{resultado?.encontrado && resultado?.autorizado && (
					<section className="portal-resultados-panel">
						<div className="portal-membrete-print">
							<img
								src={membreteSrc}
								alt="Centro Diagnostico California"
							/>
						</div>
						<div className="portal-resumen">
							<div>
								<span>Paciente</span>
								<strong>{venta?.paciente || "-"}</strong>
								<small>
									{calcularEdad(venta?.fecha_nacimiento)}
									{venta?.sexo ? ` - ${venta.sexo}` : ""}
								</small>
							</div>
							<div>
								<span>Folio</span>
								<strong>{venta?.folio}</strong>
								<small>{formatearFecha(venta?.fecha_venta)}</small>
							</div>
							<div>
								<span>Cliente</span>
								<strong>{venta?.cliente || "Particular"}</strong>
								<small>{estudios.length} resultado(s)</small>
							</div>
						</div>

						<div className="portal-actions">
							{estudioImagen && (
								<button type="button" onClick={verEstudio}>
									Ver estudio
								</button>
							)}
							<button type="button" onClick={verPdf} disabled={generandoPdf}>
								{generandoPdf ? "Abriendo PDF..." : "Ver PDF"}
							</button>
						</div>

						{estudios.length === 0 ? (
							<div className="portal-vacio">
								Los resultados aun no estan liberados para descarga.
							</div>
						) : (
							<div className="portal-estudios">
								{estudios.map((estudio) => (
									<article
										className="portal-estudio"
										key={`${estudio.tipo}-${estudio.id}`}>
										<div className="portal-estudio-header">
											<div>
												<span>{estudio.tipo === "imagen" ? "Imagen" : "Laboratorio"}</span>
												<h2>{estudio.descripcion}</h2>
											</div>
											<strong>{estudio.estado}</strong>
										</div>

										{estudio.tipo === "imagen" ? null : (
											<div className="portal-analitos-texto">
												{estudio.archivo_cultivo_url && <p>PDF de cultivo adjunto.</p>}
												<div className="portal-analitos-header">
													<span>Analito</span>
													<span>Resultado</span>
													<span>Referencia</span>
												</div>
												{(estudio.analitos || []).map((analito) => {
													const campos = obtenerAnalitoCampos(analito);
													return (
														<div
															className="portal-analito-row"
															key={`${estudio.id}-${analito.clave}`}>
															<span>{campos.analito}</span>
															<strong>{campos.resultado}</strong>
															<span>{campos.referencia}</span>
															<p>{obtenerAnalitoTexto(analito)}</p>
														</div>
													);
												})}
											</div>
										)}
									</article>
								))}
							</div>
						)}
					</section>
				)}
			</main>
		</div>
	);
};

export default PortalResultados;
