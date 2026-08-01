import { useEffect, useRef, useState } from "react";
import { calcularAreaImagenMpr, calcularVoiMpr, combinarPixelesMpr, crearPlanPrecargaMpr, moverIndiceMpr, obtenerIndicesInicialesMpr, obtenerIndicesSlabMpr } from "../../../utils/mpr-loader";
import { actualizarPuntoPorCorteMpr, calcularCoordenadaCorteMpr, calcularPosicionCruzMpr, calcularPuntoCentralMpr, calcularSeparacionCortesMpr, obtenerGeometriaMpr } from "../../../utils/mpr-geometry";
import "./Mpr2dViewer.css";

const vistas = [
	["mpr-axial", "Axial"],
	["mpr-sagital", "Sagital"],
	["mpr-coronal", "Coronal"],
];

export default function Mpr2dViewer({
	imageIds,
	series = [],
	seriesSeleccionadas = [],
	indicesIniciales = [],
	restaurarIndices = false,
	panelActivo,
	onPanelSeleccionado,
	onIndicesChange,
	herramientaActiva,
	resetCounter,
	grosorCorte = 0.1,
	modoReconstruccion = "MIP",
}) {
	const refs = useRef({});
	const panelRefs = useRef({});
	const cornerstoneRef = useRef(null);
	const arrastreWwwcRef = useRef(null);
	const precargasPendientesRef = useRef(new Set());
	const colaPrecargasRef = useRef([]);
	const precargasActivasRef = useRef(0);
	const geometriasCacheRef = useRef(new Map());
	const puntoAnatomicoRef = useRef(null);
	const mprInicializadoRef = useRef(false);
	const seriesInicializadasRef = useRef(false);
	const indicesRef = useRef([]);
	const navegacionRef = useRef(0);
	const ruedaRef = useRef(null);
	const [mensaje, setMensaje] = useState("Cargando imágenes…");
	const [areasImagen, setAreasImagen] = useState([null, null, null]);
	const [geometrias, setGeometrias] = useState([null, null, null]);
	const [puntoAnatomico, setPuntoAnatomico] = useState(null);
	const obtenerTotales = () => vistas.map((_, panel) => serieDe(panel).imageIds?.length || 1);
	const crearIndicesIniciales = () => {
		const totales = vistas.map((_, panel) => {
			const serie = series.find((item) => item.id === seriesSeleccionadas[panel]);
			return serie?.imageIds?.length || imageIds.length || 1;
		});
		const centrales = obtenerIndicesInicialesMpr(totales);
		return restaurarIndices && indicesIniciales.length === vistas.length
			? indicesIniciales.map((indice, panel) => Math.max(0, Math.min(totales[panel] - 1, Number(indice) || 0)))
			: centrales;
	};
	const [indices, setIndices] = useState(crearIndicesIniciales);
	indicesRef.current = indices;
	const serieDe = (indice) =>
		series.find((serie) => serie.id === seriesSeleccionadas[indice]) || {
			imageIds,
			imagenes: [],
		};
	const cargarGeometria = async (cornerstone, imageId) => {
		if (geometriasCacheRef.current.has(imageId)) return geometriasCacheRef.current.get(imageId);
		const imagen = await cornerstone.loadAndCacheImage(imageId);
		const geometria = obtenerGeometriaMpr(imagen);
		geometriasCacheRef.current.set(imageId, geometria);
		return geometria;
	};
	const buscarIndicePorPunto = async (cornerstone, serie, punto) => {
		const ids = serie.imageIds || [];
		const central = Math.floor(Math.max(0, ids.length - 1) / 2);
		if (ids.length < 2 || !punto) return central;
		try {
			const [primero, ultimo] = await Promise.all([
				cargarGeometria(cornerstone, ids[0]),
				cargarGeometria(cornerstone, ids[ids.length - 1]),
			]);
			if (!primero || !ultimo) return central;
			const objetivo = calcularCoordenadaCorteMpr(primero, punto);
			const inicio = calcularCoordenadaCorteMpr(primero, primero.posicion);
			const fin = calcularCoordenadaCorteMpr(primero, ultimo.posicion);
			if (!Number.isFinite(objetivo) || !Number.isFinite(inicio) || !Number.isFinite(fin) || Math.abs(fin - inicio) < 0.0001) return central;
			const ascendente = inicio <= fin;
			let bajo = 0, alto = ids.length - 1, mejor = central, distanciaMejor = Infinity;
			while (bajo <= alto) {
				const medio = Math.floor((bajo + alto) / 2);
				const geometria = await cargarGeometria(cornerstone, ids[medio]);
				// Sin coordenadas fiables nunca se selecciona un extremo por accidente.
				if (!geometria) return central;
				const valor = calcularCoordenadaCorteMpr(primero, geometria.posicion);
				if (!Number.isFinite(valor)) return central;
				const distancia = Math.abs(valor - objetivo);
				if (distancia < distanciaMejor) { mejor = medio; distanciaMejor = distancia; }
				if ((valor < objetivo) === ascendente) bajo = medio + 1;
				else alto = medio - 1;
			}
			return mejor;
		} catch {
			return central;
		}
	};
	const alinearIndicesPorPunto = async (cornerstone, punto, indiceAxial) => {
		const centrales = obtenerIndicesInicialesMpr(obtenerTotales());
		const [sagital, coronal] = await Promise.all([
			buscarIndicePorPunto(cornerstone, serieDe(1), punto),
			buscarIndicePorPunto(cornerstone, serieDe(2), punto),
		]);
		return [indiceAxial, sagital ?? centrales[1], coronal ?? centrales[2]];
	};
	const precargarSerie = (cornerstone, ids, indice) => {
		const cola = crearPlanPrecargaMpr(ids, indice).filter(
			(imageId) => !precargasPendientesRef.current.has(imageId),
		);
		cola.forEach((imageId) => precargasPendientesRef.current.add(imageId));
		colaPrecargasRef.current.push(...cola);
		const procesarCola = () => {
			while (precargasActivasRef.current < 3 && colaPrecargasRef.current.length) {
				const imageId = colaPrecargasRef.current.shift();
				precargasActivasRef.current += 1;
				cornerstone.loadAndCacheImage(imageId)
					.catch(() => {})
					.finally(() => {
						precargasActivasRef.current -= 1;
						procesarCola();
					});
			}
		};
		procesarCola();
	};
	const obtenerSeparacionCorte = async (cornerstone, imageIds, indice, imagenCentral) => {
		const vecinoIndice = indice < imageIds.length - 1 ? indice + 1 : indice - 1;
		if (vecinoIndice >= 0) {
			try {
				const [geometriaCentral, geometriaVecina] = await Promise.all([
					cargarGeometria(cornerstone, imageIds[indice]),
					cargarGeometria(cornerstone, imageIds[vecinoIndice]),
				]);
				const separacionFisica = calcularSeparacionCortesMpr([geometriaCentral, geometriaVecina]);
				if (separacionFisica) return separacionFisica;
			} catch {}
		}
		const dataSet = imagenCentral?.data?.dataSet || imagenCentral?.data;
		const valor = Number(dataSet?.string?.("x00180088") || dataSet?.string?.("x00180050"));
		return Number.isFinite(valor) && valor > 0 ? valor : 1;
	};
	const crearImagenSlab = async (cornerstone, serie, indice) => {
		const imageIds = serie.imageIds || [];
		const imagenCentral = await cornerstone.loadAndCacheImage(imageIds[indice]);
		const separacionCorte = await obtenerSeparacionCorte(cornerstone, imageIds, indice, imagenCentral);
		const indicesSlab = obtenerIndicesSlabMpr(
			imageIds.length,
			indice,
			grosorCorte,
			separacionCorte,
		);
		if (indicesSlab.length === 1) return imagenCentral;
		const imagenes = await Promise.all(indicesSlab.map((indiceSlab) => cornerstone.loadAndCacheImage(imageIds[indiceSlab])));
		const pixelData = combinarPixelesMpr(imagenes.map((imagen) => imagen.getPixelData()), modoReconstruccion);
		let minPixelValue = Infinity;
		let maxPixelValue = -Infinity;
		pixelData.forEach((valor) => {
			minPixelValue = Math.min(minPixelValue, valor);
			maxPixelValue = Math.max(maxPixelValue, valor);
		});
		return {
			...imagenCentral,
			imageId: `${imagenCentral.imageId}:slab:${grosorCorte}:${modoReconstruccion}:${indice}`,
			minPixelValue,
			maxPixelValue,
			getPixelData: () => pixelData,
		};
	};

	useEffect(() => {
		mprInicializadoRef.current = false;
		puntoAnatomicoRef.current = null;
		setPuntoAnatomico(null);
		const seriesListas =
			seriesSeleccionadas.length === vistas.length &&
			seriesSeleccionadas.every((id) => series.some((serie) => serie.id === id));
		if (!seriesListas) return;
		if (!restaurarIndices && !seriesInicializadasRef.current) {
			const iniciales = obtenerIndicesInicialesMpr(obtenerTotales());
			seriesInicializadasRef.current = true;
			indicesRef.current = iniciales;
			setIndices(iniciales);
			onIndicesChange?.(iniciales);
			return;
		}
		setIndices((actual) =>
			actual.map((indice, panel) =>
				Math.min(indice, Math.max(0, (serieDe(panel).imageIds?.length || 1) - 1)),
			),
		);
	}, [seriesSeleccionadas]);

	useEffect(() => {
		let cancelado = false;
		const cargar = async () => {
			try {
				const module = await import("cornerstone-core");
				const cornerstone = module.default || module;
				cornerstoneRef.current = cornerstone;
				const resultados = await Promise.all(
					vistas.map(async ([id], panel) => {
						const elemento = refs.current[id];
						const serie = serieDe(panel);
						const imageId = serie.imageIds?.[indices[panel]] || imageIds[0];
						if (!elemento || !imageId) return;
						try { cornerstone.enable(elemento); } catch {}
						const imagen = await crearImagenSlab(cornerstone, serie, indices[panel]);
						if (cancelado) return;
						cornerstone.displayImage(elemento, imagen);
						try { cornerstone.reset(elemento); } catch {}
						cornerstone.resize(elemento, true);
						setAreasImagen((actual) => {
							const siguiente = [...actual];
							siguiente[panel] = calcularAreaImagenMpr(
								{ width: elemento.clientWidth, height: elemento.clientHeight },
								imagen,
							);
							return siguiente;
						});
						precargarSerie(cornerstone, serie.imageIds || [], indices[panel]);
						return { panel, serie, geometria: obtenerGeometriaMpr(imagen) };
					}),
				);
				if (!cancelado) {
					setGeometrias(resultados.map((resultado) => resultado?.geometria || null));
					const base = resultados[0]?.geometria;
					if (!mprInicializadoRef.current && base) {
						mprInicializadoRef.current = true;
						const punto = calcularPuntoCentralMpr(base);
						puntoAnatomicoRef.current = punto;
						setPuntoAnatomico(punto);
						if (!restaurarIndices) {
							const alineados = await alinearIndicesPorPunto(cornerstone, punto, indicesRef.current[0]);
							if (!cancelado && alineados.some((indice, panel) => indice !== indicesRef.current[panel])) {
								indicesRef.current = alineados;
								setIndices(alineados);
								onIndicesChange?.(alineados);
							}
						}
					}
				}
				if (!cancelado) setMensaje("");
			} catch (error) {
				if (!cancelado) setMensaje("No fue posible cargar las series para MPR.");
			}
		};
		cargar();
		return () => { cancelado = true; };
	}, [imageIds, series, seriesSeleccionadas, indices, grosorCorte, modoReconstruccion]);

	useEffect(() => {
		if (!resetCounter || !cornerstoneRef.current) return;
		const iniciales = obtenerIndicesInicialesMpr(obtenerTotales());
		indicesRef.current = iniciales;
		setIndices(iniciales);
		onIndicesChange?.(iniciales);
		const imageIdInicial = serieDe(0).imageIds?.[iniciales[0]];
		if (imageIdInicial) cargarGeometria(cornerstoneRef.current, imageIdInicial).then((geometria) => {
			if (!geometria) return;
			const punto = calcularPuntoCentralMpr(geometria);
			puntoAnatomicoRef.current = punto;
			setPuntoAnatomico(punto);
		}).catch(() => {});
		vistas.forEach(([id]) => {
			const elemento = refs.current[id];
			if (!elemento) return;
			try {
				cornerstoneRef.current.reset(elemento);
				cornerstoneRef.current.updateImage(elemento);
			} catch {}
		});
	}, [resetCounter]);

	const rueda = (event, panel) => {
		event.preventDefault();
		event.stopPropagation();
		const totales = vistas.map((_, indice) => serieDe(indice).imageIds?.length || 1);
		const siguiente = moverIndiceMpr(indicesRef.current, totales, panel, event.deltaY > 0 ? 1 : -1);
		if (siguiente[panel] === indicesRef.current[panel]) return;
		indicesRef.current = siguiente;
		const solicitud = ++navegacionRef.current;
		const cornerstone = cornerstoneRef.current;
		const imageId = serieDe(panel).imageIds?.[siguiente[panel]];
		if (!cornerstone || !imageId) { setIndices(siguiente); onIndicesChange?.(siguiente); return; }
		cargarGeometria(cornerstone, imageId).then((geometria) => {
			if (solicitud !== navegacionRef.current) return;
			const puntoBase = puntoAnatomicoRef.current || (geometrias[panel] && calcularPuntoCentralMpr(geometrias[panel]));
			if (geometria && puntoBase) {
				const punto = actualizarPuntoPorCorteMpr(puntoBase, geometria);
				puntoAnatomicoRef.current = punto;
				setPuntoAnatomico(punto);
			}
			setIndices(siguiente);
			onIndicesChange?.(siguiente);
		}).catch(() => { setIndices(siguiente); onIndicesChange?.(siguiente); });
	};
	useEffect(() => { ruedaRef.current = rueda; });
	useEffect(() => {
		const listeners = vistas.map(([id], panel) => {
			const elemento = panelRefs.current[id];
			if (!elemento) return null;
			const manejarWheel = (event) => ruedaRef.current?.(event, panel);
			elemento.addEventListener("wheel", manejarWheel, { passive: false });
			return () => elemento.removeEventListener("wheel", manejarWheel);
		});
		return () => listeners.forEach((remover) => remover?.());
	}, [seriesSeleccionadas]);
	const iniciarWwwc = (event, panel) => {
		if (herramientaActiva !== "Wwwc" || event.button !== 0) return;
		const cornerstone = cornerstoneRef.current;
		const elemento = refs.current[vistas[panel][0]];
		if (!cornerstone || !elemento) return;
		try {
			arrastreWwwcRef.current = {
				x: event.clientX,
				y: event.clientY,
				voi: cornerstone.getViewport(elemento)?.voi,
			};
			event.preventDefault();
		} catch {}
	};
	const moverWwwc = (event) => {
		const arrastre = arrastreWwwcRef.current;
		const cornerstone = cornerstoneRef.current;
		if (!arrastre || !cornerstone) return;
		const voi = calcularVoiMpr(arrastre.voi, event.clientX - arrastre.x, event.clientY - arrastre.y);
		vistas.forEach(([id]) => {
			const elemento = refs.current[id];
			if (!elemento) return;
			try {
				const viewport = cornerstone.getViewport(elemento);
				cornerstone.setViewport(elemento, { ...viewport, voi });
				cornerstone.updateImage(elemento);
			} catch {}
		});
	};
	const terminarWwwc = () => { arrastreWwwcRef.current = null; };

	return (
		<section className="mpr2d">
			{mensaje && <div className="mpr2d-msg">{mensaje}</div>}
			<div className="mpr2d-grid">
				{vistas.map(([id, etiqueta], panel) => {
					const serie = serieDe(panel);
					const imagen = serie.imagenes?.[indices[panel]] || {};
					const progreso = (indice) => {
						const total = serieDe(indice).imageIds?.length || 1;
						return total > 1 ? (indices[indice] / (total - 1)) * 100 : 50;
					};
					const cruzProporcional = panel === 0
						? { x: progreso(2), y: progreso(1) }
						: panel === 1
							? { x: progreso(2), y: progreso(0) }
							: { x: progreso(1), y: progreso(0) };
					const cruz = calcularPosicionCruzMpr(geometrias[panel], puntoAnatomico) || cruzProporcional;
					const area = areasImagen[panel];
					return (
						<button type="button" key={id} ref={(elemento) => { panelRefs.current[id] = elemento; }} className={`mpr2d-panel ${panelActivo === panel ? "activo" : ""}`} onClick={() => onPanelSeleccionado(panel)} onMouseDown={(event) => iniciarWwwc(event, panel)} onMouseMove={moverWwwc} onMouseUp={terminarWwwc} onMouseLeave={terminarWwwc}>
							<b>{etiqueta}</b>
							<div className="mpr2d-paciente">{serie.label || "Serie"}<small>Ser: {series.findIndex((item) => item.id === serie.id) + 1} · Img: {indices[panel] + 1}/{serie.imageIds?.length || 1}</small></div>
							<div className="mpr2d-canvas" ref={(elemento) => { refs.current[id] = elemento; }} />
							<div className="mpr2d-cruz" aria-hidden="true" style={{
								left: `${area?.left || 0}px`, top: `${area?.top || 0}px`, width: `${area?.width || 0}px`, height: `${area?.height || 0}px`,
								"--mpr-cruz-x": `${cruz.x}%`, "--mpr-cruz-y": `${cruz.y}%`,
							}} />
							<div className="mpr2d-datos">{imagen.rows && `${imagen.columns} × ${imagen.rows}`}<br />W/L: automático</div>
						</button>
					);
				})}
			</div>
		</section>
	);
}
