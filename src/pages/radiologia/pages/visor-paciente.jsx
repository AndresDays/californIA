import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import logo from "../../../assets/CalifornIA.png";
import { supabase } from "../../../lib/supabase-client";
import {
	agruparImagenesDicomPorSerie,
	crearImagenDicomFallback,
	normalizarStoragePathDicom,
} from "../../../utils/dicom-series";
import {
	crearNombreArchivoReporte,
	generarReportePdf,
} from "../../../utils/reporte-pdf";
import { MEMBRETE_B64 } from "./reporte-radiologia-template";
import "./ReporteRadiologia.css";
import "./VisorDicom.css";
import "./VisorPaciente.css";

import contrasteIcono from "../../../assets/contrasteIcono.png";
import descargarIcon from "../../../assets/descargarIcono.png";
import ampliarIcon from "../../../assets/lupaIcono.png";
import moverIcon from "../../../assets/moverIcono.png";
import restaurarIcon from "../../../assets/restaurarIcono.png";
import scrollIcon from "../../../assets/scrollIcono.png";

let csModules = null;
let csInitPromise = null;

const initCornerstone = () => {
	if (csModules) return Promise.resolve(csModules);
	if (csInitPromise) return csInitPromise;
	csInitPromise = (async () => {
		const cornerstoneModule = await import("cornerstone-core");
		const dicomParserModule = await import("dicom-parser");
		const cornerstoneWADO = await import("cornerstone-wado-image-loader");
		const cornerstone = cornerstoneModule.default || cornerstoneModule;
		const dicomParser = dicomParserModule.default || dicomParserModule;
		cornerstoneWADO.external.cornerstone = cornerstone;
		cornerstoneWADO.external.dicomParser = dicomParser;
		cornerstoneWADO.configure({
			useWebWorkers: false,
			decodeConfig: { convertFloatPixelDataToInt: false, use16BitDataType: true },
		});
		csModules = { cornerstone };
		return csModules;
	})();
	return csInitPromise;
};

const PreviewSeriePaciente = ({ imageId, label }) => {
	const previewRef = useRef(null);
	useEffect(() => {
		let cancelado = false;
		const cargarPreview = async () => {
			if (!previewRef.current || !imageId) return;
			const { cornerstone } = await initCornerstone();
			try {
				cornerstone.enable(previewRef.current);
				const imagen = await cornerstone.loadAndCacheImage(imageId);
				if (!cancelado && previewRef.current) {
					cornerstone.displayImage(previewRef.current, imagen);
					cornerstone.resize(previewRef.current, true);
				}
			} catch (error) {}
		};
		cargarPreview();
		return () => {
			cancelado = true;
			try { if (previewRef.current) csModules?.cornerstone?.disable(previewRef.current); } catch (error) {}
		};
	}, [imageId]);
	return <div ref={previewRef} className="vd-serie-preview" aria-label={`Preview ${label}`} />;
};

const TOOLS = [
	{ id: "scroll", icon: scrollIcon, label: "Scroll" },
	{ id: "zoom", icon: ampliarIcon, label: "Ampliar" },
	{ id: "wl", icon: contrasteIcono, label: "W/L" },
	{ id: "pan", icon: moverIcon, label: "Mover" },
];

const formatearFecha = (fecha) => {
	if (!fecha) return "";
	const f = new Date(fecha);
	if (Number.isNaN(f.getTime())) return String(fecha);
	return f.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
};

const VisorPaciente = () => {
	const { estudioId } = useParams();
	const divRef = useRef(null);
	const csRef = useRef(null);
	const enabledRef = useRef(false);
	const dragRef = useRef(null);
	const imageIdsRef = useRef([]);
	const indiceRef = useRef(0);
	const herramientaRef = useRef("scroll");

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [estudio, setEstudio] = useState(null);
	const [paciente, setPaciente] = useState(null);
	const [series, setSeries] = useState([]);
	const [serieActiva, setSerieActiva] = useState(null);
	const [indiceImagen, setIndiceImagen] = useState(0);
	const [herramienta, setHerramienta] = useState("scroll");
	const [vistaReporte, setVistaReporte] = useState(false);
	const [zoomInfo, setZoomInfo] = useState(null);
	const [wlInfo, setWlInfo] = useState(null);

	useEffect(() => {
		herramientaRef.current = herramienta;
	}, [herramienta]);

	useEffect(() => {
		document.title = "Estudio · CalifornIA";
	}, []);

	const crearImagenesConUrlFirmada = async (imagenes = []) =>
		Promise.all(
			imagenes.map(async (imagen) => {
				const bucket = imagen.bucket || "radiologia";
				const storagePath = normalizarStoragePathDicom(imagen.storage_path, bucket);
				const { data, error } = await supabase.storage
					.from(bucket)
					.createSignedUrl(storagePath, 900);
				if (error || !data?.signedUrl) {
					throw error || new Error("No se pudo autorizar la imagen del estudio");
				}
				return {
					...imagen,
					bucket,
					storage_path: storagePath,
					imageId: `wadouri:${data.signedUrl}`,
				};
			}),
		);

	const cargarImagen = async (imageId) => {
		const cs = csRef.current;
		const el = divRef.current;
		if (!enabledRef.current || !cs || !el || !imageId) return;
		try {
			const image = await cs.loadAndCacheImage(imageId);
			cs.displayImage(el, image);
			const vp = cs.getViewport(el);
			if (!vp?.voi?.windowWidth || vp.voi.windowWidth <= 1) {
				cs.setViewport(el, { ...vp, voi: { windowWidth: 2000, windowCenter: 0 } });
			}
			cs.resize(el, true);
		} catch (err) {
			console.error("[VisorPaciente] cargarImagen:", err);
		}
	};

	useEffect(() => {
		let cancelado = false;

		const cargar = async () => {
			setLoading(true);
			setError(null);
			try {
				const { cornerstone } = await initCornerstone();
				if (cancelado) return;

				let { data: est, error: errEst } = await supabase
					.from("estudios_radiologia")
					.select(`
						id_estudio, storage_path, reporte, tipo_estudio, descripcion, fecha_estudio, id_paciente,
						doctor:doctores!estudios_radiologia_id_doctor_fkey(nombre)
					`)
					.eq("id_estudio", estudioId)
					.single();
				if (errEst) {
					({ data: est, error: errEst } = await supabase
						.from("estudios_radiologia")
						.select("id_estudio, storage_path, reporte, tipo_estudio, descripcion, fecha_estudio, id_paciente")
						.eq("id_estudio", estudioId)
						.single());
				}
				if (errEst) throw new Error("No encontramos el estudio solicitado");
				if (cancelado) return;
				setEstudio(est);

				if (est?.id_paciente) {
					const { data: p } = await supabase
						.from("pacientes")
						.select("nombre, apellido_paterno, apellido_materno, fecha_nacimiento, sexo")
						.eq("id_paciente", est.id_paciente)
						.maybeSingle();
					if (!cancelado && p) setPaciente(p);
				}

				let imagenesDicom = [];
				const { data: imagenesGuardadas, error: errImagenes } = await supabase
					.from("estudio_dicom_imagenes")
					.select("*")
					.eq("id_estudio", estudioId)
					.order("instance_number", { ascending: true, nullsFirst: false });
				if (!errImagenes) imagenesDicom = imagenesGuardadas || [];
				if (imagenesDicom.length === 0 && est?.storage_path) {
					imagenesDicom = [crearImagenDicomFallback(est.storage_path, est)];
				}
				if (imagenesDicom.length === 0) throw new Error("Este estudio no tiene imagenes disponibles");

				const imagenesConUrl = await crearImagenesConUrlFirmada(imagenesDicom);
				const seriesAgrupadas = agruparImagenesDicomPorSerie(imagenesConUrl, est);
				if (cancelado) return;
				setSeries(seriesAgrupadas);
				setSerieActiva(seriesAgrupadas[0]);
				imageIdsRef.current = seriesAgrupadas[0]?.imageIds || [];
				setIndiceImagen(0);
				indiceRef.current = 0;

				if (divRef.current && !enabledRef.current) {
					cornerstone.enable(divRef.current);
					enabledRef.current = true;
					csRef.current = cornerstone;
					cornerstone.events.addEventListener("cornerstoneimagerendered", (ev) => {
						if (ev.detail.element !== divRef.current) return;
						const vp = cornerstone.getViewport(divRef.current);
						if (vp) {
							setZoomInfo(Math.round(vp.scale * 100));
							setWlInfo(
								`W: ${Math.round(vp.voi?.windowWidth || 0)} L: ${Math.round(vp.voi?.windowCenter || 0)}`,
							);
						}
					});
				}
				await cargarImagen(seriesAgrupadas[0]?.imageIds?.[0]);
			} catch (e) {
				if (!cancelado) setError(e.message);
			} finally {
				if (!cancelado) setLoading(false);
			}
		};

		cargar();
		return () => {
			cancelado = true;
		};
		}, [estudioId]);

	useEffect(() => {
		if (loading || error || vistaReporte) return;
		const cs = csRef.current;
		const el = divRef.current;
		if (!enabledRef.current || !cs || !el) return;
		requestAnimationFrame(() => {
			try {
				cs.resize(el, true);
			} catch {}
			cargarImagen(imageIdsRef.current[indiceRef.current]);
		});
		}, [loading, error, vistaReporte]);

	const irAImagen = (indice) => {
		const ids = imageIdsRef.current;
		if (!ids.length) return;
		const nuevo = Math.max(0, Math.min(ids.length - 1, indice));
		indiceRef.current = nuevo;
		setIndiceImagen(nuevo);
		cargarImagen(ids[nuevo]);
	};

	const seleccionarSerie = (serie, indice = 0) => {
		setVistaReporte(false);
		setSerieActiva(serie);
		imageIdsRef.current = serie.imageIds || [];
		irAImagen(indice);
	};

	const restaurar = () => {
		const cs = csRef.current;
		const el = divRef.current;
		if (!enabledRef.current || !cs || !el) return;
		try {
			cs.reset(el);
			cs.updateImage(el);
		} catch {}
	};

	const nombrePaciente = paciente
		? [paciente.nombre, paciente.apellido_paterno, paciente.apellido_materno].filter(Boolean).join(" ")
		: "";
	const tieneReporte = Boolean(String(estudio?.reporte || "").trim());
	const totalImagenes = serieActiva?.imagenes?.length || 0;

	const descargarReportePdf = async () => {
		try {
			await generarReportePdf({
				nombrePaciente,
				doctorNombre: estudio?.doctor?.nombre,
				estudioDescripcion: estudio?.descripcion || estudio?.tipo_estudio,
				fechaEncabezado: `PUERTO VALLARTA JAL. ${formatearFecha(estudio?.fecha_estudio || new Date())}.`,
				reporteTexto: String(estudio?.reporte || ""),
				membreteSrc: `data:image/jpeg;base64,${MEMBRETE_B64}`,
				qrData: `${window.location.origin}/visor-paciente/${estudioId}`,
				nombreArchivo: crearNombreArchivoReporte(nombrePaciente),
			});
		} catch (err) {
			console.error("[VisorPaciente] descargarReportePdf:", err);
		}
	};

	const descargarImagen = () => {
		const imagen = serieActiva?.imagenes?.[indiceRef.current];
		if (!imagen?.imageId) return;
		const url = imagen.imageId.replace(/^wadouri:/, "");
		const link = document.createElement("a");
		link.href = url;
		link.download = imagen.file_name || "imagen.dcm";
		link.target = "_blank";
		link.rel = "noopener";
		link.click();
	};

	const onMouseDown = (event) => {
		if (event.button !== 0) return;
		dragRef.current = { x: event.clientX, y: event.clientY };
	};

	const onMouseMove = (event) => {
		const drag = dragRef.current;
		const cs = csRef.current;
		const el = divRef.current;
		if (!drag || !enabledRef.current || !cs || !el) return;
		const dx = event.clientX - drag.x;
		const dy = event.clientY - drag.y;
		dragRef.current = { x: event.clientX, y: event.clientY };
		try {
			const vp = cs.getViewport(el);
			if (!vp) return;
			const tool = herramientaRef.current;
			if (tool === "zoom") {
				vp.scale = Math.max(0.05, vp.scale - dy * 0.01);
			} else if (tool === "wl") {
				vp.voi.windowWidth = Math.max(1, (vp.voi.windowWidth || 1) + dx * 4);
				vp.voi.windowCenter = (vp.voi.windowCenter || 0) + dy * 4;
			} else if (tool === "pan") {
				vp.translation.x += dx / vp.scale;
				vp.translation.y += dy / vp.scale;
			} else if (tool === "scroll") {
				if (Math.abs(dy) > 12) {
					irAImagen(indiceRef.current + (dy > 0 ? 1 : -1));
					dragRef.current = { x: event.clientX, y: event.clientY };
				}
				return;
			}
			cs.setViewport(el, vp);
		} catch {}
	};

	const terminarDrag = () => {
		dragRef.current = null;
	};

	const onWheel = (event) => {
		irAImagen(indiceRef.current + (event.deltaY > 0 ? 1 : -1));
	};

	const herramientaActiva = TOOLS.find((t) => t.id === herramienta)?.label || "Scroll";

	return (
		<div className="vd-root vp-publico">
			<header className="vp-header">
				<img src={logo} alt="CalifornIA" className="vp-logo" />
			</header>

			<div className="vd-toolbar">
				<div className="vd-toolbar-context">
					<div className="vd-paciente-chip">
						<span className="vd-chip-tipo">{estudio?.tipo_estudio || "DICOM"}</span>
						<span className="vd-chip-nombre">{nombrePaciente || "Paciente"}</span>
						<span className="vd-chip-fecha">{formatearFecha(estudio?.fecha_estudio)}</span>
					</div>
				</div>

				{!vistaReporte && (
					<div className="vd-toolbar-section vd-toolbar-section-tools">
						<span className="vd-toolbar-label">Herramientas</span>
						<div className="vd-tools-group">
							{TOOLS.map((t) => (
								<button
									key={t.id}
									className={`vd-tool-btn ${herramienta === t.id ? "activo" : ""}`}
									onClick={() => setHerramienta(t.id)}
									title={t.label}>
									{t.icon ? <img src={t.icon} alt="" /> : <span>{t.label[0]}</span>}
									<span>{t.label}</span>
								</button>
							))}
						</div>
					</div>
				)}

				<div className="vd-toolbar-section">
					<span className="vd-toolbar-label">Vista</span>
					<div className="vd-actions-group">
						{!vistaReporte && (
							<button className="vd-tool-btn" onClick={restaurar} title="Restaurar">
								<img src={restaurarIcon} alt="" />
								<span>Restaurar</span>
							</button>
						)}
						<button
							className="vd-tool-btn"
							onClick={vistaReporte ? descargarReportePdf : descargarImagen}
							title="Descargar">
							<img src={descargarIcon} alt="" />
							<span>Descargar</span>
						</button>
					</div>
				</div>
			</div>

			<div className={`vd-body ${vistaReporte ? "vd-body-reporte" : ""}`}>
				<div className="vd-sidebar">
					<div className="vd-sidebar-header">
						<div>
							<span>Series</span>
							<small>DICOM</small>
						</div>
						<span className="vd-serie-count">
							{series.reduce((total, serie) => total + serie.imagenes.length, 0)}
						</span>
					</div>
					<div className="vd-miniaturas">
						{loading ? (
							<div className="vd-mini-estado">
								<div className="vd-spinner" />
								Cargando...
							</div>
						) : error ? (
							<div className="vd-mini-estado error">Error: {error}</div>
						) : (
							series.map((serie, serieIndex) => (
								<div className="vd-serie-grupo" key={serie.id || serieIndex}>
									<button
										type="button"
										className={`vd-serie-titulo ${!vistaReporte && serieActiva?.id === serie.id ? "activa" : ""}`}
										onClick={() => seleccionarSerie(serie)}>
										<span>{serie.label || `Serie ${serieIndex + 1}`}</span>
										<small>{serie.imagenes.length}</small>
									</button>
									{serie.imagenes.slice(0, 1).map((imagen) => (
										<button
											type="button"
											key={imagen.id_imagen || imagen.storage_path || serie.id}
											className={`vd-miniatura ${!vistaReporte && serieActiva?.id === serie.id ? "activa" : ""}`}
											onClick={() => seleccionarSerie(serie, 0)}>
											<div className="vd-mini-img">
												<PreviewSeriePaciente imageId={imagen.imageId} label={serie.label || `Serie ${serieIndex + 1}`} />
												<span className="vd-mini-num">{imagen.numero || 1}</span>
											</div>
											<div className="vd-mini-footer">
												<span>{serie.label || `Serie ${serieIndex + 1}`}</span>
												<small>{serie.imagenes.length} imágenes</small>
											</div>
										</button>
									))}
								</div>
							))
						)}
						{!loading && !error && tieneReporte && (
							<button
								type="button"
								className={`vd-miniatura vd-miniatura-reporte ${vistaReporte ? "activa" : ""}`}
								onClick={() => setVistaReporte(true)}
								aria-label="Abrir reporte">
								<div className="vd-mini-img vd-mini-reporte-img">
									<span className="vd-mini-reporte-icon">REP</span>
									<span className="vd-mini-num">Doc</span>
								</div>
								<div className="vd-mini-footer">
									<span>Reporte</span>
									<small>Guardado</small>
								</div>
							</button>
						)}
					</div>
				</div>

				<div className="vd-viewer">
					{loading && (
						<div className="vd-loading">
							<div className="vd-spinner-lg" />
							<p>Cargando DICOM...</p>
						</div>
					)}

					{!loading && error && (
						<div className="vd-error">
							<span>!</span>
							<p>{error}</p>
						</div>
					)}

					<div
						className="vp-visor-area"
						style={{
							display: vistaReporte || error ? "none" : "block",
							visibility: loading ? "hidden" : "visible",
						}}>
						<div
							ref={divRef}
							className="vp-canvas"
							onMouseDown={onMouseDown}
							onMouseMove={onMouseMove}
							onMouseUp={terminarDrag}
							onMouseLeave={terminarDrag}
							onWheel={onWheel}
							onContextMenu={(event) => event.preventDefault()}
						/>
						<div className="vd-overlay-paciente">
							<div>
								<p className="vd-ov-nombre">{nombrePaciente}</p>
								<p className="vd-ov-dato">
									{estudio?.descripcion || estudio?.tipo_estudio || ""}
								</p>
								<p className="vd-ov-dato">{formatearFecha(estudio?.fecha_estudio)}</p>
							</div>
						</div>
						<div className="vp-status-bar">
							<span>Herramienta: {herramientaActiva}</span>
							{zoomInfo != null && <span>Zoom: {zoomInfo}%</span>}
							{wlInfo && <span>{wlInfo}</span>}
							{totalImagenes > 0 && (
								<span>Imagen: {indiceImagen + 1}/{totalImagenes}</span>
							)}
						</div>
					</div>

					{!loading && !error && vistaReporte && (
						<div className="vd-doc-scroll vp-reporte-scroll">
							<div className="rr-page-wrapper vd-rr-page-wrapper">
								<div className="rr-page vd-rr-page">
									<img
										className="rr-membrete"
										src={`data:image/jpeg;base64,${MEMBRETE_B64}`}
										alt="membrete"
									/>
									<div className="rr-contenido vd-rr-contenido">
										<p className="rr-fecha-encabezado">
											{`PUERTO VALLARTA JAL. ${formatearFecha(estudio?.fecha_estudio || new Date())}.`}
										</p>
										<div className="rr-datos-paciente">
											<div className="rr-dato-row">
												<span className="rr-label">PACIENTE:</span>
												<strong>{nombrePaciente || "-"}</strong>
											</div>
											<div className="rr-dato-row">
												<span className="rr-label">DOCTOR:</span>
												<strong>{estudio?.doctor?.nombre || "MÉDICO REFERENTE"}</strong>
											</div>
											<div className="rr-dato-row">
												<span className="rr-label">ESTUDIO:</span>
												<strong>{estudio?.descripcion || estudio?.tipo_estudio || "-"}</strong>
											</div>
										</div>
										<div className="rr-editor vd-rr-editor vp-reporte-texto">
											{String(estudio?.reporte || "")
												.split("\n")
												.map((linea, index) => (
													<p key={index}>{linea || " "}</p>
												))}
										</div>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default VisorPaciente;
