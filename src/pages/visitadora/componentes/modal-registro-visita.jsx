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
	const [campos, setCampos] = useState(() => ({
		fecha: hoyEnMexico(),
		tipo_visita: cita?.tipo_visita ?? "seguimiento",
		objetivo: cita?.objetivo ?? "",
		que_se_ofrecio: "",
		que_se_entrego: "",
		resultado: "",
		comentarios_medico: "",
		compromisos: "",
		proxima_accion: "",
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
						objetivo: visita.objetivo ?? visita.actividades,
						que_se_ofrecio: visita.que_se_ofrecio,
						que_se_entrego: visita.que_se_entrego,
						resultado: visita.resultado,
						comentarios_medico: visita.comentarios_medico,
						compromisos: visita.compromisos ?? visita.observaciones,
						proxima_accion: visita.proxima_accion ?? visita.seguimiento,
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
		if (!campos.resultado.trim()) {
			onError?.("Escribe al menos el resultado de la visita.");
			return;
		}
		try {
			await guardarVisita.mutateAsync({
				...(visita?.id_visita ? { id_visita: visita.id_visita } : {}),
				fecha: campos.fecha,
				id_doctor: medico?.id_doctor ?? null,
				medico_nombre: medico?.nombre_completo ?? medico?.nombre ?? "",
				especialidad: medico?.especialidad ?? null,
				zona: medico?.zona ?? null,
				ubicacion: medico?.hospital ?? medico?.direccion_consultorio ?? null,
				// `actividades` es la columna que ya lee el informe semanal y la
				// exportación a Excel: se llena con lo mismo que el objetivo para
				// que el reporte de siempre no salga vacío.
				actividades: campos.objetivo || campos.que_se_ofrecio,
				comentarios_medico: campos.comentarios_medico,
				observaciones: campos.compromisos,
				seguimiento: campos.proxima_accion,
				tipo_convenio: campos.tipo_convenio,
				tipo_visita: campos.tipo_visita,
				objetivo: campos.objetivo,
				resultado: campos.resultado,
				que_se_ofrecio: campos.que_se_ofrecio,
				que_se_entrego: campos.que_se_entrego,
				compromisos: campos.compromisos,
				proxima_accion: campos.proxima_accion,
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
					medico_nombre: medico?.nombre_completo ?? medico?.nombre ?? "",
					tipo: "seguimiento",
					descripcion: campos.proxima_accion || "Dar seguimiento a la visita",
					fecha_objetivo: campos.fecha_seguimiento,
					id_empleado: idEmpleado ?? null,
				});
			}

			// Sólo se escribe en el catálogo si algo cambió: así registrar una
			// visita no toca la ficha del médico cuando no hacía falta.
			const contactoCambio =
				campos.telefono !== (medico?.telefono ?? "") ||
				campos.email !== (medico?.email ?? "") ||
				campos.fecha_nacimiento !== (medico?.fecha_nacimiento ?? "");
			if (medico?.id_doctor && contactoCambio) {
				await actualizarContacto.mutateAsync({
					idDoctor: medico.id_doctor,
					telefono: campos.telefono,
					email: campos.email,
					fechaNacimiento: campos.fecha_nacimiento,
				});
			}

			if (cita?.id_agenda) {
				await guardarAgenda.mutateAsync({
					id_agenda: cita.id_agenda,
					estatus: "realizada",
					resultado: campos.resultado,
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
				<p className="visitadora-modal-sujeto">
					{medico?.nombre_completo ?? medico?.nombre} · {medico?.especialidad || "Sin especialidad"}
				</p>
				<form onSubmit={guardar}>
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

					{largo("registro-objetivo", "Motivo u objetivo", "objetivo")}
					{largo("registro-ofrecio", "Qué se ofreció", "que_se_ofrecio")}
					{largo("registro-entrego", "Qué se entregó", "que_se_entrego")}
					{largo("registro-resultado", "Resultado", "resultado")}
					{largo("registro-comentarios", "Comentarios del médico", "comentarios_medico")}
					{largo("registro-compromisos", "Compromisos adquiridos", "compromisos")}
					{largo("registro-accion", "Próxima acción", "proxima_accion")}

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
