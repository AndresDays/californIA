import { useState } from "react";
import { useGuardarTarea } from "../../../hooks/use-tareas-seguimiento";
import { TIPOS_TAREA } from "../../../utils/crm-visitadora";
import { hoyEnMexico } from "../../../utils/semanas-visitadora";
import "../visitadora.css";

const ModalTarea = ({ isOpen, medico, medicos = [], idEmpleado, onClose, onGuardado, onError }) => {
	const [campos, setCampos] = useState(() => ({
		id_doctor: medico?.id_doctor ?? "",
		tipo: "seguimiento",
		descripcion: "",
		fecha_objetivo: hoyEnMexico(),
		notas: "",
	}));
	const guardarTarea = useGuardarTarea();

	if (!isOpen) return null;

	const cambiar = (campo) => (evento) =>
		setCampos((previos) => ({ ...previos, [campo]: evento.target.value }));

	const guardar = async (evento) => {
		evento.preventDefault();
		const elegido =
			medico ?? medicos.find((candidato) => String(candidato.id_doctor) === String(campos.id_doctor));
		try {
			await guardarTarea.mutateAsync({
				id_doctor: elegido?.id_doctor ?? null,
				medico_nombre: elegido?.nombre_completo ?? elegido?.nombre ?? null,
				tipo: campos.tipo,
				descripcion: campos.descripcion,
				fecha_objetivo: campos.fecha_objetivo,
				notas: campos.notas || null,
				id_empleado: idEmpleado ?? null,
			});
			onGuardado?.("Pendiente agendado.");
		} catch (fallo) {
			onError?.(fallo.message || "No se pudo guardar el pendiente.");
		}
	};

	return (
		<div className="visitadora-modal-fondo" role="dialog" aria-modal="true">
			<div className="visitadora-modal">
				<h2>Nuevo pendiente</h2>
				{medico && (
					<p className="visitadora-modal-sujeto">{medico.nombre_completo ?? medico.nombre}</p>
				)}
				<form onSubmit={guardar}>
					{!medico && (
						<>
							<label htmlFor="tarea-medico">Médico</label>
							<select id="tarea-medico" value={campos.id_doctor} onChange={cambiar("id_doctor")}>
								<option value="">Sin médico</option>
								{medicos.map((candidato) => (
									<option key={candidato.id_doctor} value={candidato.id_doctor}>
										{candidato.nombre_completo}
									</option>
								))}
							</select>
						</>
					)}

					<label htmlFor="tarea-tipo">Tipo</label>
					<select id="tarea-tipo" value={campos.tipo} onChange={cambiar("tipo")}>
						{TIPOS_TAREA.map((tipo) => (
							<option key={tipo.valor} value={tipo.valor}>{tipo.etiqueta}</option>
						))}
					</select>

					<label htmlFor="tarea-descripcion">Descripción</label>
					<input id="tarea-descripcion" type="text" value={campos.descripcion} onChange={cambiar("descripcion")} />

					<label htmlFor="tarea-fecha">Para cuándo</label>
					<input
						id="tarea-fecha"
						type="date"
						value={campos.fecha_objetivo}
						onChange={cambiar("fecha_objetivo")}
						required
					/>

					<label htmlFor="tarea-notas">Notas</label>
					<textarea id="tarea-notas" rows={2} value={campos.notas} onChange={cambiar("notas")} />

					<div className="visitadora-modal-acciones">
						<button type="button" onClick={onClose}>Cancelar</button>
						<button type="submit" className="visitadora-boton-primario" disabled={guardarTarea.isPending}>
							{guardarTarea.isPending ? "Guardando…" : "Guardar"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default ModalTarea;
