import { useState } from "react";
import { useGuardarAgenda } from "../../../hooks/use-agenda-visitas";
import { useAgregarNotaMedico, useGuardarMedico } from "../../../hooks/use-directorio-medicos";
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
		// Alta al vuelo del médico que todavía no está en el catálogo: pasa
		// seguido al programar una visita con alguien que se acaba de conocer.
		nombre_nuevo: "",
		especialidad_nueva: "",
		telefono_nuevo: "",
		correo_nuevo: "",
	}));
	const guardarAgenda = useGuardarAgenda();
	const agregarNota = useAgregarNotaMedico();
	const guardarMedico = useGuardarMedico();

	if (!isOpen) return null;

	const cambiar = (campo) => (evento) =>
		setCampos((previos) => ({ ...previos, [campo]: evento.target.value }));

	const NUEVO = "nuevo";
	const esMedicoNuevo = campos.id_doctor === NUEVO;

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
		if (!campos.fecha) {
			onError?.("La cita necesita médico y fecha.");
			return;
		}

		let elegido =
			medicoDeLaCita ??
			medicos.find((candidato) => String(candidato.id_doctor) === String(campos.id_doctor));

		try {
			// El médico nuevo se da de alta antes que la cita: así la visita nace
			// ligada a su expediente y no como un nombre suelto.
			if (esMedicoNuevo) {
				const nombre = campos.nombre_nuevo.trim();
				if (!nombre) {
					onError?.("Escribe el nombre del médico nuevo.");
					return;
				}
				const idDoctor = await guardarMedico.mutateAsync({
					doctor: {
						nombre,
						especialidad: campos.especialidad_nueva || null,
						telefono: campos.telefono_nuevo || null,
						email: campos.correo_nuevo || null,
					},
					ficha: {
						estatus: "prospecto",
						zona: campos.zona || null,
						origen_contacto: "Alta desde la agenda",
						fecha_primer_contacto: campos.fecha,
						id_empleado: idEmpleado ?? null,
					},
				});
				elegido = {
					id_doctor: idDoctor,
					nombre_completo: nombre,
					especialidad: campos.especialidad_nueva || null,
				};
			}

			if (!elegido) {
				onError?.("La cita necesita médico y fecha.");
				return;
			}

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
			// Se devuelve dónde quedó la visita para que la agenda se mueva hasta
			// ahí: guardarla en otro día la sacaba de la semana que se estaba
			// viendo y parecía que se hubiera borrado.
			onGuardado?.(
				cita
					? "Visita actualizada."
					: esMedicoNuevo
						? "Médico registrado y visita programada."
						: "Visita programada.",
				{ fecha: campos.fecha, zona: campos.zona || null },
			);
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
								<option value={NUEVO}>➕ Todavía no está en el directorio</option>
								{medicos.map((candidato) => (
									<option key={candidato.id_doctor} value={candidato.id_doctor}>
										{candidato.nombre_completo}
										{candidato.especialidad ? ` · ${candidato.especialidad}` : ""}
									</option>
								))}
							</select>

							{esMedicoNuevo && (
								<div className="visitadora-historial">
									<p className="visitadora-historial-titulo">Médico nuevo</p>
									<p className="visitadora-ficha-dato">
										Se da de alta como prospecto y la visita queda ligada a su expediente.
									</p>
									<label htmlFor="cita-nombre-nuevo">Nombre del médico</label>
									<input
										id="cita-nombre-nuevo"
										type="text"
										value={campos.nombre_nuevo}
										onChange={cambiar("nombre_nuevo")}
									/>
									<label htmlFor="cita-especialidad-nueva">Especialidad</label>
									<input
										id="cita-especialidad-nueva"
										type="text"
										value={campos.especialidad_nueva}
										onChange={cambiar("especialidad_nueva")}
									/>
									<label htmlFor="cita-telefono-nuevo">Teléfono</label>
									<input
										id="cita-telefono-nuevo"
										type="tel"
										value={campos.telefono_nuevo}
										onChange={cambiar("telefono_nuevo")}
									/>
									<label htmlFor="cita-correo-nuevo">Correo electrónico</label>
									<input
										id="cita-correo-nuevo"
										type="email"
										value={campos.correo_nuevo}
										onChange={cambiar("correo_nuevo")}
									/>
								</div>
							)}
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
