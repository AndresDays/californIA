import { useEffect, useState } from "react";
import "./modal-detalle-estudio.css";

const valorVisible = (valor) => {
	if (typeof valor === "boolean") return valor ? "Sí" : "No";
	return valor;
};

const camposDetalle = (estudio) => [
	["Área", estudio.area],
	["Tiempo de proceso", `${estudio.diasProceso ?? estudio.dias_proceso ?? 0} días`],
	["Condiciones del paciente", estudio.condiciones_paciente],
	["Tipo de muestra", estudio.tipo_muestra],
	["Recipiente", estudio.recipiente],
	["Método", estudio.metodo],
	["Técnica", estudio.tecnica],
	["Equipo", estudio.equipo],
	["Etiquetas extra", estudio.etiquetas_extra],
	["Preparación", estudio.preparacion],
	["Duración", estudio.duracion_minutos ? `${estudio.duracion_minutos} minutos` : ""],
	["Región anatómica", estudio.region_anatomica],
	["Modalidad", estudio.modalidad],
	["Empresa operativa", estudio.empresa_operativa],
	["Requiere contraste", estudio.requiere_contraste],
	["Requiere interpretación", estudio.requiere_interpretacion],
].filter(([, valor]) => valor !== "" && valor !== null && valor !== undefined);

// Un paquete -o un perfil, que en el catálogo es lo mismo- no se cobra por lo
// que dice su renglón sino por lo que trae dentro. Sin la lista, recepción no
// puede decirle al paciente qué incluye el "PERFIL TIROIDEO" sin salirse de la
// captura.
const idDelPaquete = (estudio) =>
	estudio?.es_paquete ? (estudio.id_catalogo ?? estudio.id ?? null) : null;

const ModalDetalleEstudio = ({ estudio, onClose }) => {
	const idPaquete = idDelPaquete(estudio);
	// La lista se guarda junto con el paquete al que pertenece: así, mientras la
	// consulta va en camino -o si el modal se abre en otro renglón-, no se
	// alcanzan a pintar los estudios del paquete anterior.
	const [incluidosDe, setIncluidosDe] = useState({ idPaquete: null, lista: [], error: "" });
	const respuestaAlDia = incluidosDe.idPaquete === idPaquete;
	const incluidos = respuestaAlDia ? incluidosDe.lista : [];
	const errorIncluidos = respuestaAlDia ? incluidosDe.error : "";
	const cargandoIncluidos = Boolean(idPaquete) && !respuestaAlDia;

	useEffect(() => {
		if (!idPaquete) return undefined;

		// Al cerrar el modal -o al abrir otro renglón- la respuesta que venía en
		// camino ya no sirve.
		let vigente = true;

		(async () => {
			try {
				const { supabase } = await import("../../../lib/supabase-client");
				const { data, error } = await supabase
					.from("paquetes_estudios")
					.select("id, orden, estudios_lab_catalogo ( id, clave, descripcion )")
					.eq("id_paquete", idPaquete)
					.order("orden", { ascending: true });

				if (error) throw error;
				if (!vigente) return;

				setIncluidosDe({
					idPaquete,
					error: "",
					lista: (data || [])
						.map((renglon) => renglon.estudios_lab_catalogo)
						.filter(Boolean)
						.map((incluido) => ({
							id: incluido.id,
							clave: incluido.clave,
							descripcion: incluido.descripcion,
						})),
				});
			} catch (fallo) {
				console.error("Error al cargar los estudios del paquete:", fallo);
				if (vigente) {
					setIncluidosDe({
						idPaquete,
						lista: [],
						error: "No se pudieron cargar los estudios del paquete.",
					});
				}
			}
		})();

		return () => {
			vigente = false;
		};
	}, [idPaquete]);

	useEffect(() => {
		const cerrarConEscape = (event) => {
			if (event.key === "Escape") onClose();
		};
		window.addEventListener("keydown", cerrarConEscape);
		return () => window.removeEventListener("keydown", cerrarConEscape);
	}, [onClose]);

	if (!estudio) return null;
	const campos = camposDetalle(estudio);

	return (
		<div className="modal-detalle-estudio-backdrop" onMouseDown={onClose}>
			<section
				className="modal-detalle-estudio"
				role="dialog"
				aria-modal="true"
				aria-labelledby="detalle-estudio-titulo"
				onMouseDown={(event) => event.stopPropagation()}>
				<div className="modal-detalle-estudio-header">
					<div>
						<p className="modal-detalle-estudio-clave">{estudio.clave}</p>
						<h2 id="detalle-estudio-titulo">
							{idPaquete ? "Detalle del paquete" : "Detalle del estudio"}
						</h2>
					</div>
					<button type="button" className="modal-detalle-estudio-cerrar" onClick={onClose} aria-label="Cerrar detalle del estudio">
						×
					</button>
				</div>
				<p className="modal-detalle-estudio-nombre">{estudio.descripcion}</p>
				<dl className="modal-detalle-estudio-campos">
					{campos.map(([etiqueta, valor]) => (
						<div key={etiqueta}>
							<dt>{etiqueta}</dt>
							<dd>{valorVisible(valor)}</dd>
						</div>
					))}
				</dl>

				{idPaquete && (
					<section className="modal-detalle-estudio-incluidos">
						<h3>Estudios que incluye{incluidos.length > 0 ? ` (${incluidos.length})` : ""}</h3>
						{cargandoIncluidos && <p>Cargando los estudios del paquete…</p>}
						{!cargandoIncluidos && errorIncluidos && (
							<p className="modal-detalle-estudio-error">{errorIncluidos}</p>
						)}
						{!cargandoIncluidos && !errorIncluidos && incluidos.length === 0 && (
							<p>Este paquete no tiene estudios dados de alta.</p>
						)}
						{incluidos.length > 0 && (
							<ul>
								{incluidos.map((incluido) => (
									<li key={incluido.id}>
										<span className="modal-detalle-estudio-incluido-clave">{incluido.clave}</span>
										<span>{incluido.descripcion}</span>
									</li>
								))}
							</ul>
						)}
					</section>
				)}
				<button type="button" className="modal-detalle-estudio-btn-cerrar" onClick={onClose}>Cerrar</button>
			</section>
		</div>
	);
};

export default ModalDetalleEstudio;
