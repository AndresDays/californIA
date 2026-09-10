import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase-client";
import {
	LARGO_MAXIMO_OBSERVACION,
	construirObservacionDoctor,
	formatearFechaObservacion,
	validarObservacionDoctor,
} from "../utils/observaciones-doctor";
import "./modal-observacion-doctor.css";

const resolverEmpleadoAutor = async (empleado) => {
	try {
		const { data } = await supabase.auth.getUser();
		const authUuid = data?.user?.id;
		if (!authUuid) return empleado;
		const { data: fila } = await supabase
			.from("empleados")
			.select("id_empleado, nombre")
			.eq("auth_uuid", authUuid)
			.maybeSingle();
		if (!fila) return empleado;
		return { ...empleado, id_empleado: fila.id_empleado, nombre: empleado?.nombre || fila.nombre };
	} catch (error) {
		// Sin id la observación se guarda igual: el nombre de quien la anotó ya
		// va copiado, que es lo que se lee en el aviso.
		console.warn("No se pudo resolver el empleado que anota:", error);
		return empleado;
	}
};

// Lo anotado sobre el doctor, con lo anterior a la vista: casi siempre lo que
// se va a escribir ya está anotado, y verlo evita repetir el mismo aviso.
const ModalObservacionDoctor = ({ isOpen, onClose, doctor, empleado, onGuardada }) => {
	const [texto, setTexto] = useState("");
	const [error, setError] = useState("");
	const [guardando, setGuardando] = useState(false);
	const [historial, setHistorial] = useState([]);
	const [cargandoHistorial, setCargandoHistorial] = useState(false);

	const idDoctor = doctor?.id_doctor ?? doctor?.id ?? null;

	useEffect(() => {
		if (!isOpen) return;
		setTexto("");
		setError("");
		setGuardando(false);
	}, [isOpen, idDoctor]);

	useEffect(() => {
		if (!isOpen || !idDoctor) return undefined;
		let cancelado = false;
		setCargandoHistorial(true);
		supabase
			.from("doctor_observaciones")
			.select("id, observacion, creado_por_nombre, created_at")
			.eq("id_doctor", idDoctor)
			.order("created_at", { ascending: false })
			.limit(20)
			.then(({ data, error: errorHistorial }) => {
				if (cancelado) return;
				setCargandoHistorial(false);
				// Que no se pueda leer lo anterior no impide anotar lo nuevo, que es
				// a lo que se abrió el modal.
				if (errorHistorial) {
					console.warn("No se pudo cargar el historial del doctor:", errorHistorial);
					setHistorial([]);
					return;
				}
				setHistorial(data || []);
			});
		return () => {
			cancelado = true;
		};
	}, [isOpen, idDoctor]);

	if (!isOpen) return null;

	const guardar = async () => {
		const aviso = validarObservacionDoctor(texto);
		if (aviso) {
			setError(aviso);
			return;
		}
		if (!idDoctor) {
			setError("Selecciona un doctor antes de anotar una observación");
			return;
		}

		setError("");
		setGuardando(true);
		// El perfil de la sesión trae el nombre pero no el id del empleado: se
		// busca al vuelo para que la observación quede ligada a su autor y no
		// sólo con el nombre copiado.
		const autor = empleado?.id_empleado ? empleado : await resolverEmpleadoAutor(empleado);
		const fila = construirObservacionDoctor({ doctor, texto, empleado: autor });
		const { data, error: errorGuardado } = await supabase
			.from("doctor_observaciones")
			.insert([fila])
			.select()
			.single();

		setGuardando(false);
		if (errorGuardado) {
			console.error("Error al guardar la observación del doctor:", errorGuardado);
			setError("No se pudo guardar la observación. Intenta de nuevo.");
			return;
		}

		setHistorial((previas) => [data, ...previas]);
		setTexto("");
		onGuardada?.(data);
	};

	return (
		<>
			<div className="obs-doctor-overlay" onClick={guardando ? undefined : onClose} />
			<div
				className="obs-doctor-modal"
				role="dialog"
				aria-modal="true"
				aria-label="Observaciones del doctor">
				<header>
					<div>
						<h2>Observaciones del doctor</h2>
						<p>{doctor?.nombre || "Doctor"}</p>
					</div>
					<button type="button" onClick={onClose} aria-label="Cerrar" disabled={guardando}>
						✕
					</button>
				</header>

				<label className="obs-doctor-label" htmlFor="obs-doctor-texto">
					Nueva observación
				</label>
				<textarea
					id="obs-doctor-texto"
					className="obs-doctor-textarea"
					rows="3"
					maxLength={LARGO_MAXIMO_OBSERVACION}
					value={texto}
					disabled={guardando}
					placeholder="Ejemplo: cambió de consultorio, ahora está en Plaza Marina"
					onChange={(e) => {
						setTexto(e.target.value);
						setError("");
					}}
				/>
				<p className="obs-doctor-ayuda">
					Se avisa a la visitadora, al radiólogo director, a administración y a
					desarrollo.
				</p>

				{error && <p className="obs-doctor-error">{error}</p>}

				<div className="obs-doctor-footer">
					<button type="button" className="btn-obs-cerrar" onClick={onClose} disabled={guardando}>
						Cerrar
					</button>
					<button type="button" className="btn-obs-guardar" onClick={guardar} disabled={guardando}>
						{guardando ? "Guardando..." : "Guardar observación"}
					</button>
				</div>

				<section className="obs-doctor-historial">
					<h3>Anotaciones anteriores</h3>
					{cargandoHistorial && <p className="obs-doctor-vacio">Cargando...</p>}
					{!cargandoHistorial && historial.length === 0 && (
						<p className="obs-doctor-vacio">Todavía no hay observaciones de este doctor.</p>
					)}
					{historial.map((observacion) => (
						<article key={observacion.id} className="obs-doctor-item">
							<p>{observacion.observacion}</p>
							<small>
								{observacion.creado_por_nombre || "Sin nombre"} ·{" "}
								{formatearFechaObservacion(observacion.created_at)}
							</small>
						</article>
					))}
				</section>
			</div>
		</>
	);
};

export default ModalObservacionDoctor;
