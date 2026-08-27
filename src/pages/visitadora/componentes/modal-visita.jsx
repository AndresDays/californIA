import { useState } from "react";
import { useGuardarVisita } from "../../../hooks/use-visitas-medicas";
import { nombreDoctor } from "../../../utils/comisiones-medicos";
import "../visitadora.css";

// Los valores que más se repiten en su Excel. Es una guía, no una lista cerrada:
// en el archivo real hay convenios descritos en un párrafo completo.
const CONVENIOS_SUGERIDOS = ["MIXTO", "PUNTOS", "N/A", "PENDIENTE", "Descuento para Pacientes"];

const VACIA = {
	fecha: "",
	medico_nombre: "",
	id_doctor: "",
	especialidad: "",
	ubicacion: "",
	zona: "",
	actividades: "",
	comentarios_medico: "",
	observaciones: "",
	seguimiento: "",
	tipo_convenio: "",
};

const ModalVisita = ({
	isOpen,
	visita,
	doctores = [],
	semana,
	idEmpleado,
	onClose,
	onGuardado,
	onError,
}) => {
	// El padre monta este modal sólo mientras está abierto y lo remonta al
	// cambiar de visita, así que el estado inicial basta: no hace falta
	// sincronizarlo después con un efecto.
	const [campos, setCampos] = useState(() =>
		visita
			? { ...VACIA, ...visita, id_doctor: visita.id_doctor ?? "" }
			: { ...VACIA, fecha: semana?.desde ?? "" },
	);
	const guardarVisita = useGuardarVisita();

	if (!isOpen) return null;

	const cambiar = (campo) => (evento) =>
		setCampos((previos) => ({ ...previos, [campo]: evento.target.value }));

	// Al elegir un doctor del catálogo se copia su nombre y especialidad: es el
	// enlace que hace que la visita cuente para el concentrado de comisiones.
	const elegirDoctor = (evento) => {
		const id = evento.target.value;
		const doctor = doctores.find((candidato) => String(candidato.id_doctor) === id);
		setCampos((previos) => ({
			...previos,
			id_doctor: id,
			medico_nombre: doctor ? nombreDoctor(doctor) : previos.medico_nombre,
			especialidad: doctor?.especialidad || previos.especialidad,
		}));
	};

	const guardar = async (evento) => {
		evento.preventDefault();
		if (!campos.fecha || !String(campos.medico_nombre).trim()) {
			onError?.("La visita necesita fecha y médico.");
			return;
		}
		try {
			await guardarVisita.mutateAsync({
				...campos,
				id_doctor: campos.id_doctor === "" ? null : Number(campos.id_doctor),
				id_empleado: visita?.id_empleado ?? idEmpleado ?? null,
			});
			onGuardado?.(visita ? "Visita actualizada." : "Visita registrada.");
		} catch (fallo) {
			onError?.(fallo.message || "No se pudo guardar la visita.");
		}
	};

	const campoLargo = (id, etiqueta, campo) => (
		<>
			<label htmlFor={id}>{etiqueta}</label>
			<textarea id={id} rows={3} value={campos[campo] ?? ""} onChange={cambiar(campo)} />
		</>
	);

	return (
		<div className="visitadora-modal-fondo" role="dialog" aria-modal="true">
			<div className="visitadora-modal ancho">
				<h2>{visita ? "Editar visita" : "Nueva visita"}</h2>

				<form onSubmit={guardar}>
					<div className="visitadora-modal-columnas">
						<div>
							<label htmlFor="visita-fecha">Fecha</label>
							<input
								id="visita-fecha"
								type="date"
								value={campos.fecha ?? ""}
								onChange={cambiar("fecha")}
								required
							/>
						</div>
						<div>
							<label htmlFor="visita-doctor">Doctor del catálogo</label>
							<select id="visita-doctor" value={campos.id_doctor ?? ""} onChange={elegirDoctor}>
								<option value="">Sin ligar (empresa o médico no dado de alta)</option>
								{doctores.map((doctor) => (
									<option key={doctor.id_doctor} value={doctor.id_doctor}>
										{nombreDoctor(doctor)}
									</option>
								))}
							</select>
						</div>
					</div>

					<label htmlFor="visita-medico">Médico / Empresa</label>
					<input
						id="visita-medico"
						type="text"
						value={campos.medico_nombre ?? ""}
						onChange={cambiar("medico_nombre")}
						required
					/>

					<div className="visitadora-modal-columnas">
						<div>
							<label htmlFor="visita-especialidad">Especialidad / Giro</label>
							<input
								id="visita-especialidad"
								type="text"
								value={campos.especialidad ?? ""}
								onChange={cambiar("especialidad")}
							/>
						</div>
						<div>
							<label htmlFor="visita-ubicacion">Ubicación</label>
							<input
								id="visita-ubicacion"
								type="text"
								value={campos.ubicacion ?? ""}
								onChange={cambiar("ubicacion")}
							/>
						</div>
					</div>

					{campoLargo("visita-actividades", "Actividades", "actividades")}
					{campoLargo("visita-comentarios", "Comentarios del médico", "comentarios_medico")}
					{campoLargo("visita-observaciones", "Observaciones", "observaciones")}
					{campoLargo("visita-seguimiento", "Seguimiento", "seguimiento")}

					<label htmlFor="visita-convenio">Tipo de convenio</label>
					<input
						id="visita-convenio"
						type="text"
						list="convenios-sugeridos"
						value={campos.tipo_convenio ?? ""}
						onChange={cambiar("tipo_convenio")}
					/>
					<datalist id="convenios-sugeridos">
						{CONVENIOS_SUGERIDOS.map((convenio) => (
							<option key={convenio} value={convenio} />
						))}
					</datalist>

					<div className="visitadora-modal-acciones">
						<button type="button" onClick={onClose}>
							Cancelar
						</button>
						<button
							type="submit"
							className="visitadora-boton-primario"
							disabled={guardarVisita.isPending}>
							{guardarVisita.isPending ? "Guardando…" : "Guardar"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default ModalVisita;
