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

const API_URL = import.meta.env.VITE_CALIFORNIA_API || "";
const THRESHOLD = 0.5;

const genMock = () =>
	PATOLOGIAS.map((p) => ({
		...p,
		prob: Math.random(),
	}));

export default function PanelIA({ activo, imageId }) {
	const [fase, setFase] = useState(0);
	const [analizando, setAnalizando] = useState(false);
	const [resultados, setResultados] = useState(null);
	const [progreso, setProgreso] = useState(0);
	const [visible, setVisible] = useState(false);
	const [errorMsg, setErrorMsg] = useState(null);
	const [modoMock, setModoMock] = useState(!API_URL);

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
			".cornerstone-element.activo canvas",
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
        z-index: 50;
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

		overlay.width = csCanvas.width;
		overlay.height = csCanvas.height;
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

	const dibujarCamOverlay = (dataUrl) => {
		const csCanvas = getDicomCanvas();

		if (!csCanvas) {
			console.warn("[PanelIA] No se encontró canvas DICOM para Grad-CAM");
			return;
		}

		const overlay = asegurarOverlaySobreCanvas(csCanvas);
		if (!overlay) return;

		const ctx = overlay.getContext("2d");
		ctx.clearRect(0, 0, overlay.width, overlay.height);

		if (!dataUrl) {
			overlay.style.opacity = "0";
			return;
		}

		const img = new window.Image();
		img.onload = () => {
			overlay.width = csCanvas.width;
			overlay.height = csCanvas.height;
			overlay.style.width = csCanvas.clientWidth
				? `${csCanvas.clientWidth}px`
				: `${csCanvas.width}px`;
			overlay.style.height = csCanvas.clientHeight
				? `${csCanvas.clientHeight}px`
				: `${csCanvas.height}px`;

			const drawCtx = overlay.getContext("2d");
			drawCtx.clearRect(0, 0, overlay.width, overlay.height);
			drawCtx.globalAlpha = 0.55;
			drawCtx.drawImage(img, 0, 0, overlay.width, overlay.height);
			drawCtx.globalAlpha = 1;
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

		if (modoMock || !API_URL) {
			const anim = animarProgreso();
			setTimeout(() => {
				anim.done();
				setTimeout(() => {
					setAnalizando(false);
					setResultados(genMock());
					setCams(null);
				}, 200);
			}, 2600);
			return;
		}

		if (abortRef.current) abortRef.current.abort();
		abortRef.current = new AbortController();

		const anim = animarProgreso();

		try {
			const csCanvas = getDicomCanvas();
			let blob;

			if (csCanvas) {
				blob = await new Promise((res) =>
					csCanvas.toBlob((b) => res(b), "image/png"),
				);
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

	return (
		<div className={`pia-panel${visible ? " pia-panel--visible" : ""}`}>
			<div className="pia-header">
				<div className="pia-header-left">
					<span className="pia-dot" />
					<div>
						<p className="pia-titulo">Riesgos de Patologías</p>
						<p className="pia-subtitle">
							La región blanca del medio indica que el modelo no está seguro.
						</p>
					</div>
				</div>

				<div className="pia-header-actions">
					{API_URL && (
						<button
							className={`pia-mode-btn${modoMock ? "" : " active"}`}
							onClick={() => {
								setModoMock((m) => !m);
								setResultados(null);
								setCams(null);
								setCamActivo(null);
								setCamEnabled(true);
								limpiarCamOverlay();
							}}
							title={modoMock ? "Simulado" : "Modelo real"}>
							{modoMock ? "MOCK" : "SWIN BASE"}
						</button>
					)}

					<button
						className="pia-close"
						onClick={() => {
							setVisible(false);
							limpiarCamOverlay();
						}}>
						✕
					</button>
				</div>
			</div>

			<div className={`pia-api-badge${API_URL && !modoMock ? " connected" : ""}`}>
				<span className="pia-api-dot" />
				{API_URL && !modoMock ? "Conectado · Grad-CAM activo" : "Modo simulado"}
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
					<span className="pia-cam-label">Grad-CAM</span>

					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: "0.6rem",
							marginBottom: "0.45rem",
						}}>
						<span
							style={{
								fontSize: "0.68rem",
								color: "rgba(255,255,255,0.75)",
							}}>
							{camEnabled ? "On" : "Off"}
						</span>

						<button
							type="button"
							onClick={() => {
								const next = !camEnabled;
								setCamEnabled(next);
								if (!next) limpiarCamOverlay();
								else dibujarCamOverlay(camActivo ? cams?.[camActivo] : null);
							}}
							style={{
								width: "42px",
								height: "22px",
								borderRadius: "999px",
								border: "1px solid rgba(255,255,255,0.14)",
								background: camEnabled
									? "rgba(83,185,219,0.22)"
									: "rgba(255,255,255,0.08)",
								position: "relative",
								cursor: "pointer",
								padding: 0,
							}}
							title={camEnabled ? "Desactivar Grad-CAM" : "Activar Grad-CAM"}>
							<span
								style={{
									position: "absolute",
									top: "2px",
									left: camEnabled ? "21px" : "2px",
									width: "16px",
									height: "16px",
									borderRadius: "50%",
									background: camEnabled ? "#53B9DB" : "rgba(255,255,255,0.8)",
									transition: "left 0.2s ease",
								}}
							/>
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
						<span className="pia-th-healthy">Probabilidad</span>
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
										style={{
											width: 34,
											textAlign: "right",
											fontSize: "0.66rem",
											color: isAlert ? "#fff" : "rgba(255,255,255,0.55)",
											fontVariantNumeric: "tabular-nums",
										}}>
										{(item.prob * 100).toFixed(0)}
									</span>
								</div>
							);
						})}
					</div>

					{topPatologia && (
						<div className="pia-footer">
							<div
								style={{
									fontSize: "0.68rem",
									color: "rgba(255,255,255,0.72)",
									lineHeight: 1.5,
								}}>
								Hallazgo principal:{" "}
								<strong style={{ color: "#fff" }}>{topPatologia.label}</strong> ·{" "}
								{(topPatologia.prob * 100).toFixed(1)}%
							</div>

							<button className="pia-btn-reanalizar" onClick={correrAnalisis}>
								Reanalizar
							</button>
						</div>
					)}
				</>
			)}

			{!analizando && !errorMsg && !resultados && (
				<div className="pia-vacio">
					<div className="pia-vacio-icon">🧠</div>
					<p>Activa la IA para analizar la imagen actual del visor.</p>
				</div>
			)}
		</div>
	);
}
