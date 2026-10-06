import { useState } from "react";
import { useGuardarVisita } from "../../../hooks/use-visitas-medicas";
import { useGuardarTarea } from "../../../hooks/use-tareas-seguimiento";
import { useGuardarAgenda } from "../../../hooks/use-agenda-visitas";
import { useActualizarContactoMedico } from "../../../hooks/use-directorio-medicos";
import { TIPOS_VISITA } from "../../../utils/crm-visitadora";
import { nombreDoctor } from "../../../utils/comisiones-medicos";
import CapturaVisita, { contenidoDeCaptura, useCapturaVisita } from "./captura-visita";
import CampoFechaNacimiento from "./campo-fecha-nacimiento";
import { hoyEnMexico, sumarDias } from "../../../utils/semanas-visitadora";
import "../visitadora.css";

// Esto es lo que ella abre saliendo del consultorio, con el celular. Por eso
// nace con la fecha de hoy y el médico ya puesto: lo único que queda es dictar
// qué pasó.
// También es el modal del informe de visitas, donde no se sale de un
// consultorio sino que se captura una visita suelta: ahí no llega un médico y
// por eso se puede elegir del catálogo. Los campos son los mismos en los dos
// lados, que es lo que se pide del reporte.
const ModalRegistroVisita = ({
	isOpen,
	medico,
	cita,
	visita,
	doctores = [],
	semana,
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
		// Capturando desde el informe la fecha arranca en la semana que se está
		// llenando; saliendo del consultorio, hoy.
		fecha: semana?.desde ?? hoyEnMexico(),
		// Sin médico de la agenda se liga con el catálogo, que es lo que hace que
		// la visita cuente para el concentrado de comisiones.
		id_doctor: medico?.id_doctor ?? visita?.id_doctor ?? "",
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
						id_doctor: visita.id_doctor ?? "",
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
	const captura = useCapturaVisita(visita);

	const guardarVisita = useGuardarVisita();
	const guardarTarea = useGuardarTarea();
	const guardarAgenda = useGuardarAgenda();
	const actualizarContacto = useActualizarContactoMedico();

	if (!isOpen) return null;

	const cambiar = (campo) => (evento) =>
		setCampos((previos) => ({ ...previos, [campo]: evento.target.value }));

	// Elegir un doctor del catálogo copia su nombre y su especialidad, para no
	// volver a teclearlos.
	const elegirDoctor = (evento) => {
		const id = evento.target.value;
		const doctor = doctores.find((candidato) => String(candidato.id_doctor) === id);
		setCampos((previos) => ({
			...previos,
			id_doctor: id,
			medico_nombre: doctor ? nombreDoctor(doctor) : previos.medico_nombre,
			especialidad: doctor?.especialidad || previos.especialidad,
			// La ubicación es la zona del reporte: si no se ha escrito, se toma de
			// la ficha del médico elegido.
			ubicacion: previos.ubicacion || doctor?.zona || doctor?.ubicacion || "",
		}));
	};

	const idDoctorDeLaVisita = () => {
		if (medico?.id_doctor) return medico.id_doctor;
		return campos.id_doctor === "" || campos.id_doctor === null
			? null
			: Number(campos.id_doctor);
	};

	const guardar = async (evento) => {
		evento.preventDefault();
		if (!campos.medico_nombre.trim()) {
			onError?.("La visita necesita el nombre del médico.");
			return;
		}
		const { contenido, hayContenido, captura_libre } = contenidoDeCaptura(captura, campos);
		if (!hayContenido) {
			onError?.("Escribe al menos las actividades de la visita.");
			return;
		}
		try {
			await guardarVisita.mutateAsync({
				...(visita?.id_visita ? { id_visita: visita.id_visita } : {}),
				fecha: campos.fecha,
				id_doctor: idDoctorDeLaVisita(),
				medico_nombre: campos.medico_nombre.trim(),
				especialidad: campos.especialidad || null,
				// Ubicación y zona son lo mismo para ella: lo que escribe como
				// ubicación es lo que el reporte muestra y filtra como zona.
				zona: campos.ubicacion?.trim() || medico?.zona || cita?.zona || null,
				ubicacion: campos.ubicacion || null,
				// Éstas son las columnas del informe semanal y de su exportación a
				// Excel: lo capturado aquí sale tal cual en el reporte que entrega.
				actividades: contenido.actividades,
				comentarios_medico: contenido.comentarios_medico,
				observaciones: contenido.observaciones,
				seguimiento: contenido.seguimiento,
				tipo_convenio: contenido.tipo_convenio || campos.tipo_convenio,
				captura_libre,
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
					id_doctor: idDoctorDeLaVisita(),
					medico_nombre: campos.medico_nombre.trim(),
					tipo: "seguimiento",
					descripcion: contenido.seguimiento || "Dar seguimiento a la visita",
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
					resultado: contenido.observaciones || contenido.actividades,
					proximo_seguimiento: campos.fecha_seguimiento || null,
					updated_at: new Date().toISOString(),
				});
			}

			onGuardado?.(visita ? "Visita actualizada." : "Visita registrada.");
		} catch (fallo) {
			onError?.(fallo.message || "No se pudo registrar la visita.");
		}
	};

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
					{/* El catálogo sólo se ofrece cuando no se viene de la agenda: ahí
					    el médico ya está dado y el select sobraría. */}
					{!medico && doctores.length > 0 && (
						<>
							<label htmlFor="registro-doctor">Doctor del catálogo</label>
							<select
								id="registro-doctor"
								value={campos.id_doctor ?? ""}
								onChange={elegirDoctor}>
								<option value="">Sin ligar (empresa o médico no dado de alta)</option>
								{doctores.map((doctor) => (
									<option key={doctor.id_doctor} value={doctor.id_doctor}>
										{nombreDoctor(doctor)}
									</option>
								))}
							</select>
						</>
					)}

					<label htmlFor="registro-medico">Médico / Empresa</label>
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
							<CampoFechaNacimiento
								id="registro-cumple"
								valor={campos.fecha_nacimiento}
								onChange={(nueva) =>
									setCampos((previos) => ({ ...previos, fecha_nacimiento: nueva }))
								}
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

					<CapturaVisita
						captura={captura}
						campos={campos}
						setCampos={setCampos}
						ids={{
							libre: "registro-libre",
							actividades: "registro-actividades",
							comentarios: "registro-comentarios",
							observaciones: "registro-observaciones",
							seguimiento: "registro-seguimiento-texto",
							convenio: "registro-convenio",
						}}
					/>

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
