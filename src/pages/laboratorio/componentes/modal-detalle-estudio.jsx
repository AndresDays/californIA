import { useEffect } from "react";
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

const ModalDetalleEstudio = ({ estudio, onClose }) => {
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
						<h2 id="detalle-estudio-titulo">Detalle del estudio</h2>
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
				<button type="button" className="modal-detalle-estudio-btn-cerrar" onClick={onClose}>Cerrar</button>
			</section>
		</div>
	);
};

export default ModalDetalleEstudio;
