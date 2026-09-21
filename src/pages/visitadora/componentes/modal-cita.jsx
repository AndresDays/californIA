import { useState } from "react";
import { useGuardarAgenda } from "../../../hooks/use-agenda-visitas";
import { useAgregarNotaMedico } from "../../../hooks/use-directorio-medicos";
import { TIPOS_VISITA } from "../../../utils/crm-visitadora";
import "../visitadora.css";

const ModalCita = ({ isOpen, cita, medico, medicos = [], fecha, idEmpleado, onClose, onGuardado, onError }) => {
	const [campos, setCampos] = useState(() => ({
		id_doctor: cita?.id_doctor ?? medico?.id_doctor ?? "",
		fecha: cita?.fecha ?? fecha ?? "",
		hora: cita?.hora ?? "",
		tipo_visita: cita?.tipo_visita ?? "seguimiento",
		objetivo: cita?.objetivo ?? "",
		zona: cita?.zona ?? medico?.zona ?? "",
		// La nota no es de la cita: se guarda en la ficha del médico y se lee
		// después en su pestaña de Datos.
		nota: "",
	}));
	const guardarAgenda = useGuardarAgenda();
	const agregarNota = useAgregarNotaMedico();

	if (!isOpen) return null;

	const cambiar = (campo) => (evento) =>
		setCampos((previos) => ({ ...previos, [campo]: evento.target.value }));

	const elegirMedico = (evento) => {
		const id = evento.target.value;
		const elegido = medicos.find((candidato) => String(candidato.id_doctor) === id);
		setCampos((previos) => ({
			...previos,
			id_doctor: id,
			zona: elegido?.zona || previos.zona,
		}));
	};

	// Editando, el médico es el de la tarjeta y no se vuelve a preguntar; si
	// además no está en el catálogo, se conserva su nombre tal como quedó
	// escrito en la cita.
	const medicoDeLaCita = cita
		? (medico ??
			medicos.find((candidato) => String(candidato.id_doctor) === String(cita.id_doctor)) ?? {
				id_doctor: cita.id_doctor ?? null,
				nombre_completo: cita.medico_nombre,
				especialidad: cita.especialidad,
			})
		: medico;

	const guardar = async (evento) => {
		evento.preventDefault();
		const elegido =
			medicoDeLaCita ??
			medicos.find((candidato) => String(candidato.id_doctor) === String(campos.id_doctor));
		if (!elegido || !campos.fecha) {
			onError?.("La cita necesita médico y fecha.");
			return;
		}
		try {
			await guardarAgenda.mutateAsync({
				...(cita?.id_agenda ? { id_agenda: cita.id_agenda } : {}),
				id_doctor: elegido.id_doctor,
				medico_nombre: elegido.nombre_completo ?? elegido.nombre,
				especialidad: elegido.especialidad ?? null,
				zona: campos.zona || null,
				fecha: campos.fecha,
				hora: campos.hora || null,
				tipo_visita: campos.tipo_visita,
				objetivo: campos.objetivo || null,
				id_empleado: idEmpleado ?? null,
				...(cita?.id_agenda ? { updated_at: new Date().toISOString() } : {}),
			});
			if (campos.nota.trim() && elegido.id_doctor) {
				await agregarNota.mutateAsync({
					idDoctor: elegido.id_doctor,
					nota: campos.nota,
					fecha: campos.fecha,
				});
			}
			onGuardado?.(cita ? "Visita actualizada." : "Visita programada.");
		} catch (fallo) {
			onError?.(fallo.message || "No se pudo guardar la visita.");
		}
	};

	return (
		<div className="visitadora-modal-fondo" role="dialog" aria-modal="true">
			<div className="visitadora-modal">
				<h2>{cita ? "Editar visita programada" : "Programar visita"}</h2>
				{medicoDeLaCita && (
					<p className="visitadora-modal-sujeto">
						{medicoDeLaCita.nombre_completo ?? medicoDeLaCita.nombre}
						{medicoDeLaCita.especialidad ? ` · ${medicoDeLaCita.especialidad}` : ""}
					</p>
				)}
				<form onSubmit={guardar}>
					{!medicoDeLaCita && (
						<>
							<label htmlFor="cita-medico">Médico</label>
							<select id="cita-medico" value={campos.id_doctor} onChange={elegirMedico} required>
								<option value="">Elige un médico</option>
								{medicos.map((candidato) => (
									<option key={candidato.id_doctor} value={candidato.id_doctor}>
										{candidato.nombre_completo}
										{candidato.especialidad ? ` · ${candidato.especialidad}` : ""}
									</option>
								))}
							</select>
						</>
					)}

					<div className="visitadora-modal-columnas">
						<div>
							<label htmlFor="cita-fecha">Día de visita</label>
							<input id="cita-fecha" type="date" value={campos.fecha} onChange={cambiar("fecha")} required />
						</div>
						<div>
							<label htmlFor="cita-hora">Hora</label>
							<input id="cita-hora" type="time" value={campos.hora} onChange={cambiar("hora")} />
						</div>
					</div>

					<label htmlFor="cita-tipo">Tipo de visita</label>
					<select id="cita-tipo" value={campos.tipo_visita} onChange={cambiar("tipo_visita")}>
						{TIPOS_VISITA.map((tipo) => (
							<option key={tipo.valor} value={tipo.valor}>{tipo.etiqueta}</option>
						))}
					</select>

					<label htmlFor="cita-zona">Zona</label>
					<input id="cita-zona" type="text" value={campos.zona} onChange={cambiar("zona")} />

					<label htmlFor="cita-objetivo">Objetivo de la visita</label>
					<textarea id="cita-objetivo" rows={3} value={campos.objetivo} onChange={cambiar("objetivo")} />

					<label htmlFor="cita-nota">Notas del médico</label>
					<textarea
						id="cita-nota"
						rows={3}
						placeholder="Se guardan en la ficha del médico, en su pestaña de Datos"
						value={campos.nota}
						onChange={cambiar("nota")}
					/>

					<div className="visitadora-modal-acciones">
						<button type="button" onClick={onClose}>Cancelar</button>
						<button type="submit" className="visitadora-boton-primario" disabled={guardarAgenda.isPending}>
							{guardarAgenda.isPending ? "Guardando…" : "Guardar"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default ModalCita;
