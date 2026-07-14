import { useEffect, useMemo, useRef, useState } from "react";
import "./Panelia.css";

const PATOLOGIAS = [
	{ id: "atelectasis", label: "Atelectasis" },
	{ id: "consolidation", label: "Consolidation" },
	{ id: "infiltration", label: "Infiltration" },
	{ id: "pneumothorax", label: "Pneumothorax" },
	{ id: "edema", label: "Edema" },
	{ id: "emphysema", label: "Emphysema" },
	{ id: "fibrosis", label: "Fibrosis" },
	{ id: "effusion", label: "Effusion" },
	{ id: "pneumonia", label: "Pneumonia" },
	{ id: "pleural_thickening", label: "Pleural Thick." },
	{ id: "cardiomegaly", label: "Cardiomegaly" },
	{ id: "nodule", label: "Nodule" },
	{ id: "mass", label: "Mass" },
	{ id: "hernia", label: "Hernia" },
];

const FASES = [
	"Preprocesando imagen",
	"Ejecutando EVA-02",
	"Aplicando thresholds",
	"Generando Grad-CAM",
];

const DEPLOYED_API_URL = "https://b23824620eb08e.lhr.life";
const API_URL = import.meta.env.VITE_CALIFORNIA_API || DEPLOYED_API_URL;
const THRESHOLD = 0.5;

export default function PanelIA({ activo, imageId, onClose }) {
	const [fase, setFase] = useState(0);
	const [analizando, setAnalizando] = useState(false);
	const [resultados, setResultados] = useState(null);
	const [progreso, setProgreso] = useState(0);
	const [visible, setVisible] = useState(false);
	const [errorMsg, setErrorMsg] = useState(null);

	const [cams, setCams] = useState(null);
	const [camActivo, setCamActivo] = useState(null);
	const [camEnabled, setCamEnabled] = useState(true);

	const prevImageId = useRef(null);
	const abortRef = useRef(null);
	const camOverlayRef = useRef(null);
	const camCanvasRef = useRef(null);

	const camsDisponibles = useMemo(() => {
		if (!cams) return [];
		return Object.entries(cams)
			.filter(([, value]) => !!value)
			.map(([label]) => label);
	}, [cams]);

	useEffect(() => {
		dibujarCamOverlay(camEnabled && camActivo ? cams?.[camActivo] : null);
	}, [camActivo, cams, camEnabled]); // eslint-disable-line

	useEffect(() => {
		if (!activo) limpiarCamOverlay();
	}, [activo]);

	useEffect(() => {
		const onResize = () => {
			dibujarCamOverlay(camEnabled && camActivo ? cams?.[camActivo] : null);
		};

		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, [camActivo, cams, camEnabled]);

	const getDicomCanvas = () => {
		const candidatos = [
			".panel-imagen.activo .cornerstone-element canvas",
			".cornerstone-element canvas",
			".vd-grid canvas",
			".vd-visor canvas",
			".vd-panel canvas",
			"canvas",
		];

		for (const selector of candidatos) {
			const el = document.querySelector(selector);
			if (el && el.width > 0 && el.height > 0) {
				return el;
			}
		}

		return null;
	};

	const getCornerstoneElement = (csCanvas) => {
		const element = csCanvas?.closest?.(".cornerstone-element") || csCanvas?.parentElement;
		return element || null;
	};

	const getImageBounds = async (csCanvas) => {
		if (!csCanvas) return null;

		try {
			const cornerstoneModule = await import("cornerstone-core");
			const cornerstone = cornerstoneModule.default || cornerstoneModule;
			const element = getCornerstoneElement(csCanvas);
			const enabled = element ? cornerstone.getEnabledElement(element) : null;
			const image = enabled?.image;
			const viewport = element ? cornerstone.getViewport(element) : enabled?.viewport;

			if (image && viewport?.scale) {
				const rotation = Math.abs(viewport.rotation || 0) % 180;
				const imageWidth = rotation === 90 ? image.height : image.width;
				const imageHeight = rotation === 90 ? image.width : image.height;
				const scale = viewport.scale;
				const width = imageWidth * scale;
				const height = imageHeight * scale;
				const centerX = csCanvas.width / 2 + (viewport.translation?.x || 0) * scale;
				const centerY = csCanvas.height / 2 + (viewport.translation?.y || 0) * scale;
				const left = centerX - width / 2;
				const top = centerY - height / 2;

				return {
					x: Math.max(0, left),
					y: Math.max(0, top),
					width: Math.max(0, Math.min(csCanvas.width, left + width) - Math.max(0, left)),
					height: Math.max(0, Math.min(csCanvas.height, top + height) - Math.max(0, top)),
				};
			}
		} catch (err) {
			// Cornerstone may still be initializing; fall back to the full canvas.
		}

		return {
			x: 0,
			y: 0,
			width: csCanvas.width,
			height: csCanvas.height,
		};
	};

	const canvasToBlob = (canvas) =>
		new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));

	const recortarImagenActiva = async (csCanvas) => {
		const bounds = await getImageBounds(csCanvas);
		if (!bounds?.width || !bounds?.height) return null;

		const crop = document.createElement("canvas");
		crop.width = Math.round(bounds.width);
		crop.height = Math.round(bounds.height);
		crop
			.getContext("2d")
			.drawImage(
				csCanvas,
				bounds.x,
				bounds.y,
				bounds.width,
				bounds.height,
				0,
				0,
				crop.width,
				crop.height,
			);

		return canvasToBlob(crop);
	};

	const asegurarOverlaySobreCanvas = (csCanvas) => {
		if (!csCanvas) return null;

		let overlay = document.getElementById("pia-cam-overlay");

		if (!overlay) {
			overlay = document.createElement("canvas");
			overlay.id = "pia-cam-overlay";
			overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
        z-index: 6;
        border-radius: 4px;
        transition: opacity 0.25s ease;
        opacity: 0;
      `;
			const parent = csCanvas.parentElement;
			if (!parent) return null;

			const parentStyle = window.getComputedStyle(parent);
			if (parentStyle.position === "static") {
				parent.style.position = "relative";
			}

			parent.appendChild(overlay);
		}

		const parentRect = overlay.parentElement.getBoundingClientRect();
		const canvasRect = csCanvas.getBoundingClientRect();

		overlay.width = csCanvas.width;
		overlay.height = csCanvas.height;
		overlay.style.left = `${canvasRect.left - parentRect.left}px`;
		overlay.style.top = `${canvasRect.top - parentRect.top}px`;
		overlay.style.width = csCanvas.clientWidth
			? `${csCanvas.clientWidth}px`
			: `${csCanvas.width}px`;
		overlay.style.height = csCanvas.clientHeight
			? `${csCanvas.clientHeight}px`
			: `${csCanvas.height}px`;

		camOverlayRef.current = overlay;
		camCanvasRef.current = csCanvas;

		return overlay;
	};

	const dibujarCamOverlay = async (dataUrl) => {
		if (!dataUrl) {
			const overlay = document.getElementById("pia-cam-overlay");
			if (overlay) overlay.style.opacity = "0";
			return;
		}

		const csCanvas = getDicomCanvas();

		if (!csCanvas) {
			console.warn("[PanelIA] No se encontró canvas DICOM para Grad-CAM");
			return;
		}

		const overlay = asegurarOverlaySobreCanvas(csCanvas);
		if (!overlay) return;
		const imageBounds = await getImageBounds(csCanvas);

		const ctx = overlay.getContext("2d");
		ctx.clearRect(0, 0, overlay.width, overlay.height);

		const img = new window.Image();
		img.onload = () => {
			const parentRect = overlay.parentElement.getBoundingClientRect();
			const canvasRect = csCanvas.getBoundingClientRect();

			overlay.width = csCanvas.width;
			overlay.height = csCanvas.height;
			overlay.style.left = `${canvasRect.left - parentRect.left}px`;
			overlay.style.top = `${canvasRect.top - parentRect.top}px`;
			overlay.style.width = csCanvas.clientWidth
				? `${csCanvas.clientWidth}px`
				: `${csCanvas.width}px`;
			overlay.style.height = csCanvas.clientHeight
				? `${csCanvas.clientHeight}px`
				: `${csCanvas.height}px`;

			const drawCtx = overlay.getContext("2d");
			drawCtx.clearRect(0, 0, overlay.width, overlay.height);
			drawCtx.save();
			drawCtx.beginPath();
			drawCtx.rect(
				imageBounds.x,
				imageBounds.y,
				imageBounds.width,
				imageBounds.height,
			);
			drawCtx.clip();
			drawCtx.globalAlpha = 0.55;
			drawCtx.drawImage(
				img,
				imageBounds.x,
				imageBounds.y,
				imageBounds.width,
				imageBounds.height,
			);
			drawCtx.globalAlpha = 1;
			drawCtx.restore();
			overlay.style.opacity = "1";
		};

		img.onerror = () => {
			console.error("[PanelIA] No se pudo cargar imagen base64 del CAM");
		};

		img.src = `data:image/png;base64,${dataUrl}`;
	};

	const limpiarCamOverlay = () => {
		const overlay = document.getElementById("pia-cam-overlay");
		if (overlay) overlay.remove();
		camOverlayRef.current = null;
		camCanvasRef.current = null;
	};

	useEffect(() => {
		if (!activo) {
			setVisible(false);
			setTimeout(() => {
				setResultados(null);
				setAnalizando(false);
				setProgreso(0);
				setErrorMsg(null);
				setCams(null);
				setCamActivo(null);
				limpiarCamOverlay();
			}, 250);
			return;
		}

		setVisible(true);

		if (!imageId) return;
		if (imageId === prevImageId.current && resultados) return;

		prevImageId.current = imageId;
		correrAnalisis();
	}, [activo, imageId]); // eslint-disable-line

	const animarProgreso = () => {
		let p = 0;
		let f = 0;

		setFase(0);

		const fi = setInterval(() => {
			f++;
			if (f < FASES.length) setFase(f);
		}, 600);

		const pi = setInterval(() => {
			const step = p < 85 ? Math.random() * 5 + 2 : 0.2;
			p = Math.min(p + step, 99);
			setProgreso(p);
		}, 80);

		return {
			done: () => {
				clearInterval(fi);
				clearInterval(pi);
				setProgreso(100);
				setFase(FASES.length - 1);
			},
		};
	};

	const correrAnalisis = async () => {
		setAnalizando(true);
		setResultados(null);
		setCams(null);
		setCamActivo(null);
		setProgreso(0);
		setErrorMsg(null);
		limpiarCamOverlay();

		if (abortRef.current) abortRef.current.abort();
		abortRef.current = new AbortController();

		const anim = animarProgreso();

		try {
			const csCanvas = getDicomCanvas();
			let blob;

			if (csCanvas) {
				blob = await recortarImagenActiva(csCanvas);
			} else {
				throw new Error("No hay imagen en el visor");
			}

			if (!blob) {
				throw new Error("No se pudo convertir el canvas a PNG");
			}

			const formData = new FormData();
			formData.append("file", blob, "frame.png");

			console.log("[PanelIA] API_URL =", API_URL);
			console.log("[PanelIA] Fetching =", `${API_URL}/predict-with-cam?top_n=3`);

			const resp = await fetch(`${API_URL}/predict-with-cam?top_n=3`, {
				method: "POST",
				body: formData,
				signal: abortRef.current.signal,
			});

			const raw = await resp.text();
			console.log("[PanelIA] status =", resp.status);
			console.log("[PanelIA] body =", raw);

			if (!resp.ok) {
				throw new Error(`HTTP ${resp.status}: ${raw}`);
			}

			const data = JSON.parse(raw);

			anim.done();

			setTimeout(() => {
				setAnalizando(false);

				const arr = PATOLOGIAS.map((p) => ({
					...p,
					prob: data.probs?.[p.id] ?? 0,
				}));

				setResultados(arr);

				if (data.cams) {
					const camsLimpios = Object.fromEntries(
						Object.entries(data.cams).filter(([, value]) => !!value),
					);

					setCams(camsLimpios);

					if (data.top_label && camsLimpios[data.top_label]) {
						setCamActivo(data.top_label);
						setCamEnabled(true);
					} else {
						const primerCam = Object.keys(camsLimpios)[0] || null;
						setCamActivo(primerCam);
						setCamEnabled(!!primerCam);
					}
				}
			}, 200);
		} catch (err) {
			if (err.name === "AbortError") return;
			console.error("[PanelIA] Error:", err);
			anim.done();
			setAnalizando(false);
			setErrorMsg(`Error: ${err.message}`);
		}
	};

	if (!activo) return null;

	const resultadosOrdenados = resultados
		? [...resultados].sort((a, b) => b.prob - a.prob)
		: [];

	const topPatologia = resultadosOrdenados.length ? resultadosOrdenados[0] : null;
	const riesgosAltos = resultadosOrdenados.filter((item) => item.prob >= THRESHOLD);
	const hasImage = Boolean(imageId);
	const estadoAnalisis = analizando
		? "Analizando"
		: errorMsg
			? "Revisar"
			: resultadosOrdenados.length
				? "Completado"
				: "En espera";
	const estadoClase = estadoAnalisis.toLowerCase().replace(/\s+/g, "-");
	const camStatusText = camsDisponibles.length
		? `${camsDisponibles.length} mapas`
		: "Sin mapa";
	const topPercent = topPatologia ? `${(topPatologia.prob * 100).toFixed(0)}%` : "--";
	const handleClose = () => {
		setVisible(false);
		limpiarCamOverlay();
		onClose?.();
	};

	return (
		<div className={`pia-panel${visible ? " pia-panel--visible" : ""}`}>
			<div className="pia-header">
				<div className="pia-header-left">
					<span className="pia-dot" />
					<div>
						<p className="pia-eyebrow">Asistente IA</p>
						<p className="pia-titulo">Lectura asistida</p>
						<p className="pia-subtitle">Prioriza hallazgos y mapas Grad-CAM.</p>
					</div>
				</div>

				<div className="pia-header-actions">
					<span className={`pia-status pia-status--${estadoClase}`}>
						{estadoAnalisis}
					</span>

					<button
						className="pia-close"
						onClick={handleClose}
						aria-label="Cerrar panel de IA">
						✕
					</button>
				</div>
			</div>

			<div className="pia-api-badge connected">
				<span className="pia-api-dot" />
				<span>Modelo conectado</span>
				<span className="pia-api-divider" />
				<span>Grad-CAM: {camStatusText}</span>
			</div>

			<div className="pia-summary">
				<div className="pia-summary-card pia-summary-card--main">
					<span>Resumen</span>
					<strong>{topPatologia ? topPatologia.label : "Sin lectura"}</strong>
					<small>
						{topPatologia
							? `${topPercent} de probabilidad`
							: hasImage
								? "Listo para analizar"
								: "Sin imagen seleccionada"}
					</small>
				</div>
				<div className="pia-summary-card">
					<span>Riesgo</span>
					<strong>{riesgosAltos.length}</strong>
					<small>{riesgosAltos.length === 1 ? "alerta" : "alertas"}</small>
				</div>
				<div className="pia-summary-card">
					<span>Grad-CAM</span>
					<strong>{camsDisponibles.length}</strong>
					<small>{camEnabled ? "activo" : "apagado"}</small>
				</div>
			</div>

			{analizando && (
				<div className="pia-scanning">
					<div className="pia-scan-box">
						<div className="pia-scan-grid" />
						<div className="pia-scan-beam" />
					</div>

					<p className="pia-fase">
						{FASES[fase]}
						<span className="pia-ellipsis" />
					</p>

					<div className="pia-prog-track">
						<div className="pia-prog-fill" style={{ width: `${progreso}%` }} />
					</div>

					<span className="pia-prog-num">{Math.round(progreso)}%</span>
				</div>
			)}

			{!analizando && errorMsg && (
				<div className="pia-error">
					<span>⚠</span>
					<p>{errorMsg}</p>
					<button onClick={correrAnalisis}>Reintentar</button>
				</div>
			)}

			{!analizando && !errorMsg && camsDisponibles.length > 0 && (
				<div className="pia-cam-selector">
					<div className="pia-cam-head">
						<span className="pia-cam-label">Grad-CAM</span>
						<span className="pia-cam-state">{camEnabled ? "On" : "Off"}</span>

						<button
							type="button"
							onClick={() => {
								const next = !camEnabled;
								setCamEnabled(next);
								if (!next) limpiarCamOverlay();
								else dibujarCamOverlay(camActivo ? cams?.[camActivo] : null);
							}}
							className={`pia-cam-toggle${camEnabled ? " on" : ""}`}
							title={camEnabled ? "Desactivar Grad-CAM" : "Activar Grad-CAM"}>
							<span />
						</button>
					</div>

					<div className="pia-cam-chips">
						{camsDisponibles.map((label) => {
							const pat = PATOLOGIAS.find((p) => p.id === label);
							const texto = pat?.label || label;

							return (
								<button
									key={label}
									className={`pia-cam-chip${camActivo === label ? " active" : ""}`}
									onClick={() => {
										setCamActivo(label);
										setCamEnabled(true);
									}}>
									{texto}
								</button>
							);
						})}
					</div>

					<p className="pia-cam-hint">
						Overlay activo en:{" "}
						<strong>
							{camActivo
								? PATOLOGIAS.find((p) => p.id === camActivo)?.label || camActivo
								: "—"}
						</strong>
					</p>
				</div>
			)}

			{!analizando && !errorMsg && resultadosOrdenados.length > 0 && (
				<>
					<div className="pia-table-header">
						<span className="pia-th-name">Patología</span>
						<span className="pia-th-healthy">Escala de riesgo</span>
						<span className="pia-th-risk">%</span>
					</div>

					<div className="pia-lista">
						{resultadosOrdenados.map((item) => {
							const left = `${Math.max(0, Math.min(100, item.prob * 100))}%`;
							const isAlert = item.prob >= THRESHOLD;
							const isCam = camActivo === item.id && camEnabled;

							return (
								<div
									key={item.id}
									className={`pia-row${isAlert ? " pia-row--alert" : ""}${
										isCam ? " pia-row--cam" : ""
									}`}>
									<div className="pia-row-name">
										<span className="pia-row-label">{item.label}</span>
										{isCam && <span className="pia-cam-dot">🔥</span>}
									</div>

									<div className="pia-bar-wrap">
										<div className="pia-bar-gradient" />
										<div
											className={`pia-bar-marker${isAlert ? " pia-bar-marker--alert" : ""}`}
											style={{ left }}>
											{isAlert && <span className="pia-marker-badge">⚠</span>}
										</div>
									</div>

									<span
										className={`pia-row-score${isAlert ? " pia-row-score--alert" : ""}`}>
										{(item.prob * 100).toFixed(0)}
									</span>
								</div>
							);
						})}
					</div>

					{topPatologia && (
						<div className="pia-footer">
							<div className="pia-footer-note">
								Hallazgo principal: <strong>{topPatologia.label}</strong> ·{" "}
								{(topPatologia.prob * 100).toFixed(1)}%
							</div>

							<button className="pia-btn-reanalizar" onClick={correrAnalisis}>
								Reanalizar
							</button>
							<p className="pia-disclaimer">
								Apoyo visual, no reemplaza la interpretación del radiólogo.
							</p>
						</div>
					)}
				</>
			)}

			{!analizando && !errorMsg && !resultados && (
				<div className="pia-vacio">
					<div className="pia-vacio-icon">IA</div>
					<strong>
						{hasImage ? "Preparando análisis" : "Sin imagen seleccionada"}
					</strong>
					<p>
						{hasImage
							? "El análisis comenzará automáticamente en cuanto la imagen esté lista."
							: "Elige una serie del visor para que la IA pueda analizarla."}
					</p>
				</div>
			)}
		</div>
	);
}
