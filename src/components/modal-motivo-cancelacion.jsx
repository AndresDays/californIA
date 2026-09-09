import { useEffect, useState } from "react";
import warningV1 from "../assets/warningV1.png";
import "./modal-motivo-cancelacion.css";

export const MOTIVOS_CANCELACION = [
	"Paciente no se presentó",
	"Solicitud duplicada",
	"Error de captura",
	"Cancelación a petición del paciente",
	"Estudio no disponible",
	"Otro",
];

const MOTIVO_OTRO = "Otro";
export const MOTIVO_PETICION_PACIENTE = "Cancelación a petición del paciente";

// Estos dos motivos no dicen nada por sí solos: "Otro" no dice nada, y a
// petición del paciente deja la pregunta de por qué la pidió, que es justo lo
// que necesita saber quien recibe el aviso -si reagendó, si se fue con otro
// laboratorio, si el precio-. Por eso ahí el detalle es obligatorio y viaja
// pegado al motivo hasta la notificación.
const MOTIVOS_CON_DETALLE_OBLIGATORIO = [MOTIVO_OTRO, MOTIVO_PETICION_PACIENTE];

const LARGO_MINIMO_DETALLE = 5;

const ModalMotivoCancelacion = ({
	isOpen,
	onClose,
	onConfirmar,
	folio = "",
	paciente = "",
}) => {
	const [motivoSeleccionado, setMotivoSeleccionado] = useState("");
	const [detalle, setDetalle] = useState("");
	const [error, setError] = useState("");
	const [guardando, setGuardando] = useState(false);

	useEffect(() => {
		if (!isOpen) return;
		setMotivoSeleccionado("");
		setDetalle("");
		setError("");
		setGuardando(false);
	}, [isOpen]);

	if (!isOpen) return null;

	const requiereDetalle = MOTIVOS_CON_DETALLE_OBLIGATORIO.includes(motivoSeleccionado);
	// "Otro" se guarda sólo con lo escrito porque la categoría no aporta nada; en
	// los demás el detalle se suma al motivo elegido.
	const soloDetalle = motivoSeleccionado === MOTIVO_OTRO;

	const construirMotivo = () => {
		const texto = detalle.trim();
		if (!motivoSeleccionado) return "";
		if (soloDetalle) return texto;
		return texto ? `${motivoSeleccionado}: ${texto}` : motivoSeleccionado;
	};

	const handleConfirmar = async () => {
		if (!motivoSeleccionado) {
			setError("Selecciona el motivo de la cancelación");
			return;
		}
		if (requiereDetalle && detalle.trim().length < LARGO_MINIMO_DETALLE) {
			setError(`Describe el motivo con al menos ${LARGO_MINIMO_DETALLE} caracteres`);
			return;
		}
		setError("");
		setGuardando(true);
		try {
			await onConfirmar({
				motivo: construirMotivo(),
				categoria: motivoSeleccionado,
				detalle: detalle.trim(),
			});
		} catch (err) {
			console.error("Error al cancelar la solicitud:", err);
			setGuardando(false);
			return;
		}
		setGuardando(false);
	};

	return (
		<>
			<div className="modal-motivo-overlay" onClick={guardando ? undefined : onClose} />
			<div
				className="modal-motivo-container"
				role="dialog"
				aria-modal="true"
				aria-label="Cancelar solicitud">
				<div className="modal-motivo-header">
					<img src={warningV1} alt="Advertencia" className="modal-motivo-icon" />
					<h2 className="modal-motivo-titulo">Cancelar solicitud</h2>
				</div>

				<div className="modal-motivo-body">
					<p className="modal-motivo-mensaje">
						Indica por qué se cancela la solicitud. El motivo queda registrado en
						la auditoría de la orden.
					</p>
					{(folio || paciente) && (
						<p className="modal-motivo-orden">
							{folio ? `Folio ${folio}` : ""}
							{folio && paciente ? " · " : ""}
							{paciente}
						</p>
					)}

					<label className="modal-motivo-label" htmlFor="motivo-cancelacion">
						Motivo <span className="modal-motivo-requerido">*</span>
					</label>
					<select
						id="motivo-cancelacion"
						aria-label="Motivo de cancelación"
						className="modal-motivo-select"
						value={motivoSeleccionado}
						disabled={guardando}
						onChange={(e) => {
							setMotivoSeleccionado(e.target.value);
							setError("");
						}}>
						<option value="">Selecciona un motivo</option>
						{MOTIVOS_CANCELACION.map((motivo) => (
							<option key={motivo} value={motivo}>
								{motivo}
							</option>
						))}
					</select>

					<label className="modal-motivo-label" htmlFor="detalle-cancelacion">
						{requiereDetalle ? (
							<>
								{soloDetalle ? "Descripción" : "Motivo del paciente"}{" "}
								<span className="modal-motivo-requerido">*</span>
							</>
						) : (
							"Comentario adicional (opcional)"
						)}
					</label>
					<textarea
						id="detalle-cancelacion"
						aria-label="Detalle de la cancelación"
						className="modal-motivo-textarea"
						rows="3"
						maxLength={300}
						value={detalle}
						disabled={guardando}
						placeholder={
							motivoSeleccionado === MOTIVO_PETICION_PACIENTE
								? "¿Por qué la pidió? Ejemplo: reagendó para la próxima semana"
								: "Ejemplo: el paciente reagendó para la próxima semana"
						}
						onChange={(e) => {
							setDetalle(e.target.value);
							setError("");
						}}
					/>

					{error && <p className="modal-motivo-error">{error}</p>}

					<p className="modal-motivo-advertencia">
						Esta acción cancela la orden y no se puede deshacer.
					</p>
				</div>

				<div className="modal-motivo-footer">
					<button
						type="button"
						className="btn-motivo-volver"
						onClick={onClose}
						disabled={guardando}>
						Volver
					</button>
					<button
						type="button"
						className="btn-motivo-confirmar"
						onClick={handleConfirmar}
						disabled={guardando}>
						{guardando ? "Cancelando..." : "Cancelar solicitud"}
					</button>
				</div>
			</div>
		</>
	);
};

export default ModalMotivoCancelacion;
