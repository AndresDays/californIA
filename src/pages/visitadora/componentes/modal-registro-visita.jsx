import { useState } from "react";
import { useGuardarVisita } from "../../../hooks/use-visitas-medicas";
import { useGuardarTarea } from "../../../hooks/use-tareas-seguimiento";
import { useGuardarAgenda } from "../../../hooks/use-agenda-visitas";
import { useActualizarContactoMedico } from "../../../hooks/use-directorio-medicos";
import { TIPOS_VISITA } from "../../../utils/crm-visitadora";
import { hoyEnMexico, sumarDias } from "../../../utils/semanas-visitadora";
import "../visitadora.css";

// Esto es lo que ella abre saliendo del consultorio, con el celular. Por eso
// nace con la fecha de hoy y el médico ya puesto: lo único que queda es dictar
// qué pasó.
const ModalRegistroVisita = ({
	isOpen,
	medico,
	cita,
	visita,
	idEmpleado,
	onClose,
	onGuardado,
	onError,
}) => {
	// Los campos son los mismos del informe de visitas —actividades, comentarios
	// del médico, observaciones, seguimiento y convenio—, porque es el reporte
	// que ella entrega y con el que lleva años trabajando: capturar con otras
	// palabras obligaba a traducir cada renglón al llenar el informe.
	const [campos, setCampos] = useState(() => ({
		fecha: hoyEnMexico(),
		tipo_visita: cita?.tipo_visita ?? "seguimiento",
		// El nombre se puede corregir aquí: viene escrito de la agenda y a veces
		// quedó mal tecleado entre consultorios.
		medico_nombre: medico?.nombre_completo ?? medico?.nombre ?? cita?.medico_nombre ?? "",
		especialidad: medico?.especialidad ?? "",
		ubicacion: medico?.hospital ?? medico?.direccion_consultorio ?? "",
		// Las actividades nacen en blanco: son lo que pasó en la visita, no lo que
		// se pensaba hacer.
		actividades: "",
		comentarios_medico: "",
		observaciones: "",
		seguimiento: "",
		fecha_seguimiento: sumarDias(hoyEnMexico(), 15),
		tipo_convenio: medico?.convenio?.tipo ?? "",
		// Datos del médico, no de la visita: vienen precargados de su ficha y se
		// completan aquí porque es cuando se los pide en el consultorio.
		telefono: medico?.telefono ?? "",
		email: medico?.email ?? "",
		fecha_nacimiento: medico?.fecha_nacimiento ?? "",
		// Corrigiendo una visita ya registrada, los campos llegan con lo que se
		// guardó; capturando una nueva, con lo que se pueda adivinar de la cita.
		...(visita
			? Object.fromEntries(
					Object.entries({
						fecha: visita.fecha,
						tipo_visita: visita.tipo_visita,
						medico_nombre: visita.medico_nombre,
						especialidad: visita.especialidad,
						ubicacion: visita.ubicacion,
						actividades: visita.actividades ?? visita.objetivo,
						comentarios_medico: visita.comentarios_medico,
						observaciones: visita.observaciones ?? visita.resultado,
						seguimiento: visita.seguimiento ?? visita.proxima_accion,
						fecha_seguimiento: visita.fecha_seguimiento ?? "",
						tipo_convenio: visita.tipo_convenio,
					}).filter(([, valor]) => valor !== null && valor !== undefined),
				)
			: {}),
	}));
	const guardarVisita = useGuardarVisita();
	const guardarTarea = useGuardarTarea();
	const guardarAgenda = useGuardarAgenda();
	const actualizarContacto = useActualizarContactoMedico();

	if (!isOpen) return null;

	const cambiar = (campo) => (evento) =>
		setCampos((previos) => ({ ...previos, [campo]: evento.target.value }));

	const guardar = async (evento) => {
		evento.preventDefault();
		if (!campos.medico_nombre.trim()) {
			onError?.("La visita necesita el nombre del médico.");
			return;
		}
		if (!campos.actividades.trim()) {
			onError?.("Escribe al menos las actividades de la visita.");
			return;
		}
		try {
			await guardarVisita.mutateAsync({
				...(visita?.id_visita ? { id_visita: visita.id_visita } : {}),
				fecha: campos.fecha,
				id_doctor: medico?.id_doctor ?? null,
				medico_nombre: campos.medico_nombre.trim(),
				especialidad: campos.especialidad || null,
				zona: medico?.zona ?? null,
				ubicacion: campos.ubicacion || null,
				// Éstas son las columnas del informe semanal y de su exportación a
				// Excel: lo capturado aquí sale tal cual en el reporte que entrega.
				actividades: campos.actividades,
				comentarios_medico: campos.comentarios_medico,
				observaciones: campos.observaciones,
				seguimiento: campos.seguimiento,
				tipo_convenio: campos.tipo_convenio,
				tipo_visita: campos.tipo_visita,
				fecha_seguimiento: campos.fecha_seguimiento || null,
				id_agenda: cita?.id_agenda ?? null,
				id_empleado: idEmpleado ?? null,
			});

			// El seguimiento no se apunta aparte: guardar la visita ya deja el
			// pendiente en la bandeja, que es donde se le olvidaba. Al corregir una
			// visita vieja no se vuelve a crear: ya existe.
			if (campos.fecha_seguimiento && !visita) {
				await guardarTarea.mutateAsync({
					id_doctor: medico?.id_doctor ?? null,
					medico_nombre: campos.medico_nombre.trim(),
					tipo: "seguimiento",
					descripcion: campos.seguimiento || "Dar seguimiento a la visita",
					fecha_objetivo: campos.fecha_seguimiento,
					id_empleado: idEmpleado ?? null,
				});
			}

			// Sólo se escribe en el catálogo si algo cambió: así registrar una
			// visita no toca la ficha del médico cuando no hacía falta.
			const contactoCambio =
				campos.medico_nombre.trim() !== (medico?.nombre_completo ?? medico?.nombre ?? "") ||
				campos.telefono !== (medico?.telefono ?? "") ||
				campos.email !== (medico?.email ?? "") ||
				campos.fecha_nacimiento !== (medico?.fecha_nacimiento ?? "");
			if (medico?.id_doctor && contactoCambio) {
				await actualizarContacto.mutateAsync({
					idDoctor: medico.id_doctor,
					nombre: campos.medico_nombre,
					telefono: campos.telefono,
					email: campos.email,
					fechaNacimiento: campos.fecha_nacimiento,
				});
			}

			if (cita?.id_agenda) {
				await guardarAgenda.mutateAsync({
					id_agenda: cita.id_agenda,
					estatus: "realizada",
					resultado: campos.observaciones || campos.actividades,
					proximo_seguimiento: campos.fecha_seguimiento || null,
					updated_at: new Date().toISOString(),
				});
			}

			onGuardado?.(visita ? "Visita actualizada." : "Visita registrada.");
		} catch (fallo) {
			onError?.(fallo.message || "No se pudo registrar la visita.");
		}
	};

	const largo = (id, etiqueta, clave, filas = 2) => (
		<>
			<label htmlFor={id}>{etiqueta}</label>
			<textarea id={id} rows={filas} value={campos[clave]} onChange={cambiar(clave)} />
		</>
	);

	return (
		<div className="visitadora-modal-fondo" role="dialog" aria-modal="true">
			<div className="visitadora-modal ancho">
				<h2>{visita ? "Editar visita registrada" : "Registrar visita"}</h2>
				{/* El objetivo con el que se programó la visita se enseña como
				    referencia, para escribir las actividades contra lo que se iba a
				    hacer; no se edita aquí, que para eso está la cita. */}
				{cita?.objetivo && (
					<div className="visitadora-historial">
						<p className="visitadora-historial-titulo">Objetivo de la visita</p>
						<p className="visitadora-notas">{cita.objetivo}</p>
					</div>
				)}
				<form onSubmit={guardar}>
					<label htmlFor="registro-medico">Médico</label>
					<input
						id="registro-medico"
						type="text"
						value={campos.medico_nombre}
						onChange={cambiar("medico_nombre")}
					/>
					<div className="visitadora-modal-columnas">
						<div>
							<label htmlFor="registro-fecha">Fecha</label>
							<input id="registro-fecha" type="date" value={campos.fecha} onChange={cambiar("fecha")} required />
						</div>
						<div>
							<label htmlFor="registro-tipo">Tipo de visita</label>
							<select id="registro-tipo" value={campos.tipo_visita} onChange={cambiar("tipo_visita")}>
								{TIPOS_VISITA.map((tipo) => (
									<option key={tipo.valor} value={tipo.valor}>{tipo.etiqueta}</option>
								))}
							</select>
						</div>
					</div>

					<div className="visitadora-modal-columnas">
						<div>
							<label htmlFor="registro-telefono">Teléfono</label>
							<input
								id="registro-telefono"
								type="tel"
								value={campos.telefono}
								onChange={cambiar("telefono")}
							/>
						</div>
						<div>
							<label htmlFor="registro-correo">Correo electrónico</label>
							<input
								id="registro-correo"
								type="email"
								value={campos.email}
								onChange={cambiar("email")}
							/>
						</div>
						<div>
							<label htmlFor="registro-cumple">Fecha de nacimiento</label>
							<input
								id="registro-cumple"
								type="date"
								value={campos.fecha_nacimiento}
								onChange={cambiar("fecha_nacimiento")}
							/>
						</div>
					</div>

					<div className="visitadora-modal-columnas">
						<div>
							<label htmlFor="registro-especialidad">Especialidad</label>
							<input
								id="registro-especialidad"
								type="text"
								value={campos.especialidad}
								onChange={cambiar("especialidad")}
							/>
						</div>
						<div>
							<label htmlFor="registro-ubicacion">Ubicación</label>
							<input
								id="registro-ubicacion"
								type="text"
								value={campos.ubicacion}
								onChange={cambiar("ubicacion")}
							/>
						</div>
					</div>

					{largo("registro-actividades", "Actividades", "actividades", 3)}
					{largo("registro-comentarios", "Comentarios del médico", "comentarios_medico")}
					{largo("registro-observaciones", "Observaciones", "observaciones")}
					{largo("registro-seguimiento-texto", "Seguimiento", "seguimiento")}

					<label htmlFor="registro-convenio">Convenio</label>
					<input
						id="registro-convenio"
						type="text"
						list="registro-convenios-sugeridos"
						value={campos.tipo_convenio}
						onChange={cambiar("tipo_convenio")}
					/>
					{/* Los valores que más se repiten en su informe; la lista no cierra
					    la puerta a escribir el convenio con sus propias palabras. */}
					<datalist id="registro-convenios-sugeridos">
						{["MIXTO", "PUNTOS", "N/A", "PENDIENTE", "Descuento para Pacientes"].map((valor) => (
							<option key={valor} value={valor} />
						))}
					</datalist>

					<div className="visitadora-modal-columnas">
						<div>
							<label htmlFor="registro-seguimiento">Fecha de seguimiento</label>
							<input
								id="registro-seguimiento"
								type="date"
								value={campos.fecha_seguimiento}
								onChange={cambiar("fecha_seguimiento")}
							/>
						</div>
					</div>

					<div className="visitadora-modal-acciones">
						<button type="button" onClick={onClose}>Cancelar</button>
						<button type="submit" className="visitadora-boton-primario" disabled={guardarVisita.isPending}>
							{guardarVisita.isPending ? "Guardando…" : visita ? "Guardar cambios" : "Guardar visita"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default ModalRegistroVisita;
