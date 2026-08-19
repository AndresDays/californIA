import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../../context/auth-context";
import { esRadiologoClinicoPermisos } from "../../../utils/role-permissions";
import {
	htmlReporteRadiologiaParaEditor,
	normalizarHtmlReporteRadiologia,
} from "../../../utils/reporte-radiologia-html";
import { crearUrlPortalResultados, crearUrlVisorPaciente } from "../../../utils/portal-resultados";
import {
	ALTURA_UTIL_REPORTE_CON_FIRMA,
	ALTURA_UTIL_REPORTE_SIN_FIRMA,
	agruparConclusionReporte,
	elegirEscalaUnaHoja,
	crearBloquesReporteParaImprimir,
	dividirReporteParaImpresion,
	medirBloquesReporte,
	omitirPaginasVacias,
} from "../../../utils/reporte-radiologia-paginado";
import imprimirIcon from "../../../assets/imprimirIcono.png";
import { MEMBRETE_FALLBACK, cargarMembreteCdc } from "../../../utils/membrete-cdc";
import "./ReporteRadiologia.css";

let _supabase = null;
const getSupabase = () => {
	if (!_supabase) {
		_supabase = createClient(
			import.meta.env.VITE_SUPABASE_URL,
			import.meta.env.VITE_SUPABASE_ANON_KEY,
		);
	}
	return _supabase;
};

const PLANTILLAS = [
	{ label: "Plantilla vacía", contenido: "" },
	{
		label: "Tórax PA normal",
		contenido:
			"TÉCNICA: Radiografía de tórax en proyección posteroanterior.\n\nHALLAZGOS:\nÍndice cardiotorácico dentro de límites normales. Silueta cardíaca de morfología y tamaño normales. Campos pulmonares sin opacidades, consolidaciones ni infiltrados. Senos costofrénicos libres. Diafragmas de posición y morfología normales. Estructuras mediastínicas sin alteraciones.\n\nCONCLUSIÓN:\nEstudio de tórax dentro de parámetros normales para la edad del paciente.",
	},
	{
		label: "Cardiomegalia leve",
		contenido:
			"TÉCNICA: Radiografía de tórax en proyección posteroanterior.\n\nHALLAZGOS:\nÍndice cardiotorácico aumentado, compatible con cardiomegalia leve (ICT: ~0.55). Campos pulmonares sin opacidades ni derrame pleural evidente. Senos costofrénicos libres. Diafragmas de posición habitual.\n\nCONCLUSIÓN:\nCardiomegalia leve. Se recomienda correlación clínica y seguimiento ecocardiográfico.",
	},
	{
		label: "Derrame pleural",
		contenido:
			"TÉCNICA: Radiografía de tórax en proyección posteroanterior.\n\nHALLAZGOS:\nOpacidad homogénea en la base del hemitórax [derecho/izquierdo] con borramiento del seno costofrénico correspondiente, compatible con derrame pleural de volumen [leve/moderado]. El resto de los campos pulmonares sin alteraciones significativas.\n\nCONCLUSIÓN:\nDerrame pleural [derecho/izquierdo] de volumen [leve/moderado]. Se sugiere correlación clínica.",
	},
];

const AJUSTE_FIRMA_POR_DEFECTO = { firmaX: 0, firmaY: 0, firmaEscala: 1.18, datosX: 0, datosY: 0, datosEscala: 1 };

const leerAjusteFirma = (valor) => {
	try {
		const ajuste = typeof valor === "string" ? JSON.parse(valor) : valor;
		return Object.fromEntries(
			Object.entries(AJUSTE_FIRMA_POR_DEFECTO).map(([campo, predeterminado]) => [
				campo,
				Number.isFinite(Number(ajuste?.[campo])) ? Number(ajuste[campo]) : predeterminado,
			]),
		);
	} catch {
		return AJUSTE_FIRMA_POR_DEFECTO;
	}
};

const ToolBtn = ({ title, icon, cmd, arg, editorRef, onAction }) => {
	const handleClick = () => {
		if (onAction) {
			onAction();
			return;
		}
		editorRef.current?.focus();
		document.execCommand(cmd, false, arg ?? null);
	};
	return (
		<button
			className="rr-tool"
			title={title}
			onMouseDown={(e) => {
				e.preventDefault();
				handleClick();
			}}>
			{icon}
		</button>
	);
};

const Separator = () => <div className="rr-tool-sep" />;

const ReporteRadiologia = () => {
	const [searchParams] = useSearchParams();
	const { empleadoData } = useAuth();
	const editorRef = useRef(null);

	const reporteInicial = htmlReporteRadiologiaParaEditor(searchParams.get("reporte") || "");
	const radiologo = searchParams.get("radiologo") || "";
	const cedula = searchParams.get("cedula") || "";
	const especialidad = searchParams.get("especialidad") || "";
	const firmaUrl = searchParams.get("firmaUrl") || "";
	const idEstudio = searchParams.get("idEstudio") || "";
	const folio = searchParams.get("folio") || "";
	const telefono = searchParams.get("telefono") || "";
	const imprimirAlAbrir = searchParams.get("imprimir") === "1";

	const [plantillaActual, setPlantillaActual] = useState("Plantillas");
	const [guardando, setGuardando] = useState(false);
	const [notif, setNotif] = useState(null);
	const [qrUrl, setQrUrl] = useState("");
	const [membreteSrc, setMembreteSrc] = useState(MEMBRETE_FALLBACK);
	const [membreteListo, setMembreteListo] = useState(false);
	const [reporteParaImprimir, setReporteParaImprimir] = useState(reporteInicial);
	const arrastreFirmaRef = useRef(null);
	const [ajusteFirma, setAjusteFirma] = useState(() => leerAjusteFirma(searchParams.get("ajusteFirma")));

	useEffect(() => {
		const generarQr = async () => {
			try {
				const qrData = idEstudio
					? crearUrlVisorPaciente({ idEstudio, folio, telefono })
					: crearUrlPortalResultados({ folio, telefono });
				const dataUrl = await QRCode.toDataURL(qrData, {
					margin: 1,
					width: 132,
					color: {
						dark: "#111111",
						light: "#ffffff",
					},
				});
				setQrUrl(dataUrl);
			} catch {
				setQrUrl("");
			}
		};

		generarQr();
	}, [folio, idEstudio, telefono]);

	const firmaNombre = radiologo || "Radiólogo responsable";
	const firmaEspecialidad = especialidad || "Radiología e Imagen";
	const renderFirma = () => (
		<div className="rr-firma-area">
			<div className="rr-firma-elemento" onPointerDown={iniciarArrastre("firma")} onPointerMove={moverArrastre} onPointerUp={terminarArrastre} style={{ left: `calc(50% - 160px + ${ajusteFirma.firmaX}px)`, top: `${28 + ajusteFirma.firmaY}px`, transform: `scale(${ajusteFirma.firmaEscala})` }}>
				{firmaUrl ? (
					<img className="rr-firma-img" src={firmaUrl} alt="firma" />
				) : (
					<div className="rr-firma-placeholder" />
				)}
			</div>
			<div className="rr-firma-datos-elemento" onPointerDown={iniciarArrastre("datos")} onPointerMove={moverArrastre} onPointerUp={terminarArrastre} style={{ left: `calc(50% - 165px + ${ajusteFirma.datosX}px)`, top: `${154 + ajusteFirma.datosY}px`, transform: `scale(${ajusteFirma.datosEscala})` }}>
				<p className="rr-firma-nombre">{firmaNombre}</p>
				{firmaEspecialidad && (
					<p className="rr-firma-dato">{firmaEspecialidad.toUpperCase()}</p>
				)}
				{cedula && <p className="rr-firma-dato">CE {cedula}</p>}
			</div>
			{qrUrl && <img className="rr-qr" src={qrUrl} alt="Código QR del reporte" />}
		</div>
	);

	const iniciarArrastre = (bloque) => (event) => {
		arrastreFirmaRef.current = { bloque, x: event.clientX, y: event.clientY, origenX: ajusteFirma[`${bloque}X`], origenY: ajusteFirma[`${bloque}Y`] };
	};
	const moverArrastre = (event) => {
		const arrastre = arrastreFirmaRef.current;
		if (arrastre) setAjusteFirma((actual) => ({ ...actual, [`${arrastre.bloque}X`]: arrastre.origenX + event.clientX - arrastre.x, [`${arrastre.bloque}Y`]: arrastre.origenY + event.clientY - arrastre.y }));
	};
	const terminarArrastre = () => { arrastreFirmaRef.current = null; };

	useEffect(() => {
		document.title = `Reporte ${idEstudio}`;
		if (editorRef.current && reporteInicial) {
			editorRef.current.innerHTML = reporteInicial;
		}
	}, []);

	useEffect(() => {
		let cancelado = false;
		cargarMembreteCdc().then((src) => {
			if (cancelado) return;
			setMembreteSrc(src);
			setMembreteListo(true);
		});
		return () => {
			cancelado = true;
		};
	}, []);

	const showNotif = (msg, tipo = "ok") => {
		setNotif({ msg, tipo });
		setTimeout(() => setNotif(null), 2800);
	};

	const getTexto = () => editorRef.current?.innerHTML || "";

	const aplicarPlantilla = (p) => {
		if (!p.contenido && p.label === "Plantillas") return;
		if (editorRef.current) {
			editorRef.current.innerHTML = p.contenido.replace(/\n/g, "<br>");
			editorRef.current.focus();
		}
		setPlantillaActual(p.label);
	};

	const guardar = async (borrador = false) => {
		setGuardando(true);
		const texto = normalizarHtmlReporteRadiologia(editorRef.current?.innerHTML || "");
		const cliente = getSupabase();
		const { error } = esRadiologoClinicoPermisos(empleadoData?.rol)
			? await cliente.rpc("actualizar_reporte_radiologo_clinico", {
				p_id_estudio: Number(idEstudio),
				p_reporte: texto,
				p_estado: "COMPLETADO",
			})
			: await cliente
				.from("estudios_radiologia")
				.update({ reporte: texto, updated_at: new Date().toISOString() })
				.eq("id_estudio", idEstudio);
		setGuardando(false);
		if (error) showNotif("Error al guardar", "err");
		else showNotif(borrador ? "Borrador guardado" : "Reporte guardado", "ok");
	};

	const imprimir = async () => {
		if (!membreteListo) {
			showNotif("Cargando membrete para impresión", "info");
			return;
		}
		// Con la tipografía todavía sin cargar las alturas medidas salen cortas y
		// la paginación mete más texto del que cabe en la hoja.
		await document.fonts?.ready;
		// El diálogo de impresión debe abrirse cuando las hojas paginadas ya se
		// pintaron; de lo contrario el navegador imprime el DOM anterior.
		flushSync(() => {
			setReporteParaImprimir(normalizarHtmlReporteRadiologia(editorRef.current?.innerHTML || ""));
		});
		window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()));
	};

	useEffect(() => {
		if (!imprimirAlAbrir || !membreteListo) return undefined;
		const temporizador = window.setTimeout(imprimir, 0);
		return () => window.clearTimeout(temporizador);
	}, [imprimirAlAbrir, membreteListo]);

	const execFmt = (cmd, arg) => {
		editorRef.current?.focus();
		document.execCommand(cmd, false, arg ?? null);
	};

	// Si el reporte se pasa de una hoja por poco, se imprime completo en una sola
	// reduciendo un poco el texto, igual que se ve en el visor.
	const escalaUnaHoja = useMemo(
		() => elegirEscalaUnaHoja(reporteParaImprimir, ALTURA_UTIL_REPORTE_CON_FIRMA),
		[reporteParaImprimir],
	);
	const paginasImpresion = useMemo(
		() =>
			escalaUnaHoja
				? [[{ html: reporteParaImprimir, alto: 0 }]]
				: omitirPaginasVacias(
					dividirReporteParaImpresion(
						agruparConclusionReporte(
							medirBloquesReporte(crearBloquesReporteParaImprimir(reporteParaImprimir)),
							ALTURA_UTIL_REPORTE_CON_FIRMA,
						),
						ALTURA_UTIL_REPORTE_SIN_FIRMA,
						ALTURA_UTIL_REPORTE_CON_FIRMA,
					),
				),
		[reporteParaImprimir, escalaUnaHoja],
	);
	const renderPaginaImpresion = (pagina, indice) => (
		<div className="rr-page rr-print-page" key={`pagina-impresion-${indice}`}>
			<img className="rr-membrete" src={membreteSrc} alt="membrete" />
			<div className="rr-contenido rr-contenido-impresion">
				<div className="rr-editor rr-editor-impresion" style={escalaUnaHoja ? { zoom: escalaUnaHoja } : undefined}>
					{pagina.map((bloque, bloqueIndice) => (
						<div key={bloqueIndice} dangerouslySetInnerHTML={{ __html: bloque.html }} />
					))}
				</div>
				{indice === paginasImpresion.length - 1 && renderFirma()}
			</div>
		</div>
	);

	return (
		<div className="rr-root">
			<div className="rr-topbar">
				<select
					className="rr-select-plantilla"
					value={plantillaActual}
					onChange={(e) => {
						const p = PLANTILLAS.find((x) => x.label === e.target.value);
						if (p) aplicarPlantilla(p);
					}}>
					<option value="Plantillas" disabled>
						Plantillas
					</option>
					{PLANTILLAS.map((p) => (
						<option key={p.label} value={p.label}>
							{p.label}
						</option>
					))}
				</select>

				<div className="rr-topbar-actions">
					<button className="rr-btn rr-btn-outline" onClick={imprimir}>
						Cambiar editor
					</button>
					<button className="rr-btn rr-btn-cancel" onClick={() => window.close()}>
						Cancelar
					</button>
					<button
						className="rr-btn rr-btn-outline"
						onClick={() => guardar(true)}
						disabled={guardando}>
						{guardando ? "..." : "Guardar borrador"}
					</button>
					<button
						className="rr-btn rr-btn-primary"
						onClick={() => guardar(false)}
						disabled={guardando}>
						{guardando ? "..." : "Guardar"}
					</button>
				</div>
			</div>

			<div className="rr-toolbar">
				<ToolBtn title="Negrita" icon={<b>B</b>} cmd="bold" editorRef={editorRef} />
				<ToolBtn
					title="Itálica"
					icon={<i>I</i>}
					cmd="italic"
					editorRef={editorRef}
				/>
				<ToolBtn
					title="Subrayado"
					icon={<u>U</u>}
					cmd="underline"
					editorRef={editorRef}
				/>
				<Separator />
				<ToolBtn
					title="Tamaño mayor"
					icon="A+"
					cmd="fontSize"
					arg="5"
					editorRef={editorRef}
				/>
				<ToolBtn
					title="Tamaño menor"
					icon="A-"
					cmd="fontSize"
					arg="2"
					editorRef={editorRef}
				/>
				<Separator />
				<ToolBtn
					title="Lista con viñetas"
					icon="≡"
					cmd="insertUnorderedList"
					editorRef={editorRef}
				/>
				<ToolBtn
					title="Lista numerada"
					icon="1."
					cmd="insertOrderedList"
					editorRef={editorRef}
				/>
				<Separator />
				<ToolBtn
					title="Aumentar sangría"
					icon="→|"
					cmd="indent"
					editorRef={editorRef}
				/>
				<ToolBtn
					title="Reducir sangría"
					icon="|←"
					cmd="outdent"
					editorRef={editorRef}
				/>
				<Separator />
				<ToolBtn
					title="Alinear izquierda"
					icon="⬱"
					cmd="justifyLeft"
					editorRef={editorRef}
				/>
				<ToolBtn
					title="Centrar"
					icon="☰"
					cmd="justifyCenter"
					editorRef={editorRef}
				/>
				<ToolBtn
					title="Alinear derecha"
					icon="⬰"
					cmd="justifyRight"
					editorRef={editorRef}
				/>
				<ToolBtn
					title="Justificar"
					icon="▤"
					cmd="justifyFull"
					editorRef={editorRef}
				/>
				<Separator />
				<select
					className="rr-tool rr-select-heading"
					title="Estilo"
					onChange={(e) => {
						execFmt("formatBlock", e.target.value);
						e.target.value = "";
					}}>
					<option value="">H1</option>
					<option value="h1">Título 1</option>
					<option value="h2">Título 2</option>
					<option value="h3">Título 3</option>
					<option value="p">Párrafo</option>
				</select>
				<Separator />
				<ToolBtn title="Deshacer" icon="↩" cmd="undo" editorRef={editorRef} />
				<ToolBtn title="Rehacer" icon="↪" cmd="redo" editorRef={editorRef} />
			</div>

			<div className="rr-page-wrapper">
				<div className="rr-page rr-page-editor">
					<img
						className="rr-membrete"
						src={membreteSrc}
						alt="membrete"
					/>

					<div className="rr-contenido">
						<div
							ref={editorRef}
							className="rr-editor"
							contentEditable
							suppressContentEditableWarning
						spellCheck={false}
						onInput={(event) => setReporteParaImprimir(event.currentTarget.innerHTML)}
							data-placeholder="Escribir reporte aquí..."
						/>

						{renderFirma()}
					</div>
			</div>
				<div className="rr-print-pages">
					{paginasImpresion.map(renderPaginaImpresion)}
				</div>
			</div>

			{notif && <div className={`rr-notif ${notif.tipo}`}>{notif.msg}</div>}

			<div className="rr-toolbar-print">
				<button onClick={imprimir}><img src={imprimirIcon} alt="" /> Imprimir</button>
				<button onClick={() => window.close()}>✕ Cerrar</button>
			</div>
		</div>
	);
};

export default ReporteRadiologia;
