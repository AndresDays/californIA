import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
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
import { MEMBRETE_FALLBACK, cargarMembreteCdc } from "../../../utils/membrete-cdc";
import { htmlReporteRadiologiaParaEditor } from "../../../utils/reporte-radiologia-html";
import {
	ALTURA_TEXTO_VISOR_CON_FIRMA,
	ALTURA_TEXTO_VISOR_SIN_FIRMA,
	MARGEN_MEDICION_REPORTE,
	agruparConclusionReporte,
	crearBloquesReporteParaImprimir,
	elegirEscalaUnaHoja,
	dividirReporteParaImpresion,
	medirBloquesReporte,
	omitirPaginasVacias,
} from "../../../utils/reporte-radiologia-paginado";
import "./ReporteRadiologia.css";
import "./VisorDicom.css";
import "./VisorPaciente.css";

import contrasteIcono from "../../../assets/contrasteIcono.png";
import descargarIcon from "../../../assets/descargarIcono.png";
import ampliarIcon from "../../../assets/lupaIcono.png";
import moverIcon from "../../../assets/moverIcono.png";
import restaurarIcon from "../../../assets/restaurarIcono.png";
import scrollIcon from "../../../assets/scrollIcono.png";
import { normalizarFolioConsulta } from "../../../utils/folios";

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

// Cargo con el que firma el radiólogo la interpretación.
const LEYENDA_FIRMA = "MÉDICO RADIÓLOGO";

// Recorrido mínimo del dedo para pasar a la siguiente imagen.
const DESPLAZAMIENTO_MINIMO_TOQUE = 28;

// Ancho de la hoja del reporte (A4 a 96dpi) más el respiro lateral del visor.
const ANCHO_HOJA_REPORTE = 794;
const MARGEN_HOJA_REPORTE = 24;

const formatearFecha = (fecha) => {
	if (!fecha) return "";
	const f = new Date(fecha);
	if (Number.isNaN(f.getTime())) return String(fecha);
	return f.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
};

const VisorPaciente = () => {
	const { estudioId } = useParams();
	const [searchParams] = useSearchParams();
	const folioPortal = normalizarFolioConsulta(searchParams.get("folio") || "");
	const telefonoPortal = searchParams.get("telefono") || "";
	const divRef = useRef(null);
	const csRef = useRef(null);
	const enabledRef = useRef(false);
	const dragRef = useRef(null);
	const imageIdsRef = useRef([]);
	const indiceRef = useRef(0);
	const herramientaRef = useRef("scroll");
	const gestoRef = useRef(null);

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
	const [membreteSrc, setMembreteSrc] = useState(MEMBRETE_FALLBACK);
	const [radiologo, setRadiologo] = useState(null);
	const [escalaReporte, setEscalaReporte] = useState(1);
	const reporteScrollRef = useRef(null);

	useEffect(() => {
		let cancelado = false;
		cargarMembreteCdc().then((src) => {
			if (!cancelado) setMembreteSrc(src);
		});
		return () => {
			cancelado = true;
		};
	}, []);

	// En celular la hoja de 794px no cabe: se reduce a escala para que el
	// reporte se lea completo sin scroll horizontal.
	useEffect(() => {
		if (!vistaReporte) return undefined;
		const ajustarEscala = () => {
			const ancho = reporteScrollRef.current?.clientWidth || 0;
			if (!ancho) return;
			const disponible = ancho - MARGEN_HOJA_REPORTE;
			setEscalaReporte(Math.max(0.3, Math.min(1, disponible / ANCHO_HOJA_REPORTE)));
		};
		ajustarEscala();
		window.addEventListener("resize", ajustarEscala);
		window.addEventListener("orientationchange", ajustarEscala);
		return () => {
			window.removeEventListener("resize", ajustarEscala);
			window.removeEventListener("orientationchange", ajustarEscala);
		};
	}, [vistaReporte]);

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

	// El paciente llega sin sesión (QR o portal) y las políticas de la base sólo
	// permiten leer estudios a personal autenticado. En ese caso los datos se
	// piden al portal, que valida folio y teléfono y firma las imágenes.
	const cargarDesdePortal = async () => {
		const { data, error } = await supabase.functions.invoke("portal-resultados", {
			body: { p_folio: folioPortal, p_telefono: telefonoPortal, p_id_estudio: estudioId },
		});
		if (error || data?.error) throw new Error(data?.error || "No encontramos el estudio solicitado");
		return {
			estudio: data.estudio,
			paciente: data.paciente,
			radiologo: data.radiologo,
			imagenes: (data.imagenes || []).map((imagen) => ({ ...imagen, imageId: `wadouri:${imagen.url}` })),
		};
	};

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

				const { data: sesion } = await supabase.auth.getSession();
				const usarPortal = !sesion?.session && folioPortal && telefonoPortal;

				let est = null;
				let imagenesConUrl = [];

				if (usarPortal) {
					const datosPortal = await cargarDesdePortal();
					if (cancelado) return;
					est = datosPortal.estudio;
					imagenesConUrl = datosPortal.imagenes;
					if (datosPortal.paciente) setPaciente(datosPortal.paciente);
					if (datosPortal.radiologo) setRadiologo(datosPortal.radiologo);
				} else {
					let errEst;
					({ data: est, error: errEst } = await supabase
						.from("estudios_radiologia")
						.select(`
							id_estudio, storage_path, reporte, tipo_estudio, descripcion, fecha_estudio, id_paciente, id_radiologo,
							doctor:doctores!estudios_radiologia_id_doctor_fkey(nombre)
						`)
						.eq("id_estudio", estudioId)
						.single());
					if (errEst) {
						({ data: est, error: errEst } = await supabase
							.from("estudios_radiologia")
							.select("id_estudio, storage_path, reporte, tipo_estudio, descripcion, fecha_estudio, id_paciente, id_radiologo")
							.eq("id_estudio", estudioId)
							.single());
					}
					if (errEst) throw new Error("No encontramos el estudio solicitado");
					if (cancelado) return;

					if (est?.id_radiologo) {
						const { data: empleado } = await supabase
							.from("empleados")
							.select("nombre, cedula, especialidad, firma_digital, firma_url")
							.eq("id_empleado", est.id_radiologo)
							.maybeSingle();
						if (!cancelado && empleado) {
							setRadiologo({
								nombre: empleado.nombre || "",
								cedula: empleado.cedula || "",
								especialidad: empleado.especialidad || "",
								firmaUrl: empleado.firma_digital || empleado.firma_url || "",
							});
						}
					}

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
					imagenesConUrl = await crearImagenesConUrlFirmada(imagenesDicom);
				}

				setEstudio(est);
				if (imagenesConUrl.length === 0) throw new Error("Este estudio no tiene imagenes disponibles");
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
		}, [estudioId, folioPortal, telefonoPortal]);

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
	const reporteHtml = useMemo(
		() => htmlReporteRadiologiaParaEditor(estudio?.reporte),
		[estudio?.reporte],
	);
	const tieneFirma = Boolean(radiologo?.nombre || radiologo?.firmaUrl);
	// El reporte se reparte en hojas membretadas completas, igual que al
	// imprimirlo, para que el texto nunca invada el pie del membrete. La última
	// hoja reserva el espacio del bloque de firma.
	const altoUltimaHoja = tieneFirma
		? ALTURA_TEXTO_VISOR_CON_FIRMA
		: ALTURA_TEXTO_VISOR_SIN_FIRMA;
	// Si el reporte se pasa de una hoja por poco, se reduce un poco el texto
	// para que quepa completo, igual que al imprimirlo desde el editor.
	const escalaUnaHoja = useMemo(
		() =>
			vistaReporte && reporteHtml
				? elegirEscalaUnaHoja(reporteHtml, altoUltimaHoja - MARGEN_MEDICION_REPORTE)
				: null,
		[altoUltimaHoja, reporteHtml, vistaReporte],
	);
	const paginasReporte = useMemo(() => {
		if (!vistaReporte || !reporteHtml) return [];
		if (escalaUnaHoja) return [[{ html: reporteHtml, alto: 0 }]];
		const altoUltima = altoUltimaHoja;
		const paginas = omitirPaginasVacias(
			dividirReporteParaImpresion(
				agruparConclusionReporte(
					medirBloquesReporte(crearBloquesReporteParaImprimir(reporteHtml)),
					altoUltima,
				),
				ALTURA_TEXTO_VISOR_SIN_FIRMA,
				altoUltima,
			),
		);
		return paginas.length ? paginas : [[{ html: reporteHtml, alto: 0 }]];
	}, [altoUltimaHoja, escalaUnaHoja, reporteHtml, vistaReporte]);
	const totalImagenes = serieActiva?.imagenes?.length || 0;

	const descargarReportePdf = async () => {
		try {
			await generarReportePdf({
				nombrePaciente,
				reporteTexto: reporteHtml,
				membreteSrc,
				firma: radiologo,
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

	const moverPuntero = (event) => {
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

	const onMouseMove = (event) => moverPuntero(event);

	// En celular el visor se maneja con el dedo: un toque arrastra igual que el
	// mouse con la herramienta activa.
	const onTouchStart = (event) => {
		const toque = event.touches?.[0];
		if (!toque) return;
		dragRef.current = { x: toque.clientX, y: toque.clientY };
		gestoRef.current = { y: toque.clientY, cambiado: false };
	};

	const onTouchMove = (event) => {
		const toque = event.touches?.[0];
		if (!toque || !dragRef.current) return;
		if (event.cancelable) event.preventDefault();
		// Con la herramienta de scroll cada deslizada del dedo avanza una sola
		// imagen: así el paciente no se pasa media serie con un gesto.
		if (herramientaRef.current === "scroll") {
			const gesto = gestoRef.current;
			if (!gesto || gesto.cambiado) return;
			const recorrido = toque.clientY - gesto.y;
			if (Math.abs(recorrido) < DESPLAZAMIENTO_MINIMO_TOQUE) return;
			gesto.cambiado = true;
			irAImagen(indiceRef.current + (recorrido < 0 ? 1 : -1));
			return;
		}
		moverPuntero({ clientX: toque.clientX, clientY: toque.clientY });
	};

	const terminarDrag = () => {
		dragRef.current = null;
		gestoRef.current = null;
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
							onTouchStart={onTouchStart}
							onTouchMove={onTouchMove}
							onTouchEnd={terminarDrag}
							onTouchCancel={terminarDrag}
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
						{totalImagenes > 1 && (
							<div className="vp-barra-imagenes">
								<input
									type="range"
									min={0}
									max={totalImagenes - 1}
									step={1}
									value={indiceImagen}
									onChange={(event) => irAImagen(Number(event.target.value))}
									aria-label="Cambiar de imagen"
								/>
								<span>{indiceImagen + 1}/{totalImagenes}</span>
							</div>
						)}
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
						<div className="vd-doc-scroll vp-reporte-scroll" ref={reporteScrollRef}>
							<div
								className="rr-page-wrapper vd-rr-page-wrapper vp-reporte-hoja"
								style={escalaReporte < 1 ? { zoom: escalaReporte } : undefined}>
								{paginasReporte.map((pagina, indicePagina) => (
									<div className="rr-page vd-rr-page" key={`hoja-${indicePagina}`}>
										<img className="rr-membrete" src={membreteSrc} alt="membrete" />
										<div className="rr-contenido vd-rr-contenido">
											<div
												className="rr-editor vd-rr-editor vp-reporte-texto"
												style={escalaUnaHoja ? { zoom: escalaUnaHoja } : undefined}>
												{pagina.map((bloque, indiceBloque) => (
													<div
														key={`bloque-${indiceBloque}`}
														dangerouslySetInnerHTML={{ __html: bloque.html }}
													/>
												))}
											</div>
											{tieneFirma && indicePagina === paginasReporte.length - 1 && (
												<div className="vp-firma">
													{radiologo?.firmaUrl ? (
														<img
															className="vp-firma-img"
															src={radiologo.firmaUrl}
															alt={`Firma de ${radiologo?.nombre || "radiólogo"}`}
														/>
													) : (
														<div className="vp-firma-linea" />
													)}
													<p className="vp-firma-nombre">{radiologo?.nombre}</p>
													<p className="vp-firma-dato">{LEYENDA_FIRMA}</p>
													{radiologo?.cedula && (
														<p className="vp-firma-dato">CE {radiologo.cedula}</p>
													)}
												</div>
											)}
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default VisorPaciente;
