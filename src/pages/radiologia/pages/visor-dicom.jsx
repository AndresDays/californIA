import { useEffect, useRef, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import QRCode from "qrcode";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ModalConfirmarEliminacion from "../../../components/ModalConfirmarEliminacion";
import ModalNotificacion from "../../../components/ModalNotificacion";
import Header from "../../../components/header-principal";
import Sidebar from "../../../components/sidebar";
import { useAuth } from "../../../context/auth-context";
import { supabase } from "../../../lib/supabase-client";
import {
	esEmailValido,
	esTelefono10Digitos,
	normalizarTelefono10,
} from "../../../utils/form-validations";
import { crearUrlPortalResultados } from "../../../utils/portal-resultados";
import {
	crearNombreArchivoReporte,
	generarReportePdf,
} from "../../../utils/reporte-pdf";
import { crearNotificacion } from "../../../utils/notificaciones";
import {
	EVENTOS_SOLICITUD,
	registrarEventoSolicitud,
} from "../../../utils/solicitud-auditoria";
import { obtenerColumnaSchemaCacheFaltante } from "../../../utils/supabase-errors";
import {
	agruparImagenesDicomPorSerie,
	crearImagenDicomFallback,
	esArchivoDicom,
	normalizarStoragePathDicom,
	obtenerPresetVentanaInicialSerie,
	obtenerSerieFuenteMpr,
	ordenarSeriesParaMpr,
} from "../../../utils/dicom-series";
import { crearColaInicialMpr } from "../../../utils/mpr-loader";
import {
	crearClaveImagenDicom,
	crearClaveSerieDicom,
	crearEstadoVistaDicom,
	crearEstadoVentanaSerieDicom,
	leerEstadoVistaDicom,
	leerEstadoVentanaSerieDicom,
} from "../../../utils/dicom-view-state";
import {
	esDoctorExterno,
	obtenerIdDoctorExterno,
	puedeAsignarRadiologia,
	puedeEditarReporteRadiologia,
	puedeVerReporteRadiologia,
} from "../../../utils/radiologia-permisos";
import { esRadiologoClinicoPermisos } from "../../../utils/role-permissions";
import useSidebar from "../../../utils/use-sidebar";
import ModalAsignar from "../componentes/ModalAsignar";
import Mpr2dViewer from "../componentes/Mpr2dViewer";
import PanelIA from "./Panelia";
import { MEMBRETE_B64 } from "./reporte-radiologia-template";
import "./ReporteRadiologia.css";
import "./VisorDicom.css";

import anguloIcono from "../../../assets/anguloIcono.png";
import anotarIcono from "../../../assets/anotarIcono.png";
import basuraIcon from "../../../assets/basuraIcon.png";
import capturaIcon from "../../../assets/capturaIcono.png";
import centrarIcon from "../../../assets/centrarIcono.png";
import cineIcon from "../../../assets/cineIcono.png";
import clipIcon from "../../../assets/clipIcon.png";
import comentarioIcon from "../../../assets/comentarioIcono.png";
import compartirIcon from "../../../assets/compartirIcono.png";
import contrasteIcono from "../../../assets/contrasteIcono.png";
import descargarIcon from "../../../assets/descargarIcono.png";
import detallesIcon from "../../../assets/detallesIcono.png";
import doctorIcon from "../../../assets/doctorV2Icono.png";
import {
	default as lapizIcono,
	default as reporteIcon,
} from "../../../assets/editarIcono.png";
import etiquetaIcon from "../../../assets/etiquetaIcono.png";
import exclamacionIcon from "../../../assets/exclamacionIcono.png";
import formatoIcon from "../../../assets/formatoIcono.png";
import informacionIcon from "../../../assets/informacionIcono.png";
import longitudIcono from "../../../assets/longitudIcono.png";
import ampliarIcon from "../../../assets/lupaIcono.png";
import masIcon from "../../../assets/masIcono.png";
import metricasIcon from "../../../assets/metricasIcono.png";
import moverIcon from "../../../assets/moverIcono.png";
import ojosIcono from "../../../assets/ojosIcono.png";
import pestanaIcon from "../../../assets/pestanaIcono.png";
import referenteIcon from "../../../assets/referenteIcono.png";
import restaurarIcon from "../../../assets/restaurarIcono.png";
import scrollIcon from "../../../assets/scrollIcono.png";
import solicitudIcon from "../../../assets/solicitudIcono.png";
import tecnicoIcon from "../../../assets/tecnicoIcono.png";

let csModules = null;
let csInitPromise = null;
const BUCKET_ADJUNTOS_REPORTE = "reportes-radiologia-adjuntos";
const REPORTE_ADJUNTO_MAX_SIZE = 25 * 1024 * 1024;
const cacheSesionVisorDicom = new Map();
const precargasInicialesMpr = new Set();

const claveSesionMpr = (idEstudio) => `california:mpr:${idEstudio}`;
const leerSesionMpr = (idEstudio) => {
	try { return JSON.parse(sessionStorage.getItem(claveSesionMpr(idEstudio)) || "null"); } catch { return null; }
};
const guardarSesionMpr = (idEstudio, estado) => {
	try {
		const actual = leerSesionMpr(idEstudio) || {};
		sessionStorage.setItem(claveSesionMpr(idEstudio), JSON.stringify({ ...actual, ...estado }));
	} catch {}
};

const esErrorColumnaFaltante = (error, columna) => {
	const mensaje = String(error?.message || "").toLowerCase();
	const columnaNormalizada = String(columna || "").toLowerCase();
	return (
		(error?.code === "42703" || error?.code === "PGRST204") &&
		mensaje.includes(columnaNormalizada)
	);
};

const normalizarRolAsignacionRadiologia = (rol = "") =>
	String(rol)
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();

const esRolRadiologoAsignable = (rol = "") => {
	const rolNormalizado = normalizarRolAsignacionRadiologia(rol);
	return rolNormalizado.includes("radiologo") || rolNormalizado.includes("radiologa");
};

const esRolTecnicoRadiologiaAsignable = (rol = "") => {
	const rolNormalizado = normalizarRolAsignacionRadiologia(rol);
	return rolNormalizado.includes("tecnico");
};

const crearItemAsignacionRadiologia = (item, tipo) => {
	const esEmpleado = tipo === "empleado";
	const id = esEmpleado ? item.id_empleado : item.id_doctor;
	return {
		...item,
		__asignacion_id: `${tipo}:${id}`,
		__target_col: esEmpleado ? "id_radiologo" : "id_doctor",
		__target_value: id,
		nombre: item.nombre || "Sin nombre",
		especialidad: esEmpleado
			? item.especialidad || item.rol || "Empleado radiólogo"
			: item.especialidad || item.institucion || "Doctor externo",
	};
};

const normalizarTextoEstudio = (valor = "") =>
	String(valor)
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "");

const descripcionesCoinciden = (a = "", b = "") => {
	const textoA = normalizarTextoEstudio(a);
	const textoB = normalizarTextoEstudio(b);
	if (!textoA || !textoB) return false;
	return textoA === textoB || textoA.includes(textoB) || textoB.includes(textoA);
};

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

const programarPrecargaInicialMpr = (idEstudio, series = []) => {
	const modalidadesMpr = ["TOMOGRAFIA", "RESONANCIA MAGNETICA", "CT", "MR", "RM"];
	if (precargasInicialesMpr.has(String(idEstudio))) return;
	if (!series.some((serie) => modalidadesMpr.includes(String(serie.modalidad || "").toUpperCase()))) return;
	const serieFuente = obtenerSerieFuenteMpr(series);
	if (!serieFuente) return;
	const seriesPriorizadas = ordenarSeriesParaMpr(series, serieFuente.id);
	const cola = crearColaInicialMpr(seriesPriorizadas);
	if (!cola.length) return;
	precargasInicialesMpr.add(String(idEstudio));
	const precargar = async () => {
		const { cornerstone } = await initCornerstone();
		let siguiente = 0;
		const worker = async () => {
			while (siguiente < cola.length) {
				const imageId = cola[siguiente++];
				try { await cornerstone.loadAndCacheImage(imageId); } catch {}
			}
		};
		await Promise.all(Array.from({ length: 3 }, worker));
	};
	const iniciarCuandoEsteLibre = () => { void precargar(); };
	if (typeof window !== "undefined" && "requestIdleCallback" in window) {
		window.requestIdleCallback(iniciarCuandoEsteLibre, { timeout: 350 });
	} else {
		setTimeout(iniciarCuandoEsteLibre, 150);
	}
};

const TOOLS = [
	{ id: "StackScroll", icon: scrollIcon, label: "Scroll" },
	{ id: "Zoom", icon: ampliarIcon, label: "Ampliar" },
	{ id: "Wwwc", icon: contrasteIcono, label: "W/L" },
	{ id: "Pan", icon: moverIcon, label: "Mover" },
	{ id: "Datos", icon: ojosIcono, label: "Datos" },
	{ id: "Length", icon: longitudIcono, label: "Longitud" },
	{ id: "Annotate", icon: anotarIcono, label: "Anotar" },
	{ id: "Angle", icon: anguloIcono, label: "Ángulo" },
	{ id: "centrar", icon: centrarIcon, label: "Centrar" },
];

const PRESETS_VENTANA = [
	{ id: "ct-tejido-blando", modalidad: "CT", label: "CT - Tejido blando", ancho: 400, nivel: 40 },
	{ id: "ct-hueso", modalidad: "CT", label: "CT - Hueso", ancho: 1500, nivel: 600 },
	{ id: "ct-cerebro", modalidad: "CT", label: "CT - Cerebro", ancho: 80, nivel: 40 },
	{ id: "ct-pulmon", modalidad: "CT", label: "CT - Pulmón", ancho: 1500, nivel: -600 },
	{ id: "ct-higado", modalidad: "CT", label: "CT - Hígado", ancho: 150, nivel: 70 },
	{ id: "mr-alto-contraste", modalidad: "MR", label: "MR - Alto contraste", ancho: 500, nivel: 100 },
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
	{ id: "lupa", icon: ampliarIcon, label: "Lupa" },
	{ id: "ventanaROI", icon: contrasteIcono, label: "Ventana ROI" },
	{ id: "elipse", icon: anotarIcono, label: "Elipse" },
	{ id: "rectangulo", icon: formatoIcon, label: "Rectángulo" },
	{ id: "negativo", icon: contrasteIcono, label: "Negativo" },
	{ id: "girar", icon: restaurarIcon, label: "Girar →" },
	{ id: "voltearH", icon: restaurarIcon, label: "Voltear H" },
	{ id: "voltearV", icon: centrarIcon, label: "Voltear V" },
	{ id: "limpiar", icon: basuraIcon, label: "Limpiar" },
	{ id: "bidireccional", icon: longitudIcono, label: "Bidireccional" },
];

const DETALLE_ITEMS = [
	{ id: "referente", icon: referenteIcon, label: "Referente" },
	{ id: "radiologo", icon: doctorIcon, label: "Radiólogo" },
	{ id: "tecnico", icon: tecnicoIcon, label: "Técnico" },
	{ id: "prioridad", icon: exclamacionIcon, label: "Prioridad" },
	{ id: "comentarios", icon: comentarioIcon, label: "Comentarios" },
	{ id: "etiquetas", icon: etiquetaIcon, label: "Etiquetas" },
	{ id: "solicitud", icon: solicitudIcon, label: "Solicitud" },
	{ id: "metricas", icon: metricasIcon, label: "Métricas" },
];

const REPORTE_ITEMS = [
	{ id: "nueva-pestana", icon: pestanaIcon, label: "Nueva pestaña" },
	{ id: "plantillas", icon: formatoIcon, label: "Usar plantilla" },
	{ id: "adjuntar", icon: clipIcon, label: "Adjuntar" },
];

const VIEW_ACTION_IDS = ["restaurar", "cine", "formato", "mas"];
const WORKFLOW_ACTION_IDS = [
	"reporte",
	"captura",
	"descargar",
	"compartir",
	"detalle",
];

const PanelDicom = ({
	imageId,
	imagenDicom,
	estadoVista,
	estadoVentanaSerie,
	onGuardarEstadoVista,
	onGuardarVentanaSerie,
	onEliminarEstadoVista,
	stackImageIds,
	onStackScroll,
	herramienta,
	herramientaFijada,
	isActive,
	resetCounter,
	centrarCounter,
	masAccion,
	capturaClip,
	lupaExterna,
	elipseExterna,
	rectExterna,
	bidiExterna,
	presetVentanaId,
	usarVentanaSerie,
	onShortcutTool,
	onCapturaOk,
	onCapturaFail,
	onClick,
}) => {
	const wrapperRef = useRef(null);
	const divRef = useRef(null);
	const overlayRef = useRef(null);
	const csRef = useRef(null);
	const enabledRef = useRef(false);
	const requestedImageIdRef = useRef(null);
	const imageIdRef = useRef(imageId);
	const herramientaRef = useRef(herramienta);
	const herramientaFijadaRef = useRef(herramientaFijada);
	const herramientaAntesZoomRef = useRef(null);
	const dragRef = useRef({ active: false, lastX: 0, lastY: 0 });
	const lastStackWheelRef = useRef(0);
	const zoomTemporalRef = useRef(false);
	const arrastrandoBarraRef = useRef(false);
	const ventanaSeriePendienteRef = useRef(null);
	const guardadoTimerRef = useRef(null);
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
	const [cornerstoneListo, setCornerstoneListo] = useState(false);
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
		herramientaFijadaRef.current = herramientaFijada;
	}, [herramientaFijada]);

	useEffect(() => {
		imageIdRef.current = imageId;
	}, [imageId]);

	useEffect(() => {
		lastStackWheelRef.current = 0;
	}, [stackImageIds]);

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
					setCornerstoneListo(true);
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
			if (imageIdRef.current) await cargarImagen(imageIdRef.current);
		};
		init();
		return () => {
			cancelled = true;
		};
	}, []);

	const aplicarPresetVentana = () => {
		const preset = PRESETS_VENTANA.find((item) => item.id === presetVentanaId);
		const cs = csRef.current;
		const el = divRef.current;
		if (!preset || !enabledRef.current || !cs || !el) return;
		const vp = cs.getViewport(el);
		if (!vp) return;
		cs.setViewport(el, {
			...vp,
			voi: { ...vp.voi, windowWidth: preset.ancho, windowCenter: preset.nivel },
		});
		cs.updateImage(el);
	};

	const cargarImagen = async (id) => {
		const cs = csRef.current;
		const el = divRef.current;
		if (!enabledRef.current || !cs || !el) return;
		requestedImageIdRef.current = id;
		try {
			const image = await cs.loadAndCacheImage(id);
			if (requestedImageIdRef.current !== id) return;
			cs.displayImage(el, image);
			cs.reset(el);
			const estado = leerEstadoVistaDicom(estadoVista);
			if (estado) {
				medicionRef.current.lineas = estado.overlays.lineas || [];
				anotacionRef.current.anotaciones = estado.overlays.anotaciones || [];
				anguloRef.current.angulos = estado.overlays.angulos || [];
				elipseRef.current.elipses = estado.overlays.elipses || [];
				rectRef.current.rects = estado.overlays.rects || [];
				bidiRef.current.bidis = estado.overlays.bidis || [];
			}
			aplicarPresetVentana();
			const ventanaSerie = leerEstadoVentanaSerieDicom(estadoVentanaSerie);
			const voiGuardado = ventanaSerie?.voi || (usarVentanaSerie ? null : estado?.viewport?.voi);
			if (voiGuardado) {
				const vp = cs.getViewport(el);
				if (vp) {
					cs.setViewport(el, {
						...vp,
						voi: { ...vp.voi, ...voiGuardado },
					});
				}
			}
			cs.resize(el, true);
			sincronizarOverlay();
		} catch (err) {
			console.error("[Panel] cargarImagen:", err);
		}
	};

	useEffect(() => {
		if (!cornerstoneListo || !imageId || stackImageIds.length < 2 || !csRef.current) return;
		const indice = stackImageIds.indexOf(imageId);
		if (indice < 0) return;
		let cancelado = false;
		const pendientes = stackImageIds
			.map((id, i) => ({ id, distancia: Math.abs(i - indice) }))
			.filter(({ id }) => id !== imageId)
			.sort((a, b) => a.distancia - b.distancia)
			.slice(0, 24);
		const precargar = async () => {
				while (!cancelado && pendientes.length) {
					const siguiente = pendientes.shift();
					try { await csRef.current?.loadAndCacheImage(siguiente.id); } catch {}
				}
			};
		Promise.all([precargar(), precargar(), precargar()]);
		return () => { cancelado = true; };
	}, [cornerstoneListo, imageId, stackImageIds]);

	useEffect(() => {
		if (!imageId) return;
		const intentar = async () => {
			if (!enabledRef.current) await new Promise((r) => setTimeout(r, 200));
			await cargarImagen(imageId);
		};
		intentar();
	}, [imageId, estadoVista, usarVentanaSerie]);

	useEffect(() => {
		if (!imageId) return;
		try {
			aplicarPresetVentana();
		} catch {}
	}, [imageId, presetVentanaId]);

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
			elipseRef.current.elipses = [];
			rectRef.current.rects = [];
			bidiRef.current.bidis = [];
			const overlay = overlayRef.current;
			if (overlay)
				overlay.getContext("2d").clearRect(0, 0, overlay.width, overlay.height);
			onEliminarEstadoVista?.();
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

	const guardarEstadoActual = (inmediato = false) => {
		if (!imagenDicom || !onGuardarEstadoVista) return;
		const persistir = () =>
			onGuardarEstadoVista(
				crearEstadoVistaDicom({
					viewport: csRef.current?.getViewport(divRef.current),
					lineas: medicionRef.current.lineas,
					anotaciones: anotacionRef.current.anotaciones,
					angulos: anguloRef.current.angulos,
					elipses: elipseRef.current.elipses,
					rects: rectRef.current.rects,
					bidis: bidiRef.current.bidis,
				}),
			);
		if (inmediato) return persistir();
		clearTimeout(guardadoTimerRef.current);
		guardadoTimerRef.current = setTimeout(persistir, 500);
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
		guardarEstadoActual();
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
		const Wmm = distanciaMM(mx - perpX, my - perpY, mx + perpX, my + perpY).toFixed(
			1,
		);

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
			srcX,
			srcY,
			srcW,
			srcH,
			cx - RADIO,
			cy - RADIO,
			RADIO * 2,
			RADIO * 2,
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
	const esSerieNavegable = () => imageId && stackImageIds.length > 1;
	const indiceImagenActual = Math.max(0, stackImageIds.indexOf(imageId));
	const porcentajeThumbStack = Math.max(6, Math.min(100, 100 / stackImageIds.length));
	const posicionThumbStack =
		stackImageIds.length > 1
			? (indiceImagenActual / (stackImageIds.length - 1)) * (100 - porcentajeThumbStack)
			: 0;
	const activarAtajo = (tool) => {
		if (herramientaFijadaRef.current) return;
		herramientaRef.current = tool;
		onShortcutTool?.(tool);
	};

	const onMouseDown = (e) => {
		if (esSerieNavegable() && e.button === 2) {
			e.preventDefault();
			zoomTemporalRef.current = true;
			if (herramientaFijadaRef.current) {
				herramientaAntesZoomRef.current = herramientaRef.current;
				herramientaRef.current = "Zoom";
			} else activarAtajo("Zoom");
			return;
		}
		if (esSerieNavegable() && e.button === 0 && !herramientaFijadaRef.current) activarAtajo("Wwwc");
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
						px1: d1.px,
						py1: d1.py,
						px2: d2.px,
						py2: d2.py,
						dist,
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
				ar.p1x = pos.x;
				ar.p1y = pos.y;
				ar.previewX = pos.x;
				ar.previewY = pos.y;
				ar.clickX = pos.x;
				ar.clickY = pos.y;
				ar.wasDrag = false;
			} else if (ar.fase === 1) {
				ar.p2x = pos.x;
				ar.p2y = pos.y;
				ar.previewX = pos.x;
				ar.previewY = pos.y;
				ar.clickX = pos.x;
				ar.clickY = pos.y;
				ar.wasDrag = false;
				ar.fase = 2;
			} else if (ar.fase === 2) {
				const grados = calcularAngulo(ar.p1x, ar.p1y, ar.p2x, ar.p2y, pos.x, pos.y);
				if (grados > 0.5) {
					const dp1 = canvasToPixel(ar.p1x, ar.p1y),
						dp2 = canvasToPixel(ar.p2x, ar.p2y),
						dp3 = canvasToPixel(pos.x, pos.y);
					ar.angulos.push({
						pp1x: dp1.px,
						pp1y: dp1.py,
						pp2x: dp2.px,
						pp2y: dp2.py,
						pp3x: dp3.px,
						pp3y: dp3.py,
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
				canvasX: pos.x,
				canvasY: pos.y,
				screenX: scrPos.x,
				screenY: scrPos.y,
				dicomX: dp.px,
				dicomY: dp.py,
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
				const rx = Math.abs(pos.x - cx),
					ry = Math.abs(pos.y - cy);
				if (rx > 5 && ry > 5) {
					const stats = calcularEstadisticasElipse(cx, cy, rx, ry);
					const dc = canvasToPixel(cx, cy);
					const sc = getVp()?.vp.scale ?? 1;
					elipseRef.current.elipses.push({
						pcx: dc.px,
						pcy: dc.py,
						prx: rx / sc,
						pry: ry / sc,
						stats,
					});
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
					const dr1 = canvasToPixel(x1, y1),
						dr2 = canvasToPixel(pos.x, pos.y);
					rectRef.current.rects.push({
						px1: dr1.px,
						py1: dr1.py,
						px2: dr2.px,
						py2: dr2.py,
						stats,
					});
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
					const db1 = canvasToPixel(cx, cy),
						db2 = canvasToPixel(pos.x, pos.y);
					bidiRef.current.bidis.push({
						pcx: db1.px,
						pcy: db1.py,
						pex: db2.px,
						pey: db2.py,
					});
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
	const seleccionarImagenDesdeBarra = (e) => {
		e.stopPropagation();
		const rect = e.currentTarget.getBoundingClientRect();
		const proporcion = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
		const indiceDestino = Math.round(proporcion * (stackImageIds.length - 1));
		if (Number.isNaN(indiceDestino) || indiceDestino === indiceImagenActual) return;
		onStackScroll?.(indiceDestino - indiceImagenActual);
	};

	const onContextMenu = (e) => {
		e.preventDefault();
		const pos = getCanvasPos(e);
		const overlay = overlayRef.current;
		const rect = overlay?.getBoundingClientRect();
		const sx = e.clientX - (rect?.left || 0);
		const sy = e.clientY - (rect?.top || 0);

		const lineaC = (l) => {
			const c1 = pixelToCanvas(l.px1, l.py1),
				c2 = pixelToCanvas(l.px2, l.py2);
			return { x1: c1.cx, y1: c1.cy, x2: c2.cx, y2: c2.cy };
		};
		const anotC = (a) => {
			const ca = pixelToCanvas(a.px, a.py);
			return { x: ca.cx, y: ca.cy };
		};
		const anguloC = (a) => {
			const c1 = pixelToCanvas(a.pp1x, a.pp1y),
				c2 = pixelToCanvas(a.pp2x, a.pp2y),
				c3 = pixelToCanvas(a.pp3x, a.pp3y);
			return {
				p1x: c1.cx,
				p1y: c1.cy,
				p2x: c2.cx,
				p2y: c2.cy,
				p3x: c3.cx,
				p3y: c3.cy,
			};
		};
		const elipseC = (el) => {
			const cc = pixelToCanvas(el.pcx, el.pcy);
			const sc = getVp()?.vp.scale ?? 1;
			return { cx: cc.cx, cy: cc.cy, rx: el.prx * sc, ry: el.pry * sc };
		};
		const rectC = (r) => {
			const c1 = pixelToCanvas(r.px1, r.py1),
				c2 = pixelToCanvas(r.px2, r.py2);
			return { x1: c1.cx, y1: c1.cy, x2: c2.cx, y2: c2.cy };
		};
		const bidiC = (b) => {
			const c1 = pixelToCanvas(b.pcx, b.pcy),
				c2 = pixelToCanvas(b.pex, b.pey);
			return { cx: c1.cx, cy: c1.cy, ex: c2.cx, ey: c2.cy };
		};

		{
			const idx = medicionRef.current.lineas.findIndex((l) =>
				lineaHitTest(pos.x, pos.y, lineaC(l)),
			);
			if (idx >= 0) {
				setCtxMenu({ tipo: "linea", idx, screenX: sx, screenY: sy });
				return;
			}
		}
		{
			const idx = anotacionRef.current.anotaciones.findIndex((a) =>
				anotacionHitTest(pos.x, pos.y, anotC(a)),
			);
			if (idx >= 0) {
				setCtxMenu({ tipo: "anotacion", idx, screenX: sx, screenY: sy });
				return;
			}
		}
		{
			const idx = anguloRef.current.angulos.findIndex((a) =>
				anguloHitTest(pos.x, pos.y, anguloC(a)),
			);
			if (idx >= 0) {
				setCtxMenu({ tipo: "angulo", idx, screenX: sx, screenY: sy });
				return;
			}
		}
		{
			const idx = elipseRef.current.elipses.findIndex((el) =>
				elipseHitTest(pos.x, pos.y, elipseC(el)),
			);
			if (idx >= 0) {
				setCtxMenu({ tipo: "elipse", idx, screenX: sx, screenY: sy });
				return;
			}
		}
		{
			const idx = rectRef.current.rects.findIndex((r) =>
				rectHitTest(pos.x, pos.y, rectC(r)),
			);
			if (idx >= 0) {
				setCtxMenu({ tipo: "rect", idx, screenX: sx, screenY: sy });
				return;
			}
		}
		{
			const idx = bidiRef.current.bidis.findIndex((b) =>
				bidiHitTest(pos.x, pos.y, bidiC(b)),
			);
			if (idx >= 0) {
				setCtxMenu({ tipo: "bidi", idx, screenX: sx, screenY: sy });
				return;
			}
		}
	};
	const cerrarMenu = () => setCtxMenu(null);

	const onMouseMove = (e) => {
		const tool = herramientaRef.current;
		const pos = getCanvasPos(e);

		{
			let changed = false;
			const sc = getVp()?.vp.scale ?? 1;

			const lIdx = medicionRef.current.lineas.findIndex((l) => {
				const c1 = pixelToCanvas(l.px1, l.py1),
					c2 = pixelToCanvas(l.px2, l.py2);
				return lineaHitTest(pos.x, pos.y, {
					x1: c1.cx,
					y1: c1.cy,
					x2: c2.cx,
					y2: c2.cy,
				});
			});
			if (lIdx !== medicionRef.current.hoveredIdx) {
				medicionRef.current.hoveredIdx = lIdx;
				changed = true;
			}

			const angIdx = anguloRef.current.angulos.findIndex((a) => {
				const c1 = pixelToCanvas(a.pp1x, a.pp1y),
					c2 = pixelToCanvas(a.pp2x, a.pp2y),
					c3 = pixelToCanvas(a.pp3x, a.pp3y);
				return anguloHitTest(pos.x, pos.y, {
					p1x: c1.cx,
					p1y: c1.cy,
					p2x: c2.cx,
					p2y: c2.cy,
					p3x: c3.cx,
					p3y: c3.cy,
				});
			});
			if (angIdx !== anguloRef.current.hoveredIdx) {
				anguloRef.current.hoveredIdx = angIdx;
				changed = true;
			}

			const aIdx = anotacionRef.current.anotaciones.findIndex((a) => {
				const ca = pixelToCanvas(a.px, a.py);
				return anotacionHitTest(pos.x, pos.y, { x: ca.cx, y: ca.cy });
			});
			if (aIdx !== anotacionRef.current.hoveredIdx) {
				anotacionRef.current.hoveredIdx = aIdx;
				changed = true;
			}

			const eIdx = elipseRef.current.elipses.findIndex((el) => {
				const cc = pixelToCanvas(el.pcx, el.pcy);
				return elipseHitTest(pos.x, pos.y, {
					cx: cc.cx,
					cy: cc.cy,
					rx: el.prx * sc,
					ry: el.pry * sc,
				});
			});
			if (eIdx !== elipseRef.current.hoveredIdx) {
				elipseRef.current.hoveredIdx = eIdx;
				changed = true;
			}

			const rIdx = rectRef.current.rects.findIndex((r) => {
				const c1 = pixelToCanvas(r.px1, r.py1),
					c2 = pixelToCanvas(r.px2, r.py2);
				return rectHitTest(pos.x, pos.y, {
					x1: c1.cx,
					y1: c1.cy,
					x2: c2.cx,
					y2: c2.cy,
				});
			});
			if (rIdx !== rectRef.current.hoveredIdx) {
				rectRef.current.hoveredIdx = rIdx;
				changed = true;
			}

			const bIdx = bidiRef.current.bidis.findIndex((b) => {
				const c1 = pixelToCanvas(b.pcx, b.pcy),
					c2 = pixelToCanvas(b.pex, b.pey);
				return bidiHitTest(pos.x, pos.y, {
					cx: c1.cx,
					cy: c1.cy,
					ex: c2.cx,
					ey: c2.cy,
				});
			});
			if (bIdx !== bidiRef.current.hoveredIdx) {
				bidiRef.current.hoveredIdx = bIdx;
				changed = true;
			}

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
		const cs = csRef.current,
			el = divRef.current;
		const dx = e.clientX - drag.lastX,
			dy = e.clientY - drag.lastY;
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
				if (onGuardarVentanaSerie) {
					ventanaSeriePendienteRef.current = {
						windowWidth: vp.voi.windowWidth,
						windowCenter: vp.voi.windowCenter,
					};
				} else guardarEstadoActual();
			}
		} catch (err) {}
	};

	const onMouseUp = (e) => {
		if (esSerieNavegable() && e.button === 2 && zoomTemporalRef.current) {
			zoomTemporalRef.current = false;
			if (herramientaFijadaRef.current) {
				herramientaRef.current = herramientaAntesZoomRef.current;
				herramientaAntesZoomRef.current = null;
			} else activarAtajo("StackScroll");
			return;
		}
		const tool = herramientaRef.current;
		if (tool === "Wwwc" && ventanaSeriePendienteRef.current) {
			onGuardarVentanaSerie?.(ventanaSeriePendienteRef.current);
			ventanaSeriePendienteRef.current = null;
		}
		if (tool === "Angle") {
			const ar = anguloRef.current;
			const pos = getCanvasPos(e);
			const dist = Math.hypot(pos.x - (ar.clickX || 0), pos.y - (ar.clickY || 0));
			const isDrag = dist > 4;
			if (ar.fase === 1 && isDrag) {
				ar.p2x = pos.x;
				ar.p2y = pos.y;
				ar.previewX = pos.x;
				ar.previewY = pos.y;
				ar.clickX = pos.x;
				ar.clickY = pos.y;
				ar.wasDrag = false;
				ar.fase = 2;
				redibujarOverlay();
				return;
			}
			if (ar.fase === 2 && isDrag) {
				const grados = calcularAngulo(ar.p1x, ar.p1y, ar.p2x, ar.p2y, pos.x, pos.y);
				if (grados > 0.5) {
					const dp1 = canvasToPixel(ar.p1x, ar.p1y),
						dp2 = canvasToPixel(ar.p2x, ar.p2y),
						dp3 = canvasToPixel(pos.x, pos.y);
					ar.angulos.push({
						pp1x: dp1.px,
						pp1y: dp1.py,
						pp2x: dp2.px,
						pp2y: dp2.py,
						pp3x: dp3.px,
						pp3y: dp3.py,
						grados,
					});
				}
				ar.fase = 0;
				redibujarOverlay();
				return;
			}
			dragRef.current.active = false;
			return;
		}
		if (
			tool === "Length" &&
			medicionRef.current.dibujando &&
			medicionRef.current.dragging
		) {
			const pos = getCanvasPos(e);
			const { x1, y1 } = medicionRef.current;
			const dist = distanciaMM(x1, y1, pos.x, pos.y);
			if (dist > 2) {
				const d1 = canvasToPixel(x1, y1),
					d2 = canvasToPixel(pos.x, pos.y);
				medicionRef.current.lineas.push({
					px1: d1.px,
					py1: d1.py,
					px2: d2.px,
					py2: d2.py,
					dist,
				});
			}
			medicionRef.current.dibujando = false;
			medicionRef.current.dragging = false;
			delete medicionRef.current.x2;
			delete medicionRef.current.y2;
			redibujarOverlay();
			return;
		}
		dragRef.current.active = false;

		if (
			elipseActivaRef.current &&
			elipseRef.current.dibujando &&
			elipseRef.current.dragging
		) {
			const { cx, cy, rx, ry } = elipseRef.current;
			if (rx > 5 && ry > 5) {
				const stats = calcularEstadisticasElipse(cx, cy, rx, ry);
				const dc = canvasToPixel(cx, cy);
				const sc = getVp()?.vp.scale ?? 1;
				elipseRef.current.elipses.push({
					pcx: dc.px,
					pcy: dc.py,
					prx: rx / sc,
					pry: ry / sc,
					stats,
				});
			}
			elipseRef.current.dibujando = false;
			elipseRef.current.dragging = false;
			redibujarOverlay();
			return;
		}

		if (
			rectActivaRef.current &&
			rectRef.current.dibujando &&
			rectRef.current.dragging
		) {
			const { x1, y1, x2, y2 } = rectRef.current;
			if (Math.abs(x2 - x1) > 5 && Math.abs(y2 - y1) > 5) {
				const stats = calcularEstadisticasRect(x1, y1, x2, y2);
				const dr1 = canvasToPixel(x1, y1),
					dr2 = canvasToPixel(x2, y2);
				rectRef.current.rects.push({
					px1: dr1.px,
					py1: dr1.py,
					px2: dr2.px,
					py2: dr2.py,
					stats,
				});
			}
			rectRef.current.dibujando = false;
			rectRef.current.dragging = false;
			redibujarOverlay();
			return;
		}

		if (
			bidiActivaRef.current &&
			bidiRef.current.dibujando &&
			bidiRef.current.dragging
		) {
			const { cx, cy, ex, ey } = bidiRef.current;
			if (Math.hypot(ex - cx, ey - cy) > 5) {
				const db1 = canvasToPixel(cx, cy),
					db2 = canvasToPixel(ex, ey);
				bidiRef.current.bidis.push({
					pcx: db1.px,
					pcy: db1.py,
					pex: db2.px,
					pey: db2.py,
				});
			}
			bidiRef.current.dibujando = false;
			bidiRef.current.dragging = false;
			redibujarOverlay();
			return;
		}
	};

	const handleWheel = (e) => {
		e.preventDefault();
		const zoomTemporalActivo = zoomTemporalRef.current && (e.buttons & 2) === 2;
		if (zoomTemporalRef.current && !zoomTemporalActivo) zoomTemporalRef.current = false;
		if (esSerieNavegable() && !zoomTemporalActivo) {
			if (!herramientaFijadaRef.current) activarAtajo("StackScroll");
			if (stackImageIds.length < 2 || e.deltaY === 0) return;
			const now = Date.now();
			if (now - lastStackWheelRef.current < 120) return;
			lastStackWheelRef.current = now;
			onStackScroll?.(e.deltaY > 0 ? 1 : -1);
			return;
		}
		if (herramientaRef.current !== "Zoom") return;
		const cs = csRef.current,
			el = divRef.current;
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

	useEffect(() => {
		const panel = wrapperRef.current;
		if (!panel) return undefined;
		const capturarRueda = (event) => {
			if (!esSerieNavegable() && herramientaRef.current !== "StackScroll") return;
			event.preventDefault();
			event.stopPropagation();
			handleWheel(event);
		};
		panel.addEventListener("wheel", capturarRueda, { passive: false });
		return () => panel.removeEventListener("wheel", capturarRueda);
	}, [stackImageIds, onStackScroll]);

	const handleReset = (e) => {
		e.stopPropagation();
		const cs = csRef.current,
			el = divRef.current;
		if (!enabledRef.current || !cs || !el) return;
		try {
			cs.reset(el);
			medicionRef.current.lineas = [];
			medicionRef.current.dibujando = false;
			anotacionRef.current.anotaciones = [];
			anguloRef.current.angulos = [];
			anguloRef.current.fase = 0;
			elipseRef.current.elipses = [];
			rectRef.current.rects = [];
			bidiRef.current.bidis = [];
			const overlay = overlayRef.current;
			if (overlay)
				overlay.getContext("2d").clearRect(0, 0, overlay.width, overlay.height);
			onEliminarEstadoVista?.();
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
			const dp =
				inputAnotacion.dicomX !== undefined
					? { px: inputAnotacion.dicomX, py: inputAnotacion.dicomY }
					: canvasToPixel(inputAnotacion.canvasX, inputAnotacion.canvasY);
			anotacionRef.current.anotaciones.push({
				px: dp.px,
				py: dp.py,
				texto: texto.trim(),
			});
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
				if (zoomTemporalRef.current) {
					zoomTemporalRef.current = false;
					activarAtajo("StackScroll");
				}
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
					{esSerieNavegable() && (
						<div
							className="vd-stack-slider"
							role="slider"
							tabIndex="0"
							aria-label="Posición de imagen en la serie"
							aria-valuemin="1"
							aria-valuemax={stackImageIds.length}
							aria-valuenow={indiceImagenActual + 1}
							aria-valuetext={`${indiceImagenActual + 1} de ${stackImageIds.length}`}
							onMouseDown={(e) => {
								arrastrandoBarraRef.current = true;
								seleccionarImagenDesdeBarra(e);
							}}
							onMouseMove={(e) => {
								if (arrastrandoBarraRef.current) seleccionarImagenDesdeBarra(e);
							}}
							onMouseUp={(e) => {
								arrastrandoBarraRef.current = false;
								e.stopPropagation();
							}}
							onClick={(e) => e.stopPropagation()}
							>
							<span
								className="vd-stack-slider-thumb"
								style={{
									top: `${posicionThumbStack}%`,
									height: `${porcentajeThumbStack}%`,
								}}
							/>
						</div>
					)}
					<div className="overlay-acciones-imagen">
						<button
							className="btn-overlay-accion"
							onMouseDown={(e) => e.stopPropagation()}
							onClick={handleReset}>
							⟲
						</button>
						<button
							className="btn-overlay-accion"
							onMouseDown={(e) => e.stopPropagation()}
							onClick={handleCaptura}>
							⬡
						</button>
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
					style={{
						position: "fixed",
						left: inputAnotacion.screenX,
						top: inputAnotacion.screenY,
						zIndex: 300,
						transform: "translate(-50%, -120%)",
					}}
					onMouseDown={(e) => e.stopPropagation()}>
					<p>Anotación</p>
					<input
						autoFocus
						placeholder="Escribir texto..."
						onKeyDown={(e) => {
							if (e.key === "Enter") confirmarAnotacion(e.target.value);
							if (e.key === "Escape") setInputAnotacion(null);
						}}
					/>
					<div style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem" }}>
						<button
							onClick={(e) =>
								confirmarAnotacion(
									e.target.closest(".ctx-menu-medicion").querySelector("input")
										.value,
								)
							}>
							OK
						</button>
						<button onClick={() => setInputAnotacion(null)}>Cancelar</button>
					</div>
				</div>
			)}

			{ctxMenu && (
				<div
					className="ctx-menu-medicion"
					style={{ left: ctxMenu.screenX, top: ctxMenu.screenY }}
					onMouseDown={(e) => e.stopPropagation()}>
					{ctxMenu.tipo === "linea" && (
						<>
							<button
								onClick={() => {
									medicionRef.current.lineas.splice(ctxMenu.idx, 1);
									medicionRef.current.hoveredIdx = -1;
									redibujarOverlay();
									cerrarMenu();
								}}>
								Eliminar medición
							</button>
							<button
								onClick={() => {
									setLabelEdit({
										idx: ctxMenu.idx,
										value: medicionRef.current.lineas[ctxMenu.idx]?.label || "",
									});
									cerrarMenu();
								}}>
								Etiquetar
							</button>
							<button
								onClick={() => {
									medicionRef.current.lineas = [];
									medicionRef.current.hoveredIdx = -1;
									redibujarOverlay();
									cerrarMenu();
								}}>
								Borrar todas
							</button>
						</>
					)}
					{ctxMenu.tipo === "angulo" && (
						<>
							<button
								onClick={() => {
									anguloRef.current.angulos.splice(ctxMenu.idx, 1);
									anguloRef.current.hoveredIdx = -1;
									redibujarOverlay();
									cerrarMenu();
								}}>
								Eliminar ángulo
							</button>
							<button
								onClick={() => {
									anguloRef.current.angulos = [];
									anguloRef.current.hoveredIdx = -1;
									redibujarOverlay();
									cerrarMenu();
								}}>
								Borrar todos
							</button>
						</>
					)}
					{ctxMenu.tipo === "anotacion" && (
						<>
							<button
								onClick={() => {
									const a = anotacionRef.current.anotaciones[ctxMenu.idx];
									const ca = pixelToCanvas(a.px, a.py);
									const scrPos = getScreenPos(ca.cx, ca.cy);
									setInputAnotacion({
										canvasX: ca.cx,
										canvasY: ca.cy,
										screenX: scrPos.x,
										screenY: scrPos.y,
										dicomX: a.px,
										dicomY: a.py,
										value: a.texto,
										editIdx: ctxMenu.idx,
									});
									anotacionRef.current.anotaciones.splice(ctxMenu.idx, 1);
									anotacionRef.current.hoveredIdx = -1;
									redibujarOverlay();
									cerrarMenu();
								}}>
								Editar
							</button>
							<button
								onClick={() => {
									anotacionRef.current.anotaciones.splice(ctxMenu.idx, 1);
									anotacionRef.current.hoveredIdx = -1;
									redibujarOverlay();
									cerrarMenu();
								}}>
								Eliminar
							</button>
							<button
								onClick={() => {
									anotacionRef.current.anotaciones = [];
									anotacionRef.current.hoveredIdx = -1;
									redibujarOverlay();
									cerrarMenu();
								}}>
								Borrar todas
							</button>
						</>
					)}
					{ctxMenu.tipo === "elipse" && (
						<>
							<button
								onClick={() => {
									elipseRef.current.elipses.splice(ctxMenu.idx, 1);
									elipseRef.current.hoveredIdx = -1;
									redibujarOverlay();
									cerrarMenu();
								}}>
								Eliminar elipse
							</button>
							<button
								onClick={() => {
									setElipseLabelEdit({
										idx: ctxMenu.idx,
										value: elipseRef.current.elipses[ctxMenu.idx]?.label || "",
									});
									cerrarMenu();
								}}>
								Etiquetar
							</button>
							<button
								onClick={() => {
									elipseRef.current.elipses = [];
									elipseRef.current.hoveredIdx = -1;
									redibujarOverlay();
									cerrarMenu();
								}}>
								Borrar todas
							</button>
						</>
					)}
					{ctxMenu.tipo === "rect" && (
						<>
							<button
								onClick={() => {
									rectRef.current.rects.splice(ctxMenu.idx, 1);
									rectRef.current.hoveredIdx = -1;
									redibujarOverlay();
									cerrarMenu();
								}}>
								Eliminar rectángulo
							</button>
							<button
								onClick={() => {
									setRectLabelEdit({
										idx: ctxMenu.idx,
										value: rectRef.current.rects[ctxMenu.idx]?.label || "",
									});
									cerrarMenu();
								}}>
								Etiquetar
							</button>
							<button
								onClick={() => {
									rectRef.current.rects = [];
									rectRef.current.hoveredIdx = -1;
									redibujarOverlay();
									cerrarMenu();
								}}>
								Borrar todas
							</button>
						</>
					)}
					{ctxMenu.tipo === "bidi" && (
						<>
							<button
								onClick={() => {
									bidiRef.current.bidis.splice(ctxMenu.idx, 1);
									bidiRef.current.hoveredIdx = -1;
									redibujarOverlay();
									cerrarMenu();
								}}>
								Eliminar medición
							</button>
							<button
								onClick={() => {
									setBidiLabelEdit({
										idx: ctxMenu.idx,
										value: bidiRef.current.bidis[ctxMenu.idx]?.label || "",
									});
									cerrarMenu();
								}}>
								Etiquetar
							</button>
							<button
								onClick={() => {
									bidiRef.current.bidis = [];
									bidiRef.current.hoveredIdx = -1;
									redibujarOverlay();
									cerrarMenu();
								}}>
								Borrar todas
							</button>
						</>
					)}
				</div>
			)}

			{labelEdit && (
				<div
					className="ctx-menu-medicion label-edit"
					style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}
					onMouseDown={(e) => e.stopPropagation()}>
					<p>Etiqueta</p>
					<input
						autoFocus
						value={labelEdit.value}
						onChange={(e) => setLabelEdit((v) => ({ ...v, value: e.target.value }))}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								medicionRef.current.lineas[labelEdit.idx].label = labelEdit.value;
								redibujarOverlay();
								setLabelEdit(null);
							}
							if (e.key === "Escape") setLabelEdit(null);
						}}
					/>
					<div style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem" }}>
						<button
							onClick={() => {
								medicionRef.current.lineas[labelEdit.idx].label = labelEdit.value;
								redibujarOverlay();
								setLabelEdit(null);
							}}>
							OK
						</button>
						<button onClick={() => setLabelEdit(null)}>Cancelar</button>
					</div>
				</div>
			)}

			{elipseLabelEdit && (
				<div
					className="ctx-menu-medicion label-edit"
					style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}
					onMouseDown={(e) => e.stopPropagation()}>
					<p>Descripción de elipse</p>
					<input
						autoFocus
						value={elipseLabelEdit.value}
						onChange={(e) =>
							setElipseLabelEdit((v) => ({ ...v, value: e.target.value }))
						}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								elipseRef.current.elipses[elipseLabelEdit.idx].label =
									elipseLabelEdit.value;
								redibujarOverlay();
								setElipseLabelEdit(null);
							}
							if (e.key === "Escape") setElipseLabelEdit(null);
						}}
					/>
					<div style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem" }}>
						<button
							onClick={() => {
								elipseRef.current.elipses[elipseLabelEdit.idx].label =
									elipseLabelEdit.value;
								redibujarOverlay();
								setElipseLabelEdit(null);
							}}>
							OK
						</button>
						<button onClick={() => setElipseLabelEdit(null)}>Cancelar</button>
					</div>
				</div>
			)}

			{rectLabelEdit && (
				<div
					className="ctx-menu-medicion label-edit"
					style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}
					onMouseDown={(e) => e.stopPropagation()}>
					<p>Descripción de rectángulo</p>
					<input
						autoFocus
						value={rectLabelEdit.value}
						onChange={(e) =>
							setRectLabelEdit((v) => ({ ...v, value: e.target.value }))
						}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								rectRef.current.rects[rectLabelEdit.idx].label = rectLabelEdit.value;
								redibujarOverlay();
								setRectLabelEdit(null);
							}
							if (e.key === "Escape") setRectLabelEdit(null);
						}}
					/>
					<div style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem" }}>
						<button
							onClick={() => {
								rectRef.current.rects[rectLabelEdit.idx].label = rectLabelEdit.value;
								redibujarOverlay();
								setRectLabelEdit(null);
							}}>
							OK
						</button>
						<button onClick={() => setRectLabelEdit(null)}>Cancelar</button>
					</div>
				</div>
			)}

			{bidiLabelEdit && (
				<div
					className="ctx-menu-medicion label-edit"
					style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}
					onMouseDown={(e) => e.stopPropagation()}>
					<p>Etiqueta bidireccional</p>
					<input
						autoFocus
						value={bidiLabelEdit.value}
						onChange={(e) =>
							setBidiLabelEdit((v) => ({ ...v, value: e.target.value }))
						}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								bidiRef.current.bidis[bidiLabelEdit.idx].label = bidiLabelEdit.value;
								redibujarOverlay();
								setBidiLabelEdit(null);
							}
							if (e.key === "Escape") setBidiLabelEdit(null);
						}}
					/>
					<div style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem" }}>
						<button
							onClick={() => {
								bidiRef.current.bidis[bidiLabelEdit.idx].label = bidiLabelEdit.value;
								redibujarOverlay();
								setBidiLabelEdit(null);
							}}>
							OK
						</button>
						<button onClick={() => setBidiLabelEdit(null)}>Cancelar</button>
					</div>
				</div>
			)}

			{(ctxMenu ||
				labelEdit ||
				elipseLabelEdit ||
				rectLabelEdit ||
				bidiLabelEdit) && (
				<div
					className="ctx-menu-backdrop"
					onClick={() => {
						cerrarMenu();
						setLabelEdit(null);
						setElipseLabelEdit(null);
						setRectLabelEdit(null);
						setBidiLabelEdit(null);
					}}
				/>
			)}
		</div>
	);
};

const MiniaturaSerieDicom = ({ imageId, label }) => {
	const ref = useRef(null);
	useEffect(() => {
		let cancelled = false;
		const cargar = async () => {
			if (!ref.current || !imageId) return;
			const { cornerstone } = await initCornerstone();
			if (cancelled || !ref.current) return;
			try {
				cornerstone.enable(ref.current);
				const image = await cornerstone.loadAndCacheImage(imageId);
				if (!cancelled && ref.current) {
					cornerstone.displayImage(ref.current, image);
					cornerstone.resize(ref.current, true);
				}
			} catch (error) {}
		};
		cargar();
		return () => {
			cancelled = true;
			try { if (ref.current) csModules?.cornerstone?.disable(ref.current); } catch (error) {}
		};
	}, [imageId]);
	return <div ref={ref} className="vd-serie-preview" data-testid="preview-serie" aria-label={`Preview ${label}`} />;
};

const VisorDicom = () => {
	const { user, signOut, empleadoData: authEmpleadoData } = useAuth();
	const navigate = useNavigate();
	const { sidebarOpen, setSidebarOpen, isMobile } = useSidebar();
	const { estudioId } = useParams();
	const location = useLocation();
	const estudioData = location.state?.estudio;

	const [empleadoData, setEmpleadoData] = useState(null);
	const [menuOpen, setMenuOpen] = useState(false);
	const [imageIds, setImageIds] = useState([]);
	const [imagenesDicomPorId, setImagenesDicomPorId] = useState({});
	const [seriesDicom, setSeriesDicom] = useState([]);
	const [serieActivaId, setSerieActivaId] = useState(null);
	const [panelActivo, setPanelActivo] = useState(0);
	const [estudioAsignacion, setEstudioAsignacion] = useState({
		id_doctor: null,
		id_radiologo: null,
		doctorNombre: "",
		radiologoNombre: "",
	});
	const reporteEncabezadoRef = useRef(null);
	const arrastreFirmaRef = useRef(null);
	const [reporteEncabezado, setReporteEncabezado] = useState({});
	const [ajusteFirma, setAjusteFirma] = useState({ firmaX: 0, firmaY: 0, firmaEscala: 1.18, datosX: 0, datosY: 0, datosEscala: 1 });
	const [panelImageIds, setPanelImageIds] = useState(Array(6).fill(null));
	const [herramienta, setHerramienta] = useState("Wwwc");
	const [herramientaFijada, setHerramientaFijada] = useState(false);
	const [formatoGrid, setFormatoGrid] = useState(FORMATOS[0]);
	const [mprActivo, setMprActivo] = useState(false);
	const [mprPanelActivo, setMprPanelActivo] = useState(0);
	const [mprSeries, setMprSeries] = useState([]);
	const [mprGrosorCorte, setMprGrosorCorte] = useState(0.1);
	const [mprIndices, setMprIndices] = useState([]);
	const [mprRestaurarIndices, setMprRestaurarIndices] = useState(false);
	const [mprModoReconstruccion, setMprModoReconstruccion] = useState("MIP");
	const [mprModoActivado, setMprModoActivado] = useState(false);
	const mprSesionEstudioRef = useRef(null);

	useEffect(() => {
		const idEstudio = estudioId || estudioData?.id;
		if (!idEstudio) return;
		if (mprSesionEstudioRef.current !== String(idEstudio)) return;
		guardarSesionMpr(idEstudio, { mprActivo, mprPanelActivo, mprSeries, mprGrosorCorte, mprIndices, mprModoReconstruccion });
		const sesion = cacheSesionVisorDicom.get(String(idEstudio));
		if (!sesion) return;
		cacheSesionVisorDicom.set(String(idEstudio), {
			...sesion,
			mprActivo,
			mprPanelActivo,
			mprSeries,
			mprGrosorCorte,
			mprIndices,
			mprModoReconstruccion,
		});
	}, [estudioId, estudioData?.id, mprActivo, mprPanelActivo, mprSeries, mprGrosorCorte, mprIndices, mprModoReconstruccion]);
	const [mostrarFormatos, setMostrarFormatos] = useState(false);
	const [mostrarPresetsVentana, setMostrarPresetsVentana] = useState(false);
	const [presetsVentanaPorSerie, setPresetsVentanaPorSerie] = useState({});
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
	const [mostrarInfo, setMostrarInfo] = useState(true);
	const [mostrarReporte, setMostrarReporte] = useState(false);
	const [cineActivo, setCineActivo] = useState(false);
	const [reporteTexto, setReporteTexto] = useState("");
	const [modalPlantillasReporte, setModalPlantillasReporte] = useState(false);
	const [plantillasReporte, setPlantillasReporte] = useState([]);
	const [plantillasReporteLoading, setPlantillasReporteLoading] = useState(false);
	const [plantillaReporteTab, setPlantillaReporteTab] = useState("organizacion");
	const [plantillaReporteBusqueda, setPlantillaReporteBusqueda] = useState("");
	const [plantillaSeleccionada, setPlantillaSeleccionada] = useState(null);
	const [reporteQrUrl, setReporteQrUrl] = useState("");
	const [membreteReporteSrc, setMembreteReporteSrc] = useState(
		`data:image/jpeg;base64,${MEMBRETE_B64}`,
	);
	const [panelDerecho, setPanelDerecho] = useState(null);
	const [reporteExpandido, setReporteExpandido] = useState(false);
	const [seriesContraidas, setSeriesContraidas] = useState(false);
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
	const [iaActiva, setIaActiva] = useState(false);
	const [notif, setNotif] = useState({ isOpen: false, mensaje: "", tipo: "exito" });
	const [empleadoCargado, setEmpleadoCargado] = useState(false);

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
	const [comentariosInfo, setComentariosInfo] = useState([]);
	const [comentarioInfoTxt, setComentarioInfoTxt] = useState("");

	const cineRef = useRef(null);
	const cineIdx = useRef(0);
	const menuRef = useRef(null);
	const toolbarRef = useRef(null);
	const reporteButtonRef = useRef(null);
	const reporteMenuRef = useRef(null);
	const reporteEditorRef = useRef(null);
	const reporteAdjuntoInputRef = useRef(null);
	const detalleButtonRef = useRef(null);
	const sidePanelRef = useRef(null);
	const [masBarTop, setMasBarTop] = useState(112);

	const pacienteInfo = {
		nombre: estudioData?.nombrePaciente || "Sin paciente",
		tipoEstudio: estudioData?.tipoEstudio || "—",
		sucursal: estudioData?.sucursal || "—",
		horaFecha: estudioData?.horaFecha || "—",
		estado: estudioData?.estado || "—",
		folio: estudioData?.folio || "",
		telefono: estudioData?.telefonoPaciente || "",
		doctor:
			estudioData?.doctor ||
			estudioData?.medico ||
			estudioData?.referente ||
			"Médico referente",
	};

	const firmaEmpleadoUrl = empleadoData?.firma_digital || empleadoData?.firma_url || "";
	const nombreRadiologo = empleadoData?.nombre || "Radiólogo responsable";
	const especialidadRadiologo = empleadoData?.especialidad || "Radiología e Imagen";

	const fechaReporte = (() => {
		if (!pacienteInfo.horaFecha || pacienteInfo.horaFecha === "—") {
			return new Date()
				.toLocaleDateString("es-MX", {
					day: "2-digit",
					month: "long",
					year: "numeric",
				})
				.toUpperCase();
		}
		const fecha = new Date(pacienteInfo.horaFecha);
		if (Number.isNaN(fecha.getTime())) return String(pacienteInfo.horaFecha).toUpperCase();
		return fecha.toLocaleDateString("es-MX", {
			day: "2-digit",
			month: "long",
			year: "numeric",
		}).toUpperCase();
	})();

	const fechaReporteEncabezado = `PUERTO VALLARTA JAL. ${fechaReporte}.`;
	const encabezadoMostrado = {
		fecha: Object.hasOwn(reporteEncabezado, "fecha") ? reporteEncabezado.fecha : fechaReporteEncabezado,
		paciente: Object.hasOwn(reporteEncabezado, "paciente") ? reporteEncabezado.paciente : pacienteInfo.nombre,
		doctor: Object.hasOwn(reporteEncabezado, "doctor") ? reporteEncabezado.doctor : pacienteInfo.doctor,
		estudio: Object.hasOwn(reporteEncabezado, "estudio") ? reporteEncabezado.estudio : pacienteInfo.tipoEstudio,
	};
	const obtenerEncabezadoReporte = () => {
		const lineas = String(reporteEncabezadoRef.current?.innerText || "")
			.split("\n")
			.map((linea) => linea.trim());
		const valor = (etiqueta) => lineas.find((linea) => linea.toUpperCase().startsWith(etiqueta))?.slice(etiqueta.length).trim() || "";
		return {
			fecha: lineas.find((linea) => !/^(PACIENTE|DOCTOR|ESTUDIO):/i.test(linea)) || "",
			paciente: valor("PACIENTE:"),
			doctor: valor("DOCTOR:"),
			estudio: valor("ESTUDIO:"),
		};
	};
	const actualizarAjusteFirma = (campo, valor) => setAjusteFirma((actual) => ({ ...actual, [campo]: Number(valor) }));
	const iniciarArrastreFirma = (bloque, event) => {
		if (event.currentTarget.getBoundingClientRect().right - event.clientX < 18 && event.currentTarget.getBoundingClientRect().bottom - event.clientY < 18) return;
		arrastreFirmaRef.current = { bloque, x: event.clientX, y: event.clientY, origenX: ajusteFirma[`${bloque}X`], origenY: ajusteFirma[`${bloque}Y`] };
		event.currentTarget.setPointerCapture(event.pointerId);
	};
	const moverArrastreFirma = (event) => { const arrastre = arrastreFirmaRef.current; if (arrastre) setAjusteFirma((actual) => ({ ...actual, [`${arrastre.bloque}X`]: arrastre.origenX + event.clientX - arrastre.x, [`${arrastre.bloque}Y`]: arrastre.origenY + event.clientY - arrastre.y })); };
	const terminarArrastreFirma = () => { arrastreFirmaRef.current = null; };

	const getPrimerNombre = (n) => n || user?.email?.split("@")[0] || "Usuario";
	const formatRol = (rol) => {
		const roles = {
			admin: "Administrador",
			radiologo: "Radiólogo - Director",
			doctor: "Médico",
			medico: "Médico",
			doctor_externo: "Doctor externo Rayos X",
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
				if (String(user.id).startsWith("doctor:")) {
					if (esDoctorExterno(authEmpleadoData?.rol)) {
						setEmpleadoData(authEmpleadoData);
						setEmpleadoCargado(true);
					}
					return;
				}
				if (esDoctorExterno(authEmpleadoData?.rol)) {
					setEmpleadoData(authEmpleadoData);
					setEmpleadoCargado(true);
					return;
				}
				let { data, error } = await supabase
					.from("empleados")
					.select("nombre, rol, cedula, especialidad, firma_url, firma_digital, sucursal, id_doctor")
					.eq("auth_uuid", user.id)
					.maybeSingle();
				if (esErrorColumnaFaltante(error, "id_doctor")) {
					({ data } = await supabase
						.from("empleados")
						.select("nombre, rol, cedula, especialidad, firma_url, firma_digital, id_sucursal, sucursal")
						.eq("auth_uuid", user.id)
						.maybeSingle());
				}
				if (data) {
				if (esDoctorExterno(data.rol)) {
					let doctorQuery = supabase
						.from("doctores")
						.select("id_doctor, nombre, auth_uuid, es_radiologo, especialidad");
					doctorQuery = data.id_doctor
						? doctorQuery.eq("id_doctor", data.id_doctor)
						: doctorQuery.eq("auth_uuid", user.id);
					let { data: doctorExterno, error: doctorError } = await doctorQuery.maybeSingle();
					if (
						esErrorColumnaFaltante(doctorError, "es_radiologo") ||
						esErrorColumnaFaltante(doctorError, "especialidad")
					) {
						let doctorBaseQuery = supabase
							.from("doctores")
							.select("id_doctor, nombre, auth_uuid");
						doctorBaseQuery = data.id_doctor
							? doctorBaseQuery.eq("id_doctor", data.id_doctor)
							: doctorBaseQuery.eq("auth_uuid", user.id);
						({ data: doctorExterno } = await doctorBaseQuery.maybeSingle());
					}
					setEmpleadoData({
						...data,
						id_doctor: data.id_doctor || doctorExterno?.id_doctor || null,
						doctor_nombre: doctorExterno?.nombre || null,
						es_radiologo: doctorExterno?.es_radiologo === true,
						especialidad: doctorExterno?.especialidad || data.especialidad || null,
					});
				} else {
					setEmpleadoData(data);
				}
			}
			setEmpleadoCargado(true);
		};
		fetchEmpleado();
	}, [user, authEmpleadoData]);

	useEffect(() => {
		const generarQrReporte = async () => {
			try {
				const id = estudioId || estudioData?.id || "";
				const qrData = id
					? `${window.location.origin}/visor-paciente/${id}`
					: crearUrlPortalResultados({
							folio: estudioData?.folio,
							telefono: estudioData?.telefonoPaciente,
						});
				const dataUrl = await QRCode.toDataURL(
					qrData,
					{
						margin: 1,
						width: 132,
						color: {
							dark: "#111111",
							light: "#ffffff",
						},
					},
				);
				setReporteQrUrl(dataUrl);
			} catch {
				setReporteQrUrl("");
			}
		};

		generarQrReporte();
	}, [estudioData?.folio, estudioData?.id, estudioData?.telefonoPaciente, estudioId]);

	useEffect(() => {
		if (!empleadoCargado) return undefined;
		cargarImagenes();
		return () => {
			if (cineRef.current) clearInterval(cineRef.current);
		};
	}, [estudioId, empleadoCargado, empleadoData?.id_doctor, empleadoData?.rol]);

	useEffect(() => {
		if (!mostrarReporte) return;

		const cerrarReporteSiClickFuera = (event) => {
			const target = event.target;
			if (
				reporteMenuRef.current?.contains(target) ||
				reporteButtonRef.current?.contains(target)
			) {
				return;
			}
			setMostrarReporte(false);
		};

		document.addEventListener("mousedown", cerrarReporteSiClickFuera);
		return () => document.removeEventListener("mousedown", cerrarReporteSiClickFuera);
	}, [mostrarReporte]);

	useEffect(() => {
		if (panelDerecho !== "detalles") return;

		const cerrarDetalleSiClickFuera = (event) => {
			const target = event.target;
			if (
				sidePanelRef.current?.contains(target) ||
				detalleButtonRef.current?.contains(target)
			) {
				return;
			}
			setPanelDerecho(null);
		};

		document.addEventListener("mousedown", cerrarDetalleSiClickFuera);
		return () => document.removeEventListener("mousedown", cerrarDetalleSiClickFuera);
	}, [panelDerecho]);

	useEffect(() => {
		if (panelDerecho !== "reporte" || !reporteEditorRef.current) return;
		reporteEditorRef.current.innerHTML = (reporteTexto || "").replace(/\n/g, "<br>");
	}, [panelDerecho]);

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

	const seleccionarSerieDicom = (serie, panelObjetivo = panelActivo) => {
		if (!serie?.imageIds?.length) return;
		const presetInicial = obtenerPresetVentanaInicialSerie(serie);
		setSerieActivaId(serie.id);
		setImageIds(serie.imageIds);
		setPresetsVentanaPorSerie((prev) => {
			if (!presetInicial || prev[serie.id]) return prev;
			return { ...prev, [serie.id]: presetInicial };
		});
		setPanelImageIds((prev) => {
			const n = [...prev];
			n[panelObjetivo] = serie.imageIds[0];
			return n;
		});
	};

	const navegarImagenSerie = (panelObjetivo, direccion) => {
		if (imageIds.length < 2) return;
		setPanelImageIds((prev) => {
			const indiceActual = imageIds.indexOf(prev[panelObjetivo]);
			if (indiceActual < 0) return prev;
			const siguienteIndice = Math.max(
				0,
				Math.min(indiceActual + direccion, imageIds.length - 1),
			);
			if (siguienteIndice === indiceActual) return prev;
			const siguiente = [...prev];
			siguiente[panelObjetivo] = imageIds[siguienteIndice];
			return siguiente;
		});
	};

	const guardarEstadoVista = async (imagen, estado) => {
		try {
			const { error } = await supabase.from("estudio_dicom_estados_vista").upsert(
				{
					id_estudio: Number(estudioId || estudioData?.id),
					id_imagen: imagen.id_imagen || null,
					storage_path: crearClaveImagenDicom(imagen),
					estado,
				},
				{ onConflict: "id_estudio,storage_path" },
			);
			if (error) throw error;
		} catch {
			showNotif("No se pudieron guardar las ediciones de la imagen", "error");
		}
	};

	const guardarVentanaSerie = async (serie, voi) => {
		if (!serie?.id) return;
		const estadoVentanaSerie = crearEstadoVentanaSerieDicom(voi);
		try {
			const { error } = await supabase.from("estudio_dicom_estados_vista").upsert(
				{
					id_estudio: Number(estudioId || estudioData?.id),
					id_imagen: null,
					storage_path: crearClaveSerieDicom(serie),
					estado: estadoVentanaSerie,
				},
				{ onConflict: "id_estudio,storage_path" },
			);
			if (error) throw error;
			setImagenesDicomPorId((prev) => {
				const siguiente = Object.fromEntries(Object.entries(prev).map(([imageId, imagen]) => [
					imageId,
					(imagen.series_instance_uid || imagen.series_description || "serie-unica") === serie.id
						? { ...imagen, estadoVentanaSerie }
						: imagen,
				]));
				const sesion = cacheSesionVisorDicom.get(String(estudioId || estudioData?.id));
				if (sesion) cacheSesionVisorDicom.set(String(estudioId || estudioData?.id), {
					...sesion,
					imagenesDicomPorId: siguiente,
				});
				return siguiente;
			});
		} catch {
			showNotif("No se pudo guardar la ventana de la serie", "error");
		}
	};

	const eliminarEstadoVista = async (imagen) => {
		try {
			const { error } = await supabase
				.from("estudio_dicom_estados_vista")
				.delete()
				.eq("id_estudio", Number(estudioId || estudioData?.id))
				.eq("storage_path", crearClaveImagenDicom(imagen));
			if (error) throw error;
		} catch {
			showNotif("No se pudieron borrar las ediciones de la imagen", "error");
		}
	};

	const cargarImagenes = async () => {
		const idEstudio = estudioId || estudioData?.id;
		const sesionGuardada = cacheSesionVisorDicom.get(String(idEstudio));
		if (sesionGuardada) {
			const sesionMpr = leerSesionMpr(idEstudio) || sesionGuardada;
			mprSesionEstudioRef.current = String(idEstudio);
			setSeriesDicom(sesionGuardada.seriesDicom);
			setImageIds(sesionGuardada.imageIds);
			setSerieActivaId(sesionGuardada.serieActivaId);
			const serieActivaGuardada = sesionGuardada.seriesDicom.find(
				(serie) => serie.id === sesionGuardada.serieActivaId,
			);
			const presetSerieActivaGuardada = obtenerPresetVentanaInicialSerie(serieActivaGuardada);
			if (presetSerieActivaGuardada) {
				setPresetsVentanaPorSerie((prev) => ({
					...prev,
					[serieActivaGuardada.id]: presetSerieActivaGuardada,
				}));
			}
			setPanelImageIds(sesionGuardada.panelImageIds);
			setImagenesDicomPorId(sesionGuardada.imagenesDicomPorId);
			setFormatoGrid(sesionGuardada.formatoGrid);
			setMprActivo(Boolean(sesionMpr.mprActivo));
			setMprRestaurarIndices(Boolean(sesionMpr.mprActivo));
			setMprPanelActivo(sesionMpr.mprPanelActivo || 0);
			setMprSeries(sesionMpr.mprSeries || []);
			setMprGrosorCorte(Number(sesionMpr.mprGrosorCorte) || 0.1);
			setMprIndices(sesionMpr.mprIndices || []);
			setMprModoReconstruccion(sesionMpr.mprModoReconstruccion || "MIP");
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			await initCornerstone();
				let { data: estudio, error: errEst } = await supabase
					.from("estudios_radiologia")
					.select(`
						storage_path,
						reporte,
						reporte_encabezado,
						tipo_estudio,
						descripcion,
						fecha_estudio,
						id_doctor,
						id_radiologo,
						doctor:doctores!estudios_radiologia_id_doctor_fkey(nombre),
						radiologo:empleados!estudios_radiologia_id_radiologo_fkey(nombre)
					`)
					.eq("id_estudio", idEstudio)
					.single();
				if (errEst) {
					({ data: estudio, error: errEst } = await supabase
						.from("estudios_radiologia")
						.select("storage_path, reporte, reporte_encabezado, tipo_estudio, descripcion, fecha_estudio, id_doctor, id_radiologo")
						.eq("id_estudio", idEstudio)
						.single());
				}
				if (errEst) throw errEst;
				setEstudioAsignacion({
					id_doctor: estudio?.id_doctor || null,
					id_radiologo: estudio?.id_radiologo || null,
					doctorNombre: estudio?.doctor?.nombre || "",
					radiologoNombre: estudio?.radiologo?.nombre || "",
				});
				if (
					esDoctorExterno(empleadoData?.rol) &&
					"id_doctor" in (estudio || {}) &&
					String(estudio?.id_doctor || "") !== String(obtenerIdDoctorExterno(empleadoData) || "")
				) {
				throw new Error("No tienes acceso a este estudio");
			}
			if (estudio.reporte) setReporteTexto(estudio.reporte);
			setReporteEncabezado(estudio.reporte_encabezado || {});

			let imagenesDicom = [];
			const consultaImagenes = supabase
				.from("estudio_dicom_imagenes")
				.select("*")
				.eq("id_estudio", idEstudio);
			const { data: imagenesGuardadas, error: errImagenes } =
				typeof consultaImagenes.order === "function"
					? await consultaImagenes.order("instance_number", { ascending: true, nullsFirst: false })
					: await consultaImagenes;

			if (!errImagenes) {
				imagenesDicom = (imagenesGuardadas || []).filter(esArchivoDicom);
			}

			if (imagenesDicom.length === 0 && estudio?.storage_path) {
				imagenesDicom = [crearImagenDicomFallback(estudio.storage_path, estudio)];
			}

			if (imagenesDicom.length === 0) throw new Error("Sin archivo");

			const { data: estadosVista, error: estadosError } = await supabase
				.from("estudio_dicom_estados_vista")
				.select("storage_path, estado")
				.eq("id_estudio", idEstudio);
			if (estadosError) throw estadosError;
			const estadosPorRuta = new Map(
				(estadosVista || [])
					.filter((fila) => !String(fila.storage_path || "").startsWith("serie:"))
					.map((fila) => [fila.storage_path, fila.estado]),
			);
			const ventanasPorSerie = new Map(
				(estadosVista || [])
					.filter((fila) => String(fila.storage_path || "").startsWith("serie:"))
					.map((fila) => [fila.storage_path, leerEstadoVentanaSerieDicom(fila.estado)]),
			);
			const imagenesConUrl = (await crearImagenesConUrlFirmada(imagenesDicom)).map(
				(imagen) => ({
					...imagen,
					estadoVista: estadosPorRuta.get(imagen.storage_path) || null,
					estadoVentanaSerie: ventanasPorSerie.get(`serie:${imagen.series_instance_uid || imagen.series_description || "serie-unica"}`) || null,
				}),
			);
			setImagenesDicomPorId(
				Object.fromEntries(imagenesConUrl.map((imagen) => [imagen.imageId, imagen])),
			);
			const series = agruparImagenesDicomPorSerie(imagenesConUrl, estudio);
			const primeraSerie = series[0];
			const presetPrimeraSerie = obtenerPresetVentanaInicialSerie(primeraSerie);
			const sesionMpr = leerSesionMpr(idEstudio);
			mprSesionEstudioRef.current = String(idEstudio);

			setSeriesDicom(series);
			if (presetPrimeraSerie) {
				setPresetsVentanaPorSerie((prev) => ({ ...prev, [primeraSerie.id]: presetPrimeraSerie }));
			}
			const primerImageId = primeraSerie?.imageIds?.[0] || null;
			const panelesIniciales = Array(6).fill(null);
			panelesIniciales[0] = primerImageId;
			cacheSesionVisorDicom.set(String(idEstudio), {
				seriesDicom: series,
				imageIds: primeraSerie?.imageIds || [],
				serieActivaId: primeraSerie?.id || null,
				panelImageIds: panelesIniciales,
				imagenesDicomPorId: Object.fromEntries(imagenesConUrl.map((imagen) => [imagen.imageId, imagen])),
				formatoGrid,
				mprActivo: Boolean(sesionMpr?.mprActivo),
				mprPanelActivo: sesionMpr?.mprPanelActivo || 0,
				mprSeries: sesionMpr?.mprSeries || [],
				mprGrosorCorte: Number(sesionMpr?.mprGrosorCorte) || 0.1,
				mprIndices: sesionMpr?.mprIndices || [],
				mprModoReconstruccion: sesionMpr?.mprModoReconstruccion || "MIP",
			});
			setMprActivo(Boolean(sesionMpr?.mprActivo));
			setMprRestaurarIndices(Boolean(sesionMpr?.mprActivo));
			setMprPanelActivo(sesionMpr?.mprPanelActivo || 0);
			setMprSeries(sesionMpr?.mprSeries || []);
			setMprGrosorCorte(Number(sesionMpr?.mprGrosorCorte) || 0.1);
			setMprIndices(sesionMpr?.mprIndices || []);
			setMprModoReconstruccion(sesionMpr?.mprModoReconstruccion || "MIP");
			seleccionarSerieDicom(primeraSerie, 0);
			programarPrecargaInicialMpr(idEstudio, series);
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
		const idEstudio = estudioId || estudioData?.id;
		try {
			const { data: est } = await supabase
				.from("estudios_radiologia")
				.select(
					"id_estudio, fecha_estudio, tipo_estudio, descripcion, id_paciente, id_tecnico, storage_path, alta_prioridad, etiquetas, reporte, solicitud_url",
				)
				.eq("id_estudio", idEstudio)
				.single();
			let paciente = null;
			if (est?.id_paciente) {
				const { data: p } = await supabase
					.from("pacientes")
					.select("*")
					.eq("id_paciente", est.id_paciente)
					.single();
				paciente = p;
			}
			let historial = [];
			if (est?.id_paciente) {
				const { data: h } = await supabase
					.from("estudios_radiologia")
					.select("id_estudio, tipo_estudio, descripcion, fecha_estudio")
					.eq("id_paciente", est.id_paciente)
					.neq("id_estudio", idEstudio)
					.order("fecha_estudio", { ascending: false })
					.limit(10);
				historial = h || [];
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
			console.error("Error al cargar ficha:", err);
		} finally {
			setFichaLoading(false);
		}
	};

	const guardarFichaPaciente = async () => {
		if (!fichaData?.paciente) return;
		if (
			fichaData.paciente.telefono &&
			!esTelefono10Digitos(fichaData.paciente.telefono)
		) {
			showNotif("El teléfono debe tener 10 dígitos numéricos", "error");
			return;
		}
		if (fichaData.paciente.email && !esEmailValido(fichaData.paciente.email)) {
			showNotif("Ingresa un email válido", "error");
			return;
		}
		const { error } = await supabase
			.from("pacientes")
			.update({
				nombre: fichaData.paciente.nombre,
				apellido: fichaData.paciente.apellido,
				fecha_nacimiento: fichaData.paciente.fecha_nacimiento,
				telefono: fichaData.paciente.telefono,
				genero: fichaData.paciente.genero,
				email: fichaData.paciente.email,
			})
			.eq("id_paciente", fichaData.paciente.id_paciente);
		if (error) showNotif("Error al guardar", "error");
		else showNotif("Datos del paciente guardados", "exito");
	};

	const guardarInfoEstudio = async () => {
		const idEstudio = estudioId || estudioData?.id;
		const { error } = await supabase
			.from("estudios_radiologia")
			.update({
				descripcion: fichaData?.est?.descripcion,
				updated_at: new Date().toISOString(),
			})
			.eq("id_estudio", idEstudio);
		if (error) showNotif("Error al guardar", "error");
		else showNotif("Estudio actualizado", "exito");
	};

	const asignarTecnicoInfo = async () => {
		if (!tecnicoSeleccionado) return;
		const idEstudio = estudioId || estudioData?.id;
		const { error } = await supabase
			.from("estudios_radiologia")
			.update({
				id_tecnico: tecnicoSeleccionado,
				updated_at: new Date().toISOString(),
			})
			.eq("id_estudio", idEstudio);
		if (error) showNotif("Error al asignar técnico", "error");
		else showNotif("Técnico asignado", "exito");
	};

	const agregarComentarioInfo = async () => {
		const texto = comentarioInfoTxt.trim();
		if (!texto) return;
		const idEstudio = estudioId || estudioData?.id;
		const nombreCompleto =
			empleadoData?.nombre || user?.email?.split("@")[0] || "Usuario";
		const iniciales = nombreCompleto
			.split(" ")
			.filter(Boolean)
			.slice(0, 2)
			.map((p) => p[0].toUpperCase())
			.join("");
		const { data, error } = await supabase
			.from("comentarios_estudio")
			.insert({
				id_estudio: idEstudio,
				texto,
				autor_nombre: nombreCompleto,
				autor_iniciales: iniciales,
				autor_uuid: user?.id || null,
			})
			.select()
			.single();
		if (error) {
			showNotif("Error al agregar comentario", "error");
			return;
		}
		setComentariosInfo((c) => [...c, data]);
		setComentarioInfoTxt("");
		showNotif("Comentario agregado", "exito");
	};

	const toggleFichaSeccion = (key) =>
		setFichaSeccion((s) => ({ ...s, [key]: !s[key] }));

	const handleAction = (id) => {
		if (id === "mpr") {
			const idEstudio = estudioId || estudioData?.id;
			const serieFuente = obtenerSerieFuenteMpr(seriesDicom);
			const seriesOrdenadas = ordenarSeriesParaMpr(seriesDicom, serieFuente?.id || serieActivaId);
			const seriesIniciales = Array.from(
				{ length: 3 },
				(_, indice) => seriesOrdenadas[indice]?.id || seriesOrdenadas[0]?.id,
			);
			setMprPanelActivo(0);
			setMprSeries(seriesIniciales);
			setMprRestaurarIndices(false);
			// Una apertura nueva debe partir del mismo centro que Restaurar. Los
			// índices sólo se conservan cuando el MPR ya estaba activo al volver.
			setMprIndices([]);
			const sesion = cacheSesionVisorDicom.get(String(idEstudio));
			if (sesion) cacheSesionVisorDicom.set(String(idEstudio), { ...sesion, mprActivo: true, mprPanelActivo: 0, mprSeries: seriesIniciales, mprIndices: [], mprModoReconstruccion });
			guardarSesionMpr(idEstudio, { mprActivo: true, mprPanelActivo: 0, mprSeries: seriesIniciales, mprGrosorCorte, mprIndices: [], mprModoReconstruccion });
			setMprActivo(true); return;
		}
		if (id === "restaurar") {
			setResetCounter((c) => c + 1);
			return;
		}
		if (id === "centrar") {
			setCentrarCounter((c) => c + 1);
			return;
		}
		if (id === "informacion") {
			setPanelDerecho("detalles");
			return;
		}
		if (id === "cine") {
			toggleCine();
			return;
		}
		if (id === "formato") {
			setMostrarFormatos((f) => !f);
			setMostrarMas(false);
			setMostrarDetalle(false);
			setMostrarReporte(false);
			return;
		}
		if (id === "reporte") {
			if (!puedeVerReporteRadiologia(empleadoData)) {
				showNotif("No tienes permiso para ver este reporte", "error");
				return;
			}
			setReporteExpandido(false);
			setPanelDerecho((panel) => (panel === "reporte" ? null : "reporte"));
			setMostrarFormatos(false);
			setMostrarMas(false);
			setMostrarDetalle(false);
			setMostrarReporte(false);
			return;
		}
		if (id === "descargar") {
			if (panelDerecho === "reporte" && reporteExpandido) {
				descargarReportePdf();
			} else {
				descargarArchivo();
			}
			return;
		}
		if (id === "captura") {
			setCapturaClip((c) => c + 1);
			return;
		}
		if (id === "compartir") {
			compartir();
			return;
		}
		if (id === "mas") {
			setMostrarMas((f) => {
				if (!f && toolbarRef.current) {
					const r = toolbarRef.current.getBoundingClientRect();
					setMasBarTop(r.bottom);
				}
				return !f;
			});
			setMostrarFormatos(false);
			setMostrarDetalle(false);
			setMostrarReporte(false);
			return;
		}
		if (id === "detalle") {
			setPanelDerecho("detalles");
			setMostrarFormatos(false);
			setMostrarMas(false);
			setMostrarReporte(false);
			return;
		}
	};

	const toggleMenuReporte = () => {
		setMostrarReporte((f) => {
			if (!f && toolbarRef.current) {
				const toolbarRect = toolbarRef.current.getBoundingClientRect();
				setReporteBarTop(toolbarRect.bottom);
			}
			return !f;
		});
		setMostrarFormatos(false);
		setMostrarMas(false);
		setMostrarDetalle(false);
	};

	const MODOS_TOGGLE = ["lupa", "elipse", "rectangulo", "bidireccional"];

	const handleMasItem = (id) => {
		if (MODOS_TOGGLE.includes(id)) {
			const yaActivo =
				(id === "lupa" && lupaGlobal) ||
				(id === "elipse" && elipseGlobal) ||
				(id === "rectangulo" && rectanguloGlobal) ||
				(id === "bidireccional" && bidiGlobal);
			setLupaGlobal(false);
			setElipseGlobal(false);
			setRectanguloGlobal(false);
			setBidiGlobal(false);
			if (!yaActivo) {
				if (id === "lupa") setLupaGlobal(true);
				else if (id === "elipse") setElipseGlobal(true);
				else if (id === "rectangulo") setRectanguloGlobal(true);
				else if (id === "bidireccional") setBidiGlobal(true);
			setHerramienta(null);
			setHerramientaFijada(false);
			}
			return;
		}
		setMasAccion({ id, ts: Date.now() });
	};

	const MODAL_CONFIG = {
		radiologo: {
			titulo: "Asignar estudio a doctor",
			tabla: "doctores",
			select: "id_doctor, nombre, especialidad, tipo_doctor, institucion, es_radiologo, activo",
			filtro: null,
			idKey: "__asignacion_id",
			labelKey: "nombre",
			sublabelKey: "especialidad",
			col: "id_radiologo",
			tipoAsignacion: "doctor_o_radiologo",
			notifOk: "Estudio asignado",
			notifErr: "Error al asignar estudio",
		},
		tecnico: {
			titulo: "Asignar estudio a técnico radiólogo",
			tabla: "empleados",
			select: "id_empleado, nombre, rol",
			filtro: null,
			idKey: "id_empleado",
			labelKey: "nombre",
			col: "id_tecnico",
			tipoAsignacion: "tecnico",
			notifOk: "Técnico asignado",
			notifErr: "Error al asignar técnico",
		},
		referente: {
			titulo: "Asignar estudio a doctor",
			tabla: "doctores",
			select: "id_doctor, nombre, especialidad, tipo_doctor, institucion, es_radiologo, activo",
			filtro: null,
			idKey: "__asignacion_id",
			labelKey: "nombre",
			sublabelKey: "especialidad",
			col: "id_doctor",
			tipoAsignacion: "doctor_o_radiologo",
			notifOk: "Estudio asignado",
			notifErr: "Error al asignar estudio",
		},
	};

	const cargarDoctoresYRadiologosAsignables = async (cfg) => {
		const [doctoresBaseResponse, empleadosResponse] = await Promise.all([
			supabase
				.from("doctores")
				.select("id_doctor, nombre")
				.order("nombre"),
			supabase
				.from("empleados")
				.select("id_empleado, nombre, rol, especialidad")
				.order("nombre"),
		]);

		if (doctoresBaseResponse.error) throw doctoresBaseResponse.error;
		if (empleadosResponse.error) throw empleadosResponse.error;

		let doctores = doctoresBaseResponse.data || [];
		const doctoresMetaResponse = await supabase
			.from("doctores")
			.select(cfg.select)
			.order("nombre");
		if (!doctoresMetaResponse.error) {
			const doctoresMetaPorId = new Map(
				(doctoresMetaResponse.data || []).map((doctor) => [doctor.id_doctor, doctor]),
			);
			doctores = doctores.map((doctor) => ({
				...doctor,
				...(doctoresMetaPorId.get(doctor.id_doctor) || {}),
			}));
		}

		const radiologosAsignables = (empleadosResponse.data || []).filter((empleado) =>
			esRolRadiologoAsignable(empleado.rol),
		);

		return [
			...doctores.map((doctor) => crearItemAsignacionRadiologia(doctor, "doctor")),
			...radiologosAsignables.map((empleado) => crearItemAsignacionRadiologia(empleado, "empleado")),
		];
	};


		const abrirModalAsignar = (id) => {
			const cfg = MODAL_CONFIG[id];
			if (!cfg) return;
		setMostrarDetalle(false);
		setModalAsignar({
			...cfg,
			items: [],
			actual: null,
			seleccionado: null,
			loading: true,
		});
		const idEstudio = estudioId || estudioData?.id;
		const estudioSelect = cfg.tipoAsignacion === "doctor_o_radiologo"
			? "id_doctor, id_radiologo"
			: cfg.col;
		const cargarItems = async () => {
			if (cfg.tipoAsignacion === "doctor_o_radiologo") {
				return cargarDoctoresYRadiologosAsignables(cfg);
			}
			const { data, error } = await supabase
				.from(cfg.tabla)
				.select(cfg.select)
				.order("nombre");
			if (error) throw error;
			if (cfg.tipoAsignacion === "radiologo") return (data || []).filter((item) => esRolRadiologoAsignable(item.rol));
			if (cfg.tipoAsignacion === "tecnico") return (data || []).filter((item) => esRolTecnicoRadiologiaAsignable(item.rol));
			return data || [];
		};

		Promise.all([
			cargarItems(),
			supabase
				.from("estudios_radiologia")
				.select(estudioSelect)
				.eq("id_estudio", idEstudio)
				.single(),
		]).then(([itemsAsignables, estudioResponse]) => {
			let estudio = estudioResponse.data;
			let errorEstudio = estudioResponse.error;

			if (
				esErrorColumnaFaltante(errorEstudio, cfg.col) ||
				(cfg.tipoAsignacion === "doctor_o_radiologo" && esErrorColumnaFaltante(errorEstudio, "id_doctor"))
			) {
				errorEstudio = null;
				estudio = {};
			}
			if (errorEstudio) throw errorEstudio;

			const actual = cfg.tipoAsignacion === "doctor_o_radiologo"
				? estudio?.id_doctor
					? `doctor:${estudio.id_doctor}`
					: estudio?.id_radiologo
						? `empleado:${estudio.id_radiologo}`
						: null
				: estudio?.[cfg.col] || null;

			setModalAsignar((m) => ({
				...m,
				items: itemsAsignables,
				actual,
				seleccionado: actual,
				loading: false,
			}));
		}).catch((error) => {
			console.error("Error al abrir modal de asignación:", error);
			showNotif(cfg.notifErr, "error");
			setModalAsignar(null);
		});
		};

	const handleAsignarConfirmar = async () => {
		if (!modalAsignar?.seleccionado) return;
		const idEstudio = estudioId || estudioData?.id;
		const itemSeleccionado = modalAsignar.items?.find(
			(item) => item[modalAsignar.idKey] == modalAsignar.seleccionado,
		);
		const payload = modalAsignar.tipoAsignacion === "doctor_o_radiologo" && itemSeleccionado
			? {
				[itemSeleccionado.__target_col]: itemSeleccionado.__target_value,
				[itemSeleccionado.__target_col === "id_doctor" ? "id_radiologo" : "id_doctor"]: null,
				estado: "ASIGNADO",
				updated_at: new Date().toISOString(),
			}
			: {
				[modalAsignar.col]: modalAsignar.seleccionado,
				estado: "ASIGNADO",
				updated_at: new Date().toISOString(),
			};
		const { data: estudioActualizado, error } = await supabase
			.from("estudios_radiologia")
			.update(payload)
			.eq("id_estudio", idEstudio)
			.select("id_estudio, id_doctor, id_radiologo, estado")
			.maybeSingle();
		if (
			esErrorColumnaFaltante(error, modalAsignar.col) ||
			(modalAsignar.tipoAsignacion === "doctor_o_radiologo" && esErrorColumnaFaltante(error, "id_doctor"))
		) {
			showNotif("Falta aplicar la migración para asignar doctores externos", "error");
		} else if (error) showNotif(modalAsignar.notifErr, "error");
		else if (!estudioActualizado) showNotif("No se pudo confirmar la asignación del estudio", "error");
		else {
			if (modalAsignar.tipoAsignacion === "doctor_o_radiologo" && itemSeleccionado) {
				setEstudioAsignacion({
					id_doctor: estudioActualizado.id_doctor || null,
					id_radiologo: estudioActualizado.id_radiologo || null,
					doctorNombre: itemSeleccionado.__target_col === "id_doctor" ? itemSeleccionado.nombre : "",
					radiologoNombre: itemSeleccionado.__target_col === "id_radiologo" ? itemSeleccionado.nombre : "",
				});
			}
			showNotif(modalAsignar.notifOk, "exito");
			setModalAsignar(null);
		}
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
		const nombreCompleto =
			empleadoData?.nombre || user?.email?.split("@")[0] || "Usuario";
		const iniciales = nombreCompleto
			.split(" ")
			.filter(Boolean)
			.slice(0, 2)
			.map((p) => p[0].toUpperCase())
			.join("");
		const { data, error } = await supabase
			.from("comentarios_estudio")
			.insert({
				id_estudio: idEstudio,
				texto,
				autor_nombre: nombreCompleto,
				autor_iniciales: iniciales,
				autor_uuid: user?.id || null,
			})
			.select()
			.single();
		if (error) {
			showNotif("Error al agregar comentario", "error");
			return;
		}
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
		if (error) {
			showNotif("Error al actualizar comentario", "error");
			return;
		}
		setComentarios((c) => c.map((x) => (x.id === id ? { ...x, texto } : x)));
		setComentarioEditId(null);
		setComentarioEditTxt("");
		showNotif("Comentario actualizado", "exito");
	};

	const handleEliminarComentario = async (id) => {
		const { error } = await supabase
			.from("comentarios_estudio")
			.delete()
			.eq("id", id);
		if (error) {
			showNotif("Error al eliminar comentario", "error");
			return;
		}
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
		setModalPrioridad({
			altaPrioridad: data?.alta_prioridad ?? false,
			loading: false,
		});
	};

	const handlePrioridadConfirmar = async () => {
		const idEstudio = estudioId || estudioData?.id;
		const { error } = await supabase
			.from("estudios_radiologia")
			.update({
				alta_prioridad: modalPrioridad.altaPrioridad,
				updated_at: new Date().toISOString(),
			})
			.eq("id_estudio", idEstudio);
		if (error) showNotif("Error al actualizar prioridad", "error");
		else
			showNotif(
				modalPrioridad.altaPrioridad
					? "Estudio marcado como alta prioridad"
					: "Prioridad normal restablecida",
				"exito",
			);
		setModalPrioridad(null);
	};

	const handleDetalleItem = (id) => {
		if (
			empleadoData &&
			!puedeAsignarRadiologia(empleadoData) &&
			["radiologo", "tecnico", "referente", "prioridad"].includes(id)
		) {
			showNotif("No tienes permiso para modificar este estudio", "error");
			return;
		}
		if (["radiologo", "tecnico", "referente"].includes(id)) abrirModalAsignar(id);
		else if (id === "prioridad") abrirModalPrioridad();
		else if (id === "comentarios") abrirModalComentarios();
		else if (id === "etiquetas") abrirModalEtiquetas();
		else if (id === "metricas") abrirModalMetricas();
		else setMostrarDetalle(false);
	};

	const abrirModalEtiquetas = async () => {
		setMostrarDetalle(false);
		const idEstudio = estudioId || estudioData?.id;
		const { data } = await supabase
			.from("estudios_radiologia")
			.select("etiquetas")
			.eq("id_estudio", idEstudio)
			.single();
		setEtiquetas(data?.etiquetas || []);
		setEtiquetaInput("");
		setEtiquetaSugerencia(false);
		setModalEtiquetas(true);
	};

	const handleGuardarEtiquetas = async (lista) => {
		const idEstudio = estudioId || estudioData?.id;
		const { error } = await supabase
			.from("estudios_radiologia")
			.update({ etiquetas: lista })
			.eq("id_estudio", idEstudio);
		if (error) {
			showNotif("Error al guardar etiquetas", "error");
			return;
		}
		setEtiquetas(lista);
	};

	const agregarEtiqueta = (texto) => {
		const tag = texto.trim();
		if (!tag || etiquetas.includes(tag)) return;
		handleGuardarEtiquetas([...etiquetas, tag]);
		setEtiquetaInput("");
		setEtiquetaSugerencia(false);
	};

	const quitarEtiqueta = (tag) =>
		handleGuardarEtiquetas(etiquetas.filter((e) => e !== tag));

	const abrirModalMetricas = async () => {
		setMostrarDetalle(false);
		const idEstudio = estudioId || estudioData?.id;
		setModalMetricas({ loading: true });
		const { data } = await supabase
			.from("estudios_radiologia")
			.select(
				"tipo_estudio, fecha_estudio, primer_reporte_at, primer_reporte_usuario",
			)
			.eq("id_estudio", idEstudio)
			.single();
		if (!data) {
			setModalMetricas(null);
			showNotif("No se encontraron métricas", "error");
			return;
		}
		let tiempoTxt = "—";
		if (data.fecha_estudio && data.primer_reporte_at) {
			const diff = Math.round(
				(new Date(data.primer_reporte_at) - new Date(data.fecha_estudio)) / 60000,
			);
			if (diff < 60) tiempoTxt = `${diff} minuto${diff !== 1 ? "s" : ""}`;
			else {
				const h = Math.floor(diff / 60),
					m = diff % 60;
				tiempoTxt = m > 0 ? `${h}h ${m}min` : `${h}h`;
			}
		}
		const fmtDate = (iso) =>
			iso
				? new Date(iso).toLocaleString("es-MX", {
						dateStyle: "long",
						timeStyle: "short",
					})
				: "—";
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
		if (!puedeEditarReporteRadiologia(empleadoData)) {
			showNotif("No tienes permiso para interpretar este estudio", "error");
			return;
		}
		setMostrarReporte(false);
		if (id === "plantillas") {
			setReporteExpandido(false);
			setPanelDerecho("reporte");
			abrirSelectorPlantillas();
			return;
		}
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
				doctor: pacienteInfo.doctor || "",
				folio: pacienteInfo.folio || "",
				telefono: pacienteInfo.telefono || "",
				radiologo: nombreRadiologo || "",
				cedula: empleadoData?.cedula || "",
				especialidad: especialidadRadiologo || "",
				firmaUrl: firmaEmpleadoUrl,
			});
			window.open(`/reporte?${params.toString()}`, "_blank");
		}
		if (id === "adjuntar") {
			reporteAdjuntoInputRef.current?.click();
		}
	};

	const handleTool = (id) => {
		if (id === "Datos") {
			setMostrarInfo((f) => !f);
			return;
		}
		if (id === "centrar") {
			setCentrarCounter((c) => c + 1);
			return;
		}
		setLupaGlobal(false);
		setElipseGlobal(false);
		setRectanguloGlobal(false);
		setBidiGlobal(false);
		if (herramientaFijada && herramienta === id) {
			setHerramienta(null);
			setHerramientaFijada(false);
			return;
		}
		setHerramienta(id);
		setHerramientaFijada(true);
	};
	const handleShortcutTool = (id) => {
		if (!herramientaFijada) setHerramienta(id);
	};

	const toggleCine = () => {
		if (cineActivo) {
			clearInterval(cineRef.current);
			setCineActivo(false);
			return;
		}
		if (imageIds.length === 0) return;
		cineIdx.current = 0;
		cineRef.current = setInterval(() => {
			cineIdx.current = (cineIdx.current + 1) % imageIds.length;
			setPanelImageIds((p) => {
				const n = [...p];
				n[panelActivo] = imageIds[cineIdx.current];
				return n;
			});
		}, 300);
		setCineActivo(true);
	};

	const descargarArchivo = () => {
		const url = (panelImageIds[panelActivo] || imageIds[0])?.replace("wadouri:", "");
		if (!url) return;
		const a = document.createElement("a");
		a.href = url;
		a.download = "estudio.dcm";
		a.click();
	};

	const compartir = async () => {
		if (navigator.share)
			await navigator.share({
				title: pacienteInfo.nombre,
				url: window.location.href,
			});
		else {
			navigator.clipboard.writeText(window.location.href);
			alert("URL copiada");
		}
	};

	const descargarReportePdf = async () => {
		const id = estudioId || estudioData?.id || "";
		const texto = reporteEditorRef.current?.innerText ?? reporteTexto;
		const encabezado = obtenerEncabezadoReporte();
		try {
			await generarReportePdf({
				nombrePaciente: encabezado.paciente,
				doctorNombre: encabezado.doctor,
				estudioDescripcion: encabezado.estudio,
				fechaEncabezado: encabezado.fecha,
				reporteTexto: texto,
				membreteSrc: membreteReporteSrc,
				qrData: id ? `${window.location.origin}/visor-paciente/${id}` : "",
				nombreArchivo: crearNombreArchivoReporte(pacienteInfo.nombre),
			});
		} catch (err) {
			console.error("Error al generar PDF del reporte:", err);
			showNotif("No fue posible generar el PDF del reporte", "error");
		}
	};

	const guardarReporte = async () => {
		if (!puedeEditarReporteRadiologia(empleadoData)) {
			showNotif("No tienes permiso para interpretar este estudio", "error");
			return;
		}
		const textoReporte = reporteEditorRef.current?.innerText ?? reporteTexto;
		const idEstudio = estudioId || estudioData?.id;
		const encabezado = obtenerEncabezadoReporte();
		if (esRadiologoClinicoPermisos(empleadoData?.rol)) {
			const { error } = await supabase.rpc("actualizar_reporte_radiologo_clinico", {
				p_id_estudio: Number(idEstudio),
				p_reporte: textoReporte,
				p_estado: "COMPLETADO",
				p_reporte_encabezado: encabezado,
			});
			if (error) showNotif("Error al guardar el reporte", "error");
			else {
				setReporteTexto(textoReporte);
				showNotif("Reporte guardado", "success");
			}
			return;
		}
		const actualizarReporte = (payload) =>
			supabase
				.from("estudios_radiologia")
				.update(payload)
				.eq("id_estudio", estudioId || estudioData?.id);
		const actualizadoEn = new Date().toISOString();
		let payloadReporte = {
			reporte: textoReporte,
			reporte_encabezado: encabezado,
			estado: "COMPLETADO",
			listo_entrega: false,
			entregado: false,
			updated_at: actualizadoEn,
		};
		let { error } = await actualizarReporte(payloadReporte);
		while (error) {
			const columna = obtenerColumnaSchemaCacheFaltante(error);
			if (
				![
					"listo_entrega",
					"entregado",
				].includes(columna)
			) {
				break;
			}
			payloadReporte = { ...payloadReporte };
			delete payloadReporte[columna];
			({ error } = await actualizarReporte(payloadReporte));
		}
		if (error) showNotif("Error al guardar el reporte", "error");
		else {
			setReporteTexto(textoReporte);
			let { data: estudioEntrega, error: errorEstudioEntrega } = await supabase
				.from("estudios_radiologia")
				.select(
					"id_estudio, id_venta, id_estudio_venta, id_sucursal, sucursal, tipo_estudio, id_paciente, descripcion, fecha_estudio",
				)
				.eq("id_estudio", idEstudio)
				.maybeSingle();
			if (errorEstudioEntrega) {
				const { data: estudioBasico, error: errorBasico } = await supabase
					.from("estudios_radiologia")
					.select("id_estudio, tipo_estudio, id_paciente, descripcion, fecha_estudio")
					.eq("id_estudio", idEstudio)
					.maybeSingle();
				if (errorBasico) {
					console.error("Error al consultar estudio de radiologia:", errorBasico);
				}
				estudioEntrega = estudioBasico || null;
			}
			if (textoReporte.trim() && estudioEntrega) {
				let idEstudioVenta = estudioEntrega.id_estudio_venta || null;
				if (!idEstudioVenta && estudioEntrega.id_paciente) {
					const { data: ventasPaciente, error: errorVentasPaciente } = await supabase
						.from("ventas")
						.select(
							"id_venta, fecha_venta, estudios_venta (id_estudio_venta, descripcion_estudio, clave_estudio, estado_validacion)",
						)
						.eq("id_paciente", estudioEntrega.id_paciente)
						.eq("estado", "activo")
						.order("fecha_venta", { ascending: false })
						.limit(20);
					if (errorVentasPaciente) {
						console.error(
							"Error al buscar venta para estudio de imagen:",
							errorVentasPaciente,
						);
					}
					const estudioVentaRelacionado = (ventasPaciente || [])
						.flatMap((venta) =>
							(venta.estudios_venta || []).map((estudioVenta) => ({
								...estudioVenta,
								id_venta: venta.id_venta,
							})),
						)
						.find((estudioVenta) =>
							descripcionesCoinciden(
								estudioVenta.descripcion_estudio || estudioVenta.clave_estudio,
								estudioEntrega.descripcion || pacienteInfo.tipoEstudio,
							),
						);
					idEstudioVenta = estudioVentaRelacionado?.id_estudio_venta || null;
				}
				if (idEstudioVenta) {
					const { error: errorEstudioVenta } = await supabase
						.from("estudios_venta")
						.update({
							estado_captura: "completado",
							estado_validacion: "guardado",
							updated_at: actualizadoEn,
						})
						.eq("id_estudio_venta", idEstudioVenta);
					if (errorEstudioVenta) {
						console.error(
							"Error al sincronizar estudio de imagen en captura:",
							errorEstudioVenta,
						);
					}
				}
			}
			await registrarEventoSolicitud(supabase, {
				id_venta: estudioEntrega?.id_venta,
				evento: EVENTOS_SOLICITUD.INTERPRETADA,
				descripcion: `Reporte interpretado para ${estudioEntrega?.descripcion || pacienteInfo.tipoEstudio}`,
				empleado: empleadoData,
				user,
				entidad_tipo: "estudio_radiologia",
				entidad_id: Number(idEstudio),
				detalles: {
					tipo_estudio: estudioEntrega?.tipo_estudio || pacienteInfo.tipoEstudio,
				},
			});
			await crearNotificacion(supabase, {
				titulo: "Reporte de imagen guardado",
				mensaje: `${pacienteInfo.nombre} · ${estudioEntrega?.tipo_estudio || pacienteInfo.tipoEstudio}`,
				tipo: "captura",
				canal_destino: "captura",
				entidad_tipo: "estudio_radiologia",
				entidad_id: Number(idEstudio),
				id_venta: estudioEntrega?.id_venta || null,
				id_sucursal:
					estudioEntrega?.id_sucursal || empleadoData?.id_sucursal || null,
				sucursal: estudioEntrega?.sucursal || empleadoData?.sucursal || "",
				action_path: "/captura",
			});
			showNotif("Reporte guardado", "exito");
		}
	};

	const limpiarNombreArchivo = (nombre) =>
		nombre
			.trim()
			.toLowerCase()
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.replace(/[^a-z0-9.]+/g, "-")
			.replace(/(^-|-$)/g, "");

	const handleReporteAdjuntoChange = async (event) => {
		const archivo = event.target.files?.[0];
		if (!archivo) return;

		if (archivo.size > REPORTE_ADJUNTO_MAX_SIZE) {
			showNotif("El archivo debe pesar menos de 25MB", "error");
			event.target.value = "";
			return;
		}

		try {
			const idEstudio = estudioId || estudioData?.id;
			const nombreSeguro = limpiarNombreArchivo(archivo.name);
			const archivoPath = `${idEstudio}/${Date.now()}-${nombreSeguro}`;

			const { error: uploadError } = await supabase.storage
				.from(BUCKET_ADJUNTOS_REPORTE)
				.upload(archivoPath, archivo, {
					cacheControl: "3600",
					contentType: archivo.type || "application/octet-stream",
					upsert: false,
				});

			if (uploadError) throw uploadError;

			const { data: publicData } = supabase.storage
				.from(BUCKET_ADJUNTOS_REPORTE)
				.getPublicUrl(archivoPath);

			const { error: insertError } = await supabase
				.from("reporte_radiologia_adjuntos")
				.insert([
					{
						id_estudio: Number(idEstudio),
						nombre_archivo: archivo.name,
						archivo_path: archivoPath,
						archivo_url: publicData?.publicUrl || null,
						mime_type: archivo.type || null,
						size_bytes: archivo.size,
						creado_por: user?.id || null,
					},
				])
				.select()
				.single();

			if (insertError) throw insertError;

			showNotif("Archivo adjuntado al reporte", "exito");
		} catch (error) {
			console.error("Error al adjuntar archivo:", error);
			showNotif("Error al adjuntar archivo", "error");
		} finally {
			event.target.value = "";
		}
	};

	const cargarPlantillasReporte = async () => {
		setPlantillasReporteLoading(true);
		try {
			const { data, error } = await supabase
				.from("plantillas_radiologia")
				.select(
					"id, nombre, descripcion, categoria, visibilidad, archivo_url, mime_type, contenido_html, membrete_base64, created_at",
				)
				.order("created_at", { ascending: false });

			if (error) throw error;
			setPlantillasReporte(data || []);
		} catch (error) {
			console.error("Error al cargar plantillas:", error);
			showNotif("Error al cargar plantillas", "error");
		} finally {
			setPlantillasReporteLoading(false);
		}
	};

	const abrirSelectorPlantillas = () => {
		setModalPlantillasReporte(true);
		if (plantillasReporte.length === 0) cargarPlantillasReporte();
	};

	const aplicarPlantillaSubida = (plantilla) => {
		setPlantillaSeleccionada(plantilla);

		if (plantilla.membrete_base64?.startsWith("data:image/")) {
			setMembreteReporteSrc(plantilla.membrete_base64);
		} else if (plantilla.archivo_url && plantilla.mime_type?.startsWith("image/")) {
			setMembreteReporteSrc(plantilla.archivo_url);
		}

		const contenido = plantilla.contenido_html || "";
		if (contenido) {
			setReporteTexto(contenido);
			if (reporteEditorRef.current) {
				reporteEditorRef.current.innerHTML = contenido;
				reporteEditorRef.current.focus();
			}
		}

		setModalPlantillasReporte(false);
		showNotif(`Plantilla "${plantilla.nombre}" seleccionada`, "exito");
	};

	const aplicarPlantillaReporte = (tipo) => {
		const plantillas = {
			normal:
				"HALLAZGOS:\nSe revisan las imagenes del estudio solicitado. No se identifican alteraciones radiologicas evidentes en las proyecciones obtenidas.\n\nIMPRESION DIAGNOSTICA:\nEstudio sin datos radiologicos agudos evidentes.",
			hallazgos: "HALLAZGOS:\n\n\nIMPRESION DIAGNOSTICA:\n\n\nRECOMENDACIONES:\n",
			limpiar: "",
		};

		const contenido = plantillas[tipo] ?? "";
		setReporteTexto(contenido);
		if (reporteEditorRef.current) {
			reporteEditorRef.current.innerHTML = contenido.replace(/\n/g, "<br>");
			reporteEditorRef.current.focus();
		}
	};

	const totalPaneles = formatoGrid.cols * formatoGrid.rows;
	const serieActiva = seriesDicom.find((serie) => serie.id === serieActivaId);
	const modalidadSerieActiva = String(serieActiva?.modalidad || "").toUpperCase();
	const esSerieCt = ["CT", "TOMOGRAFIA"].includes(modalidadSerieActiva);
	const esSerieRm = ["MR", "RM", "RESONANCIA MAGNETICA"].includes(modalidadSerieActiva);
	const esSerieCtRm = esSerieCt || esSerieRm;
	const serieFuenteMpr = obtenerSerieFuenteMpr(seriesDicom);
	const presetsVentanaDisponibles = PRESETS_VENTANA.filter((preset) =>
		preset.modalidad === "MR"
			? esSerieRm
			: esSerieCt,
	);
	const aplicarPresetVentana = (preset) => {
		if (!serieActiva) return;
		setPresetsVentanaPorSerie((prev) => ({ ...prev, [serieActiva.id]: preset.id }));
		setHerramienta("Wwwc");
		setHerramientaFijada(true);
		setMostrarPresetsVentana(false);
	};
	const accionesVista = ACTIONS.filter((a) => VIEW_ACTION_IDS.includes(a.id));
	if (esSerieCtRm && serieActiva?.id === serieFuenteMpr?.id) accionesVista.unshift({ id: "mpr", icon: formatoIcon, label: "2D MPR" });
	const seleccionarSerieMpr = (serie) => {
		setMprSeries((actual) => {
			const siguiente = actual.map((id, indice) => indice === mprPanelActivo ? serie.id : id);
			const idEstudio = estudioId || estudioData?.id;
			const sesion = cacheSesionVisorDicom.get(String(idEstudio));
			if (sesion) cacheSesionVisorDicom.set(String(idEstudio), { ...sesion, mprActivo: true, mprPanelActivo, mprSeries: siguiente, mprModoReconstruccion });
			guardarSesionMpr(idEstudio, { mprActivo: true, mprPanelActivo, mprSeries: siguiente, mprModoReconstruccion });
			return siguiente;
		});
	};
	const salirMpr = () => {
		const idEstudio = estudioId || estudioData?.id;
		const sesion = cacheSesionVisorDicom.get(String(idEstudio));
		if (sesion) cacheSesionVisorDicom.set(String(idEstudio), { ...sesion, mprActivo: false, mprModoReconstruccion });
		guardarSesionMpr(idEstudio, { mprActivo: false, mprPanelActivo, mprSeries, mprGrosorCorte, mprIndices, mprModoReconstruccion });
		setMprActivo(false);
	};
	const puedeEditarReporte = !empleadoData || puedeEditarReporteRadiologia(empleadoData);
	const puedeVerReporte = !empleadoData || puedeVerReporteRadiologia(empleadoData);
	const puedeAsignarEstudio = !empleadoData || puedeAsignarRadiologia(empleadoData);
	const accionesFlujo = ACTIONS.filter((a) =>
		WORKFLOW_ACTION_IDS.includes(a.id) && (puedeVerReporte || a.id !== "reporte"),
	);
	const herramientaActiva =
		(mprActivo && herramienta === "Wwwc" ? "WWWC" : TOOLS.find((t) => t.id === herramienta)?.label) ||
		MAS_ITEMS.find(
			(item) =>
				(item.id === "lupa" && lupaGlobal) ||
				(item.id === "elipse" && elipseGlobal) ||
				(item.id === "rectangulo" && rectanguloGlobal) ||
				(item.id === "bidireccional" && bidiGlobal),
		)?.label ||
		"Sin herramienta";
	const imagenActivaIndex = imageIds.findIndex((id) => id === panelImageIds[panelActivo]);
	const imagenActivaTexto =
		imagenActivaIndex >= 0 ? `${imagenActivaIndex + 1}/${imageIds.length}` : "0/0";
	const mostrarMiniaturaReporte = Boolean(reporteTexto.trim()) || panelDerecho === "reporte";
	const totalImagenesDicom = seriesDicom.reduce((total, serie) => total + serie.imagenes.length, 0);
	const nombreDoctorAsignado =
		estudioAsignacion.doctorNombre ||
		estudioAsignacion.radiologoNombre ||
		"Sin asignar";
	const detalleResumen = [
		{ label: "Doctor asignado", value: nombreDoctorAsignado, action: "radiologo" },
		{ label: "Técnico", value: "Pendiente", action: "tecnico" },
		{ label: "Referente", value: "Pendiente", action: "referente" },
		{ label: "Prioridad", value: estudioData?.altaPrioridad ? "Alta" : "Normal", action: "prioridad" },
	].filter((item) => puedeAsignarEstudio || !item.action);
	const detalleItemsVisibles = DETALLE_ITEMS.filter((item) =>
		puedeAsignarEstudio || !["radiologo", "tecnico", "referente", "prioridad", "etiquetas"].includes(item.id),
	);
	const plantillasReporteFiltradas = plantillasReporte.filter((plantilla) => {
		const coincideTab = plantilla.visibilidad === plantillaReporteTab;
		const texto = plantillaReporteBusqueda.trim().toLowerCase();
		const coincideBusqueda =
			!texto ||
			[plantilla.nombre, plantilla.descripcion, plantilla.categoria]
				.filter(Boolean)
				.some((valor) => valor.toLowerCase().includes(texto));

		return coincideTab && coincideBusqueda;
	});
	const cantidadPlantillasOrganizacion = plantillasReporte.filter(
		(plantilla) => plantilla.visibilidad === "organizacion",
	).length;
	const cantidadPlantillasPrivadas = plantillasReporte.filter(
		(plantilla) => plantilla.visibilidad === "privado",
	).length;

	return (
		<div className="vd-root">
			<Header
				menuOpen={menuOpen}
				setMenuOpen={setMenuOpen}
				menuRef={menuRef}
				empleadoData={empleadoData}
				formatRol={formatRol}
				getPrimerNombre={getPrimerNombre}
				user={user}
				handleLogout={handleLogout}
				currentPage="visor"
				sidebarOpen={sidebarOpen}
				setSidebarOpen={setSidebarOpen}
			/>
			{isMobile && <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />}
			<input
				ref={reporteAdjuntoInputRef}
				type="file"
				className="vd-hidden-file-input"
				aria-label="Adjuntar archivo al reporte"
				accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
				onChange={handleReporteAdjuntoChange}
			/>

			<div className="vd-toolbar" ref={toolbarRef}>
				<div className="vd-toolbar-context">
					<button className="vd-btn-back" onClick={() => navigate(-1)}>
						‹ Atrás
					</button>

					{!mprActivo && <div className="vd-paciente-chip">
						<span className="vd-chip-tipo">{pacienteInfo.tipoEstudio}</span>
						<span className="vd-chip-nombre">{pacienteInfo.nombre}</span>
						<span className="vd-chip-fecha">{pacienteInfo.horaFecha}</span>
						<span
							className={`vd-chip-estado estado-${pacienteInfo.estado?.toLowerCase().replace(/ /g, "-")}`}>
							{pacienteInfo.estado}
						</span>
					</div>}
				</div>
				{mprActivo && (
					<div className="vd-toolbar-section vd-toolbar-section-tools vd-mpr-toolbar">
						<span className="vd-toolbar-label">MPR 2D</span>
						<div className="vd-tools-group">
							<button className="vd-tool-btn" onClick={() => handleAction("descargar")} title="Descargar">
								<img src={descargarIcon} alt="" /><span>Descargar</span>
							</button>
							<button className="vd-tool-btn" onClick={salirMpr} title="Salir de MPR 2D">
								<CloseIcon className="vd-mpr-exit-icon" /><span>Salir de MPR 2D</span>
							</button>
							<button className="vd-tool-btn" onClick={() => handleAction("centrar")} title="Punto de mira">
								<img src={centrarIcon} alt="" /><span>Punto de mira</span>
							</button>
							<button className={`vd-tool-btn ${herramienta === "Wwwc" ? "activo" : ""}`} onClick={() => handleTool("Wwwc")} title="WWWC">
								<img src={contrasteIcono} alt="" /><span>WWWC</span>
							</button>
							<button className="vd-tool-btn" onClick={() => handleAction("restaurar")} title="Restaurar">
								<img src={restaurarIcon} alt="" /><span>Restaurar</span>
							</button>
							<label className="vd-mpr-cut-control">
								<small>{mprGrosorCorte.toFixed(1)} mm</small>
								<input aria-label="Grosor de corte MPR" type="range" min="0.1" max="500" step="0.1" value={mprGrosorCorte} onChange={(event) => setMprGrosorCorte(Number(event.target.value))} />
								<span>Grosor de corte</span>
							</label>
							<label className="vd-mpr-mode-toggle"><input type="checkbox" checked={mprModoActivado} onChange={(event) => setMprModoActivado(event.target.checked)} /> Modo</label>
							<label className="vd-mpr-reconstruction"><span>Reconstrucción</span><select aria-label="Modo de reconstrucción MPR" value={mprModoReconstruccion} onChange={(event) => setMprModoReconstruccion(event.target.value)}><option>MIP</option><option>MinIP</option><option>Promedio</option></select></label>
						</div>
					</div>
				)}

				{!mprActivo && !(panelDerecho === "reporte" && reporteExpandido) && (
				<div className="vd-toolbar-section vd-toolbar-section-tools">
					<span className="vd-toolbar-label">Herramientas</span>
					<div className="vd-tools-group">
						{TOOLS.map((t) => {
							const boton = (
								<button
									className={`vd-tool-btn ${t.id === "Datos" ? (mostrarInfo ? "activo" : "") : herramienta === t.id ? "activo" : ""}`}
									onClick={() => handleTool(t.id)}
									title={t.label}>
									{t.icon ? <img src={t.icon} alt="" /> : <span>{t.label[0]}</span>}
									<span>{t.label}</span>
								</button>
							);
							if (t.id !== "Wwwc" || !esSerieCtRm) return <span key={t.id}>{boton}</span>;
							return (
								<div className="vd-wl-menu-wrap" key={t.id}>
									{boton}
									<button
										type="button"
										className="vd-wl-preset-toggle"
										title="Presets de ventana"
										aria-label="Presets de ventana"
										onClick={() => setMostrarPresetsVentana((visible) => !visible)}>
										<KeyboardArrowDownIcon fontSize="small" />
									</button>
									{mostrarPresetsVentana && (
										<div className="vd-wl-preset-menu" role="menu" aria-label="Vistas de ventana">
											{presetsVentanaDisponibles.map((preset, indice) => (
												<button key={preset.id} type="button" role="menuitem" onClick={() => aplicarPresetVentana(preset)}>
													{indice + 1} - {preset.label}
												</button>
											))}
										</div>
									)}
								</div>
							);
						})}
					</div>
				</div>
				)}

				{!mprActivo && !(panelDerecho === "reporte" && reporteExpandido) && (
				<div className="vd-toolbar-section">
					<span className="vd-toolbar-label">Vista</span>
					<div className="vd-actions-group">
						{accionesVista.map((a) => (
							<button
								key={a.id}
								className={`vd-tool-btn ${a.id === "cine" && cineActivo ? "cine-on" : ""} ${a.id === "mas" && mostrarMas ? "activo" : ""} ${a.id === "formato" && mostrarFormatos ? "activo" : ""}`}
								onClick={() => handleAction(a.id)}
								title={a.label}>
								{a.icon ? <img src={a.icon} alt="" /> : <span>⊞</span>}
								<span>{a.label}</span>
							</button>
						))}
					</div>
				</div>
				)}

				<div className="vd-toolbar-section">
					<span className="vd-toolbar-label">Flujo</span>
					<div className="vd-actions-group">
						{accionesFlujo.map((a) =>
							a.id === "reporte" ? (
								<div
									key={a.id}
									ref={reporteButtonRef}
									className={`vd-split-action ${
										panelDerecho === "reporte" || mostrarReporte ? "activo" : ""
									}`}>
									<button
										type="button"
										className="vd-tool-btn vd-split-main"
										onClick={() => handleAction(a.id)}
										title="Abrir reporte">
										{a.icon ? <img src={a.icon} alt="" /> : <span>⊞</span>}
										<span>{a.label}</span>
									</button>
									{puedeEditarReporte && (
										<button
											type="button"
											className="vd-split-toggle"
											onClick={toggleMenuReporte}
											aria-label="Opciones de reporte"
											title="Opciones de reporte">
											⌄
										</button>
									)}
								</div>
							) : (
								<button
									key={a.id}
									ref={a.id === "detalle" ? detalleButtonRef : null}
									className={`vd-tool-btn ${
										a.id === panelDerecho ||
										(a.id === "detalle" && panelDerecho === "detalles")
											? "activo"
											: ""
									}`}
									onClick={() => handleAction(a.id)}
									title={a.label}>
									{a.icon ? <img src={a.icon} alt="" /> : <span>⊞</span>}
									<span>{a.label}</span>
								</button>
							),
						)}
					</div>
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
							{item.icon ? (
								<img src={item.icon} alt={item.label} className="vd-mas-icon" />
							) : (
								<span className="vd-mas-fallback">{item.label[0]}</span>
							)}
							<span>{item.label}</span>
						</button>
					))}
				</div>
			)}

			{mostrarDetalle && (
				<div className="vd-mas-bar" style={{ top: detalleBarTop }}>
					{detalleItemsVisibles.map((item) => (
						<button
							key={item.id}
							className="vd-mas-item"
							onClick={() => handleDetalleItem(item.id)}
							title={item.label}>
							{item.icon ? (
								<img src={item.icon} alt={item.label} className="vd-mas-icon" />
							) : (
								<span className="vd-mas-fallback">{item.label[0]}</span>
							)}
							<span>{item.label}</span>
						</button>
					))}
				</div>
			)}

			{mostrarReporte && (
				<div
					className="vd-mas-bar"
					ref={reporteMenuRef}
					style={{ top: reporteBarTop }}>
					{puedeEditarReporte && REPORTE_ITEMS.map((item) => (
						<button
							key={item.id}
							className="vd-mas-item"
							onClick={() => handleReporteItem(item.id)}
							title={item.label}>
							{item.icon ? (
								<img src={item.icon} alt={item.label} className="vd-mas-icon" />
							) : (
								<span className="vd-mas-fallback">{item.label[0]}</span>
							)}
							<span>{item.label}</span>
						</button>
					))}
				</div>
			)}

			<div className={`vd-body ${panelDerecho === "reporte" ? "vd-body-reporte" : ""} ${panelDerecho === "reporte" && reporteExpandido ? "vd-body-reporte-expandido" : ""}`}>
				<div className={`vd-sidebar ${seriesContraidas ? "contraida" : ""}`}>
					<div className="vd-sidebar-header">
						<div>
							<span>Series</span>
							<small>DICOM</small>
						</div>
						<button
							type="button"
							className="vd-sidebar-toggle"
							onClick={() => setSeriesContraidas((v) => !v)}
							aria-label={seriesContraidas ? "Expandir series" : "Contraer series"}
							title={seriesContraidas ? "Expandir series" : "Contraer series"}>
							{seriesContraidas ? "›" : "‹"}
						</button>
						<span className="vd-serie-count">{totalImagenesDicom || imageIds.length}</span>
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
							seriesDicom.map((serie, serieIndex) => (
								<div className="vd-serie-grupo" key={serie.id || serieIndex}>
									<button
										type="button"
										className={`vd-serie-titulo ${serieActivaId === serie.id ? "activa" : ""}`}
										onClick={() => mprActivo ? seleccionarSerieMpr(serie) : seleccionarSerieDicom(serie)}>
										<span>{serie.label || `Serie ${serieIndex + 1}`}</span>
										<small>{serie.imagenes.length}</small>
									</button>
									<button type="button" className={`vd-serie-card ${mprActivo ? mprSeries[mprPanelActivo] === serie.id : serieActivaId === serie.id ? "activa" : ""}`} onClick={() => mprActivo ? seleccionarSerieMpr(serie) : seleccionarSerieDicom(serie)}>
										<MiniaturaSerieDicom imageId={serie.imageIds[0]} label={serie.label} />
										<div className="vd-serie-card-info"><strong>{serie.label || `Serie ${serieIndex + 1}`}</strong><span>S: {serieIndex + 1}</span><small>{serie.imagenes.length} imágenes</small></div>
									</button>
								</div>
							))
						)}
						{mostrarMiniaturaReporte && (
							<button
								type="button"
								className={`vd-miniatura vd-miniatura-reporte ${panelDerecho === "reporte" ? "activa" : ""}`}
								onClick={() => {
									setReporteExpandido(true);
									setPanelDerecho("reporte");
								}}
								aria-label="Abrir reporte">
								<div className="vd-mini-img vd-mini-reporte-img">
									<span className="vd-mini-reporte-icon">REP</span>
									<span className="vd-mini-num">Doc</span>
								</div>
								<div className="vd-mini-footer">
									<span>Reporte</span>
									<small>{reporteTexto.trim() ? "Guardado" : "Nuevo"}</small>
								</div>
							</button>
						)}
					</div>
				</div>

				<div className="vd-viewer">
					{mostrarInfo && !mprActivo && (
						<div className="vd-overlay-paciente">
							<div>
								<p className="vd-ov-nombre">{pacienteInfo.nombre}</p>
								<p className="vd-ov-dato">
									{pacienteInfo.tipoEstudio} · {pacienteInfo.sucursal}
								</p>
								<p className="vd-ov-dato">{pacienteInfo.horaFecha}</p>
							</div>
							<span
								className={`vd-ov-estado estado-${pacienteInfo.estado?.toLowerCase().replace(/ /g, "-")}`}>
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
							<span>!</span>
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
									onClick={() => {
										setFormatoGrid(f);
										setMostrarFormatos(false);
									}}>
									<div
										className="vd-formato-grid"
										style={{
											gridTemplateColumns: `repeat(${f.cols},1fr)`,
											gridTemplateRows: `repeat(${f.rows},1fr)`,
										}}>
										{Array(f.cols * f.rows)
											.fill(0)
											.map((_, i) => (
												<div key={i} />
											))}
									</div>
									<span>{f.label}</span>
								</button>
							))}
						</div>
					)}

					{mprActivo ? <Mpr2dViewer imageIds={imageIds} series={seriesDicom} seriesSeleccionadas={mprSeries} indicesIniciales={mprIndices} restaurarIndices={mprRestaurarIndices} panelActivo={mprPanelActivo} herramientaActiva={herramienta} resetCounter={resetCounter} grosorCorte={mprGrosorCorte} modoReconstruccion={mprModoReconstruccion} onIndicesChange={setMprIndices} onPanelSeleccionado={(panel) => { setMprPanelActivo(panel); const idEstudio = estudioId || estudioData?.id; const sesion = cacheSesionVisorDicom.get(String(idEstudio)); if (sesion) cacheSesionVisorDicom.set(String(idEstudio), { ...sesion, mprActivo: true, mprPanelActivo: panel, mprSeries, mprModoReconstruccion }); guardarSesionMpr(idEstudio, { mprActivo: true, mprPanelActivo: panel, mprSeries, mprGrosorCorte, mprIndices, mprModoReconstruccion }); }} /> : <div
						className="vd-grid"
						style={{
							gridTemplateColumns: `repeat(${formatoGrid.cols},1fr)`,
							gridTemplateRows: `repeat(${formatoGrid.rows},1fr)`,
						}}>
						{Array(totalPaneles)
							.fill(0)
							.map((_, i) => (
								<PanelDicom
									key={`${formatoGrid.id}-${i}`}
									imageId={panelImageIds[i] || null}
									imagenDicom={imagenesDicomPorId[panelImageIds[i]] || null}
									estadoVista={imagenesDicomPorId[panelImageIds[i]]?.estadoVista || null}
									estadoVentanaSerie={imagenesDicomPorId[panelImageIds[i]]?.estadoVentanaSerie || null}
									onGuardarEstadoVista={(estado) =>
										guardarEstadoVista(imagenesDicomPorId[panelImageIds[i]], estado)
									}
									onEliminarEstadoVista={() =>
										eliminarEstadoVista(imagenesDicomPorId[panelImageIds[i]])
									}
									onGuardarVentanaSerie={panelActivo === i && esSerieCtRm
										? (voi) => guardarVentanaSerie(serieActiva, voi)
										: null}
									stackImageIds={imageIds}
									onStackScroll={(direccion) => navegarImagenSerie(i, direccion)}
									herramienta={herramienta}
									herramientaFijada={herramientaFijada}
									isActive={panelActivo === i}
									resetCounter={resetCounter}
									centrarCounter={centrarCounter}
									masAccion={masAccion}
									capturaClip={panelActivo === i ? capturaClip : 0}
									lupaExterna={panelActivo === i ? lupaGlobal : false}
									elipseExterna={panelActivo === i ? elipseGlobal : false}
									rectExterna={panelActivo === i ? rectanguloGlobal : false}
									bidiExterna={panelActivo === i ? bidiGlobal : false}
									presetVentanaId={panelActivo === i ? presetsVentanaPorSerie[serieActivaId] : null}
									usarVentanaSerie={panelActivo === i && esSerieCtRm}
									onShortcutTool={handleShortcutTool}
									onCapturaOk={() =>
										showNotif("Captura copiada al portapapeles", "exito")
									}
									onCapturaFail={() => showNotif("Captura descargada", "info")}
									onClick={() => setPanelActivo(i)}
								/>
							))}
					</div>}
					<PanelIA
						activo={iaActiva}
						imageId={panelImageIds[panelActivo] || null}
						onClose={() => setIaActiva(false)}
					/>
					<button
						type="button"
						className={`vd-ia-float ${iaActiva ? "activo" : ""}`}
						onClick={() => setIaActiva((v) => !v)}
						aria-label={iaActiva ? "Desactivar IA" : "Activar IA"}
						title={iaActiva ? "Desactivar IA" : "Activar IA"}>
						<span className="vd-ia-float-orb">IA</span>
						<span className="vd-ia-float-text">{iaActiva ? "IA activa" : "Activar IA"}</span>
					</button>
					<div className="vd-status-strip">
						<span>
							<b>Herramienta:</b> {herramientaActiva}
						</span>
						<span>
							<b>Formato:</b> {formatoGrid.label}
						</span>
						<span>
							<b>Panel:</b> {panelActivo + 1}/{totalPaneles}
						</span>
						<span>
							<b>Imagen:</b> {imagenActivaTexto}
						</span>
					</div>
				</div>

				{panelDerecho && (
					<div
						ref={sidePanelRef}
						className={`vd-side-panel vd-side-panel-${panelDerecho}${panelDerecho === "reporte" && reporteExpandido ? " vd-side-panel-expandido" : ""}`}>
						<div className="vd-side-tabs">
							{puedeVerReporte && (
								<button
									type="button"
									className={panelDerecho === "reporte" ? "activo" : ""}
									onClick={() => {
										setReporteExpandido(false);
										setPanelDerecho("reporte");
									}}>
									Reporte
								</button>
							)}
							<button
								type="button"
								className={panelDerecho === "detalles" ? "activo" : ""}
								onClick={() => setPanelDerecho("detalles")}>
								Detalles
							</button>
							<button
								type="button"
								className="vd-side-close"
								onClick={() => setPanelDerecho(null)}
								aria-label="Cerrar panel lateral">
								×
							</button>
						</div>

						{panelDerecho === "reporte" && puedeVerReporte && (
							<div className="vd-reporte">
								<h2 className="vd-sr-only">Documento de interpretación</h2>
								{puedeEditarReporte && <div className="vd-doc-topbar">
									<button
										type="button"
										className="vd-doc-ghost"
										onClick={() => setPanelDerecho(null)}>
										Cambiar editor
									</button>
									<button
										type="button"
										className="vd-doc-template-button"
										onClick={abrirSelectorPlantillas}>
										{plantillaSeleccionada?.nombre || "Buscar Plantilla"}
									</button>
									<button
										type="button"
										className="vd-doc-ghost"
										onClick={() => setPanelDerecho(null)}>
										Cancelar
									</button>
									<div className="vd-doc-save-group">
										<button type="button" onClick={guardarReporte}>
											Guardar
										</button>
										<button type="button" aria-label="Opciones de guardado">
											⌄
										</button>
									</div>
								</div>}
								{puedeEditarReporte && <div className="vd-doc-formatbar" aria-label="Herramientas del documento">
									<button type="button" className="is-strong" title="Negritas">
										B
									</button>
									<button type="button" className="is-italic" title="Cursiva">
										I
									</button>
									<button type="button" className="is-underlined" title="Subrayado">
										U
									</button>
									<button type="button" title="Formato de texto">
										Aa
									</button>
									<button type="button" title="Color de texto">
										A
									</button>
									<button type="button" title="Lista">
										☰
									</button>
									<button type="button" title="Numeración">
										1.
									</button>
									<button type="button" title="Alinear izquierda">
										≡
									</button>
									<button type="button" title="Insertar imagen">
										▧
									</button>
									<button type="button" title="Encabezado">
										H1
									</button>
									<button type="button" title="Deshacer">
										↶
									</button>
									<button type="button" title="Rehacer">
										↷
									</button>
									<button type="button" onClick={() => aplicarPlantillaReporte("limpiar")}>
										Limpiar
									</button>
									<button type="button" onClick={() => handleReporteItem("nueva-pestana")}>
										Abrir
									</button>
								</div>}
								<div className="vd-doc-scroll">
									<div className="rr-page-wrapper vd-rr-page-wrapper">
										<div className="rr-page vd-rr-page">
											<img
												className="rr-membrete"
												src={membreteReporteSrc}
												alt="membrete"
											/>

											<div className="rr-contenido vd-rr-contenido">
												<span className="vd-sr-only">Centro Diagnóstico California</span>
												<div ref={reporteEncabezadoRef} contentEditable={puedeEditarReporte} suppressContentEditableWarning spellCheck={false} aria-label="Encabezado del reporte">
													<p className="rr-fecha-encabezado">{encabezadoMostrado.fecha}</p>
													<div className="rr-datos-paciente">
													<div className="rr-dato-row">
														<span className="rr-label">PACIENTE:</span>
														<strong>{encabezadoMostrado.paciente}</strong>
													</div>
													<div className="rr-dato-row">
														<span className="rr-label">DOCTOR:</span>
														<strong>{encabezadoMostrado.doctor}</strong>
													</div>
													<div className="rr-dato-row">
														<span className="rr-label">ESTUDIO:</span>
														<strong>{encabezadoMostrado.estudio}</strong>
													</div>
												</div>
												</div>

												<div
													ref={reporteEditorRef}
													className="rr-editor vd-rr-editor"
													contentEditable={puedeEditarReporte}
													suppressContentEditableWarning
													spellCheck={false}
													role="textbox"
													aria-label="Editor de interpretación radiológica"
													data-placeholder="Escribir reporte aquí..."
													onInput={(e) => setReporteTexto(e.currentTarget.innerText)}
												/>

											<div className="rr-firma-area">
													<div className="rr-firma-elemento" onPointerDown={puedeEditarReporte ? (e) => iniciarArrastreFirma("firma", e) : undefined} onPointerMove={moverArrastreFirma} onPointerUp={terminarArrastreFirma} style={{ left: `calc(50% - 160px + ${ajusteFirma.firmaX}px)`, top: `${28 + ajusteFirma.firmaY}px` }}>
														{firmaEmpleadoUrl ? (
															<img
																className="rr-firma-img"
																src={firmaEmpleadoUrl}
																alt="firma"
															/>
														) : (
															<div className="rr-firma-placeholder" />
														)}
													</div>
													<div className="rr-firma-datos-elemento" onPointerDown={puedeEditarReporte ? (e) => iniciarArrastreFirma("datos", e) : undefined} onPointerMove={moverArrastreFirma} onPointerUp={terminarArrastreFirma} style={{ left: `calc(50% - 165px + ${ajusteFirma.datosX}px)`, top: `${154 + ajusteFirma.datosY}px` }}>
														<p className="rr-firma-nombre">{nombreRadiologo}</p>
														<p className="rr-firma-dato">
															{especialidadRadiologo.toUpperCase()}
														</p>
														{empleadoData?.cedula && (
															<p className="rr-firma-dato">
															CE {empleadoData.cedula}
															</p>
														)}
													</div>
													{reporteQrUrl && (
														<img
															className="rr-qr"
															src={reporteQrUrl}
															alt="Código QR del reporte"
														/>
													)}
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						)}

						{panelDerecho === "detalles" && (
							<div className="vd-detalles-panel">
								<div className="vd-detalle-resumen">
									<div>
										<span className="vd-detalle-label">Paciente</span>
										<strong>{pacienteInfo.nombre}</strong>
									</div>
									<div>
										<span className="vd-detalle-label">Estudio</span>
										<strong>{pacienteInfo.tipoEstudio}</strong>
									</div>
									<div>
										<span className="vd-detalle-label">Sucursal</span>
										<strong>{pacienteInfo.sucursal}</strong>
									</div>
									<div>
										<span className="vd-detalle-label">Estado</span>
										<strong>{pacienteInfo.estado}</strong>
									</div>
								</div>

								<div className="vd-detalle-grid">
									{detalleResumen.map((item) => (
										<button
											key={item.label}
											type="button"
											className="vd-detalle-card"
											onClick={() => handleDetalleItem(item.action)}>
											<span>{item.label}</span>
											<strong>{item.value}</strong>
										</button>
									))}
								</div>

								<div className="vd-detalle-actions">
									{DETALLE_ITEMS.filter(
										(item) =>
											!["radiologo", "tecnico", "referente", "prioridad"].includes(
												item.id,
											),
									).map((item) => (
										<button
											key={item.id}
											type="button"
											className="vd-detalle-action"
											onClick={() => handleDetalleItem(item.id)}>
											<img src={item.icon} alt="" />
											<span>{item.label}</span>
										</button>
									))}
									<button
										type="button"
										className="vd-detalle-action"
										onClick={abrirModalInfo}>
										<img src={informacionIcon} alt="" />
										<span>Ficha completa</span>
									</button>
								</div>
							</div>
						)}
					</div>
				)}
			</div>

			{modalPlantillasReporte && (
				<div
					className="vd-template-modal-overlay"
					onMouseDown={() => setModalPlantillasReporte(false)}>
					<div
						className="vd-template-modal"
						onMouseDown={(event) => event.stopPropagation()}
						role="dialog"
						aria-modal="true"
						aria-labelledby="vd-template-modal-title">
						<div className="vd-template-modal-header">
							<h2 id="vd-template-modal-title">Elegir plantilla</h2>
							<button
								type="button"
								className="vd-template-close"
								onClick={() => setModalPlantillasReporte(false)}
								aria-label="Cerrar selector de plantillas">
								×
							</button>
						</div>

						<div className="vd-template-tabs" role="tablist" aria-label="Tipo de plantilla">
							<button
								type="button"
								className={plantillaReporteTab === "organizacion" ? "activo" : ""}
								onClick={() => setPlantillaReporteTab("organizacion")}
								role="tab"
								aria-selected={plantillaReporteTab === "organizacion"}>
								<span className="vd-template-tab-icon" aria-hidden="true">
									▦
								</span>
								Organización
								<strong>{cantidadPlantillasOrganizacion}</strong>
							</button>
							<button
								type="button"
								className={plantillaReporteTab === "privado" ? "activo" : ""}
								onClick={() => setPlantillaReporteTab("privado")}
								role="tab"
								aria-selected={plantillaReporteTab === "privado"}>
								<span className="vd-template-tab-icon" aria-hidden="true">
									▣
								</span>
								Privado
								<strong>{cantidadPlantillasPrivadas}</strong>
							</button>
						</div>

						<div className="vd-template-toolbar">
							<span>Plantillas</span>
							<label className="vd-template-search">
								<span className="vd-template-search-icon" aria-hidden="true">
									⌕
								</span>
								<input
									type="search"
									value={plantillaReporteBusqueda}
									onChange={(event) => setPlantillaReporteBusqueda(event.target.value)}
									placeholder="Buscar"
									aria-label="Buscar plantilla"
								/>
							</label>
						</div>

						<div className="vd-template-list">
							{plantillasReporteLoading ? (
								<div className="vd-template-empty">Cargando plantillas...</div>
							) : plantillasReporteFiltradas.length === 0 ? (
								<div className="vd-template-empty">
									No hay plantillas {plantillaReporteTab === "privado" ? "privadas" : "de organización"}.
								</div>
							) : (
								plantillasReporteFiltradas.map((plantilla) => (
									<button
										key={plantilla.id}
										type="button"
										className="vd-template-row"
										onClick={() => aplicarPlantillaSubida(plantilla)}>
										<span className="vd-template-file-icon" aria-hidden="true">
											{plantilla.mime_type?.startsWith("image/") ? (
												<svg viewBox="0 0 24 24" fill="none">
													<path
														d="M4 5h16v14H4V5Z"
														stroke="currentColor"
														strokeWidth="1.8"
													/>
													<path
														d="m5 17 5-5 3 3 2-2 4 4"
														stroke="currentColor"
														strokeWidth="1.8"
														strokeLinecap="round"
														strokeLinejoin="round"
													/>
													<circle cx="15.5" cy="9" r="1.4" fill="currentColor" />
												</svg>
											) : (
												<svg viewBox="0 0 24 24" fill="none">
													<path
														d="M7 3h7l4 4v14H7V3Z"
														fill="currentColor"
														opacity="0.95"
													/>
													<path d="M14 3v5h5" stroke="#06111d" strokeWidth="1.5" />
												</svg>
											)}
										</span>
										<span className="vd-template-row-main">
											<strong>{plantilla.nombre}</strong>
											<small>{plantilla.descripcion || plantilla.categoria || "Sin descripcion"}</small>
										</span>
										<span className="vd-template-date">
											{plantilla.created_at
												? new Date(plantilla.created_at).toLocaleString("es-MX", {
														day: "2-digit",
														month: "2-digit",
														year: "numeric",
														hour: "numeric",
														minute: "2-digit",
													})
												: "Sin fecha"}
										</span>
									</button>
								))
							)}
						</div>
					</div>
				</div>
			)}

			{/* ── MODAL FICHA CLÍNICA (botón Info) ────────────────────────────────── */}
			{modalInfo && (
				<div className="vd-modal-overlay" onClick={() => setModalInfo(false)}>
					<div
						className="vd-modal-box vd-modal-ficha"
						onClick={(e) => e.stopPropagation()}>
						<div className="vd-modal-header">
							<div>
								<span className="vd-modal-titulo">Ficha clínica</span>
								<p className="vd-modal-subtitulo">
									Información del paciente y del estudio.
								</p>
							</div>
							<button className="vd-modal-close" onClick={() => setModalInfo(false)}>
								✕
							</button>
						</div>
						<div className="vd-ficha-body">
							{fichaLoading ? (
								<div className="vd-modal-body">
									<span className="vd-modal-cargando">Cargando…</span>
								</div>
							) : (
								<>
									{/* ── Información del paciente ── */}
									<div className="vd-ficha-seccion">
										<button
											className="vd-ficha-seccion-hdr"
											onClick={() => toggleFichaSeccion("paciente")}>
											<span>Información del paciente</span>
											<span className="vd-ficha-chevron">
												{fichaSeccion.paciente ? "∧" : "∨"}
											</span>
										</button>
										{fichaSeccion.paciente && (
											<div className="vd-ficha-grid">
												<div className="vd-ficha-row">
													<label>Id del paciente</label>
													<input
														className="vd-ficha-input"
														readOnly
														value={fichaData?.paciente?.id_paciente || "—"}
													/>
												</div>
												<div className="vd-ficha-row">
													<label>Nombre del paciente</label>
													<input
														className="vd-ficha-input"
														value={fichaData?.paciente?.nombre || ""}
														onChange={(e) =>
															setFichaData((d) => ({
																...d,
																paciente: { ...d.paciente, nombre: e.target.value },
															}))
														}
													/>
												</div>
												<div className="vd-ficha-row">
													<label>Apellido del paciente</label>
													<input
														className="vd-ficha-input"
														value={fichaData?.paciente?.apellido || ""}
														onChange={(e) =>
															setFichaData((d) => ({
																...d,
																paciente: {
																	...d.paciente,
																	apellido: e.target.value,
																},
															}))
														}
													/>
												</div>
												<div className="vd-ficha-row">
													<label>Edad</label>
													<input
														className="vd-ficha-input"
														readOnly
														value={
															fichaData?.paciente?.fecha_nacimiento
																? (() => {
																		const d = new Date(
																			fichaData.paciente.fecha_nacimiento,
																		);
																		return (
																			Math.floor((Date.now() - d) / 31557600000) +
																			"Y"
																		);
																	})()
																: "—"
														}
													/>
												</div>
												<div className="vd-ficha-row">
													<label>Fecha de nacimiento</label>
													<input
														className="vd-ficha-input"
														type="date"
														value={
															fichaData?.paciente?.fecha_nacimiento?.split("T")[0] ||
															""
														}
														onChange={(e) =>
															setFichaData((d) => ({
																...d,
																paciente: {
																	...d.paciente,
																	fecha_nacimiento: e.target.value,
																},
															}))
														}
													/>
												</div>
												<div className="vd-ficha-row">
													<label>Número de teléfono</label>
													<input
														className="vd-ficha-input"
														value={fichaData?.paciente?.telefono || ""}
														onChange={(e) =>
															setFichaData((d) => ({
																...d,
																paciente: {
																	...d.paciente,
																	telefono: normalizarTelefono10(e.target.value),
																},
															}))
														}
														maxLength="10"
														inputMode="numeric"
													/>
												</div>
												<div className="vd-ficha-row">
													<label>Género</label>
													<select
														className="vd-ficha-input"
														value={fichaData?.paciente?.genero || ""}
														onChange={(e) =>
															setFichaData((d) => ({
																...d,
																paciente: { ...d.paciente, genero: e.target.value },
															}))
														}>
														<option value="">Seleccionar</option>
														<option value="Masculino">Masculino</option>
														<option value="Femenino">Femenino</option>
														<option value="Otro">Otro</option>
													</select>
												</div>
												<div className="vd-ficha-row">
													<label>Email</label>
													<input
														className="vd-ficha-input"
														type="email"
														value={fichaData?.paciente?.email || ""}
														onChange={(e) =>
															setFichaData((d) => ({
																...d,
																paciente: { ...d.paciente, email: e.target.value },
															}))
														}
													/>
												</div>
												<div className="vd-ficha-footer">
													<button
														className="vd-modal-btn-cancel"
														onClick={() => abrirModalInfo()}>
														Reiniciar
													</button>
													<button
														className="vd-modal-btn-ok"
														onClick={guardarFichaPaciente}>
														Guardar
													</button>
												</div>
											</div>
										)}
									</div>

									{/* ── Historial del paciente ── */}
									<div className="vd-ficha-seccion">
										<button
											className="vd-ficha-seccion-hdr"
											onClick={() => toggleFichaSeccion("historial")}>
											<span>Historial del paciente</span>
											<span className="vd-ficha-chevron">
												{fichaSeccion.historial ? "∧" : "∨"}
											</span>
										</button>
										{fichaSeccion.historial && (
											<div className="vd-ficha-tabla-wrap">
												{fichaData?.historial?.length === 0 ? (
													<p className="vd-ficha-empty">
														Actualmente no hay estudios relacionados con el ID de
														paciente ingresado
													</p>
												) : (
													<table className="vd-ficha-tabla">
														<thead>
															<tr>
																<th>MOD</th>
																<th>DESCRIPCION</th>
																<th>FECHA</th>
															</tr>
														</thead>
														<tbody>
															{fichaData?.historial?.map((h) => (
																<tr key={h.id_estudio}>
																	<td>{h.tipo_estudio || "—"}</td>
																	<td>{h.descripcion || "—"}</td>
																	<td>
																		{h.fecha_estudio
																			? new Date(h.fecha_estudio).toLocaleDateString(
																					"es-MX",
																				)
																			: "—"}
																	</td>
																</tr>
															))}
														</tbody>
													</table>
												)}
											</div>
										)}
									</div>

									{/* ── Información del estudio ── */}
									<div className="vd-ficha-seccion">
										<button
											className="vd-ficha-seccion-hdr"
											onClick={() => toggleFichaSeccion("estudio")}>
											<span>Informacion del estudio</span>
											<span className="vd-ficha-chevron">
												{fichaSeccion.estudio ? "∧" : "∨"}
											</span>
										</button>
										{fichaSeccion.estudio && (
											<div className="vd-ficha-grid">
												<div className="vd-ficha-row">
													<label>Fecha</label>
													<input
														className="vd-ficha-input"
														readOnly
														value={
															fichaData?.est?.fecha_estudio
																? new Date(
																		fichaData.est.fecha_estudio,
																	).toLocaleString("es-MX", {
																		dateStyle: "long",
																		timeStyle: "short",
																	})
																: "—"
														}
													/>
												</div>
												<div className="vd-ficha-row">
													<label>Descripción del Estudio</label>
													<input
														className="vd-ficha-input"
														value={fichaData?.est?.descripcion || ""}
														onChange={(e) =>
															setFichaData((d) => ({
																...d,
																est: { ...d.est, descripcion: e.target.value },
															}))
														}
													/>
												</div>
												<div className="vd-ficha-row">
													<label>Doctor:</label>
													<input
														className="vd-ficha-input"
														readOnly
														value={empleadoData?.nombre || "—"}
													/>
												</div>
												<div className="vd-ficha-footer">
													<button
														className="vd-modal-btn-cancel"
														onClick={() => abrirModalInfo()}>
														Reiniciar
													</button>
													<button
														className="vd-modal-btn-ok"
														onClick={guardarInfoEstudio}>
														Guardar
													</button>
												</div>
											</div>
										)}
									</div>

									{/* ── Técnico asignado ── */}
									<div className="vd-ficha-seccion">
										<button
											className="vd-ficha-seccion-hdr"
											onClick={() => toggleFichaSeccion("tecnico")}>
											<span>Técnico asignado</span>
											<span className="vd-ficha-chevron">
												{fichaSeccion.tecnico ? "∧" : "∨"}
											</span>
										</button>
										{fichaSeccion.tecnico && (
											<div className="vd-ficha-grid">
												<div className="vd-ficha-row">
													<label></label>
													<select
														className="vd-ficha-input"
														value={tecnicoSeleccionado || ""}
														onChange={(e) =>
															setTecnicoSeleccionado(
																e.target.value ? Number(e.target.value) : null,
															)
														}>
														<option value="">Seleccionar técnico radiólogo</option>
														{tecnicosLista.map((t) => (
															<option key={t.id_empleado} value={t.id_empleado}>
																{t.nombre}
															</option>
														))}
													</select>
												</div>
												<div className="vd-ficha-footer vd-ficha-footer--right">
													<button
														className="vd-modal-btn-ok"
														onClick={asignarTecnicoInfo}>
														Asignar Estudio
													</button>
												</div>
											</div>
										)}
									</div>

									{/* ── Solicitud del estudio ── */}
									<div className="vd-ficha-seccion">
										<button
											className="vd-ficha-seccion-hdr"
											onClick={() => toggleFichaSeccion("solicitud")}>
											<span>Solicitud del estudio</span>
											<span className="vd-ficha-chevron">
												{fichaSeccion.solicitud ? "∧" : "∨"}
											</span>
										</button>
										{fichaSeccion.solicitud && (
											<div className="vd-ficha-solicitud">
												{fichaData?.est?.solicitud_url ? (
													<img
														src={fichaData.est.solicitud_url}
														alt="Solicitud"
														className="vd-ficha-solicitud-img"
													/>
												) : (
													<label className="vd-ficha-dropzone">
														<input
															type="file"
															accept="image/*"
															style={{ display: "none" }}
															onChange={(e) => setSolicitudFile(e.target.files[0])}
														/>
														<span className="vd-ficha-cloud">☁</span>
														<span>
															<u>Seleccione</u> un archivo o arrastre aquí su foto.
														</span>
													</label>
												)}
												{solicitudFile && (
													<p className="vd-ficha-filename">{solicitudFile.name}</p>
												)}
											</div>
										)}
									</div>

									{/* ── Comentarios ── */}
									<div className="vd-ficha-seccion">
										<button
											className="vd-ficha-seccion-hdr"
											onClick={() => toggleFichaSeccion("comentariosInfo")}>
											<span>Comentarios</span>
											<span className="vd-ficha-chevron">
												{fichaSeccion.comentariosInfo ? "∧" : "∨"}
											</span>
										</button>
										{fichaSeccion.comentariosInfo && (
											<div className="vd-ficha-grid">
												{comentariosInfo.map((c) => (
													<div
														key={c.id}
														className="vd-coment-item vd-ficha-coment-item">
														<div className="vd-coment-avatar">
															{c.autor_iniciales || "??"}
														</div>
														<div className="vd-coment-content">
															<p className="vd-coment-texto">{c.texto}</p>
															<span className="vd-coment-meta">
																{c.autor_nombre} ·{" "}
																{new Date(c.created_at).toLocaleDateString("es-MX")}
															</span>
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
													<button
														className="vd-modal-btn-ok"
														disabled={!comentarioInfoTxt.trim()}
														onClick={agregarComentarioInfo}>
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

			{/* Modal Asignar — radiólogo / técnico / referente */}
			<ModalAsignar
				config={modalAsignar}
				onSeleccionar={(id) => setModalAsignar((m) => ({ ...m, seleccionado: id }))}
				onConfirmar={handleAsignarConfirmar}
				onCerrar={() => setModalAsignar(null)}
			/>

			{/* Modal Prioridad */}
			{modalPrioridad && (
				<div className="vd-modal-overlay" onClick={() => setModalPrioridad(null)}>
					<div className="vd-modal-box" onClick={(e) => e.stopPropagation()}>
						<div className="vd-modal-header">
							<span className="vd-modal-titulo">Cambiar prioridad del estudio</span>
							<button
								className="vd-modal-close"
								onClick={() => setModalPrioridad(null)}>
								✕
							</button>
						</div>
						<div className="vd-modal-body">
							{modalPrioridad.loading ? (
								<span className="vd-modal-cargando">Cargando…</span>
							) : (
								<label className="vd-prioridad-row">
									<span className="vd-prioridad-label">
										Este estudio es de alta prioridad
									</span>
									<button
										className={`vd-toggle ${modalPrioridad.altaPrioridad ? "on" : ""}`}
										onClick={() =>
											setModalPrioridad((m) => ({
												...m,
												altaPrioridad: !m.altaPrioridad,
											}))
										}
										aria-label="Toggle alta prioridad">
										<span className="vd-toggle-thumb" />
									</button>
								</label>
							)}
						</div>
						<div className="vd-modal-footer">
							<button
								className="vd-modal-btn-cancel"
								onClick={() => setModalPrioridad(null)}>
								Cancelar
							</button>
							<button
								className="vd-modal-btn-ok"
								disabled={modalPrioridad.loading}
								onClick={handlePrioridadConfirmar}>
								Aceptar
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Modal Comentarios */}
			{modalComentarios && (
				<div className="vd-modal-overlay" onClick={() => setModalComentarios(false)}>
					<div
						className="vd-modal-box vd-modal-comentarios"
						onClick={(e) => e.stopPropagation()}>
						<div className="vd-modal-header">
							<span className="vd-modal-titulo">Comentarios</span>
							<button
								className="vd-modal-close"
								onClick={() => setModalComentarios(false)}>
								✕
							</button>
						</div>
						<div className="vd-modal-body vd-coment-body">
							<textarea
								className="vd-coment-textarea"
								placeholder="Escribe un comentario…"
								value={comentarioTexto}
								onChange={(e) => setComentarioTexto(e.target.value)}
								rows={4}
							/>
						</div>
						<div className="vd-modal-footer">
							<button
								className="vd-modal-btn-cancel"
								onClick={() => setModalComentarios(false)}>
								Cancelar
							</button>
							<button
								className="vd-modal-btn-ok"
								disabled={!comentarioTexto.trim()}
								onClick={handleAgregarComentario}>
								Agregar un comentario
							</button>
						</div>
						{comentarios.length > 0 && (
							<div className="vd-coment-lista">
								{comentarios.map((c) => (
									<div key={c.id} className="vd-coment-item">
										<div className="vd-coment-avatar">
											{c.autor_iniciales || "??"}
										</div>
										<div className="vd-coment-content">
											{comentarioEditId === c.id ? (
												<>
													<textarea
														className="vd-coment-textarea vd-coment-textarea--edit"
														value={comentarioEditTxt}
														onChange={(e) => setComentarioEditTxt(e.target.value)}
														rows={2}
														autoFocus
													/>
													<div className="vd-coment-edit-actions">
														<button
															className="vd-modal-btn-cancel vd-coment-btn-sm"
															onClick={() => {
																setComentarioEditId(null);
																setComentarioEditTxt("");
															}}>
															Cancelar
														</button>
														<button
															className="vd-modal-btn-ok vd-coment-btn-sm"
															disabled={!comentarioEditTxt.trim()}
															onClick={() => handleEditarComentario(c.id)}>
															Actualizar comentario
														</button>
													</div>
												</>
											) : (
												<p className="vd-coment-texto">{c.texto}</p>
											)}
											<span className="vd-coment-meta">
												{c.autor_nombre}{" "}
												{new Date(c.created_at).toLocaleDateString("es-MX")}
											</span>
										</div>
										{comentarioEditId !== c.id && (
											<div className="vd-coment-actions">
												<button
													className="vd-coment-action-btn"
													title="Editar"
													onClick={() => {
														setComentarioEditId(c.id);
														setComentarioEditTxt(c.texto);
													}}>
													<img
														src={lapizIcono}
														alt="Editar"
														className="vd-coment-icon"
													/>
												</button>
												<button
													className="vd-coment-action-btn vd-coment-action-btn--del"
													title="Eliminar"
													onClick={() => setConfirmElimComentario(c.id)}>
													<img
														src={basuraIcon}
														alt="Eliminar"
														className="vd-coment-icon vd-coment-icon--del"
													/>
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

			{/* ── MODAL MÉTRICAS ────────────────────────────────────────── */}
			{modalMetricas && (
				<div className="vd-modal-overlay" onClick={() => setModalMetricas(null)}>
					<div
						className="vd-modal-box vd-modal-metricas"
						onClick={(e) => e.stopPropagation()}>
						<div className="vd-modal-header">
							<span className="vd-modal-titulo">Tiempo de reporte</span>
							<button
								className="vd-modal-close"
								onClick={() => setModalMetricas(null)}>
								✕
							</button>
						</div>
						{modalMetricas.loading ? (
							<div className="vd-modal-body">
								<span className="vd-modal-cargando">Cargando…</span>
							</div>
						) : (
							<div className="vd-metricas-body">
								{[
									{ label: "Modalidad", valor: modalMetricas.modalidad },
									{
										label: "Fecha y hora del estudio",
										valor: modalMetricas.fechaEstudio,
									},
									{
										label: "Fecha y hora del primer reporte",
										valor: modalMetricas.primerReporte,
									},
									{
										label: "Tiempo transcurrido",
										valor: modalMetricas.tiempoTranscurrido,
									},
									{
										label: "Usuario del primer reporte",
										valor: modalMetricas.usuario,
									},
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

			{/* ── MODAL ETIQUETAS ────────────────────────────────────────── */}
			{modalEtiquetas && (
				<div className="vd-modal-overlay" onClick={() => setModalEtiquetas(false)}>
					<div
						className="vd-modal-box vd-modal-etiquetas"
						onClick={(e) => e.stopPropagation()}>
						<div className="vd-modal-header">
							<span className="vd-modal-titulo">Agregar etiquetas al estudio</span>
							<button
								className="vd-modal-close"
								onClick={() => setModalEtiquetas(false)}>
								✕
							</button>
						</div>
						<div className="vd-etiq-row">
							<span className="vd-etiq-label">Etiquetas</span>
							<div
								className="vd-etiq-input-wrap"
								onClick={() => document.getElementById("vd-etiq-input").focus()}>
								{etiquetas.map((tag) => (
									<span key={tag} className="vd-etiq-chip">
										{tag}
										<button
											className="vd-etiq-chip-remove"
											onClick={() => quitarEtiqueta(tag)}>
											×
										</button>
									</span>
								))}
								<input
									id="vd-etiq-input"
									className="vd-etiq-text-input"
									value={etiquetaInput}
									placeholder={etiquetas.length === 0 ? "Escribe una etiqueta…" : ""}
									onChange={(e) => {
										setEtiquetaInput(e.target.value);
										setEtiquetaSugerencia(e.target.value.trim().length > 0);
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === ",") {
											e.preventDefault();
											agregarEtiqueta(etiquetaInput);
										}
										if (
											e.key === "Backspace" &&
											etiquetaInput === "" &&
											etiquetas.length > 0
										)
											quitarEtiqueta(etiquetas[etiquetas.length - 1]);
									}}
									autoComplete="off"
								/>
								{etiquetaSugerencia && (
									<div className="vd-etiq-dropdown">
										<div
											className="vd-etiq-dropdown-item"
											onMouseDown={() => agregarEtiqueta(etiquetaInput)}>
											Agregar: <em>&ldquo;{etiquetaInput}&rdquo;</em>
										</div>
									</div>
								)}
							</div>
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
