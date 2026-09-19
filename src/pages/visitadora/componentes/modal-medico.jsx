import { useState } from "react";
import { useGuardarMedico } from "../../../hooks/use-directorio-medicos";
import { ESTATUS_MEDICO } from "../../../utils/crm-visitadora";
import "../visitadora.css";

// El alta se captura muchas veces de pie, en la sala de espera del consultorio:
// sólo el nombre es obligatorio y todo lo demás se puede completar después
// desde el expediente.
const VACIO = {
	primer_nombre: "",
	apellido_paterno: "",
	apellido_materno: "",
	especialidad: "",
	telefono: "",
	email: "",
	fecha_nacimiento: "",
	whatsapp: "",
	hospital: "",
	direccion_consultorio: "",
	zona: "",
	horario_consulta: "",
	estatus: "prospecto",
	frecuencia_visita_dias: "",
	origen_contacto: "",
	notas: "",
	latitud: "",
	longitud: "",
};

const CAMPOS_DOCTOR = [
	"primer_nombre",
	"apellido_paterno",
	"apellido_materno",
	"especialidad",
	"telefono",
	"email",
	"fecha_nacimiento",
];

const numeroONulo = (valor) => {
	const convertido = Number(valor);
	return valor === "" || !Number.isFinite(convertido) ? null : convertido;
};

const ModalMedico = ({ isOpen, medico, idEmpleado, onClose, onGuardado, onError }) => {
	const [campos, setCampos] = useState(() => ({
		...VACIO,
		...Object.fromEntries(
			Object.entries(medico ?? {}).filter(([, valor]) => valor !== null && valor !== undefined),
		),
	}));
	const guardarMedico = useGuardarMedico();

	if (!isOpen) return null;

	const cambiar = (campo) => (evento) =>
		setCampos((previos) => ({ ...previos, [campo]: evento.target.value }));

	// El celular sí sabe dónde está parada: eso ahorra teclear coordenadas para
	// que luego funcione "médicos cercanos".
	const tomarUbicacion = () => {
		if (!navigator.geolocation) {
			onError?.("Este dispositivo no comparte la ubicación.");
			return;
		}
		navigator.geolocation.getCurrentPosition(
			(posicion) =>
				setCampos((previos) => ({
					...previos,
					latitud: posicion.coords.latitude.toFixed(7),
					longitud: posicion.coords.longitude.toFixed(7),
				})),
			() => onError?.("No se pudo leer la ubicación."),
		);
	};

	const guardar = async (evento) => {
		evento.preventDefault();
		const nombreCompleto = [campos.primer_nombre, campos.apellido_paterno, campos.apellido_materno]
			.map((parte) => String(parte || "").trim())
			.filter(Boolean)
			.join(" ");
		if (!nombreCompleto) {
			onError?.("El médico necesita al menos un nombre.");
			return;
		}
		const doctor = { id_doctor: medico?.id_doctor ?? null, nombre: nombreCompleto };
		for (const campo of CAMPOS_DOCTOR) doctor[campo] = campos[campo] || null;
		const ficha = {
			whatsapp: campos.whatsapp || null,
			hospital: campos.hospital || null,
			direccion_consultorio: campos.direccion_consultorio || null,
			zona: campos.zona || null,
			horario_consulta: campos.horario_consulta || null,
			estatus: campos.estatus || "prospecto",
			frecuencia_visita_dias: numeroONulo(campos.frecuencia_visita_dias),
			origen_contacto: campos.origen_contacto || null,
			notas: campos.notas || null,
			latitud: numeroONulo(campos.latitud),
			longitud: numeroONulo(campos.longitud),
			id_empleado: medico?.id_empleado ?? idEmpleado ?? null,
		};
		try {
			const idDoctor = await guardarMedico.mutateAsync({ doctor, ficha });
			onGuardado?.(medico ? "Médico actualizado." : "Médico registrado.", idDoctor);
		} catch (fallo) {
			onError?.(fallo.message || "No se pudo guardar el médico.");
		}
	};

	const campo = (id, etiqueta, clave, tipo = "text") => (
		<div>
			<label htmlFor={id}>{etiqueta}</label>
			<input id={id} type={tipo} value={campos[clave] ?? ""} onChange={cambiar(clave)} />
		</div>
	);

	return (
		<div className="visitadora-modal-fondo" role="dialog" aria-modal="true">
			<div className="visitadora-modal ancho">
				<h2>{medico ? "Editar médico" : "Nuevo médico"}</h2>
				<form onSubmit={guardar}>
					<div className="visitadora-modal-columnas">
						{campo("medico-nombre", "Nombre(s)", "primer_nombre")}
						{campo("medico-paterno", "Apellido paterno", "apellido_paterno")}
						{campo("medico-materno", "Apellido materno", "apellido_materno")}
						{campo("medico-especialidad", "Especialidad", "especialidad")}
						{campo("medico-telefono", "Teléfono", "telefono", "tel")}
						{campo("medico-whatsapp", "WhatsApp", "whatsapp", "tel")}
						{campo("medico-email", "Correo electrónico", "email", "email")}
						{campo("medico-cumple", "Fecha de cumpleaños", "fecha_nacimiento", "date")}
						{campo("medico-hospital", "Hospital o clínica", "hospital")}
						{campo("medico-zona", "Zona", "zona")}
						{campo("medico-frecuencia", "Visitarlo cada (días)", "frecuencia_visita_dias", "number")}
						{campo("medico-origen", "Cómo se obtuvo el contacto", "origen_contacto")}
						<div>
							<label htmlFor="medico-estatus">Estatus</label>
							<select id="medico-estatus" value={campos.estatus} onChange={cambiar("estatus")}>
								{ESTATUS_MEDICO.map((estatus) => (
									<option key={estatus.valor} value={estatus.valor}>{estatus.etiqueta}</option>
								))}
							</select>
						</div>
					</div>

					<label htmlFor="medico-direccion">Dirección del consultorio</label>
					<input
						id="medico-direccion"
						type="text"
						value={campos.direccion_consultorio ?? ""}
						onChange={cambiar("direccion_consultorio")}
					/>

					<label htmlFor="medico-horario">Días y horarios de consulta</label>
					<input
						id="medico-horario"
						type="text"
						placeholder="Lunes y miércoles de 16:00 a 20:00"
						value={campos.horario_consulta ?? ""}
						onChange={cambiar("horario_consulta")}
					/>

					<div className="visitadora-modal-columnas">
						{campo("medico-latitud", "Latitud", "latitud")}
						{campo("medico-longitud", "Longitud", "longitud")}
					</div>
					<div className="visitadora-acciones-rapidas">
						<button type="button" onClick={tomarUbicacion}>
							📍 Usar mi ubicación actual
						</button>
					</div>

					<label htmlFor="medico-notas">Notas y observaciones</label>
					<textarea id="medico-notas" rows={3} value={campos.notas ?? ""} onChange={cambiar("notas")} />

					<div className="visitadora-modal-acciones">
						<button type="button" onClick={onClose}>Cancelar</button>
						<button
							type="submit"
							className="visitadora-boton-primario"
							disabled={guardarMedico.isPending}>
							{guardarMedico.isPending ? "Guardando…" : "Guardar"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default ModalMedico;
