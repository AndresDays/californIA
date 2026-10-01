import { useState } from "react";
import { useGuardarVisita } from "../../../hooks/use-visitas-medicas";
import { nombreDoctor } from "../../../utils/comisiones-medicos";
import CapturaVisita, { contenidoDeCaptura, useCapturaVisita } from "./captura-visita";
import "../visitadora.css";

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
	// Lo que pasó en la visita se captura igual que al registrarla desde la
	// agenda: de corrido, con «Acomodar con IA», o campo por campo.
	const captura = useCapturaVisita(visita);
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
		const { contenido, hayContenido, captura_libre } = contenidoDeCaptura(captura, campos);
		if (!hayContenido) {
			onError?.("Escribe al menos las actividades de la visita.");
			return;
		}
		try {
			await guardarVisita.mutateAsync({
				...campos,
				...contenido,
				tipo_convenio: contenido.tipo_convenio || campos.tipo_convenio,
				captura_libre,
				id_doctor: campos.id_doctor === "" ? null : Number(campos.id_doctor),
				id_empleado: visita?.id_empleado ?? idEmpleado ?? null,
			});
			onGuardado?.(visita ? "Visita actualizada." : "Visita registrada.");
		} catch (fallo) {
			onError?.(fallo.message || "No se pudo guardar la visita.");
		}
	};

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

					<CapturaVisita
						captura={captura}
						campos={campos}
						setCampos={setCampos}
						ids={{
							libre: "visita-libre",
							actividades: "visita-actividades",
							comentarios: "visita-comentarios",
							observaciones: "visita-observaciones",
							seguimiento: "visita-seguimiento",
							convenio: "visita-convenio",
						}}
					/>

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
