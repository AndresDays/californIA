import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ModalConfirmarEliminacion from "../../../components/ModalConfirmarEliminacion";
import ModalNotificacion from "../../../components/ModalNotificacion";
import Header from "../../../components/header-principal";
import { useAuth } from "../../../context/auth-context";
import { supabase } from "../../../lib/supabase-client";
import ModalAsignar from "../componentes/ModalAsignar";
import "./VisorDicom.css";

import anguloIcono from "../../../assets/anguloIcono.png";
import anotarIcono from "../../../assets/anotarIcono.png";
import basuraIcon from "../../../assets/basuraIcon.png";
import capturaIcon from "../../../assets/capturaIcono.png";
import centrarIcon from "../../../assets/centrarIcono.png";
import cineIcon from "../../../assets/cineIcono.png";
import comentarioIcon from "../../../assets/comentarioIcono.png";
import compartirIcon from "../../../assets/compartirIcono.png";
import contrasteIcono from "../../../assets/contrasteIcono.png";
import descargarIcon from "../../../assets/descargarIcono.png";
import detallesIcon from "../../../assets/detallesIcono.png";
import doctorIcon from "../../../assets/doctorV2Icono.png";
import { default as lapizIcono, default as reporteIcon } from "../../../assets/editarIcono.png";
import etiquetaIcon from "../../../assets/etiquetaIcono.png";
import exclamacionIcon from "../../../assets/exclamacionIcono.png";
import formatoIcon from "../../../assets/formatoIcono.png";
import informacionIcon from "../../../assets/informacionIcono.png";
import longitudIcono from "../../../assets/longitudIcono.png";
import ampliarIcon from "../../../assets/lupaIcono.png";
import masIcon from "../../../assets/masIcono.png";
import metricasIcon from "../../../assets/metricasIcono.png";
import moverIcon from "../../../assets/moverIcono.png";
import nubeIcono from "../../../assets/nubeIcono.png";
import ojosIcono from "../../../assets/ojosIcono.png";
import referenteIcon from "../../../assets/referenteIcono.png";
import restaurarIcon from "../../../assets/restaurarIcono.png";
import scrollIcon from "../../../assets/scrollIcono.png";
import solicitudIcon from "../../../assets/solicitudIcono.png";
import tecnicoIcon from "../../../assets/tecnicoIcono.png";

let csModules = null;
let csInitPromise = null;

const initCornerstone = () => {
	if (csModules) return Promise.resolve(csModules);
	if (csInitPromise) return csInitPromise;
	csInitPromise = (async () => {
		const cornerstoneModule = await import("cornerstone-core");
		const dicomParserModule = await import("dicom-parser");
		const cornerstoneWADO = await import("cornerstone-wado-image-loader");
		const cornerstoneTools = await import("cornerstone-tools");
		const cornerstone = cornerstoneModule.default || cornerstoneModule;
		const dicomParser = dicomParserModule.default || dicomParserModule;
		cornerstoneWADO.external.cornerstone = cornerstone;
		cornerstoneWADO.external.dicomParser = dicomParser;
		cornerstoneTools.external.cornerstone = cornerstone;
		cornerstoneWADO.configure({
			useWebWorkers: false,
			decodeConfig: { convertFloatPixelDataToInt: false, use16BitDataType: true },
		});
		csModules = { cornerstone, cornerstoneWADO, cornerstoneTools };
		return csModules;
	})();
	return csInitPromise;
};

const TOOLS = [
	{ id: "StackScroll", icon: scrollIcon, label: "Scroll", emoji: "≡" },
	{ id: "Zoom", icon: ampliarIcon, label: "Ampliar", emoji: "🔍" },
	{ id: "Wwwc", icon: contrasteIcono, label: "W/L", emoji: "◑" },
	{ id: "Pan", icon: moverIcon, label: "Mover", emoji: "✥" },
	{ id: "Datos", icon: ojosIcono, label: "Datos", emoji: "👁" },
	{ id: "Length", icon: longitudIcono, label: "Longitud", emoji: "⟵⟶" },
	{ id: "Annotate", icon: anotarIcono, label: "Anotar", emoji: "✎" },
	{ id: "Angle", icon: anguloIcono, label: "Ángulo", emoji: "∠" },
	{ id: "centrar", icon: centrarIcon, label: "Centrar", emoji: "⊕" },
];

const ACTIONS = [
	{ id: "restaurar", icon: restaurarIcon, label: "Restaurar" },
	{ id: "cine", icon: cineIcon, label: "CINE" },
	{ id: "mas", icon: masIcon, label: "Más" },
	{ id: "detalle", icon: detallesIcon, label: "Detalle" },
	{ id: "descargar", icon: descargarIcon, label: "Descargar" },
	{ id: "captura", icon: capturaIcon, label: "Captura" },
	{ id: "reporte", icon: reporteIcon, label: "Reporte" },
	{ id: "informacion", icon: informacionIcon, label: "Info" },
	{ id: "compartir", icon: compartirIcon, label: "Compartir" },
	{ id: "formato", icon: formatoIcon, label: "Formato" },
];

const FORMATOS = [
	{ id: "1x1", cols: 1, rows: 1, label: "1×1" },
	{ id: "2x1", cols: 2, rows: 1, label: "2×1" },
	{ id: "1x2", cols: 1, rows: 2, label: "1×2" },
	{ id: "2x2", cols: 2, rows: 2, label: "2×2" },
	{ id: "3x1", cols: 3, rows: 1, label: "3×1" },
	{ id: "2x3", cols: 3, rows: 2, label: "2×3" },
];

const MAS_ITEMS = [
	{ id: "lupa", icon: ampliarIcon, emoji: null, label: "Lupa" },
	{ id: "ventanaROI", icon: null, emoji: "⬛", label: "Ventana ROI" },
	{ id: "elipse", icon: null, emoji: "⬭", label: "Elipse" },
	{ id: "rectangulo", icon: null, emoji: "▭", label: "Rectángulo" },
	{ id: "negativo", icon: contrasteIcono, emoji: null, label: "Negativo" },
	{ id: "girar", icon: restaurarIcon, emoji: null, label: "Girar →" },
	{ id: "voltearH", icon: null, emoji: "↔", label: "Voltear H" },
	{ id: "voltearV", icon: null, emoji: "↕", label: "Voltear V" },
	{ id: "limpiar", icon: null, emoji: "🗑", label: "Limpiar" },
	{ id: "bidireccional", icon: null, emoji: "⇄", label: "Bidireccional" },
];

const DETALLE_ITEMS = [
	{ id: "referente", icon: referenteIcon, emoji: "👤", label: "Referente" },
	{ id: "radiologo", icon: doctorIcon, emoji: "👨‍⚕️", label: "Radiólogo" },
	{ id: "tecnico", icon: tecnicoIcon, emoji: "👩‍💻", label: "Técnico" },
	{ id: "prioridad", icon: exclamacionIcon, emoji: "❗", label: "Prioridad" },
	{ id: "comentarios", icon: comentarioIcon, emoji: "🗒", label: "Comentarios" },
	{ id: "etiquetas", icon: etiquetaIcon, emoji: "🏷", label: "Etiquetas" },
	{ id: "solicitud", icon: solicitudIcon, emoji: "📄", label: "Solicitud" },
	{ id: "metricas", icon: metricasIcon, emoji: "📊", label: "Métricas" },
];

const REPORTE_ITEMS = [
	{ id: "nueva-pestana", emoji: "📋", label: "Nueva pestaña" },
	{ id: "visualizacion-simultanea", emoji: "🖥", label: "Visualización simultánea" },
	{ id: "adjuntar", emoji: "📎", label: "Adjuntar" },
];

const PanelDicom = ({
	imageId,
	herramienta,
	isActive,
	resetCounter,
	centrarCounter,
	masAccion,
	capturaClip,
	lupaExterna,
	elipseExterna,
	rectExterna,
	bidiExterna,
	onCapturaOk,
	onCapturaFail,
	onClick,
}) => {
	const wrapperRef = useRef(null);
	const divRef = useRef(null);
	const overlayRef = useRef(null);
	const csRef = useRef(null);
	const enabledRef = useRef(false);
	const herramientaRef = useRef(herramienta);
	const dragRef = useRef({ active: false, lastX: 0, lastY: 0 });
	const lupaActivaRef = useRef(false);
	const medicionRef = useRef({
		dibujando: false,
		x1: 0,
		y1: 0,
		lineas: [],
		hoveredIdx: -1,
	});
	const anguloRef = useRef({
		fase: 0,
		p1x: 0,
		p1y: 0,
		p2x: 0,
		p2y: 0,
		previewX: 0,
		previewY: 0,
		angulos: [],
		hoveredIdx: -1,
	});
	const elipseRef = useRef({
		elipses: [],
		dibujando: false,
		hoveredIdx: -1,
		cx: 0,
		cy: 0,
		rx: 0,
		ry: 0,
	});
	const elipseActivaRef = useRef(false);
	const rectRef = useRef({
		rects: [],
		dibujando: false,
		hoveredIdx: -1,
		x1: 0,
		y1: 0,
		x2: 0,
		y2: 0,
	});
	const rectActivaRef = useRef(false);
	const bidiRef = useRef({
		bidis: [],
		dibujando: false,
		hoveredIdx: -1,
		cx: 0,
		cy: 0,
		ex: 0,
		ey: 0,
	});
	const bidiActivaRef = useRef(false);
	const anotacionRef = useRef({ anotaciones: [], hoveredIdx: -1 });

	const [zoom, setZoom] = useState(null);
	const [wl, setWl] = useState(null);
	const [ctxMenu, setCtxMenu] = useState(null);
	const [labelEdit, setLabelEdit] = useState(null);
	const [elipseLabelEdit, setElipseLabelEdit] = useState(null);
	const [rectLabelEdit, setRectLabelEdit] = useState(null);
	const [bidiLabelEdit, setBidiLabelEdit] = useState(null);
	const [inputAnotacion, setInputAnotacion] = useState(null);

	useEffect(() => {
		redibujarOverlayRef.current = redibujarOverlay;
	});

	useEffect(() => {
		herramientaRef.current = herramienta;
	}, [herramienta]);

	useEffect(() => {
		lupaActivaRef.current = !!lupaExterna;
		if (!lupaExterna) redibujarOverlay();
	}, [lupaExterna]); // eslint-disable-line

	useEffect(() => {
		elipseActivaRef.current = !!elipseExterna;
		if (!elipseExterna) {
			elipseRef.current.dibujando = false;
			redibujarOverlay();
		}
	}, [elipseExterna]); // eslint-disable-line

	useEffect(() => {
		rectActivaRef.current = !!rectExterna;
		if (!rectExterna) {
			rectRef.current.dibujando = false;
			redibujarOverlay();
		}
	}, [rectExterna]); // eslint-disable-line

	useEffect(() => {
		bidiActivaRef.current = !!bidiExterna;
		if (!bidiExterna) {
			bidiRef.current.dibujando = false;
			redibujarOverlay();
		}
	}, [bidiExterna]); // eslint-disable-line

	useEffect(() => {
		let cancelled = false;
		const init = async () => {
			const { cornerstone } = await initCornerstone();
			if (cancelled || !divRef.current) return;
			try {
				cornerstone.getEnabledElement(divRef.current);
			} catch (e) {
				try {
					cornerstone.enable(divRef.current);
					enabledRef.current = true;
					csRef.current = cornerstone;
					cornerstone.events.addEventListener("cornerstoneimagerendered", (ev) => {
						if (ev.detail.element !== divRef.current) return;
						const vp = cornerstone.getViewport(divRef.current);
						if (vp) {
							setZoom(Math.round(vp.scale * 100));
							setWl(
								`W:${Math.round(vp.voi?.windowWidth || 0)} L:${Math.round(vp.voi?.windowCenter || 0)}`,
							);
						}
						if (redibujarOverlayRef.current) redibujarOverlayRef.current();
					});
				} catch (err) {
					console.error("[Panel] enable:", err.message);
					return;
				}
			}
			if (imageId) await cargarImagen(imageId);
		};
		init();
		return () => {
			cancelled = true;
		};
	}, []);

	const cargarImagen = async (id) => {
		const cs = csRef.current;
		const el = divRef.current;
		if (!enabledRef.current || !cs || !el) return;
		try {
			const image = await cs.loadAndCacheImage(id);
			cs.displayImage(el, image);
			const vp = cs.getViewport(el);
			if (!vp?.voi?.windowWidth || vp.voi.windowWidth <= 1) {
				cs.setViewport(el, { ...vp, voi: { windowWidth: 2000, windowCenter: 0 } });
			}
			cs.resize(el, true);
			sincronizarOverlay();
		} catch (err) {
			console.error("[Panel] cargarImagen:", err);
		}
	};

	useEffect(() => {
		if (!imageId) return;
		const intentar = async () => {
			if (!enabledRef.current) await new Promise((r) => setTimeout(r, 200));
			await cargarImagen(imageId);
		};
		intentar();
	}, [imageId]);

	useEffect(() => {
		if (!capturaClip) return;
		const dicomCanvas = divRef.current?.querySelector("canvas");
		const overlay = overlayRef.current;
		if (!dicomCanvas) return;
		const merged = document.createElement("canvas");
		merged.width = dicomCanvas.width;
		merged.height = dicomCanvas.height;
		const ctx = merged.getContext("2d");
		ctx.drawImage(dicomCanvas, 0, 0);
		if (overlay) ctx.drawImage(overlay, 0, 0);
		merged.toBlob(async (blob) => {
			try {
				await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
				onCapturaOk?.();
			} catch (err) {
				const link = document.createElement("a");
				link.download = `captura_${Date.now()}.png`;
				link.href = URL.createObjectURL(blob);
				link.click();
				onCapturaFail?.();
			}
		}, "image/png");
	}, [capturaClip]);

	useEffect(() => {
		if (!masAccion) return;
		const cs = csRef.current,
			el = divRef.current;
		if (!enabledRef.current || !cs || !el) return;
		try {
			const vp = cs.getViewport(el);
			if (!vp) return;
			const id = masAccion.id;
			if (id === "negativo") {
				vp.invert = !vp.invert;
				cs.setViewport(el, vp);
				cs.updateImage(el);
			}
			if (id === "girar") {
				vp.rotation = ((vp.rotation || 0) + 90) % 360;
				cs.setViewport(el, vp);
				cs.updateImage(el);
			}
			if (id === "voltearH") {
				vp.hflip = !vp.hflip;
				cs.setViewport(el, vp);
				cs.updateImage(el);
			}
			if (id === "voltearV") {
				vp.vflip = !vp.vflip;
				cs.setViewport(el, vp);
				cs.updateImage(el);
			}
			if (id === "limpiar") {
				medicionRef.current.lineas = [];
				medicionRef.current.dibujando = false;
				anotacionRef.current.anotaciones = [];
				anguloRef.current.angulos = [];
				anguloRef.current.fase = 0;
				elipseRef.current.elipses = [];
				elipseRef.current.dibujando = false;
				rectRef.current.rects = [];
				rectRef.current.dibujando = false;
				bidiRef.current.bidis = [];
				bidiRef.current.dibujando = false;
				const overlay = overlayRef.current;
				if (overlay)
					overlay.getContext("2d").clearRect(0, 0, overlay.width, overlay.height);
			}
		} catch (err) {}
	}, [masAccion]);

	useEffect(() => {
		if (!resetCounter) return;
		const cs = csRef.current,
			el = divRef.current;
		if (!enabledRef.current || !cs || !el) return;
		try {
			cs.reset(el);
			cs.updateImage(el);
			medicionRef.current.lineas = [];
			medicionRef.current.dibujando = false;
			anotacionRef.current.anotaciones = [];
			anguloRef.current.angulos = [];
			anguloRef.current.fase = 0;
			const overlay = overlayRef.current;
			if (overlay)
				overlay.getContext("2d").clearRect(0, 0, overlay.width, overlay.height);
		} catch (err) {}
	}, [resetCounter]);

	useEffect(() => {
		if (!centrarCounter) return;
		const cs = csRef.current,
			el = divRef.current;
		if (!enabledRef.current || !cs || !el) return;
		try {
			cs.reset(el);
			cs.updateImage(el);
			redibujarOverlayRef.current?.();
		} catch (err) {}
	}, [centrarCounter]);

	const sincronizarOverlay = () => {
		const canvas = divRef.current?.querySelector("canvas");
		const overlay = overlayRef.current;
		if (!canvas || !overlay) return;
		overlay.width = canvas.width;
		overlay.height = canvas.height;
		overlay.style.width = canvas.style.width || canvas.width + "px";
		overlay.style.height = canvas.style.height || canvas.height + "px";
	};

	const getCanvasPos = (e) => {
		const overlay = overlayRef.current;
		if (!overlay) return { x: 0, y: 0 };
		const rect = overlay.getBoundingClientRect();
		return {
			x: (e.clientX - rect.left) * (overlay.width / rect.width),
			y: (e.clientY - rect.top) * (overlay.height / rect.height),
		};
	};

	const getScreenPos = (canvasX, canvasY) => {
		const overlay = overlayRef.current;
		if (!overlay) return { x: 0, y: 0 };
		const rect = overlay.getBoundingClientRect();
		return {
			x: canvasX * (rect.width / overlay.width) + rect.left,
			y: canvasY * (rect.height / overlay.height) + rect.top,
		};
	};

	const pixelSpacing = () => {
		const cs = csRef.current;
		const el = divRef.current;
		if (!cs || !el) return { x: 1, y: 1 };
		try {
			const img = cs.getImage(el);
			const rcs = img?.rowPixelSpacing || img?.data?.floatString?.("x00280030") || 1;
			const cps = img?.columnPixelSpacing || rcs;
			return { x: parseFloat(cps) || 1, y: parseFloat(rcs) || 1 };
		} catch (e) {
			return { x: 1, y: 1 };
		}
	};

	const distanciaMM = (x1, y1, x2, y2) => {
		const cs = csRef.current;
		const el = divRef.current;
		if (!cs || !el) return 0;
		try {
			const vp = cs.getViewport(el);
			const canvas = el.querySelector("canvas");
			if (!vp || !canvas) return 0;
			const ps = pixelSpacing();
			const cx = canvas.width / 2 + vp.translation.x * vp.scale;
			const cy = canvas.height / 2 + vp.translation.y * vp.scale;
			const px1 = (x1 - cx) / vp.scale,
				py1 = (y1 - cy) / vp.scale;
			const px2 = (x2 - cx) / vp.scale,
				py2 = (y2 - cy) / vp.scale;
			const dx = (px2 - px1) * ps.x,
				dy = (py2 - py1) * ps.y;
			return Math.sqrt(dx * dx + dy * dy);
		} catch (e) {
			return 0;
		}
	};

	const getVp = () => {
		try {
			const vp = csRef.current?.getViewport(divRef.current);
			const canvas = divRef.current?.querySelector("canvas");
			if (vp && canvas) return { vp, canvas };
		} catch {}
		return null;
	};

	const canvasToPixel = (cx, cy) => {
		const r = getVp();
		if (!r) return { px: cx, py: cy };
		const originX = r.canvas.width / 2 + r.vp.translation.x * r.vp.scale;
		const originY = r.canvas.height / 2 + r.vp.translation.y * r.vp.scale;
		return { px: (cx - originX) / r.vp.scale, py: (cy - originY) / r.vp.scale };
	};

	const pixelToCanvas = (px, py) => {
		const r = getVp();
		if (!r) return { cx: px, cy: py };
		const originX = r.canvas.width / 2 + r.vp.translation.x * r.vp.scale;
		const originY = r.canvas.height / 2 + r.vp.translation.y * r.vp.scale;
		return { cx: px * r.vp.scale + originX, cy: py * r.vp.scale + originY };
	};

	const lineaHitTest = (x, y, l) => {
		const dx = l.x2 - l.x1,
			dy = l.y2 - l.y1;
		const len2 = dx * dx + dy * dy;
		if (len2 === 0) return false;
		const t = Math.max(0, Math.min(1, ((x - l.x1) * dx + (y - l.y1) * dy) / len2));
		const nx = l.x1 + t * dx - x,
			ny = l.y1 + t * dy - y;
		return Math.sqrt(nx * nx + ny * ny) < 8;
	};

	const anotacionHitTest = (x, y, a) => {
		return Math.abs(x - a.x) < 60 && Math.abs(y - a.y) < 16;
	};

	const redibujarOverlayRef = useRef(null);
	const redibujarOverlay = () => {
		const overlay = overlayRef.current;
		if (!overlay) return;
		sincronizarOverlay();
		const ctx = overlay.getContext("2d");
		ctx.clearRect(0, 0, overlay.width, overlay.height);

		const vpScale = getVp()?.vp.scale ?? 1;

		const { lineas, hoveredIdx: lHov, dibujando } = medicionRef.current;
		lineas.forEach((l, i) => {
			const c1 = pixelToCanvas(l.px1, l.py1),
				c2 = pixelToCanvas(l.px2, l.py2);
			dibujarLinea(
				ctx,
				{ x1: c1.cx, y1: c1.cy, x2: c2.cx, y2: c2.cy, dist: l.dist, label: l.label },
				i === lHov ? "hover" : "normal",
			);
		});
		if (dibujando && medicionRef.current.x2 !== undefined) {
			const { x1, y1, x2, y2 } = medicionRef.current;
			dibujarLinea(
				ctx,
				{ x1, y1, x2, y2, dist: distanciaMM(x1, y1, x2, y2) },
				"preview",
			);
		}

		const { anotaciones, hoveredIdx: aHov } = anotacionRef.current;
		anotaciones.forEach((a, i) => {
			const ca = pixelToCanvas(a.px, a.py);
			dibujarAnotacion(
				ctx,
				{ x: ca.cx, y: ca.cy, texto: a.texto },
				i === aHov ? "hover" : "normal",
			);
		});

		const {
			angulos,
			hoveredIdx: angHov,
			fase,
			p1x,
			p1y,
			p2x,
			p2y,
			previewX,
			previewY,
		} = anguloRef.current;
		angulos.forEach((a, i) => {
			const c1 = pixelToCanvas(a.pp1x, a.pp1y);
			const c2 = pixelToCanvas(a.pp2x, a.pp2y);
			const c3 = pixelToCanvas(a.pp3x, a.pp3y);
			dibujarAngulo(
				ctx,
				{
					p1x: c1.cx,
					p1y: c1.cy,
					p2x: c2.cx,
					p2y: c2.cy,
					p3x: c3.cx,
					p3y: c3.cy,
					grados: a.grados,
				},
				i === angHov ? "hover" : "normal",
			);
		});
		if (fase === 1) {
			ctx.save();
			ctx.strokeStyle = "rgba(255,220,0,0.75)";
			ctx.lineWidth = 1.5;
			ctx.setLineDash([5, 3]);
			ctx.beginPath();
			ctx.moveTo(p1x, p1y);
			ctx.lineTo(previewX, previewY);
			ctx.stroke();
			ctx.restore();
		}
		if (fase === 2) {
			const grados = calcularAngulo(p1x, p1y, p2x, p2y, previewX, previewY);
			dibujarAngulo(
				ctx,
				{ p1x, p1y, p2x, p2y, p3x: previewX, p3y: previewY, grados },
				"preview",
			);
		}

		const {
			elipses,
			hoveredIdx: eHov,
			dibujando: eDib,
			cx: eCx,
			cy: eCy,
			rx: eRx,
			ry: eRy,
		} = elipseRef.current;
		elipses.forEach((e, i) => {
			const cc = pixelToCanvas(e.pcx, e.pcy);
			dibujarElipseShape(
				ctx,
				{
					cx: cc.cx,
					cy: cc.cy,
					rx: e.prx * vpScale,
					ry: e.pry * vpScale,
					stats: e.stats,
					label: e.label,
				},
				i === eHov ? "hover" : "normal",
			);
		});
		if (eDib && eRx > 0 && eRy > 0) {
			const statsPreview = calcularEstadisticasElipse(eCx, eCy, eRx, eRy);
			dibujarElipseShape(
				ctx,
				{ cx: eCx, cy: eCy, rx: eRx, ry: eRy, stats: statsPreview },
				"preview",
			);
		}

		const {
			rects,
			hoveredIdx: rHov,
			dibujando: rDib,
			x1: rX1,
			y1: rY1,
			x2: rX2,
			y2: rY2,
		} = rectRef.current;
		rects.forEach((r, i) => {
			const cr1 = pixelToCanvas(r.px1, r.py1),
				cr2 = pixelToCanvas(r.px2, r.py2);
			dibujarRectShape(
				ctx,
				{
					x1: cr1.cx,
					y1: cr1.cy,
					x2: cr2.cx,
					y2: cr2.cy,
					stats: r.stats,
					label: r.label,
				},
				i === rHov ? "hover" : "normal",
			);
		});
		if (rDib && Math.abs(rX2 - rX1) > 2 && Math.abs(rY2 - rY1) > 2) {
			const statsR = calcularEstadisticasRect(rX1, rY1, rX2, rY2);
			dibujarRectShape(
				ctx,
				{ x1: rX1, y1: rY1, x2: rX2, y2: rY2, stats: statsR },
				"preview",
			);
		}

		const {
			bidis,
			hoveredIdx: bHov,
			dibujando: bDib,
			cx: bCx,
			cy: bCy,
			ex: bEx,
			ey: bEy,
		} = bidiRef.current;
		bidis.forEach((b, i) => {
			const cb1 = pixelToCanvas(b.pcx, b.pcy),
				cb2 = pixelToCanvas(b.pex, b.pey);
			dibujarBidiShape(
				ctx,
				{ cx: cb1.cx, cy: cb1.cy, ex: cb2.cx, ey: cb2.cy, label: b.label },
				i === bHov ? "hover" : "normal",
			);
		});
		if (bDib && Math.hypot(bEx - bCx, bEy - bCy) > 5) {
			dibujarBidiShape(ctx, { cx: bCx, cy: bCy, ex: bEx, ey: bEy }, "preview");
		}
	};

	const dibujarLinea = (ctx, l, mode) => {
		const { x1, y1, x2, y2, dist, label } = l;
		const isPreview = mode === "preview";
		const isHover = mode === "hover";
		const color = isPreview
			? "rgba(255,220,0,0.9)"
			: isHover
				? "#4cff72"
				: "rgba(73,178,212,0.95)";
		ctx.save();
		ctx.strokeStyle = color;
		ctx.lineWidth = isHover ? 2 : 1.5;
		ctx.setLineDash(isPreview ? [6, 3] : []);
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.stroke();
		[
			{ x: x1, y: y1 },
			{ x: x2, y: y2 },
		].forEach((p) => {
			ctx.beginPath();
			ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
			ctx.fillStyle = color;
			ctx.fill();
		});
		const mx = (x1 + x2) / 2,
			my = (y1 + y2) / 2;
		const txt = label
			? `${label} (${dist?.toFixed(1)} mm)`
			: dist > 0
				? `${dist.toFixed(1)} mm`
				: "";
		if (!txt) {
			ctx.restore();
			return;
		}
		ctx.font = "bold 13px monospace";
		const tw = ctx.measureText(txt).width;
		const pad = 4;
		ctx.fillStyle = "rgba(0,0,0,0.65)";
		ctx.fillRect(mx - tw / 2 - pad, my - 14, tw + pad * 2, 20);
		ctx.fillStyle = isPreview ? "#FFE000" : isHover ? "#4cff72" : "#53B9DB";
		ctx.textAlign = "center";
		ctx.fillText(txt, mx, my + 2);
		ctx.restore();
	};

	const dibujarAnotacion = (ctx, a, mode) => {
		const isHover = mode === "hover";
		const color = isHover ? "#4cff72" : "#FFE000";
		const arrowLen = 22;
		ctx.save();
		ctx.strokeStyle = color;
		ctx.fillStyle = color;
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(a.x, a.y);
		ctx.lineTo(a.x + arrowLen, a.y - arrowLen * 0.6);
		ctx.stroke();
		const ang = Math.atan2(-arrowLen * 0.6, arrowLen);
		const tipX = a.x,
			tipY = a.y;
		ctx.beginPath();
		ctx.moveTo(tipX, tipY);
		ctx.lineTo(tipX + 9 * Math.cos(ang - 0.4), tipY + 9 * Math.sin(ang - 0.4));
		ctx.lineTo(tipX + 9 * Math.cos(ang + 0.4), tipY + 9 * Math.sin(ang + 0.4));
		ctx.closePath();
		ctx.fill();
		ctx.font = "bold 13px monospace";
		ctx.fillStyle = color;
		ctx.textAlign = "left";
		ctx.shadowColor = "rgba(0,0,0,0.9)";
		ctx.shadowBlur = 4;
		ctx.fillText(a.texto, a.x + arrowLen + 4, a.y - arrowLen * 0.6 + 4);
		ctx.restore();
	};

	const dibujarAngulo = (ctx, a, mode) => {
		const isHover = mode === "hover";
		const isPreview = mode === "preview";
		const color = isPreview
			? "rgba(255,220,0,0.9)"
			: isHover
				? "#4cff72"
				: "#FFE000";
		ctx.save();
		ctx.strokeStyle = color;
		ctx.lineWidth = isHover ? 2 : 1.5;
		ctx.setLineDash(isPreview ? [6, 3] : []);
		ctx.beginPath();
		ctx.moveTo(a.p1x, a.p1y);
		ctx.lineTo(a.p2x, a.p2y);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(a.p2x, a.p2y);
		ctx.lineTo(a.p3x, a.p3y);
		ctx.stroke();
		[
			{ x: a.p1x, y: a.p1y },
			{ x: a.p2x, y: a.p2y },
			{ x: a.p3x, y: a.p3y },
		].forEach((p) => {
			ctx.beginPath();
			ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
			ctx.fillStyle = color;
			ctx.fill();
		});
		const r = 22;
		const ang1 = Math.atan2(a.p1y - a.p2y, a.p1x - a.p2x);
		const ang2 = Math.atan2(a.p3y - a.p2y, a.p3x - a.p2x);
		ctx.setLineDash([]);
		let startA = ang1,
			endA = ang2;
		let diff = endA - startA;
		while (diff < -Math.PI) diff += 2 * Math.PI;
		while (diff > Math.PI) diff -= 2 * Math.PI;
		ctx.beginPath();
		ctx.arc(a.p2x, a.p2y, r, startA, startA + diff, diff < 0);
		ctx.stroke();
		if (a.grados !== undefined) {
			const midAng = startA + diff / 2;
			const tx = a.p2x + (r + 18) * Math.cos(midAng);
			const ty = a.p2y + (r + 18) * Math.sin(midAng);
			ctx.font = "bold 13px monospace";
			ctx.fillStyle = color;
			ctx.textAlign = "center";
			ctx.shadowColor = "rgba(0,0,0,0.9)";
			ctx.shadowBlur = 4;
			ctx.fillText(`${a.grados.toFixed(2)}°`, tx, ty);
		}
		ctx.restore();
	};

	const calcularAngulo = (p1x, p1y, p2x, p2y, p3x, p3y) => {
		const ang1 = Math.atan2(p1y - p2y, p1x - p2x);
		const ang2 = Math.atan2(p3y - p2y, p3x - p2x);
		let diff = ang2 - ang1;
		while (diff < -Math.PI) diff += 2 * Math.PI;
		while (diff > Math.PI) diff -= 2 * Math.PI;
		return Math.abs((diff * 180) / Math.PI);
	};

	const rectHitTest = (x, y, r) => {
		const lx = Math.min(r.x1, r.x2),
			rx2 = Math.max(r.x1, r.x2);
		const ly = Math.min(r.y1, r.y2),
			ry2 = Math.max(r.y1, r.y2);
		const onH = Math.abs(y - ly) < 8 || Math.abs(y - ry2) < 8;
		const onV = Math.abs(x - lx) < 8 || Math.abs(x - rx2) < 8;
		const inX = x >= lx - 8 && x <= rx2 + 8;
		const inY = y >= ly - 8 && y <= ry2 + 8;
		return (onH && inX) || (onV && inY);
	};

	const elipseHitTest = (x, y, e) => {
		const dx = (x - e.cx) / (e.rx || 1);
		const dy = (y - e.cy) / (e.ry || 1);
		const d = Math.sqrt(dx * dx + dy * dy);
		return Math.abs(d - 1) < 10 / Math.min(e.rx, e.ry || 1);
	};

	const anguloHitTest = (x, y, a) => {
		const hitSeg = (x1, y1, x2, y2) => {
			const dx = x2 - x1,
				dy = y2 - y1,
				len2 = dx * dx + dy * dy;
			if (len2 === 0) return false;
			const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / len2));
			return Math.hypot(x1 + t * dx - x, y1 + t * dy - y) < 8;
		};
		return hitSeg(a.p1x, a.p1y, a.p2x, a.p2y) || hitSeg(a.p2x, a.p2y, a.p3x, a.p3y);
	};

	const calcularEstadisticasRect = (x1, y1, x2, y2) => {
		const dicomCanvas = divRef.current?.querySelector("canvas");
		if (!dicomCanvas) return { area: 0, mean: 0, std: 0 };
		const ctx2 = document.createElement("canvas").getContext("2d");
		const W = dicomCanvas.width,
			H = dicomCanvas.height;
		ctx2.canvas.width = W;
		ctx2.canvas.height = H;
		ctx2.drawImage(dicomCanvas, 0, 0);
		const imageData = ctx2.getImageData(0, 0, W, H);
		const data = imageData.data;
		const valores = [];
		const minX = Math.max(0, Math.floor(Math.min(x1, x2)));
		const maxX = Math.min(W - 1, Math.ceil(Math.max(x1, x2)));
		const minY = Math.max(0, Math.floor(Math.min(y1, y2)));
		const maxY = Math.min(H - 1, Math.ceil(Math.max(y1, y2)));
		for (let y = minY; y <= maxY; y++) {
			for (let x = minX; x <= maxX; x++) {
				const idx = (y * W + x) * 4;
				valores.push(data[idx]);
			}
		}
		if (valores.length === 0) return { area: 0, mean: 0, std: 0 };
		const mean = valores.reduce((a, b) => a + b, 0) / valores.length;
		const std = Math.sqrt(
			valores.reduce((a, b) => a + (b - mean) ** 2, 0) / valores.length,
		);
		const ps = pixelSpacing();
		const area = Math.abs(x2 - x1) * Math.abs(y2 - y1) * ps.x * ps.y;
		const toHU = (v) => (v / 255) * 4095 - 1024;
		return {
			area: area.toFixed(2),
			mean: toHU(mean).toFixed(2),
			std: (std * (4095 / 255)).toFixed(2),
		};
	};

	const calcularEstadisticasElipse = (cx, cy, rx, ry) => {
		const dicomCanvas = divRef.current?.querySelector("canvas");
		if (!dicomCanvas) return { area: 0, mean: 0, std: 0 };
		const ctx2 = document.createElement("canvas").getContext("2d");
		const W = dicomCanvas.width,
			H = dicomCanvas.height;
		ctx2.canvas.width = W;
		ctx2.canvas.height = H;
		ctx2.drawImage(dicomCanvas, 0, 0);
		const imageData = ctx2.getImageData(0, 0, W, H);
		const data = imageData.data;
		const valores = [];
		for (
			let y = Math.max(0, Math.floor(cy - ry));
			y <= Math.min(H - 1, Math.ceil(cy + ry));
			y++
		) {
			for (
				let x = Math.max(0, Math.floor(cx - rx));
				x <= Math.min(W - 1, Math.ceil(cx + rx));
				x++
			) {
				const dx = (x - cx) / rx,
					dy = (y - cy) / ry;
				if (dx * dx + dy * dy <= 1) {
					const idx = (y * W + x) * 4;
					valores.push(data[idx]);
				}
			}
		}
		if (valores.length === 0) return { area: 0, mean: 0, std: 0 };
		const mean = valores.reduce((a, b) => a + b, 0) / valores.length;
		const std = Math.sqrt(
			valores.reduce((a, b) => a + (b - mean) ** 2, 0) / valores.length,
		);
		const ps = pixelSpacing();
		const area = Math.PI * rx * ry * ps.x * ps.y;
		const toHU = (v) => (v / 255) * 4095 - 1024;
		const meanHU = toHU(mean);
		const stdHU = std * (4095 / 255);
		return { area: area.toFixed(2), mean: meanHU.toFixed(2), std: stdHU.toFixed(2) };
	};

	const bidiHitTest = (x, y, b) => {
		const hitSeg = (x1, y1, x2, y2) => {
			const dx = x2 - x1,
				dy = y2 - y1,
				len2 = dx * dx + dy * dy;
			if (len2 === 0) return false;
			const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / len2));
			return Math.hypot(x1 + t * dx - x, y1 + t * dy - y) < 8;
		};
		const { cx, cy, ex, ey } = b;
		const dx = ex - cx,
			dy = ey - cy;
		const len = Math.hypot(dx, dy) || 1;
		const hw = len / 2;
		const px = (-dy / len) * hw,
			py = (dx / len) * hw;
		return (
			hitSeg(cx, cy, ex, ey) ||
			hitSeg(cx + dx / 2 - px, cy + dy / 2 - py, cx + dx / 2 + px, cy + dy / 2 + py)
		);
	};

	const dibujarBidiShape = (ctx, b, mode) => {
		const { cx, cy, ex, ey, label } = b;
		const isPreview = mode === "preview";
		const isHover = mode === "hover";
		const color = isPreview
			? "rgba(255,220,0,0.85)"
			: isHover
				? "#4cff72"
				: "rgba(255,220,0,0.95)";
		const dx = ex - cx,
			dy = ey - cy;
		const Lpx = Math.hypot(dx, dy);
		if (Lpx < 1) return;

		const ux = dx / Lpx,
			uy = dy / Lpx;
		const Wpx = Lpx / 2;
		const mx = cx + dx / 2,
			my = cy + dy / 2;
		const perpX = (-uy * Wpx) / 2,
			perpY = (ux * Wpx) / 2;

		ctx.save();
		ctx.strokeStyle = color;
		ctx.lineWidth = isHover ? 2.5 : 1.8;
		ctx.setLineDash(isPreview ? [6, 3] : []);

		ctx.beginPath();
		ctx.moveTo(cx, cy);
		ctx.lineTo(ex, ey);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(mx - perpX, my - perpY);
		ctx.lineTo(mx + perpX, my + perpY);
		ctx.stroke();

		[
			[cx, cy],
			[ex, ey],
			[mx - perpX, my - perpY],
			[mx + perpX, my + perpY],
		].forEach(([px2, py2]) => {
			ctx.beginPath();
			ctx.arc(px2, py2, 4, 0, Math.PI * 2);
			ctx.fillStyle = color;
			ctx.fill();
		});

		const Lmm = distanciaMM(cx, cy, ex, ey).toFixed(1);
		const Wmm = distanciaMM(mx - perpX, my - perpY, mx + perpX, my + perpY).toFixed(1);

		const tx = cx + 8,
			ty = cy - 8;
		ctx.font = "bold 13px monospace";
		ctx.fillStyle = color;
		ctx.shadowColor = "rgba(0,0,0,0.9)";
		ctx.shadowBlur = 4;
		ctx.setLineDash([]);
		if (label) ctx.fillText(label, tx, ty - 36);
		ctx.fillText("L " + Lmm + " mm", tx, ty - 18);
		ctx.fillText("W " + Wmm + " mm", tx, ty);
		ctx.restore();
	};

	const dibujarRectShape = (ctx, r, mode) => {
		const { x1, y1, x2, y2, stats, label } = r;
		const isPreview = mode === "preview";
		const isHover = mode === "hover";
		const color = isPreview
			? "rgba(73,178,212,0.85)"
			: isHover
				? "#4cff72"
				: "rgba(73,178,212,0.95)";
		const lx = Math.min(x1, x2),
			ly = Math.min(y1, y2);
		const rw = Math.abs(x2 - x1),
			rh = Math.abs(y2 - y1);
		ctx.save();
		ctx.strokeStyle = color;
		ctx.lineWidth = isHover ? 2.5 : 1.8;
		ctx.setLineDash(isPreview ? [6, 3] : []);
		ctx.strokeRect(lx, ly, rw, rh);
		[
			[x1, y1],
			[x2, y1],
			[x2, y2],
			[x1, y2],
		].forEach(([px, py]) => {
			ctx.beginPath();
			ctx.arc(px, py, 4, 0, Math.PI * 2);
			ctx.fillStyle = color;
			ctx.fill();
		});
		if (stats) {
			const tx = Math.max(x1, x2) + 8;
			const ty = Math.min(y1, y2) + 16;
			ctx.font = "bold 13px monospace";
			ctx.fillStyle = color;
			ctx.shadowColor = "rgba(0,0,0,0.8)";
			ctx.shadowBlur = 4;
			if (label) ctx.fillText(label, tx, ty - 18);
			ctx.fillText("Área: " + stats.area + " mm²", tx, ty);
			ctx.fillText("Media: " + stats.mean, tx, ty + 18);
			ctx.fillText("Desv. Est.: " + stats.std, tx, ty + 36);
		}
		ctx.restore();
	};

	const dibujarElipseShape = (ctx, e, mode) => {
		const { cx, cy, rx, ry, stats } = e;
		const isPreview = mode === "preview";
		const isHover = mode === "hover";
		const color = isPreview
			? "rgba(255,220,0,0.85)"
			: isHover
				? "#4cff72"
				: "rgba(255,220,0,0.95)";
		ctx.save();
		ctx.strokeStyle = color;
		ctx.lineWidth = isHover ? 2.5 : 1.8;
		ctx.setLineDash(isPreview ? [6, 3] : []);
		ctx.beginPath();
		ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
		ctx.stroke();
		if (stats) {
			const tx = cx + rx + 8;
			const ty = cy - ry / 2;
			ctx.font = "bold 13px monospace";
			ctx.fillStyle = color;
			ctx.shadowColor = "rgba(0,0,0,0.8)";
			ctx.shadowBlur = 4;
			if (e.label) ctx.fillText(e.label, tx, ty - 18);
			ctx.fillText("Área: " + stats.area + " mm²", tx, ty);
			ctx.fillText("Media: " + stats.mean, tx, ty + 18);
			ctx.fillText("Desv. Est.: " + stats.std, tx, ty + 36);
		}
		ctx.restore();
	};

	const dibujarLupa = (clientX, clientY) => {
		const dicomCanvas = divRef.current?.querySelector("canvas");
		const overlay = overlayRef.current;
		if (!dicomCanvas || !overlay) return;

		const RADIO = 100;
		const ZOOM = 3;

		const rect = overlay.getBoundingClientRect();
		const scaleX = overlay.width / rect.width;
		const scaleY = overlay.height / rect.height;
		const cx = (clientX - rect.left) * scaleX;
		const cy = (clientY - rect.top) * scaleY;

		const srcW = (RADIO * 2) / ZOOM;
		const srcH = (RADIO * 2) / ZOOM;
		const srcX = cx - srcW / 2;
		const srcY = cy - srcH / 2;

		redibujarOverlay();

		const ctx = overlay.getContext("2d");

		ctx.save();
		ctx.beginPath();
		ctx.arc(cx, cy, RADIO, 0, Math.PI * 2);
		ctx.fillStyle = "#000";
		ctx.fill();
		ctx.restore();

		ctx.save();
		ctx.beginPath();
		ctx.arc(cx, cy, RADIO, 0, Math.PI * 2);
		ctx.clip();
		ctx.drawImage(
			dicomCanvas,
			srcX, srcY, srcW, srcH,
			cx - RADIO, cy - RADIO, RADIO * 2, RADIO * 2,
		);
		ctx.restore();

		ctx.save();
		ctx.beginPath();
		ctx.arc(cx, cy, RADIO, 0, Math.PI * 2);
		ctx.strokeStyle = "rgba(73,178,212,0.95)";
		ctx.lineWidth = 2.5;
		ctx.stroke();
		ctx.strokeStyle = "rgba(73,178,212,0.7)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(cx - 12, cy);
		ctx.lineTo(cx + 12, cy);
		ctx.moveTo(cx, cy - 12);
		ctx.lineTo(cx, cy + 12);
		ctx.stroke();
		ctx.restore();
	};

	const getCursor = () => "crosshair";

	const onMouseDown = (e) => {
		const tool = herramientaRef.current;

		if (tool === "Length") {
			if (e.button !== 0) return;
			e.preventDefault();
			const pos = getCanvasPos(e);
			if (medicionRef.current.dibujando) {
				const { x1, y1 } = medicionRef.current;
				const dist = distanciaMM(x1, y1, pos.x, pos.y);
				if (dist > 2) {
					const d1 = canvasToPixel(x1, y1),
						d2 = canvasToPixel(pos.x, pos.y);
					medicionRef.current.lineas.push({
						px1: d1.px, py1: d1.py, px2: d2.px, py2: d2.py, dist,
					});
				}
				medicionRef.current.dibujando = false;
				delete medicionRef.current.x2;
				delete medicionRef.current.y2;
				redibujarOverlay();
			} else {
				medicionRef.current.dibujando = true;
				medicionRef.current.dragging = false;
				medicionRef.current.x1 = pos.x;
				medicionRef.current.y1 = pos.y;
				medicionRef.current.x2 = pos.x;
				medicionRef.current.y2 = pos.y;
			}
			return;
		}

		if (tool === "Angle") {
			if (e.button !== 0) return;
			e.preventDefault();
			const pos = getCanvasPos(e);
			const ar = anguloRef.current;
			if (ar.fase === 0) {
				ar.fase = 1;
				ar.p1x = pos.x; ar.p1y = pos.y;
				ar.previewX = pos.x; ar.previewY = pos.y;
				ar.clickX = pos.x; ar.clickY = pos.y;
				ar.wasDrag = false;
			} else if (ar.fase === 1) {
				ar.p2x = pos.x; ar.p2y = pos.y;
				ar.previewX = pos.x; ar.previewY = pos.y;
				ar.clickX = pos.x; ar.clickY = pos.y;
				ar.wasDrag = false;
				ar.fase = 2;
			} else if (ar.fase === 2) {
				const grados = calcularAngulo(ar.p1x, ar.p1y, ar.p2x, ar.p2y, pos.x, pos.y);
				if (grados > 0.5) {
					const dp1 = canvasToPixel(ar.p1x, ar.p1y),
						dp2 = canvasToPixel(ar.p2x, ar.p2y),
						dp3 = canvasToPixel(pos.x, pos.y);
					ar.angulos.push({
						pp1x: dp1.px, pp1y: dp1.py,
						pp2x: dp2.px, pp2y: dp2.py,
						pp3x: dp3.px, pp3y: dp3.py,
						grados,
					});
				}
				ar.fase = 0;
			}
			redibujarOverlay();
			return;
		}

		if (tool === "Annotate") {
			if (e.button !== 0) return;
			e.preventDefault();
			const pos = getCanvasPos(e);
			const scrPos = getScreenPos(pos.x, pos.y);
			const dp = canvasToPixel(pos.x, pos.y);
			setInputAnotacion({
				canvasX: pos.x, canvasY: pos.y,
				screenX: scrPos.x, screenY: scrPos.y,
				dicomX: dp.px, dicomY: dp.py,
				value: "",
			});
			return;
		}

		if (e.button !== 0) return;
		e.preventDefault();

		dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };

		if (elipseActivaRef.current) {
			if (e.button !== 0) return;
			e.preventDefault();
			const pos = getCanvasPos(e);
			if (elipseRef.current.dibujando) {
				const { cx, cy } = elipseRef.current;
				const rx = Math.abs(pos.x - cx), ry = Math.abs(pos.y - cy);
				if (rx > 5 && ry > 5) {
					const stats = calcularEstadisticasElipse(cx, cy, rx, ry);
					const dc = canvasToPixel(cx, cy);
					const sc = getVp()?.vp.scale ?? 1;
					elipseRef.current.elipses.push({ pcx: dc.px, pcy: dc.py, prx: rx / sc, pry: ry / sc, stats });
				}
				elipseRef.current.dibujando = false;
				elipseRef.current.dragging = false;
				redibujarOverlay();
			} else {
				elipseRef.current.dibujando = true;
				elipseRef.current.dragging = false;
				elipseRef.current.cx = pos.x;
				elipseRef.current.cy = pos.y;
				elipseRef.current.rx = 0;
				elipseRef.current.ry = 0;
			}
			return;
		}

		if (rectActivaRef.current) {
			if (e.button !== 0) return;
			e.preventDefault();
			const pos = getCanvasPos(e);
			if (rectRef.current.dibujando) {
				const { x1, y1 } = rectRef.current;
				if (Math.abs(pos.x - x1) > 5 && Math.abs(pos.y - y1) > 5) {
					const stats = calcularEstadisticasRect(x1, y1, pos.x, pos.y);
					const dr1 = canvasToPixel(x1, y1), dr2 = canvasToPixel(pos.x, pos.y);
					rectRef.current.rects.push({ px1: dr1.px, py1: dr1.py, px2: dr2.px, py2: dr2.py, stats });
				}
				rectRef.current.dibujando = false;
				rectRef.current.dragging = false;
				redibujarOverlay();
			} else {
				rectRef.current.dibujando = true;
				rectRef.current.dragging = false;
				rectRef.current.x1 = pos.x;
				rectRef.current.y1 = pos.y;
				rectRef.current.x2 = pos.x;
				rectRef.current.y2 = pos.y;
			}
			return;
		}

		if (bidiActivaRef.current) {
			if (e.button !== 0) return;
			e.preventDefault();
			const pos = getCanvasPos(e);
			if (bidiRef.current.dibujando) {
				const { cx, cy } = bidiRef.current;
				if (Math.hypot(pos.x - cx, pos.y - cy) > 5) {
					const db1 = canvasToPixel(cx, cy), db2 = canvasToPixel(pos.x, pos.y);
					bidiRef.current.bidis.push({ pcx: db1.px, pcy: db1.py, pex: db2.px, pey: db2.py });
				}
				bidiRef.current.dibujando = false;
				bidiRef.current.dragging = false;
				redibujarOverlay();
			} else {
				bidiRef.current.dibujando = true;
				bidiRef.current.dragging = false;
				bidiRef.current.cx = pos.x;
				bidiRef.current.cy = pos.y;
				bidiRef.current.ex = pos.x;
				bidiRef.current.ey = pos.y;
			}
			return;
		}
	};

	const onContextMenu = (e) => {
		e.preventDefault();
		const pos = getCanvasPos(e);
		const overlay = overlayRef.current;
		const rect = overlay?.getBoundingClientRect();
		const sx = e.clientX - (rect?.left || 0);
		const sy = e.clientY - (rect?.top || 0);

		const lineaC = (l) => {
			const c1 = pixelToCanvas(l.px1, l.py1), c2 = pixelToCanvas(l.px2, l.py2);
			return { x1: c1.cx, y1: c1.cy, x2: c2.cx, y2: c2.cy };
		};
		const anotC = (a) => { const ca = pixelToCanvas(a.px, a.py); return { x: ca.cx, y: ca.cy }; };
		const anguloC = (a) => {
			const c1 = pixelToCanvas(a.pp1x, a.pp1y), c2 = pixelToCanvas(a.pp2x, a.pp2y), c3 = pixelToCanvas(a.pp3x, a.pp3y);
			return { p1x: c1.cx, p1y: c1.cy, p2x: c2.cx, p2y: c2.cy, p3x: c3.cx, p3y: c3.cy };
		};
		const elipseC = (el) => {
			const cc = pixelToCanvas(el.pcx, el.pcy);
			const sc = getVp()?.vp.scale ?? 1;
			return { cx: cc.cx, cy: cc.cy, rx: el.prx * sc, ry: el.pry * sc };
		};
		const rectC = (r) => {
			const c1 = pixelToCanvas(r.px1, r.py1), c2 = pixelToCanvas(r.px2, r.py2);
			return { x1: c1.cx, y1: c1.cy, x2: c2.cx, y2: c2.cy };
		};
		const bidiC = (b) => {
			const c1 = pixelToCanvas(b.pcx, b.pcy), c2 = pixelToCanvas(b.pex, b.pey);
			return { cx: c1.cx, cy: c1.cy, ex: c2.cx, ey: c2.cy };
		};

		{ const idx = medicionRef.current.lineas.findIndex((l) => lineaHitTest(pos.x, pos.y, lineaC(l))); if (idx >= 0) { setCtxMenu({ tipo: "linea", idx, screenX: sx, screenY: sy }); return; } }
		{ const idx = anotacionRef.current.anotaciones.findIndex((a) => anotacionHitTest(pos.x, pos.y, anotC(a))); if (idx >= 0) { setCtxMenu({ tipo: "anotacion", idx, screenX: sx, screenY: sy }); return; } }
		{ const idx = anguloRef.current.angulos.findIndex((a) => anguloHitTest(pos.x, pos.y, anguloC(a))); if (idx >= 0) { setCtxMenu({ tipo: "angulo", idx, screenX: sx, screenY: sy }); return; } }
		{ const idx = elipseRef.current.elipses.findIndex((el) => elipseHitTest(pos.x, pos.y, elipseC(el))); if (idx >= 0) { setCtxMenu({ tipo: "elipse", idx, screenX: sx, screenY: sy }); return; } }
		{ const idx = rectRef.current.rects.findIndex((r) => rectHitTest(pos.x, pos.y, rectC(r))); if (idx >= 0) { setCtxMenu({ tipo: "rect", idx, screenX: sx, screenY: sy }); return; } }
		{ const idx = bidiRef.current.bidis.findIndex((b) => bidiHitTest(pos.x, pos.y, bidiC(b))); if (idx >= 0) { setCtxMenu({ tipo: "bidi", idx, screenX: sx, screenY: sy }); return; } }
	};
	const cerrarMenu = () => setCtxMenu(null);

	const onMouseMove = (e) => {
		const tool = herramientaRef.current;
		const pos = getCanvasPos(e);

		{
			let changed = false;
			const sc = getVp()?.vp.scale ?? 1;

			const lIdx = medicionRef.current.lineas.findIndex((l) => {
				const c1 = pixelToCanvas(l.px1, l.py1), c2 = pixelToCanvas(l.px2, l.py2);
				return lineaHitTest(pos.x, pos.y, { x1: c1.cx, y1: c1.cy, x2: c2.cx, y2: c2.cy });
			});
			if (lIdx !== medicionRef.current.hoveredIdx) { medicionRef.current.hoveredIdx = lIdx; changed = true; }

			const angIdx = anguloRef.current.angulos.findIndex((a) => {
				const c1 = pixelToCanvas(a.pp1x, a.pp1y), c2 = pixelToCanvas(a.pp2x, a.pp2y), c3 = pixelToCanvas(a.pp3x, a.pp3y);
				return anguloHitTest(pos.x, pos.y, { p1x: c1.cx, p1y: c1.cy, p2x: c2.cx, p2y: c2.cy, p3x: c3.cx, p3y: c3.cy });
			});
			if (angIdx !== anguloRef.current.hoveredIdx) { anguloRef.current.hoveredIdx = angIdx; changed = true; }

			const aIdx = anotacionRef.current.anotaciones.findIndex((a) => {
				const ca = pixelToCanvas(a.px, a.py);
				return anotacionHitTest(pos.x, pos.y, { x: ca.cx, y: ca.cy });
			});
			if (aIdx !== anotacionRef.current.hoveredIdx) { anotacionRef.current.hoveredIdx = aIdx; changed = true; }

			const eIdx = elipseRef.current.elipses.findIndex((el) => {
				const cc = pixelToCanvas(el.pcx, el.pcy);
				return elipseHitTest(pos.x, pos.y, { cx: cc.cx, cy: cc.cy, rx: el.prx * sc, ry: el.pry * sc });
			});
			if (eIdx !== elipseRef.current.hoveredIdx) { elipseRef.current.hoveredIdx = eIdx; changed = true; }

			const rIdx = rectRef.current.rects.findIndex((r) => {
				const c1 = pixelToCanvas(r.px1, r.py1), c2 = pixelToCanvas(r.px2, r.py2);
				return rectHitTest(pos.x, pos.y, { x1: c1.cx, y1: c1.cy, x2: c2.cx, y2: c2.cy });
			});
			if (rIdx !== rectRef.current.hoveredIdx) { rectRef.current.hoveredIdx = rIdx; changed = true; }

			const bIdx = bidiRef.current.bidis.findIndex((b) => {
				const c1 = pixelToCanvas(b.pcx, b.pcy), c2 = pixelToCanvas(b.pex, b.pey);
				return bidiHitTest(pos.x, pos.y, { cx: c1.cx, cy: c1.cy, ex: c2.cx, ey: c2.cy });
			});
			if (bIdx !== bidiRef.current.hoveredIdx) { bidiRef.current.hoveredIdx = bIdx; changed = true; }

			if (changed) redibujarOverlay();
		}

		if (tool === "Length" && medicionRef.current.dibujando) {
			medicionRef.current.x2 = pos.x;
			medicionRef.current.y2 = pos.y;
			medicionRef.current.dragging = true;
			redibujarOverlay();
			return;
		}

		if (tool === "Angle") {
			const ar = anguloRef.current;
			if (ar.fase === 1 || ar.fase === 2) {
				ar.previewX = pos.x;
				ar.previewY = pos.y;
				redibujarOverlay();
				return;
			}
		}

		if (lupaActivaRef.current) {
			dibujarLupa(e.clientX, e.clientY);
			return;
		}

		if (elipseActivaRef.current && elipseRef.current.dibujando) {
			const { cx, cy } = elipseRef.current;
			elipseRef.current.rx = Math.abs(pos.x - cx);
			elipseRef.current.ry = Math.abs(pos.y - cy);
			elipseRef.current.dragging = true;
			redibujarOverlay();
			return;
		}

		if (rectActivaRef.current && rectRef.current.dibujando) {
			rectRef.current.x2 = pos.x;
			rectRef.current.y2 = pos.y;
			rectRef.current.dragging = true;
			redibujarOverlay();
			return;
		}

		if (bidiActivaRef.current && bidiRef.current.dibujando) {
			bidiRef.current.ex = pos.x;
			bidiRef.current.ey = pos.y;
			bidiRef.current.dragging = true;
			redibujarOverlay();
			return;
		}

		const drag = dragRef.current;
		if (!drag.active || !csRef.current || !divRef.current) return;
		const cs = csRef.current, el = divRef.current;
		const dx = e.clientX - drag.lastX, dy = e.clientY - drag.lastY;
		drag.lastX = e.clientX;
		drag.lastY = e.clientY;
		try {
			const vp = cs.getViewport(el);
			if (!vp) return;
			if (tool === "Pan") {
				const rect = el.getBoundingClientRect();
				vp.translation.x += (dx * (el.offsetWidth / rect.width)) / vp.scale;
				vp.translation.y += (dy * (el.offsetHeight / rect.height)) / vp.scale;
				cs.setViewport(el, vp);
				cs.updateImage(el);
				redibujarOverlay();
			}
			if (tool === "Zoom") {
				vp.scale = Math.max(0.1, Math.min(vp.scale * (dy > 0 ? 0.97 : 1.03), 10));
				cs.setViewport(el, vp);
				cs.updateImage(el);
				redibujarOverlay();
			}
			if (tool === "Wwwc") {
				vp.voi.windowWidth = Math.max(1, vp.voi.windowWidth + dx * 10);
				vp.voi.windowCenter = vp.voi.windowCenter + dy * 5;
				cs.setViewport(el, vp);
				cs.updateImage(el);
			}
		} catch (err) {}
	};

	const onMouseUp = (e) => {
		const tool = herramientaRef.current;
		if (tool === "Angle") {
			const ar = anguloRef.current;
			const pos = getCanvasPos(e);
			const dist = Math.hypot(pos.x - (ar.clickX || 0), pos.y - (ar.clickY || 0));
			const isDrag = dist > 4;
			if (ar.fase === 1 && isDrag) {
				ar.p2x = pos.x; ar.p2y = pos.y;
				ar.previewX = pos.x; ar.previewY = pos.y;
				ar.clickX = pos.x; ar.clickY = pos.y;
				ar.wasDrag = false;
				ar.fase = 2;
				redibujarOverlay();
				return;
			}
			if (ar.fase === 2 && isDrag) {
				const grados = calcularAngulo(ar.p1x, ar.p1y, ar.p2x, ar.p2y, pos.x, pos.y);
				if (grados > 0.5) {
					const dp1 = canvasToPixel(ar.p1x, ar.p1y), dp2 = canvasToPixel(ar.p2x, ar.p2y), dp3 = canvasToPixel(pos.x, pos.y);
					ar.angulos.push({ pp1x: dp1.px, pp1y: dp1.py, pp2x: dp2.px, pp2y: dp2.py, pp3x: dp3.px, pp3y: dp3.py, grados });
				}
				ar.fase = 0;
				redibujarOverlay();
				return;
			}
			dragRef.current.active = false;
			return;
		}
		if (tool === "Length" && medicionRef.current.dibujando && medicionRef.current.dragging) {
			const pos = getCanvasPos(e);
			const { x1, y1 } = medicionRef.current;
			const dist = distanciaMM(x1, y1, pos.x, pos.y);
			if (dist > 2) {
				const d1 = canvasToPixel(x1, y1), d2 = canvasToPixel(pos.x, pos.y);
				medicionRef.current.lineas.push({ px1: d1.px, py1: d1.py, px2: d2.px, py2: d2.py, dist });
			}
			medicionRef.current.dibujando = false;
			medicionRef.current.dragging = false;
			delete medicionRef.current.x2;
			delete medicionRef.current.y2;
			redibujarOverlay();
			return;
		}
		dragRef.current.active = false;

		if (elipseActivaRef.current && elipseRef.current.dibujando && elipseRef.current.dragging) {
			const { cx, cy, rx, ry } = elipseRef.current;
			if (rx > 5 && ry > 5) {
				const stats = calcularEstadisticasElipse(cx, cy, rx, ry);
				const dc = canvasToPixel(cx, cy);
				const sc = getVp()?.vp.scale ?? 1;
				elipseRef.current.elipses.push({ pcx: dc.px, pcy: dc.py, prx: rx / sc, pry: ry / sc, stats });
			}
			elipseRef.current.dibujando = false;
			elipseRef.current.dragging = false;
			redibujarOverlay();
			return;
		}

		if (rectActivaRef.current && rectRef.current.dibujando && rectRef.current.dragging) {
			const { x1, y1, x2, y2 } = rectRef.current;
			if (Math.abs(x2 - x1) > 5 && Math.abs(y2 - y1) > 5) {
				const stats = calcularEstadisticasRect(x1, y1, x2, y2);
				const dr1 = canvasToPixel(x1, y1), dr2 = canvasToPixel(x2, y2);
				rectRef.current.rects.push({ px1: dr1.px, py1: dr1.py, px2: dr2.px, py2: dr2.py, stats });
			}
			rectRef.current.dibujando = false;
			rectRef.current.dragging = false;
			redibujarOverlay();
			return;
		}

		if (bidiActivaRef.current && bidiRef.current.dibujando && bidiRef.current.dragging) {
			const { cx, cy, ex, ey } = bidiRef.current;
			if (Math.hypot(ex - cx, ey - cy) > 5) {
				const db1 = canvasToPixel(cx, cy), db2 = canvasToPixel(ex, ey);
				bidiRef.current.bidis.push({ pcx: db1.px, pcy: db1.py, pex: db2.px, pey: db2.py });
			}
			bidiRef.current.dibujando = false;
			bidiRef.current.dragging = false;
			redibujarOverlay();
			return;
		}
	};

	const handleWheel = (e) => {
		e.preventDefault();
		const cs = csRef.current, el = divRef.current;
		if (!enabledRef.current || !cs || !el) return;
		try {
			const vp = cs.getViewport(el);
			if (!vp) return;
			vp.scale = Math.max(0.1, Math.min(vp.scale * (e.deltaY < 0 ? 1.1 : 0.9), 10));
			cs.setViewport(el, vp);
			cs.updateImage(el);
			redibujarOverlay();
		} catch (err) {}
	};

	const handleReset = (e) => {
		e.stopPropagation();
		const cs = csRef.current, el = divRef.current;
		if (!enabledRef.current || !cs || !el) return;
		try {
			cs.reset(el);
			medicionRef.current.lineas = [];
			medicionRef.current.dibujando = false;
			anotacionRef.current.anotaciones = [];
			anguloRef.current.angulos = [];
			anguloRef.current.fase = 0;
			const overlay = overlayRef.current;
			if (overlay) overlay.getContext("2d").clearRect(0, 0, overlay.width, overlay.height);
		} catch (err) {}
	};

	const handleCaptura = (e) => {
		e.stopPropagation();
		const dicomCanvas = divRef.current?.querySelector("canvas");
		const overlay = overlayRef.current;
		if (!dicomCanvas) return;
		const merged = document.createElement("canvas");
		merged.width = dicomCanvas.width;
		merged.height = dicomCanvas.height;
		const ctx = merged.getContext("2d");
		ctx.drawImage(dicomCanvas, 0, 0);
		if (overlay) ctx.drawImage(overlay, 0, 0);
		const link = document.createElement("a");
		link.download = `captura_${Date.now()}.png`;
		link.href = merged.toDataURL();
		link.click();
	};

	const confirmarAnotacion = (texto) => {
		if (texto.trim() && inputAnotacion) {
			const dp = inputAnotacion.dicomX !== undefined
				? { px: inputAnotacion.dicomX, py: inputAnotacion.dicomY }
				: canvasToPixel(inputAnotacion.canvasX, inputAnotacion.canvasY);
			anotacionRef.current.anotaciones.push({ px: dp.px, py: dp.py, texto: texto.trim() });
			redibujarOverlay();
		}
		setInputAnotacion(null);
	};

	return (
		<div
			ref={wrapperRef}
			className={`panel-imagen ${isActive ? "activo" : ""}`}
			onClick={onClick}
			onMouseDown={onMouseDown}
			onMouseMove={onMouseMove}
			onMouseUp={onMouseUp}
			onMouseLeave={() => {
				dragRef.current.active = false;
				medicionRef.current.hoveredIdx = -1;
				anotacionRef.current.hoveredIdx = -1;
				anguloRef.current.hoveredIdx = -1;
				redibujarOverlay();
			}}
			onWheel={handleWheel}
			onContextMenu={onContextMenu}
			style={{ cursor: getCursor(herramienta) }}>
			<div
				ref={divRef}
				className="cornerstone-element"
				style={{ display: imageId ? "block" : "none", pointerEvents: "none" }}
			/>
			<canvas
				ref={overlayRef}
				className="overlay-canvas"
				style={{ display: imageId ? "block" : "none", pointerEvents: "none" }}
			/>
			{!imageId && (
				<div className="panel-vacio">
					<span>+</span>
					<span>Sin imagen</span>
				</div>
			)}
			{imageId && (
				<>
					<div className="overlay-acciones-imagen">
						<button className="btn-overlay-accion" onMouseDown={(e) => e.stopPropagation()} onClick={handleReset}>⟲</button>
						<button className="btn-overlay-accion" onMouseDown={(e) => e.stopPropagation()} onClick={handleCaptura}>⬡</button>
					</div>
					{zoom && (
						<div className="overlay-stats">
							<span>Zoom: {zoom}%</span>
							{wl && <span>{wl}</span>}
						</div>
					)}
				</>
			)}

			{inputAnotacion && (
				<div
					className="ctx-menu-medicion label-edit"
					style={{ position: "fixed", left: inputAnotacion.screenX, top: inputAnotacion.screenY, zIndex: 300, transform: "translate(-50%, -120%)" }}
					onMouseDown={(e) => e.stopPropagation()}>
					<p>Anotación</p>
					<input autoFocus placeholder="Escribir texto..."
						onKeyDown={(e) => {
							if (e.key === "Enter") confirmarAnotacion(e.target.value);
							if (e.key === "Escape") setInputAnotacion(null);
						}}
					/>
					<div style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem" }}>
						<button onClick={(e) => confirmarAnotacion(e.target.closest(".ctx-menu-medicion").querySelector("input").value)}>OK</button>
						<button onClick={() => setInputAnotacion(null)}>Cancelar</button>
					</div>
				</div>
			)}

			{ctxMenu && (
				<div className="ctx-menu-medicion" style={{ left: ctxMenu.screenX, top: ctxMenu.screenY }} onMouseDown={(e) => e.stopPropagation()}>
					{ctxMenu.tipo === "linea" && (
						<>
							<button onClick={() => { medicionRef.current.lineas.splice(ctxMenu.idx, 1); medicionRef.current.hoveredIdx = -1; redibujarOverlay(); cerrarMenu(); }}>Eliminar medición</button>
							<button onClick={() => { setLabelEdit({ idx: ctxMenu.idx, value: medicionRef.current.lineas[ctxMenu.idx]?.label || "" }); cerrarMenu(); }}>Etiquetar</button>
							<button onClick={() => { medicionRef.current.lineas = []; medicionRef.current.hoveredIdx = -1; redibujarOverlay(); cerrarMenu(); }}>Borrar todas</button>
						</>
					)}
					{ctxMenu.tipo === "angulo" && (
						<>
							<button onClick={() => { anguloRef.current.angulos.splice(ctxMenu.idx, 1); anguloRef.current.hoveredIdx = -1; redibujarOverlay(); cerrarMenu(); }}>Eliminar ángulo</button>
							<button onClick={() => { anguloRef.current.angulos = []; anguloRef.current.hoveredIdx = -1; redibujarOverlay(); cerrarMenu(); }}>Borrar todos</button>
						</>
					)}
					{ctxMenu.tipo === "anotacion" && (
						<>
							<button onClick={() => {
								const a = anotacionRef.current.anotaciones[ctxMenu.idx];
								const ca = pixelToCanvas(a.px, a.py);
								const scrPos = getScreenPos(ca.cx, ca.cy);
								setInputAnotacion({ canvasX: ca.cx, canvasY: ca.cy, screenX: scrPos.x, screenY: scrPos.y, dicomX: a.px, dicomY: a.py, value: a.texto, editIdx: ctxMenu.idx });
								anotacionRef.current.anotaciones.splice(ctxMenu.idx, 1);
								anotacionRef.current.hoveredIdx = -1;
								redibujarOverlay();
								cerrarMenu();
							}}>Editar</button>
							<button onClick={() => { anotacionRef.current.anotaciones.splice(ctxMenu.idx, 1); anotacionRef.current.hoveredIdx = -1; redibujarOverlay(); cerrarMenu(); }}>Eliminar</button>
							<button onClick={() => { anotacionRef.current.anotaciones = []; anotacionRef.current.hoveredIdx = -1; redibujarOverlay(); cerrarMenu(); }}>Borrar todas</button>
						</>
					)}
					{ctxMenu.tipo === "elipse" && (
						<>
							<button onClick={() => { elipseRef.current.elipses.splice(ctxMenu.idx, 1); elipseRef.current.hoveredIdx = -1; redibujarOverlay(); cerrarMenu(); }}>Eliminar elipse</button>
							<button onClick={() => { setElipseLabelEdit({ idx: ctxMenu.idx, value: elipseRef.current.elipses[ctxMenu.idx]?.label || "" }); cerrarMenu(); }}>Etiquetar</button>
							<button onClick={() => { elipseRef.current.elipses = []; elipseRef.current.hoveredIdx = -1; redibujarOverlay(); cerrarMenu(); }}>Borrar todas</button>
						</>
					)}
					{ctxMenu.tipo === "rect" && (
						<>
							<button onClick={() => { rectRef.current.rects.splice(ctxMenu.idx, 1); rectRef.current.hoveredIdx = -1; redibujarOverlay(); cerrarMenu(); }}>Eliminar rectángulo</button>
							<button onClick={() => { setRectLabelEdit({ idx: ctxMenu.idx, value: rectRef.current.rects[ctxMenu.idx]?.label || "" }); cerrarMenu(); }}>Etiquetar</button>
							<button onClick={() => { rectRef.current.rects = []; rectRef.current.hoveredIdx = -1; redibujarOverlay(); cerrarMenu(); }}>Borrar todas</button>
						</>
					)}
					{ctxMenu.tipo === "bidi" && (
						<>
							<button onClick={() => { bidiRef.current.bidis.splice(ctxMenu.idx, 1); bidiRef.current.hoveredIdx = -1; redibujarOverlay(); cerrarMenu(); }}>Eliminar medición</button>
							<button onClick={() => { setBidiLabelEdit({ idx: ctxMenu.idx, value: bidiRef.current.bidis[ctxMenu.idx]?.label || "" }); cerrarMenu(); }}>Etiquetar</button>
							<button onClick={() => { bidiRef.current.bidis = []; bidiRef.current.hoveredIdx = -1; redibujarOverlay(); cerrarMenu(); }}>Borrar todas</button>
						</>
					)}
				</div>
			)}

			{labelEdit && (
				<div className="ctx-menu-medicion label-edit" style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)" }} onMouseDown={(e) => e.stopPropagation()}>
					<p>Etiqueta</p>
					<input autoFocus value={labelEdit.value} onChange={(e) => setLabelEdit((v) => ({ ...v, value: e.target.value }))}
						onKeyDown={(e) => { if (e.key === "Enter") { medicionRef.current.lineas[labelEdit.idx].label = labelEdit.value; redibujarOverlay(); setLabelEdit(null); } if (e.key === "Escape") setLabelEdit(null); }} />
					<div style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem" }}>
						<button onClick={() => { medicionRef.current.lineas[labelEdit.idx].label = labelEdit.value; redibujarOverlay(); setLabelEdit(null); }}>OK</button>
						<button onClick={() => setLabelEdit(null)}>Cancelar</button>
					</div>
				</div>
			)}

			{elipseLabelEdit && (
				<div className="ctx-menu-medicion label-edit" style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)" }} onMouseDown={(e) => e.stopPropagation()}>
					<p>Descripción de elipse</p>
					<input autoFocus value={elipseLabelEdit.value} onChange={(e) => setElipseLabelEdit((v) => ({ ...v, value: e.target.value }))}
						onKeyDown={(e) => { if (e.key === "Enter") { elipseRef.current.elipses[elipseLabelEdit.idx].label = elipseLabelEdit.value; redibujarOverlay(); setElipseLabelEdit(null); } if (e.key === "Escape") setElipseLabelEdit(null); }} />
					<div style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem" }}>
						<button onClick={() => { elipseRef.current.elipses[elipseLabelEdit.idx].label = elipseLabelEdit.value; redibujarOverlay(); setElipseLabelEdit(null); }}>OK</button>
						<button onClick={() => setElipseLabelEdit(null)}>Cancelar</button>
					</div>
				</div>
			)}

			{rectLabelEdit && (
				<div className="ctx-menu-medicion label-edit" style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)" }} onMouseDown={(e) => e.stopPropagation()}>
					<p>Descripción de rectángulo</p>
					<input autoFocus value={rectLabelEdit.value} onChange={(e) => setRectLabelEdit((v) => ({ ...v, value: e.target.value }))}
						onKeyDown={(e) => { if (e.key === "Enter") { rectRef.current.rects[rectLabelEdit.idx].label = rectLabelEdit.value; redibujarOverlay(); setRectLabelEdit(null); } if (e.key === "Escape") setRectLabelEdit(null); }} />
					<div style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem" }}>
						<button onClick={() => { rectRef.current.rects[rectLabelEdit.idx].label = rectLabelEdit.value; redibujarOverlay(); setRectLabelEdit(null); }}>OK</button>
						<button onClick={() => setRectLabelEdit(null)}>Cancelar</button>
					</div>
				</div>
			)}

			{bidiLabelEdit && (
				<div className="ctx-menu-medicion label-edit" style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)" }} onMouseDown={(e) => e.stopPropagation()}>
					<p>Etiqueta bidireccional</p>
					<input autoFocus value={bidiLabelEdit.value} onChange={(e) => setBidiLabelEdit((v) => ({ ...v, value: e.target.value }))}
						onKeyDown={(e) => { if (e.key === "Enter") { bidiRef.current.bidis[bidiLabelEdit.idx].label = bidiLabelEdit.value; redibujarOverlay(); setBidiLabelEdit(null); } if (e.key === "Escape") setBidiLabelEdit(null); }} />
					<div style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem" }}>
						<button onClick={() => { bidiRef.current.bidis[bidiLabelEdit.idx].label = bidiLabelEdit.value; redibujarOverlay(); setBidiLabelEdit(null); }}>OK</button>
						<button onClick={() => setBidiLabelEdit(null)}>Cancelar</button>
					</div>
				</div>
			)}

			{(ctxMenu || labelEdit || elipseLabelEdit || rectLabelEdit || bidiLabelEdit) && (
				<div className="ctx-menu-backdrop" onClick={() => { cerrarMenu(); setLabelEdit(null); setElipseLabelEdit(null); setRectLabelEdit(null); setBidiLabelEdit(null); }} />
			)}
		</div>
	);
};

// ══════════════════════════════════════════════════════════════════
// VisorDicom — componente principal
// ══════════════════════════════════════════════════════════════════
const VisorDicom = () => {
	const { user, signOut } = useAuth();
	const navigate = useNavigate();
	const { estudioId } = useParams();
	const location = useLocation();
	const estudioData = location.state?.estudio;

	const [empleadoData, setEmpleadoData] = useState(null);
	const [imageIds, setImageIds] = useState([]);
	const [panelActivo, setPanelActivo] = useState(0);
	const [panelImageIds, setPanelImageIds] = useState(Array(6).fill(null));
	const [herramienta, setHerramienta] = useState("Wwwc");
	const [formatoGrid, setFormatoGrid] = useState(FORMATOS[0]);
	const [mostrarFormatos, setMostrarFormatos] = useState(false);
	const [mostrarMas, setMostrarMas] = useState(false);
	const [mostrarDetalle, setMostrarDetalle] = useState(false);
	const [modalAsignar, setModalAsignar] = useState(null);
	const [modalPrioridad, setModalPrioridad] = useState(null);
	const [modalComentarios, setModalComentarios] = useState(false);
	const [comentarios, setComentarios] = useState([]);
	const [comentarioTexto, setComentarioTexto] = useState("");
	const [comentarioEditId, setComentarioEditId] = useState(null);
	const [comentarioEditTxt, setComentarioEditTxt] = useState("");
	const [confirmElimComentario, setConfirmElimComentario] = useState(null);
	const [modalEtiquetas, setModalEtiquetas] = useState(false);
	const [modalMetricas, setModalMetricas] = useState(null);
	const [etiquetas, setEtiquetas] = useState([]);
	const [etiquetaInput, setEtiquetaInput] = useState("");
	const [etiquetaSugerencia, setEtiquetaSugerencia] = useState(false);
	const [detalleBarTop, setDetalleBarTop] = useState(112);
	const [reporteBarTop, setReporteBarTop] = useState(112);
	const [reporteBarLeft, setReporteBarLeft] = useState("50%");
	const [mostrarInfo, setMostrarInfo] = useState(true);
	const [mostrarReporte, setMostrarReporte] = useState(false);
	const [cineActivo, setCineActivo] = useState(false);
	const [reporteTexto, setReporteTexto] = useState("");
	const [mostrarPanelReporte, setMostrarPanelReporte] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [resetCounter, setResetCounter] = useState(0);
	const [centrarCounter, setCentrarCounter] = useState(0);
	const [masAccion, setMasAccion] = useState(null);
	const [lupaGlobal, setLupaGlobal] = useState(false);
	const [elipseGlobal, setElipseGlobal] = useState(false);
	const [rectanguloGlobal, setRectanguloGlobal] = useState(false);
	const [bidiGlobal, setBidiGlobal] = useState(false);
	const [capturaClip, setCapturaClip] = useState(0);
	const [notif, setNotif] = useState({ isOpen: false, mensaje: "", tipo: "exito" });

	const [modalInfo, setModalInfo] = useState(false);
	const [fichaData, setFichaData] = useState(null);
	const [fichaLoading, setFichaLoading] = useState(false);
	const [fichaSeccion, setFichaSeccion] = useState({
		paciente: true,
		historial: false,
		estudio: true,
		tecnico: true,
		solicitud: true,
		comentariosInfo: true,
	});
	const [tecnicosLista, setTecnicosLista] = useState([]);
	const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState(null);
	const [solicitudFile, setSolicitudFile] = useState(null);
	const [modalSolicitud, setModalSolicitud] = useState(false);
	const [solicitudSubiendo, setSolicitudSubiendo] = useState(false);
	const [solicitudPreview, setSolicitudPreview] = useState(null);
	const [comentariosInfo, setComentariosInfo] = useState([]);
	const [comentarioInfoTxt, setComentarioInfoTxt] = useState("");

	const cineRef = useRef(null);
	const cineIdx = useRef(0);
	const toolbarRef = useRef(null);
	const [masBarTop, setMasBarTop] = useState(112);

	const pacienteInfo = {
		nombre: estudioData?.nombrePaciente || "Sin paciente",
		tipoEstudio: estudioData?.tipoEstudio || "—",
		sucursal: estudioData?.sucursal || "—",
		horaFecha: estudioData?.horaFecha || "—",
		estado: estudioData?.estado || "—",
	};

	const getPrimerNombre = (n) => n || user?.email?.split("@")[0] || "Usuario";
	const formatRol = (rol) => {
		const roles = {
			admin: "Administrador",
			radiologo: "Radiólogo - Director",
			doctor: "Médico",
			tecnico_radiologia: "Técnico en Radiología",
			quimico: "Químico",
			recepcionista: "Recepcionista",
			desarrollador: "Desarrollador",
		};
		return roles[rol] || rol || "Usuario";
	};
	const handleLogout = async () => {
		await signOut();
		navigate("/login");
	};

	useEffect(() => {
		const fetchEmpleado = async () => {
			if (!user?.id) return;
			const { data } = await supabase
				.from("empleados")
				.select("nombre, rol, cedula, especialidad, firma_url")
				.eq("auth_uuid", user.id)
				.maybeSingle();
			if (data) setEmpleadoData(data);
		};
		fetchEmpleado();
	}, [user]);

	useEffect(() => {
		cargarImagenes();
		return () => {
			if (cineRef.current) clearInterval(cineRef.current);
		};
	}, [estudioId]);

	const cargarImagenes = async () => {
		setLoading(true);
		setError(null);
		try {
			await initCornerstone();
			const idEstudio = estudioId || estudioData?.id;
			const { data: estudio, error: errEst } = await supabase
				.from("estudios_radiologia")
				.select("storage_path, reporte")
				.eq("id_estudio", idEstudio)
				.single();
			if (errEst) throw errEst;
			if (!estudio?.storage_path) throw new Error("Sin archivo");
			if (estudio.reporte) setReporteTexto(estudio.reporte);
			const storagePath = estudio.storage_path.includes("supabase.co")
				? estudio.storage_path.split("/radiologia/").pop().split("?")[0]
				: estudio.storage_path;
			const { data: urlData } = supabase.storage.from("radiologia").getPublicUrl(storagePath);
			const wadouri = `wadouri:${urlData.publicUrl}`;
			setImageIds([wadouri]);
			setPanelImageIds((prev) => { const n = [...prev]; n[0] = wadouri; return n; });
		} catch (e) {
			setError(e.message);
		} finally {
			setLoading(false);
		}
	};

	const showNotif = (mensaje, tipo = "exito") => {
		setNotif({ isOpen: true, mensaje, tipo });
	};

	const abrirModalInfo = async () => {
		setModalInfo(true);
		setFichaLoading(true);
		const idEstudio = Number(estudioId || estudioData?.id);
		try {
			const { data: est, error: errEst } = await supabase
				.from("estudios_radiologia")
				.select("id_estudio, fecha_estudio, tipo_estudio, descripcion, id_paciente, id_tecnico, storage_path, alta_prioridad, etiquetas, reporte, solicitud_url")
				.eq("id_estudio", idEstudio)
				.single();
			if (errEst) throw errEst;

			let paciente = null;
			if (est?.id_paciente) {
				const { data: p, error: errP } = await supabase
					.from("pacientes")
					.select("id_paciente, primer_nombre, apellido_paterno, apellido_materno, fecha_nacimiento, telefono, sexo, email")
					.eq("id_paciente", est.id_paciente)
					.single();
				if (!errP) paciente = p;
			}

			let historial = [];
			if (est?.id_paciente) {
				const [{ data: hRad, error: errRad }, { data: hLab, error: errLab }] = await Promise.all([
					supabase
						.from("estudios_radiologia")
						.select("id_estudio, tipo_estudio, descripcion, fecha_estudio")
						.eq("id_paciente", est.id_paciente)
						.neq("id_estudio", idEstudio)
						.order("fecha_estudio", { ascending: false })
						.limit(10),
					supabase
						.from("ventas")
						.select("id_venta, folio, fecha_venta, estudios_venta(descripcion_estudio)")
						.eq("id_paciente", est.id_paciente)
						.eq("estado", "activo")
						.order("fecha_venta", { ascending: false })
						.limit(10),
				]);
				const radList = (hRad || []).map((r) => ({
					tipo: r.tipo_estudio || "RAD",
					descripcion: r.descripcion || "Estudio radiológico",
					fecha: r.fecha_estudio,
				}));
				const labList = (hLab || []).flatMap((v) =>
					(v.estudios_venta || []).map((e) => ({
						tipo: "LAB",
						descripcion: e.descripcion_estudio || "Estudio de laboratorio",
						fecha: v.fecha_venta,
					}))
				);
				console.log("[historial] rad:", hRad, "errRad:", errRad);
				console.log("[historial] lab:", hLab, "errLab:", errLab);
				historial = [...radList, ...labList].sort(
					(a, b) => new Date(b.fecha) - new Date(a.fecha)
				).slice(0, 15);
				console.log("[historial] final:", historial);
			}

			const { data: tecnicos } = await supabase
				.from("empleados")
				.select("id_empleado, nombre")
				.eq("rol", "Tecnico")
				.order("nombre");
			setTecnicosLista(tecnicos || []);
			setTecnicoSeleccionado(est?.id_tecnico || null);

			const { data: comsInfo } = await supabase
				.from("comentarios_estudio")
				.select("id, texto, autor_nombre, autor_iniciales, created_at")
				.eq("id_estudio", idEstudio)
				.order("created_at", { ascending: true });
			setComentariosInfo(comsInfo || []);

			setFichaData({ est, paciente, historial });
		} catch (err) {
			console.error("[abrirModalInfo] error:", err);
			showNotif("Error al cargar la ficha clínica", "error");
		} finally {
			setFichaLoading(false);
		}
	};

	const guardarFichaPaciente = async () => {
		if (!fichaData?.paciente) return;
		const { error } = await supabase
			.from("pacientes")
			.update({
				primer_nombre: fichaData.paciente.primer_nombre,
				apellido_paterno: fichaData.paciente.apellido_paterno,
				apellido_materno: fichaData.paciente.apellido_materno,
				fecha_nacimiento: fichaData.paciente.fecha_nacimiento,
				telefono: fichaData.paciente.telefono,
				sexo: fichaData.paciente.sexo,
				email: fichaData.paciente.email,
			})
			.eq("id_paciente", fichaData.paciente.id_paciente);
		if (error) showNotif("Error al guardar", "error");
		else showNotif("Datos del paciente guardados", "exito");
	};

	const guardarInfoEstudio = async () => {
		const idEstudio = Number(estudioId || estudioData?.id);
		const { error } = await supabase
			.from("estudios_radiologia")
			.update({ descripcion: fichaData?.est?.descripcion, updated_at: new Date().toISOString() })
			.eq("id_estudio", idEstudio);
		if (error) showNotif("Error al guardar", "error");
		else showNotif("Estudio actualizado", "exito");
	};

	const asignarTecnicoInfo = async () => {
		if (!tecnicoSeleccionado) return;
		const idEstudio = Number(estudioId || estudioData?.id);
		const { error } = await supabase
			.from("estudios_radiologia")
			.update({ id_tecnico: tecnicoSeleccionado, updated_at: new Date().toISOString() })
			.eq("id_estudio", idEstudio);
		if (error) showNotif("Error al asignar técnico", "error");
		else showNotif("Técnico asignado", "exito");
	};

	const agregarComentarioInfo = async () => {
		const texto = comentarioInfoTxt.trim();
		if (!texto) return;
		const idEstudio = Number(estudioId || estudioData?.id);
		const nombreCompleto = empleadoData?.nombre || user?.email?.split("@")[0] || "Usuario";
		const iniciales = nombreCompleto.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
		const { data, error } = await supabase
			.from("comentarios_estudio")
			.insert({ id_estudio: idEstudio, texto, autor_nombre: nombreCompleto, autor_iniciales: iniciales, autor_uuid: user?.id || null })
			.select().single();
		if (error) { showNotif("Error al agregar comentario", "error"); return; }
		setComentariosInfo((c) => [...c, data]);
		setComentarioInfoTxt("");
		showNotif("Comentario agregado", "exito");
	};

	const toggleFichaSeccion = (key) => setFichaSeccion((s) => ({ ...s, [key]: !s[key] }));

	const abrirModalSolicitud = async () => {
		setMostrarDetalle(false);
		const idEstudio = Number(estudioId || estudioData?.id);
		const { data } = await supabase
			.from("estudios_radiologia")
			.select("solicitud_url")
			.eq("id_estudio", idEstudio)
			.single();
		setSolicitudPreview(data?.solicitud_url || null);
		setSolicitudFile(null);
		setModalSolicitud(true);
	};

	const subirSolicitud = async () => {
		if (!solicitudFile) return;
		const idEstudio = Number(estudioId || estudioData?.id);
		setSolicitudSubiendo(true);
		try {
			const ext = solicitudFile.name.split(".").pop();
			const path = `solicitudes/\${idEstudio}_\${Date.now()}.\${ext}\``;
			const { error: errUp } = await supabase.storage
				.from("radiologia")
				.upload(path, solicitudFile, { upsert: true });
			if (errUp) throw errUp;
			const { data: urlData } = supabase.storage
				.from("radiologia")
				.getPublicUrl(path);
			const { error: errDb } = await supabase
				.from("estudios_radiologia")
				.update({ solicitud_url: urlData.publicUrl })
				.eq("id_estudio", idEstudio);
			if (errDb) throw errDb;
			setSolicitudPreview(urlData.publicUrl);
			setSolicitudFile(null);
			showNotif("Solicitud subida correctamente", "exito");
			setModalSolicitud(false);
		} catch (err) {
			console.error("[subirSolicitud]", err);
			showNotif("Error al subir la solicitud", "error");
		} finally {
			setSolicitudSubiendo(false);
		}
	};

	const handleAction = (id) => {
		if (id === "restaurar") { setResetCounter((c) => c + 1); return; }
		if (id === "centrar")   { setCentrarCounter((c) => c + 1); return; }
		if (id === "informacion") { abrirModalInfo(); return; }
		if (id === "cine")     { toggleCine(); return; }
		if (id === "formato")  { setMostrarFormatos((f) => !f); setMostrarMas(false); setMostrarDetalle(false); setMostrarReporte(false); return; }
		if (id === "reporte")  { return; }
		if (id === "descargar") { descargarArchivo(); return; }
		if (id === "captura")  { setCapturaClip((c) => c + 1); return; }
		if (id === "compartir") { compartir(); return; }
		if (id === "mas") {
			setMostrarMas((f) => {
				if (!f && toolbarRef.current) { const r = toolbarRef.current.getBoundingClientRect(); setMasBarTop(r.bottom); }
				return !f;
			});
			setMostrarFormatos(false); setMostrarDetalle(false); setMostrarReporte(false);
			return;
		}
		if (id === "detalle") {
			setMostrarDetalle((f) => {
				if (!f && toolbarRef.current) { const r = toolbarRef.current.getBoundingClientRect(); setDetalleBarTop(r.bottom); }
				return !f;
			});
			setMostrarFormatos(false); setMostrarMas(false); setMostrarReporte(false);
			return;
		}
	};

	const MODOS_TOGGLE = ["lupa", "elipse", "rectangulo", "bidireccional"];

	const handleMasItem = (id) => {
		if (MODOS_TOGGLE.includes(id)) {
			const yaActivo =
				(id === "lupa" && lupaGlobal) ||
				(id === "elipse" && elipseGlobal) ||
				(id === "rectangulo" && rectanguloGlobal) ||
				(id === "bidireccional" && bidiGlobal);
			setLupaGlobal(false); setElipseGlobal(false); setRectanguloGlobal(false); setBidiGlobal(false);
			if (!yaActivo) {
				if (id === "lupa") setLupaGlobal(true);
				else if (id === "elipse") setElipseGlobal(true);
				else if (id === "rectangulo") setRectanguloGlobal(true);
				else if (id === "bidireccional") setBidiGlobal(true);
				setHerramienta(null);
			}
			return;
		}
		setMasAccion({ id, ts: Date.now() });
	};

	const MODAL_CONFIG = {
		radiologo: {
			titulo: "Asignar estudio a médico radiólogo",
			tabla: "empleados",
			select: "id_empleado, nombre",
			filtro: { col: "rol", val: "Radiologo" },
			idKey: "id_empleado",
			labelKey: "nombre",
			col: "id_radiologo",
			notifOk: "Radiólogo asignado",
			notifErr: "Error al asignar radiólogo",
		},
		tecnico: {
			titulo: "Asignar estudio a técnico radiólogo",
			tabla: "empleados",
			select: "id_empleado, nombre",
			filtro: { col: "rol", val: "Tecnico" },
			idKey: "id_empleado",
			labelKey: "nombre",
			col: "id_tecnico",
			notifOk: "Técnico asignado",
			notifErr: "Error al asignar técnico",
		},
		referente: {
			titulo: "Asignar estudio a médico referente",
			tabla: "medicos_referentes",
			select: "id_referente, nombre, especialidad",
			filtro: { col: "activo", val: true },
			idKey: "id_referente",
			labelKey: "nombre",
			sublabelKey: "especialidad",
			col: "id_referente",
			notifOk: "Médico referente asignado",
			notifErr: "Error al asignar referente",
		},
	};

	const abrirModalAsignar = (id) => {
		const cfg = MODAL_CONFIG[id];
		if (!cfg) return;
		setMostrarDetalle(false);
		setModalAsignar({ ...cfg, items: [], actual: null, seleccionado: null, loading: true });
		const idEstudio = estudioId || estudioData?.id;
		Promise.all([
			supabase.from(cfg.tabla).select(cfg.select).eq(cfg.filtro.col, cfg.filtro.val).order("nombre"),
			supabase.from("estudios_radiologia").select(cfg.col).eq("id_estudio", idEstudio).single(),
		]).then(([{ data: items }, { data: estudio }]) => {
			setModalAsignar((m) => ({ ...m, items: items || [], actual: estudio?.[cfg.col] || null, seleccionado: estudio?.[cfg.col] || null, loading: false }));
		});
	};

	const handleAsignarConfirmar = async () => {
		if (!modalAsignar?.seleccionado) return;
		const idEstudio = estudioId || estudioData?.id;
		const { error } = await supabase
			.from("estudios_radiologia")
			.update({ [modalAsignar.col]: modalAsignar.seleccionado, updated_at: new Date().toISOString() })
			.eq("id_estudio", idEstudio);
		if (error) showNotif(modalAsignar.notifErr, "error");
		else { showNotif(modalAsignar.notifOk, "exito"); setModalAsignar(null); }
	};

	const abrirModalComentarios = async () => {
		setMostrarDetalle(false);
		setModalComentarios(true);
		setComentarioTexto("");
		setComentarioEditId(null);
		const idEstudio = estudioId || estudioData?.id;
		const { data } = await supabase
			.from("comentarios_estudio")
			.select("id, texto, autor_nombre, autor_iniciales, created_at")
			.eq("id_estudio", idEstudio)
			.order("created_at", { ascending: true });
		setComentarios(data || []);
	};

	const handleAgregarComentario = async () => {
		const texto = comentarioTexto.trim();
		if (!texto) return;
		const idEstudio = estudioId || estudioData?.id;
		const nombreCompleto = empleadoData?.nombre || user?.email?.split("@")[0] || "Usuario";
		const iniciales = nombreCompleto.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
		const { data, error } = await supabase
			.from("comentarios_estudio")
			.insert({ id_estudio: idEstudio, texto, autor_nombre: nombreCompleto, autor_iniciales: iniciales, autor_uuid: user?.id || null })
			.select().single();
		if (error) { showNotif("Error al agregar comentario", "error"); return; }
		setComentarios((c) => [...c, data]);
		setComentarioTexto("");
		showNotif("Comentario agregado", "exito");
	};

	const handleEditarComentario = async (id) => {
		const texto = comentarioEditTxt.trim();
		if (!texto) return;
		const { error } = await supabase
			.from("comentarios_estudio")
			.update({ texto, updated_at: new Date().toISOString() })
			.eq("id", id);
		if (error) { showNotif("Error al actualizar comentario", "error"); return; }
		setComentarios((c) => c.map((x) => (x.id === id ? { ...x, texto } : x)));
		setComentarioEditId(null);
		setComentarioEditTxt("");
		showNotif("Comentario actualizado", "exito");
	};

	const handleEliminarComentario = async (id) => {
		const { error } = await supabase.from("comentarios_estudio").delete().eq("id", id);
		if (error) { showNotif("Error al eliminar comentario", "error"); return; }
		setComentarios((c) => c.filter((x) => x.id !== id));
		showNotif("Comentario eliminado", "exito");
	};

	const abrirModalPrioridad = async () => {
		setMostrarDetalle(false);
		const idEstudio = estudioId || estudioData?.id;
		setModalPrioridad({ altaPrioridad: false, loading: true });
		const { data } = await supabase
			.from("estudios_radiologia")
			.select("alta_prioridad")
			.eq("id_estudio", idEstudio)
			.single();
		setModalPrioridad({ altaPrioridad: data?.alta_prioridad ?? false, loading: false });
	};

	const handlePrioridadConfirmar = async () => {
		const idEstudio = estudioId || estudioData?.id;
		const { error } = await supabase
			.from("estudios_radiologia")
			.update({ alta_prioridad: modalPrioridad.altaPrioridad, updated_at: new Date().toISOString() })
			.eq("id_estudio", idEstudio);
		if (error) showNotif("Error al actualizar prioridad", "error");
		else showNotif(modalPrioridad.altaPrioridad ? "Estudio marcado como alta prioridad" : "Prioridad normal restablecida", "exito");
		setModalPrioridad(null);
	};

	const handleDetalleItem = (id) => {
		if (["radiologo", "tecnico", "referente"].includes(id)) abrirModalAsignar(id);
		else if (id === "prioridad") abrirModalPrioridad();
		else if (id === "comentarios") abrirModalComentarios();
		else if (id === "etiquetas") abrirModalEtiquetas();
		else if (id === "metricas") abrirModalMetricas();
		else if (id === "solicitud") abrirModalSolicitud();
		else setMostrarDetalle(false);
	};

	const abrirModalEtiquetas = async () => {
		setMostrarDetalle(false);
		const idEstudio = estudioId || estudioData?.id;
		const { data } = await supabase.from("estudios_radiologia").select("etiquetas").eq("id_estudio", idEstudio).single();
		setEtiquetas(data?.etiquetas || []);
		setEtiquetaInput("");
		setEtiquetaSugerencia(false);
		setModalEtiquetas(true);
	};

	const handleGuardarEtiquetas = async (lista) => {
		const idEstudio = estudioId || estudioData?.id;
		const { error } = await supabase.from("estudios_radiologia").update({ etiquetas: lista }).eq("id_estudio", idEstudio);
		if (error) { showNotif("Error al guardar etiquetas", "error"); return; }
		setEtiquetas(lista);
	};

	const agregarEtiqueta = (texto) => {
		const tag = texto.trim();
		if (!tag || etiquetas.includes(tag)) return;
		handleGuardarEtiquetas([...etiquetas, tag]);
		setEtiquetaInput("");
		setEtiquetaSugerencia(false);
	};

	const quitarEtiqueta = (tag) => handleGuardarEtiquetas(etiquetas.filter((e) => e !== tag));

	const abrirModalMetricas = async () => {
		setMostrarDetalle(false);
		const idEstudio = estudioId || estudioData?.id;
		setModalMetricas({ loading: true });
		const { data } = await supabase
			.from("estudios_radiologia")
			.select("tipo_estudio, fecha_estudio, primer_reporte_at, primer_reporte_usuario")
			.eq("id_estudio", idEstudio)
			.single();
		if (!data) { setModalMetricas(null); showNotif("No se encontraron métricas", "error"); return; }
		let tiempoTxt = "—";
		if (data.fecha_estudio && data.primer_reporte_at) {
			const diff = Math.round((new Date(data.primer_reporte_at) - new Date(data.fecha_estudio)) / 60000);
			if (diff < 60) tiempoTxt = `${diff} minuto${diff !== 1 ? "s" : ""}`;
			else { const h = Math.floor(diff / 60), m = diff % 60; tiempoTxt = m > 0 ? `${h}h ${m}min` : `${h}h`; }
		}
		const fmtDate = (iso) => iso ? new Date(iso).toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short" }) : "—";
		setModalMetricas({
			loading: false,
			modalidad: data.tipo_estudio || "—",
			fechaEstudio: fmtDate(data.fecha_estudio),
			primerReporte: fmtDate(data.primer_reporte_at),
			tiempoTranscurrido: tiempoTxt,
			usuario: data.primer_reporte_usuario || "—",
		});
	};

	const handleReporteItem = async (id) => {
		setMostrarReporte(false);
		if (id === "nueva-pestana") {
			const idEstudio = estudioId || estudioData?.id;
			const { data: est } = await supabase
				.from("estudios_radiologia")
				.select("fecha_estudio, reporte, id_radiologo")
				.eq("id_estudio", idEstudio)
				.single();
			const params = new URLSearchParams({
				idEstudio,
				nombrePaciente: pacienteInfo.nombre,
				tipoEstudio: pacienteInfo.tipoEstudio,
				fechaEstudio: est?.fecha_estudio || "",
				reporte: est?.reporte || "",
				radiologo: empleadoData?.nombre || "",
				cedula: empleadoData?.cedula || "",
				especialidad: empleadoData?.especialidad || "",
				firmaUrl: empleadoData?.firma_url || "",
			});
			window.open(`/reporte?${params.toString()}`, "_blank");
		}
		if (id === "adjuntar") {}
	};

	const handleTool = (id) => {
		if (id === "Datos")   { setMostrarInfo((f) => !f); return; }
		if (id === "centrar") { setCentrarCounter((c) => c + 1); return; }
		setLupaGlobal(false); setElipseGlobal(false); setRectanguloGlobal(false); setBidiGlobal(false);
		setHerramienta(id);
	};

	const toggleCine = () => {
		if (cineActivo) { clearInterval(cineRef.current); setCineActivo(false); return; }
		cineIdx.current = 0;
		cineRef.current = setInterval(() => {
			cineIdx.current = (cineIdx.current + 1) % imageIds.length;
			setPanelImageIds((p) => { const n = [...p]; n[panelActivo] = imageIds[cineIdx.current]; return n; });
		}, 300);
		setCineActivo(true);
	};

	const descargarArchivo = () => {
		const url = imageIds[0]?.replace("wadouri:", "");
		if (!url) return;
		const a = document.createElement("a");
		a.href = url; a.download = "estudio.dcm"; a.click();
	};

	const compartir = async () => {
		if (navigator.share) await navigator.share({ title: pacienteInfo.nombre, url: window.location.href });
		else { navigator.clipboard.writeText(window.location.href); alert("URL copiada"); }
	};

	const guardarReporte = async () => {
		await supabase.from("estudios_radiologia").update({ reporte: reporteTexto, updated_at: new Date().toISOString() }).eq("id_estudio", estudioId || estudioData?.id);
		alert("Guardado");
	};

	const totalPaneles = formatoGrid.cols * formatoGrid.rows;

	return (
		<div className="vd-root">
			<Header
				empleadoData={empleadoData}
				formatRol={formatRol}
				getPrimerNombre={getPrimerNombre}
				user={user}
				handleLogout={handleLogout}
				currentPage="visor"
			/>

			<div className="vd-toolbar" ref={toolbarRef}>
				<button className="vd-btn-back" onClick={() => navigate(-1)}>‹ Atrás</button>

				<div className="vd-paciente-chip">
					<span className="vd-chip-tipo">{pacienteInfo.tipoEstudio}</span>
					<span className="vd-chip-nombre">{pacienteInfo.nombre}</span>
					<span className="vd-chip-fecha">{pacienteInfo.horaFecha}</span>
				</div>

				<div className="vd-tools-group">
					{TOOLS.map((t) => (
						<button
							key={t.id}
							className={`vd-tool-btn ${t.id === "Datos" ? (mostrarInfo ? "activo" : "") : herramienta === t.id ? "activo" : ""}`}
							onClick={() => handleTool(t.id)}
							title={t.label}>
							{t.icon ? <img src={t.icon} alt={t.label} /> : <span>{t.emoji}</span>}
							<span>{t.label}</span>
						</button>
					))}
				</div>

				<div className="vd-separator" />

				<div className="vd-actions-group">
					{ACTIONS.map((a) => (
						<button
							key={a.id}
							className={`vd-tool-btn ${a.id === "cine" && cineActivo ? "cine-on" : ""} ${a.id === "reporte" && mostrarReporte ? "activo" : ""} ${a.id === "mas" && mostrarMas ? "activo" : ""} ${a.id === "detalle" && mostrarDetalle ? "activo" : ""}`}
							onClick={(e) => {
								if (a.id === "reporte") {
									const r = e.currentTarget.getBoundingClientRect();
									setReporteBarLeft(r.left + r.width / 2);
									if (toolbarRef.current) setReporteBarTop(toolbarRef.current.getBoundingClientRect().bottom);
									setMostrarReporte((f) => !f);
									setMostrarMas(false); setMostrarDetalle(false); setMostrarFormatos(false);
								} else {
									handleAction(a.id);
								}
							}}
							title={a.label}>
							{a.icon ? <img src={a.icon} alt={a.label} /> : <span>⊞</span>}
							<span>{a.label}</span>
						</button>
					))}
				</div>
			</div>

			{mostrarMas && (
				<div className="vd-mas-bar" style={{ top: masBarTop }}>
					{MAS_ITEMS.map((item) => (
						<button
							key={item.id}
							className={`vd-mas-item${item.id === "lupa" && lupaGlobal ? " activo" : ""}${item.id === "elipse" && elipseGlobal ? " activo" : ""}${item.id === "rectangulo" && rectanguloGlobal ? " activo" : ""}${item.id === "bidireccional" && bidiGlobal ? " activo" : ""}`}
							onClick={() => handleMasItem(item.id)}
							title={item.label}>
							{item.icon ? <img src={item.icon} alt={item.label} className="vd-mas-icon" /> : <span className="vd-mas-emoji">{item.emoji}</span>}
							<span>{item.label}</span>
						</button>
					))}
				</div>
			)}

			{mostrarDetalle && (
				<div className="vd-mas-bar" style={{ top: detalleBarTop }}>
					{DETALLE_ITEMS.map((item) => (
						<button key={item.id} className="vd-mas-item" onClick={() => handleDetalleItem(item.id)} title={item.label}>
							{item.icon ? <img src={item.icon} alt={item.label} className="vd-mas-icon" /> : <span className="vd-mas-emoji">{item.emoji}</span>}
							<span>{item.label}</span>
						</button>
					))}
				</div>
			)}

			{mostrarReporte && (
				<div className="vd-mas-bar" style={{ top: reporteBarTop, left: reporteBarLeft, transform: "translateX(-50%)" }}>
					{REPORTE_ITEMS.map((item) => (
						<button key={item.id} className="vd-mas-item" onClick={() => handleReporteItem(item.id)} title={item.label}>
							{item.icon ? <img src={item.icon} alt={item.label} className="vd-mas-icon" /> : <span className="vd-mas-emoji">{item.emoji}</span>}
							<span>{item.label}</span>
						</button>
					))}
				</div>
			)}

			<div className="vd-body">
				<div className="vd-sidebar">
					<div className="vd-sidebar-header">
						<span>Serie</span>
						<span className="vd-serie-count">{imageIds.length}</span>
					</div>
					<div className="vd-miniaturas">
						{loading ? (
							<div className="vd-mini-estado"><div className="vd-spinner" />Cargando...</div>
						) : error ? (
							<div className="vd-mini-estado error">⚠ {error}</div>
						) : (
							imageIds.map((id, i) => (
								<div
									key={i}
									className={`vd-miniatura ${panelImageIds[panelActivo] === id ? "activa" : ""}`}
									onClick={() => setPanelImageIds((prev) => { const n = [...prev]; n[panelActivo] = id; return n; })}>
									<div className="vd-mini-img">
										<span className="vd-mini-dcm">DCM</span>
										<span className="vd-mini-num">{i + 1}</span>
									</div>
									<div className="vd-mini-footer">{i + 1}/{imageIds.length}</div>
								</div>
							))
						)}
					</div>
				</div>

				<div className="vd-viewer">
					{mostrarInfo && (
						<div className="vd-overlay-paciente">
							<div>
								<p className="vd-ov-nombre">{pacienteInfo.nombre}</p>
								<p className="vd-ov-dato">{pacienteInfo.tipoEstudio} · {pacienteInfo.sucursal}</p>
								<p className="vd-ov-dato">{pacienteInfo.horaFecha}</p>
							</div>
							<span className={`vd-ov-estado estado-${pacienteInfo.estado?.toLowerCase().replace(/ /g, "-")}`}>
								{pacienteInfo.estado}
							</span>
						</div>
					)}

					{loading && (
						<div className="vd-loading">
							<div className="vd-spinner-lg" />
							<p>Cargando DICOM...</p>
						</div>
					)}

					{error && (
						<div className="vd-error">
							<span>⚠</span>
							<p>{error}</p>
							<button onClick={cargarImagenes}>Reintentar</button>
						</div>
					)}

					{mostrarFormatos && (
						<div className="vd-formatos-popup">
							{FORMATOS.map((f) => (
								<button
									key={f.id}
									className={`vd-formato-btn ${formatoGrid.id === f.id ? "activo" : ""}`}
									onClick={() => { setFormatoGrid(f); setMostrarFormatos(false); }}>
									<div className="vd-formato-grid" style={{ gridTemplateColumns: `repeat(${f.cols},1fr)`, gridTemplateRows: `repeat(${f.rows},1fr)` }}>
										{Array(f.cols * f.rows).fill(0).map((_, i) => <div key={i} />)}
									</div>
									<span>{f.label}</span>
								</button>
							))}
						</div>
					)}

					<div
						className="vd-grid"
						style={{ gridTemplateColumns: `repeat(${formatoGrid.cols},1fr)`, gridTemplateRows: `repeat(${formatoGrid.rows},1fr)` }}>
						{Array(totalPaneles).fill(0).map((_, i) => (
							<PanelDicom
								key={`${formatoGrid.id}-${i}`}
								imageId={panelImageIds[i] || null}
								herramienta={herramienta}
								isActive={panelActivo === i}
								resetCounter={resetCounter}
								centrarCounter={centrarCounter}
								masAccion={masAccion}
								capturaClip={panelActivo === i ? capturaClip : 0}
								lupaExterna={panelActivo === i ? lupaGlobal : false}
								elipseExterna={panelActivo === i ? elipseGlobal : false}
								rectExterna={panelActivo === i ? rectanguloGlobal : false}
								bidiExterna={panelActivo === i ? bidiGlobal : false}
								onCapturaOk={() => showNotif("Captura copiada al portapapeles", "exito")}
								onCapturaFail={() => showNotif("Captura descargada", "info")}
								onClick={() => setPanelActivo(i)}
							/>
						))}
					</div>
				</div>

				{mostrarPanelReporte && (
					<div className="vd-reporte">
						<div className="vd-reporte-header">
							<span>Reporte Radiológico</span>
							<button onClick={() => setMostrarPanelReporte(false)}>✕</button>
						</div>
						<div className="vd-reporte-info">
							<p><b>Paciente:</b> {pacienteInfo.nombre}</p>
							<p><b>Estudio:</b> {pacienteInfo.tipoEstudio}</p>
							<p><b>Fecha:</b> {pacienteInfo.horaFecha}</p>
						</div>
						<textarea className="vd-reporte-textarea" value={reporteTexto} onChange={(e) => setReporteTexto(e.target.value)} placeholder="Escribir reporte radiológico..." />
						<div className="vd-reporte-footer">
							<button className="vd-btn-guardar" onClick={guardarReporte}>Guardar</button>
							<button className="vd-btn-imprimir" onClick={() => window.print()}>Imprimir</button>
						</div>
					</div>
				)}
			</div>

			{modalInfo && (
				<div className="vd-modal-overlay" onClick={() => setModalInfo(false)}>
					<div className="vd-modal-box vd-modal-ficha" onClick={(e) => e.stopPropagation()}>
						<div className="vd-modal-header">
							<div>
								<span className="vd-modal-titulo">Ficha clínica</span>
								<p className="vd-modal-subtitulo">Información del paciente y del estudio.</p>
							</div>
							<button className="vd-modal-close" onClick={() => setModalInfo(false)}>✕</button>
						</div>
						<div className="vd-ficha-body">
							{fichaLoading ? (
								<div className="vd-modal-body"><span className="vd-modal-cargando">Cargando…</span></div>
							) : (
								<>
									<div className="vd-ficha-seccion">
										<button className="vd-ficha-seccion-hdr" onClick={() => toggleFichaSeccion("paciente")}>
											<span>Información del paciente</span>
											<span className="vd-ficha-chevron">{fichaSeccion.paciente ? "∧" : "∨"}</span>
										</button>
										{fichaSeccion.paciente && (
											<div className="vd-ficha-grid">
												<div className="vd-ficha-row">
													<label>Id del paciente</label>
													<input className="vd-ficha-input" readOnly value={fichaData?.paciente?.id_paciente || "—"} />
												</div>
												<div className="vd-ficha-row">
													<label>Nombre</label>
													<input className="vd-ficha-input" value={fichaData?.paciente?.primer_nombre || ""}
														onChange={(e) => setFichaData((d) => ({ ...d, paciente: { ...d.paciente, primer_nombre: e.target.value } }))} />
												</div>
												<div className="vd-ficha-row">
													<label>Apellido paterno</label>
													<input className="vd-ficha-input" value={fichaData?.paciente?.apellido_paterno || ""}
														onChange={(e) => setFichaData((d) => ({ ...d, paciente: { ...d.paciente, apellido_paterno: e.target.value } }))} />
												</div>
												<div className="vd-ficha-row">
													<label>Apellido materno</label>
													<input className="vd-ficha-input" value={fichaData?.paciente?.apellido_materno || ""}
														onChange={(e) => setFichaData((d) => ({ ...d, paciente: { ...d.paciente, apellido_materno: e.target.value } }))} />
												</div>
												<div className="vd-ficha-row">
													<label>Edad</label>
													<input className="vd-ficha-input" readOnly
														value={fichaData?.paciente?.fecha_nacimiento ? (() => { const d = new Date(fichaData.paciente.fecha_nacimiento); return Math.floor((Date.now() - d) / 31557600000) + "Y"; })() : "—"} />
												</div>
												<div className="vd-ficha-row">
													<label>Fecha de nacimiento</label>
													<input className="vd-ficha-input" type="date" value={fichaData?.paciente?.fecha_nacimiento?.split("T")[0] || ""}
														onChange={(e) => setFichaData((d) => ({ ...d, paciente: { ...d.paciente, fecha_nacimiento: e.target.value } }))} />
												</div>
												<div className="vd-ficha-row">
													<label>Número de teléfono</label>
													<input className="vd-ficha-input" value={fichaData?.paciente?.telefono || ""}
														onChange={(e) => setFichaData((d) => ({ ...d, paciente: { ...d.paciente, telefono: e.target.value } }))} />
												</div>
												<div className="vd-ficha-row">
													<label>Sexo</label>
													<select className="vd-ficha-input" value={fichaData?.paciente?.sexo || ""}
														onChange={(e) => setFichaData((d) => ({ ...d, paciente: { ...d.paciente, sexo: e.target.value } }))}>
														<option value="">Seleccionar</option>
														<option value="masculino">Masculino</option>
														<option value="femenino">Femenino</option>
														<option value="otro">Otro</option>
													</select>
												</div>
												<div className="vd-ficha-row">
													<label>Email</label>
													<input className="vd-ficha-input" type="email" value={fichaData?.paciente?.email || ""}
														onChange={(e) => setFichaData((d) => ({ ...d, paciente: { ...d.paciente, email: e.target.value } }))} />
												</div>
												<div className="vd-ficha-footer">
													<button className="vd-modal-btn-cancel" onClick={() => abrirModalInfo()}>Reiniciar</button>
													<button className="vd-modal-btn-ok" onClick={guardarFichaPaciente}>Guardar</button>
												</div>
											</div>
										)}
									</div>

									<div className="vd-ficha-seccion">
										<button className="vd-ficha-seccion-hdr" onClick={() => toggleFichaSeccion("historial")}>
											<span>Historial del paciente</span>
											<span className="vd-ficha-chevron">{fichaSeccion.historial ? "∧" : "∨"}</span>
										</button>
										{fichaSeccion.historial && (
											<div className="vd-ficha-tabla-wrap">
												{fichaData?.historial?.length === 0 ? (
													<p className="vd-ficha-empty">Actualmente no hay estudios relacionados con el ID de paciente ingresado</p>
												) : (
													<table className="vd-ficha-tabla">
														<thead><tr><th>MOD</th><th>DESCRIPCION</th><th>FECHA</th></tr></thead>
														<tbody>
															{fichaData?.historial?.map((h, i) => (
																<tr key={i}>
																	<td>{h.tipo || "—"}</td>
																	<td>{h.descripcion || "—"}</td>
																	<td>{h.fecha ? new Date(h.fecha).toLocaleDateString("es-MX") : "—"}</td>
																</tr>
															))}
														</tbody>
													</table>
												)}
											</div>
										)}
									</div>

									<div className="vd-ficha-seccion">
										<button className="vd-ficha-seccion-hdr" onClick={() => toggleFichaSeccion("estudio")}>
											<span>Informacion del estudio</span>
											<span className="vd-ficha-chevron">{fichaSeccion.estudio ? "∧" : "∨"}</span>
										</button>
										{fichaSeccion.estudio && (
											<div className="vd-ficha-grid">
												<div className="vd-ficha-row">
													<label>Fecha</label>
													<input className="vd-ficha-input" readOnly
														value={fichaData?.est?.fecha_estudio ? new Date(fichaData.est.fecha_estudio).toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short" }) : "—"} />
												</div>
												<div className="vd-ficha-row">
													<label>Descripción del Estudio</label>
													<input className="vd-ficha-input" value={fichaData?.est?.descripcion || ""}
														onChange={(e) => setFichaData((d) => ({ ...d, est: { ...d.est, descripcion: e.target.value } }))} />
												</div>
												<div className="vd-ficha-row">
													<label>Doctor:</label>
													<input className="vd-ficha-input" readOnly value={empleadoData?.nombre || "—"} />
												</div>
												<div className="vd-ficha-footer">
													<button className="vd-modal-btn-cancel" onClick={() => abrirModalInfo()}>Reiniciar</button>
													<button className="vd-modal-btn-ok" onClick={guardarInfoEstudio}>Guardar</button>
												</div>
											</div>
										)}
									</div>

									<div className="vd-ficha-seccion">
										<button className="vd-ficha-seccion-hdr" onClick={() => toggleFichaSeccion("tecnico")}>
											<span>Técnico asignado</span>
											<span className="vd-ficha-chevron">{fichaSeccion.tecnico ? "∧" : "∨"}</span>
										</button>
										{fichaSeccion.tecnico && (
											<div className="vd-ficha-grid">
												<div className="vd-ficha-row">
													<label></label>
													<select className="vd-ficha-input" value={tecnicoSeleccionado || ""}
														onChange={(e) => setTecnicoSeleccionado(e.target.value ? Number(e.target.value) : null)}>
														<option value="">Seleccionar técnico radiólogo</option>
														{tecnicosLista.map((t) => (
															<option key={t.id_empleado} value={t.id_empleado}>{t.nombre}</option>
														))}
													</select>
												</div>
												<div className="vd-ficha-footer vd-ficha-footer--right">
													<button className="vd-modal-btn-ok" onClick={asignarTecnicoInfo}>Asignar Estudio</button>
												</div>
											</div>
										)}
									</div>

									<div className="vd-ficha-seccion">
										<button className="vd-ficha-seccion-hdr" onClick={() => toggleFichaSeccion("solicitud")}>
											<span>Solicitud del estudio</span>
											<span className="vd-ficha-chevron">{fichaSeccion.solicitud ? "∧" : "∨"}</span>
										</button>
										{fichaSeccion.solicitud && (
											<div className="vd-ficha-solicitud">
												{fichaData?.est?.solicitud_url ? (
													<img src={fichaData.est.solicitud_url} alt="Solicitud" className="vd-ficha-solicitud-img" />
												) : (
													<label className="vd-ficha-dropzone">
														<input type="file" accept="image/*" style={{ display: "none" }}
															onChange={(e) => setSolicitudFile(e.target.files[0])} />
														<span className="vd-ficha-cloud">☁</span>
														<span><u>Seleccione</u> un archivo o arrastre aquí su foto.</span>
													</label>
												)}
												{solicitudFile && <p className="vd-ficha-filename">{solicitudFile.name}</p>}
											</div>
										)}
									</div>

									<div className="vd-ficha-seccion">
										<button className="vd-ficha-seccion-hdr" onClick={() => toggleFichaSeccion("comentariosInfo")}>
											<span>Comentarios</span>
											<span className="vd-ficha-chevron">{fichaSeccion.comentariosInfo ? "∧" : "∨"}</span>
										</button>
										{fichaSeccion.comentariosInfo && (
											<div className="vd-ficha-grid">
												{comentariosInfo.map((c) => (
													<div key={c.id} className="vd-coment-item vd-ficha-coment-item">
														<div className="vd-coment-avatar">{c.autor_iniciales || "??"}</div>
														<div className="vd-coment-content">
															<p className="vd-coment-texto">{c.texto}</p>
															<span className="vd-coment-meta">{c.autor_nombre} · {new Date(c.created_at).toLocaleDateString("es-MX")}</span>
														</div>
													</div>
												))}
												<textarea
													className="vd-coment-textarea"
													rows={3}
													placeholder="Escribe un comentario…"
													value={comentarioInfoTxt}
													onChange={(e) => setComentarioInfoTxt(e.target.value)}
												/>
												<div className="vd-ficha-footer vd-ficha-footer--right">
													<button className="vd-modal-btn-ok" disabled={!comentarioInfoTxt.trim()} onClick={agregarComentarioInfo}>
														Agregar un comentario
													</button>
												</div>
											</div>
										)}
									</div>
								</>
							)}
						</div>
					</div>
				</div>
			)}

			<ModalAsignar
				config={modalAsignar}
				onSeleccionar={(id) => setModalAsignar((m) => ({ ...m, seleccionado: id }))}
				onConfirmar={handleAsignarConfirmar}
				onCerrar={() => setModalAsignar(null)}
			/>

			{modalPrioridad && (
				<div className="vd-modal-overlay" onClick={() => setModalPrioridad(null)}>
					<div className="vd-modal-box" onClick={(e) => e.stopPropagation()}>
						<div className="vd-modal-header">
							<span className="vd-modal-titulo">Cambiar prioridad del estudio</span>
							<button className="vd-modal-close" onClick={() => setModalPrioridad(null)}>✕</button>
						</div>
						<div className="vd-modal-body">
							{modalPrioridad.loading ? (
								<span className="vd-modal-cargando">Cargando…</span>
							) : (
								<label className="vd-prioridad-row">
									<span className="vd-prioridad-label">Este estudio es de alta prioridad</span>
									<button
										className={`vd-toggle ${modalPrioridad.altaPrioridad ? "on" : ""}`}
										onClick={() => setModalPrioridad((m) => ({ ...m, altaPrioridad: !m.altaPrioridad }))}
										aria-label="Toggle alta prioridad">
										<span className="vd-toggle-thumb" />
									</button>
								</label>
							)}
						</div>
						<div className="vd-modal-footer">
							<button className="vd-modal-btn-cancel" onClick={() => setModalPrioridad(null)}>Cancelar</button>
							<button className="vd-modal-btn-ok" disabled={modalPrioridad.loading} onClick={handlePrioridadConfirmar}>Aceptar</button>
						</div>
					</div>
				</div>
			)}

			{modalComentarios && (
				<div className="vd-modal-overlay" onClick={() => setModalComentarios(false)}>
					<div className="vd-modal-box vd-modal-comentarios" onClick={(e) => e.stopPropagation()}>
						<div className="vd-modal-header">
							<span className="vd-modal-titulo">Comentarios</span>
							<button className="vd-modal-close" onClick={() => setModalComentarios(false)}>✕</button>
						</div>
						<div className="vd-modal-body vd-coment-body">
							<textarea className="vd-coment-textarea" placeholder="Escribe un comentario…" value={comentarioTexto} onChange={(e) => setComentarioTexto(e.target.value)} rows={4} />
						</div>
						<div className="vd-modal-footer">
							<button className="vd-modal-btn-cancel" onClick={() => setModalComentarios(false)}>Cancelar</button>
							<button className="vd-modal-btn-ok" disabled={!comentarioTexto.trim()} onClick={handleAgregarComentario}>Agregar un comentario</button>
						</div>
						{comentarios.length > 0 && (
							<div className="vd-coment-lista">
								{comentarios.map((c) => (
									<div key={c.id} className="vd-coment-item">
										<div className="vd-coment-avatar">{c.autor_iniciales || "??"}</div>
										<div className="vd-coment-content">
											{comentarioEditId === c.id ? (
												<>
													<textarea className="vd-coment-textarea vd-coment-textarea--edit" value={comentarioEditTxt} onChange={(e) => setComentarioEditTxt(e.target.value)} rows={2} autoFocus />
													<div className="vd-coment-edit-actions">
														<button className="vd-modal-btn-cancel vd-coment-btn-sm" onClick={() => { setComentarioEditId(null); setComentarioEditTxt(""); }}>Cancelar</button>
														<button className="vd-modal-btn-ok vd-coment-btn-sm" disabled={!comentarioEditTxt.trim()} onClick={() => handleEditarComentario(c.id)}>Actualizar comentario</button>
													</div>
												</>
											) : (
												<p className="vd-coment-texto">{c.texto}</p>
											)}
											<span className="vd-coment-meta">{c.autor_nombre} {new Date(c.created_at).toLocaleDateString("es-MX")}</span>
										</div>
										{comentarioEditId !== c.id && (
											<div className="vd-coment-actions">
												<button className="vd-coment-action-btn" title="Editar" onClick={() => { setComentarioEditId(c.id); setComentarioEditTxt(c.texto); }}>
													<img src={lapizIcono} alt="Editar" className="vd-coment-icon" />
												</button>
												<button className="vd-coment-action-btn vd-coment-action-btn--del" title="Eliminar" onClick={() => setConfirmElimComentario(c.id)}>
													<img src={basuraIcon} alt="Eliminar" className="vd-coment-icon vd-coment-icon--del" />
												</button>
											</div>
										)}
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			)}

			{modalMetricas && (
				<div className="vd-modal-overlay" onClick={() => setModalMetricas(null)}>
					<div className="vd-modal-box vd-modal-metricas" onClick={(e) => e.stopPropagation()}>
						<div className="vd-modal-header">
							<span className="vd-modal-titulo">Tiempo de reporte</span>
							<button className="vd-modal-close" onClick={() => setModalMetricas(null)}>✕</button>
						</div>
						{modalMetricas.loading ? (
							<div className="vd-modal-body"><span className="vd-modal-cargando">Cargando…</span></div>
						) : (
							<div className="vd-metricas-body">
								{[
									{ label: "Modalidad", valor: modalMetricas.modalidad },
									{ label: "Fecha y hora del estudio", valor: modalMetricas.fechaEstudio },
									{ label: "Fecha y hora del primer reporte", valor: modalMetricas.primerReporte },
									{ label: "Tiempo transcurrido", valor: modalMetricas.tiempoTranscurrido },
									{ label: "Usuario del primer reporte", valor: modalMetricas.usuario },
								].map(({ label, valor }) => (
									<div key={label} className="vd-metricas-row">
										<span className="vd-metricas-label">{label}</span>
										<span className="vd-metricas-valor">{valor}</span>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			)}

			{modalEtiquetas && (
				<div className="vd-modal-overlay" onClick={() => setModalEtiquetas(false)}>
					<div className="vd-modal-box vd-modal-etiquetas" onClick={(e) => e.stopPropagation()}>
						<div className="vd-modal-header">
							<span className="vd-modal-titulo">Agregar etiquetas al estudio</span>
							<button className="vd-modal-close" onClick={() => setModalEtiquetas(false)}>✕</button>
						</div>
						<div className="vd-etiq-row">
							<span className="vd-etiq-label">Etiquetas</span>
							<div className="vd-etiq-input-wrap" onClick={() => document.getElementById("vd-etiq-input").focus()}>
								{etiquetas.map((tag) => (
									<span key={tag} className="vd-etiq-chip">
										{tag}
										<button className="vd-etiq-chip-remove" onClick={() => quitarEtiqueta(tag)}>×</button>
									</span>
								))}
								<input
									id="vd-etiq-input"
									className="vd-etiq-text-input"
									value={etiquetaInput}
									placeholder={etiquetas.length === 0 ? "Escribe una etiqueta…" : ""}
									onChange={(e) => { setEtiquetaInput(e.target.value); setEtiquetaSugerencia(e.target.value.trim().length > 0); }}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === ",") { e.preventDefault(); agregarEtiqueta(etiquetaInput); }
										if (e.key === "Backspace" && etiquetaInput === "" && etiquetas.length > 0) quitarEtiqueta(etiquetas[etiquetas.length - 1]);
									}}
									autoComplete="off"
								/>
								{etiquetaSugerencia && (
									<div className="vd-etiq-dropdown">
										<div className="vd-etiq-dropdown-item" onMouseDown={() => agregarEtiqueta(etiquetaInput)}>
											Agregar: <em>&ldquo;{etiquetaInput}&rdquo;</em>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			)}

			{modalSolicitud && (
				<div className="vd-modal-overlay" onClick={() => setModalSolicitud(false)}>
					<div className="vd-modal-box" style={{ width: "min(520px, 94vw)" }} onClick={(e) => e.stopPropagation()}>
						<div className="vd-modal-header">
							<div>
								<span className="vd-modal-titulo">Solicitud del estudio</span>
								<p className="vd-modal-subtitulo">Seleccione y adjunte su solicitud para este estudio. Optativamente puede tomar una fotografía usando su cámara</p>
							</div>
							<button className="vd-modal-close" onClick={() => setModalSolicitud(false)}>✕</button>
						</div>
						<div className="vd-modal-body">
							{solicitudPreview ? (
								<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
									<img src={solicitudPreview} alt="Solicitud" className="vd-ficha-solicitud-img" />
									<button className="vd-modal-btn-cancel" style={{ alignSelf: "flex-start" }}
										onClick={() => setSolicitudPreview(null)}>
										Reemplazar
									</button>
								</div>
							) : (
								<label className="vd-ficha-dropzone" style={{ cursor: "pointer" }}>
									<input type="file" accept="image/*,application/pdf" style={{ display: "none" }}
										onChange={(e) => setSolicitudFile(e.target.files[0])} />
									<img src={nubeIcono} alt="Subir" style={{ width: 48, height: 48, opacity: 0.7, filter: "brightness(0) invert(1)" }} />
									<span><u>Seleccione</u> un archivo o arrastre aquí su foto.</span>
									{solicitudFile && <p className="vd-ficha-filename">{solicitudFile.name}</p>}
								</label>
							)}
							<label className="vd-ficha-dropzone" style={{ marginTop: "0.75rem", cursor: "pointer" }}>
								<input type="file" accept="image/*" capture="environment" style={{ display: "none" }}
									onChange={(e) => setSolicitudFile(e.target.files[0])} />
								<img src={capturaIcon} alt="Cámara" style={{ width: 28, height: 28, filter: "brightness(0) invert(1)", opacity: 0.85 }} />
								<span>Tomar una fotografía</span>
							</label>
						</div>
						<div className="vd-modal-footer">
							<button className="vd-modal-btn-cancel" onClick={() => setModalSolicitud(false)}>Cancelar</button>
							<button className="vd-modal-btn-ok" disabled={!solicitudFile || solicitudSubiendo} onClick={subirSolicitud}>
								{solicitudSubiendo ? "Subiendo..." : "Guardar"}
							</button>
						</div>
					</div>
				</div>
			)}

			<ModalConfirmarEliminacion
				isOpen={confirmElimComentario !== null}
				onClose={() => setConfirmElimComentario(null)}
				onConfirm={() => handleEliminarComentario(confirmElimComentario)}
				titulo="Confirmar eliminación"
				mensaje="¿Está seguro de que desea eliminar este comentario?"
			/>

			<ModalNotificacion
				isOpen={notif.isOpen}
				onClose={() => setNotif((n) => ({ ...n, isOpen: false }))}
				mensaje={notif.mensaje}
				tipo={notif.tipo}
			/>
		</div>
	);
};

export default VisorDicom;
