import { useCallback, useEffect, useRef, useState } from "react";
import PageLayout from "../../components/page-layout.jsx";
import { useEmpleadoActual } from "../../hooks/use-empleado-actual";
import { supabase } from "../../lib/supabase-client";
import {
	BUCKET_PROMOCIONES_SALA,
	SEGUNDOS_POR_PROMOCION,
	SEGUNDOS_TURNO_EN_PANTALLA,
	TAMANO_MAXIMO_PROMOCION,
	TIPOS_IMAGEN_PROMOCION,
	estadoPromocion,
	rutaParaPromocion,
	tituloDesdeArchivo,
	urlPromocion,
} from "../../utils/promociones-sala";
import "./promociones-sala.css";

const ETIQUETA_ESTADO = {
	visible: "Se muestra",
	inactiva: "Desactivada",
	programada: "Programada",
	vencida: "Vencida",
};

// Las promociones de la TV de la sala cambian cada mes: aquí se suben las
// imágenes, se ordenan, se apagan y se les pone vigencia, sin tocar el código.
const PromocionesSala = () => {
	const { empleadoData, formatRol, getPrimerNombre } = useEmpleadoActual();
	const [promociones, setPromociones] = useState([]);
	const [cargando, setCargando] = useState(true);
	const [subiendo, setSubiendo] = useState(false);
	const [mensaje, setMensaje] = useState(null);
	const [confirmarBorrar, setConfirmarBorrar] = useState(null);
	const inputArchivosRef = useRef(null);

	const cargar = useCallback(async () => {
		const { data, error } = await supabase
			.from("promociones_sala")
			.select("*")
			.order("orden", { ascending: true })
			.order("id_promocion", { ascending: true });
		if (error) {
			setMensaje({ tipo: "error", texto: "No se pudieron cargar las promociones." });
		} else {
			setPromociones(data || []);
		}
		setCargando(false);
	}, []);

	useEffect(() => {
		cargar();
	}, [cargar]);

	const subirArchivos = async (archivos) => {
		const lista = [...archivos];
		if (!lista.length) return;
		const rechazados = lista.filter(
			(archivo) => !TIPOS_IMAGEN_PROMOCION.includes(archivo.type) || archivo.size > TAMANO_MAXIMO_PROMOCION,
		);
		const validos = lista.filter((archivo) => !rechazados.includes(archivo));
		setSubiendo(true);
		setMensaje(null);
		let ordenSiguiente = promociones.reduce((maximo, promocion) => Math.max(maximo, promocion.orden ?? 0), 0) + 1;
		let fallidos = 0;
		for (const archivo of validos) {
			const ruta = rutaParaPromocion(archivo.name);
			const { error: errorSubida } = await supabase.storage
				.from(BUCKET_PROMOCIONES_SALA)
				.upload(ruta, archivo, { contentType: archivo.type, upsert: false });
			if (errorSubida) {
				fallidos += 1;
				continue;
			}
			const { error: errorAlta } = await supabase.from("promociones_sala").insert([
				{ titulo: tituloDesdeArchivo(archivo.name), storage_path: ruta, orden: ordenSiguiente, activa: true },
			]);
			if (errorAlta) {
				fallidos += 1;
				await supabase.storage.from(BUCKET_PROMOCIONES_SALA).remove([ruta]);
				continue;
			}
			ordenSiguiente += 1;
		}
		setSubiendo(false);
		if (inputArchivosRef.current) inputArchivosRef.current.value = "";
		const avisos = [];
		if (rechazados.length) avisos.push(`${rechazados.length} archivo(s) no son PNG, JPG o WEBP de hasta 10 MB`);
		if (fallidos) avisos.push(`${fallidos} no se pudieron subir`);
		setMensaje(
			avisos.length
				? { tipo: "error", texto: `${avisos.join(" y ")}.` }
				: { tipo: "exito", texto: validos.length === 1 ? "Promoción agregada." : `${validos.length} promociones agregadas.` },
		);
		await cargar();
	};

	const actualizar = async (promocion, cambios) => {
		setPromociones((actuales) =>
			actuales.map((actual) => (actual.id_promocion === promocion.id_promocion ? { ...actual, ...cambios } : actual)),
		);
		const { error } = await supabase
			.from("promociones_sala")
			.update(cambios)
			.eq("id_promocion", promocion.id_promocion);
		if (error) {
			setMensaje({ tipo: "error", texto: "No se pudo guardar el cambio." });
			await cargar();
		}
	};

	// Subir o bajar una posición: se intercambia el orden con la vecina y se
	// renumera toda la lista, para que dos con el mismo número no se queden
	// trabadas.
	const mover = async (indice, direccion) => {
		const destino = indice + direccion;
		if (destino < 0 || destino >= promociones.length) return;
		const reordenadas = [...promociones];
		[reordenadas[indice], reordenadas[destino]] = [reordenadas[destino], reordenadas[indice]];
		const renumeradas = reordenadas.map((promocion, posicion) => ({ ...promocion, orden: posicion + 1 }));
		setPromociones(renumeradas);
		const cambiadas = renumeradas.filter(
			(promocion) => promociones.find((original) => original.id_promocion === promocion.id_promocion)?.orden !== promocion.orden,
		);
		const resultados = await Promise.all(
			cambiadas.map((promocion) =>
				supabase.from("promociones_sala").update({ orden: promocion.orden }).eq("id_promocion", promocion.id_promocion),
			),
		);
		if (resultados.some((resultado) => resultado?.error)) {
			setMensaje({ tipo: "error", texto: "No se pudo cambiar el orden." });
			await cargar();
		}
	};

	const borrar = async (promocion) => {
		setConfirmarBorrar(null);
		const { error } = await supabase.from("promociones_sala").delete().eq("id_promocion", promocion.id_promocion);
		if (error) {
			setMensaje({ tipo: "error", texto: "No se pudo eliminar la promoción." });
			return;
		}
		// La imagen se borra después: si fallara, sólo queda un archivo huérfano,
		// nunca una promoción sin imagen en la TV.
		await supabase.storage.from(BUCKET_PROMOCIONES_SALA).remove([promocion.storage_path]);
		setMensaje({ tipo: "exito", texto: "Promoción eliminada." });
		await cargar();
	};

	const visibles = promociones.filter((promocion) => estadoPromocion(promocion) === "visible").length;

	return (
		<PageLayout empleadoData={empleadoData} formatRol={formatRol} getPrimerNombre={getPrimerNombre}>
			<div className="promos-wrapper">
				<div className="promos-header">
					<div>
						<h1 className="promos-title">Promociones de sala</h1>
						<p className="promos-subtitulo">
							Imágenes que la pantalla de sala de espera pasa en ciclo mientras no hay llamados: cada
							una {SEGUNDOS_POR_PROMOCION} s; al llamar un turno lo muestra {SEGUNDOS_TURNO_EN_PANTALLA} s
							y regresa. Los cambios se ven en la TV al momento.
						</p>
					</div>
					<a className="promos-ver-tv" href="/sala-espera" target="_blank" rel="noreferrer">
						Ver pantalla
					</a>
				</div>

				<div className="promos-content">
					<label className={`promos-subir${subiendo ? " ocupado" : ""}`}>
						<input
							ref={inputArchivosRef}
							type="file"
							accept={TIPOS_IMAGEN_PROMOCION.join(",")}
							multiple
							disabled={subiendo}
							aria-label="Subir imágenes de promociones"
							onChange={(event) => subirArchivos(event.target.files)}
						/>
						<strong>{subiendo ? "Subiendo…" : "+ Agregar promociones"}</strong>
						<span>PNG, JPG o WEBP, hasta 10 MB. Se ven mejor en horizontal 16:9 (1920 × 1080).</span>
					</label>

					{mensaje && (
						<p className={`promos-mensaje ${mensaje.tipo}`} role={mensaje.tipo === "error" ? "alert" : "status"}>
							{mensaje.texto}
						</p>
					)}

					{!cargando && (
						<p className="promos-resumen">
							{promociones.length === 0
								? "Aún no hay promociones: la pantalla muestra sólo los turnos."
								: `${visibles} de ${promociones.length} se muestran hoy en la pantalla.`}
						</p>
					)}

					<ol className="promos-lista">
						{promociones.map((promocion, indice) => {
							const estado = estadoPromocion(promocion);
							return (
								<li className={`promo-item estado-${estado}`} key={promocion.id_promocion}>
									<img
										className="promo-miniatura"
										src={urlPromocion(supabase, promocion.storage_path)}
										alt={promocion.titulo || "Promoción"}
									/>
									<div className="promo-datos">
										<div className="promo-fila">
											<input
												className="promo-titulo"
												aria-label="Nombre de la promoción"
												defaultValue={promocion.titulo || ""}
												onBlur={(event) => {
													const titulo = event.target.value.trim();
													if (titulo !== (promocion.titulo || "")) actualizar(promocion, { titulo: titulo || null });
												}}
											/>
											<span className={`promo-estado ${estado}`}>{ETIQUETA_ESTADO[estado]}</span>
										</div>
										<div className="promo-fila">
											<label className="promo-activa">
												<input
													type="checkbox"
													checked={Boolean(promocion.activa)}
													onChange={(event) => actualizar(promocion, { activa: event.target.checked })}
												/>
												Activa
											</label>
											<label className="promo-fecha">
												Desde
												<input
													type="date"
													value={promocion.vigente_desde || ""}
													max={promocion.vigente_hasta || undefined}
													onChange={(event) => actualizar(promocion, { vigente_desde: event.target.value || null })}
												/>
											</label>
											<label className="promo-fecha">
												Hasta
												<input
													type="date"
													value={promocion.vigente_hasta || ""}
													min={promocion.vigente_desde || undefined}
													onChange={(event) => actualizar(promocion, { vigente_hasta: event.target.value || null })}
												/>
											</label>
										</div>
									</div>
									<div className="promo-acciones">
										<button type="button" aria-label={`Subir ${promocion.titulo || "promoción"}`} disabled={indice === 0} onClick={() => mover(indice, -1)}>
											▲
										</button>
										<button type="button" aria-label={`Bajar ${promocion.titulo || "promoción"}`} disabled={indice === promociones.length - 1} onClick={() => mover(indice, 1)}>
											▼
										</button>
										{confirmarBorrar === promocion.id_promocion ? (
											<>
												<button type="button" className="peligro" onClick={() => borrar(promocion)}>
													Confirmar
												</button>
												<button type="button" onClick={() => setConfirmarBorrar(null)}>
													No
												</button>
											</>
										) : (
											<button type="button" className="peligro" onClick={() => setConfirmarBorrar(promocion.id_promocion)}>
												Eliminar
											</button>
										)}
									</div>
								</li>
							);
						})}
					</ol>
				</div>
			</div>
		</PageLayout>
	);
};

export default PromocionesSala;
