import { useVisitaDeAgenda } from "../../../hooks/use-visitas-medicas";
import ModalRegistroVisita from "./modal-registro-visita";
import "../visitadora.css";

// Corregir una visita ya registrada abre el mismo formulario con el que se
// capturó —resultado, qué se ofreció, compromisos y lo demás—, no sólo los
// datos de la cita. La visita se busca por la cita que la generó.
const EditarVisitaRegistrada = ({ cita, medico, idEmpleado, onClose, onGuardado, onError }) => {
	const { data: visita, isLoading, error } = useVisitaDeAgenda(cita?.id_agenda);

	if (isLoading) {
		return (
			<div className="visitadora-modal-fondo" role="dialog" aria-modal="true">
				<div className="visitadora-modal">
					<p>Cargando la visita…</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="visitadora-modal-fondo" role="dialog" aria-modal="true">
				<div className="visitadora-modal">
					<p className="visitadora-error">No se pudo abrir la visita: {error.message}</p>
					<div className="visitadora-modal-acciones">
						<button type="button" onClick={onClose}>Cerrar</button>
					</div>
				</div>
			</div>
		);
	}

	// Sin visita guardada —la cita se marcó como realizada a mano— se abre el
	// formulario en blanco, que es lo que hace falta para registrarla.
	return (
		<ModalRegistroVisita
			isOpen
			cita={cita}
			visita={visita ?? null}
			medico={medico}
			idEmpleado={idEmpleado}
			onClose={onClose}
			onGuardado={onGuardado}
			onError={onError}
		/>
	);
};

export default EditarVisitaRegistrada;
