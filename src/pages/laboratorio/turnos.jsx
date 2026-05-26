import { useEffect, useMemo, useState } from "react";
import PageLayout from "../../components/page-layout";
import { useAuth } from "../../context/auth-context";
import { supabase } from "../../lib/supabase-client";
import {
	generarCodigoTurno,
	obtenerNombrePrivado,
	obtenerRangoDiaLocalISO,
	ordenarTurnosPorCola,
	resolverDestinoTurnoDesdeEstudios,
	TURNO_DESTINOS,
	TURNO_ESTADO_LABELS,
	TURNO_ESTADOS,
} from "../../utils/turnos-pacientes";
import "./turnos.css";

const hoyLocal = () => {
	const ahora = new Date();
	return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
};

const fechaLocalAISO = (fecha) => {
	if (!fecha) return new Date().toISOString();
	const texto = String(fecha);
	if (/([zZ]|[+-]\d{2}:?\d{2})$/.test(texto)) return texto;

	const partes = texto.match(
		/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/,
	);
	if (!partes) return texto;

	const [, anio, mes, dia, hora, minuto, segundo = "0"] = partes;
	return new Date(
		Number(anio),
		Number(mes) - 1,
		Number(dia),
		Number(hora),
		Number(minuto),
		Number(segundo),
	).toISOString();
};

const formatHora = (fecha) =>
	fecha
		? new Date(fecha).toLocaleTimeString("es-MX", {
				hour: "2-digit",
				minute: "2-digit",
			})
		: "--:--";

const getPrimerNombre = (nombreCompleto, user) =>
	nombreCompleto || user?.email?.split("@")[0] || "Usuario";

const formatRol = (rol) => {
	const roles = {
		admin: "Administrador",
		administrador: "Administrador",
		radiologo: "Radiologo",
		doctor: "Medico",
		medico: "Medico",
		tecnico_radiologia: "Tecnico en Radiologia",
		tecnico: "Tecnico",
		quimico: "Quimico",
		recepcionista: "Recepcionista",
		desarrollador: "Desarrollador",
	};
	return roles[rol] || rol || "Usuario";
};

const Turnos = () => {
	const { user } = useAuth();
	const [empleadoData, setEmpleadoData] = useState(null);
	const [turnos, setTurnos] = useState([]);
	const [citasHoy, setCitasHoy] = useState([]);
	const [destinosCitas, setDestinosCitas] = useState({});
	const [pacientes, setPacientes] = useState([]);
	const [busquedaPaciente, setBusquedaPaciente] = useState("");
	const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
	const [nombreManual, setNombreManual] = useState("");
	const [area, setArea] = useState("Recepcion");
	const [destino, setDestino] = useState("Laboratorio");
	const [prioridad, setPrioridad] = useState(0);
	const [mensaje, setMensaje] = useState("");
	const [cargando, setCargando] = useState(true);

	const turnosEnEspera = useMemo(
		() => ordenarTurnosPorCola(turnos.filter((turno) => turno.estado === TURNO_ESTADOS.ESPERANDO)),
		[turnos],
	);
	const turnosLlamados = useMemo(
		() =>
			turnos
				.filter((turno) =>
					[TURNO_ESTADOS.LLAMADO, TURNO_ESTADOS.EN_ATENCION].includes(turno.estado),
				)
				.sort((a, b) => new Date(b.llamado_en || 0) - new Date(a.llamado_en || 0)),
		[turnos],
	);
	const turnosFinalizados = useMemo(
		() =>
			turnos
				.filter((turno) =>
					[TURNO_ESTADOS.ATENDIDO, TURNO_ESTADOS.AUSENTE, TURNO_ESTADOS.CANCELADO].includes(
						turno.estado,
					),
				)
				.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))
				.slice(0, 8),
		[turnos],
	);

	useEffect(() => {
		const cargarEmpleado = async () => {
			if (!user?.id) return;
			const { data, error } = await supabase
				.from("empleados")
				.select("nombre, rol")
				.eq("auth_uuid", user.id)
				.maybeSingle();
			if (!error) setEmpleadoData(data || null);
		};

		cargarEmpleado();
	}, [user]);

	useEffect(() => {
		cargarTurnos();
		cargarCitasHoy();

		const channel = supabase
			.channel("turnos-pacientes-panel")
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "turnos_pacientes" },
				() => cargarTurnos(),
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, []);

	useEffect(() => {
		const buscar = async () => {
			const termino = busquedaPaciente.trim();
			if (termino.length < 2) {
				setPacientes([]);
				return;
			}

			const query = supabase
				.from("pacientes")
				.select("id_paciente, nombre, telefono")
				.limit(8);
			const { data, error } = !Number.isNaN(Number(termino))
				? await query.or(`id_paciente.eq.${termino},telefono.ilike.%${termino}%`)
				: await query.ilike("nombre", `%${termino}%`);

			if (!error) setPacientes(data || []);
		};

		const timeout = setTimeout(buscar, 250);
		return () => clearTimeout(timeout);
	}, [busquedaPaciente]);

	const cargarTurnos = async () => {
		setCargando(true);
		const fecha = hoyLocal();
		const rango = obtenerRangoDiaLocalISO(fecha);
		const { data, error } = await supabase
			.from("turnos_pacientes")
			.select("*")
			.gte("fecha_programada", rango.inicio)
			.lte("fecha_programada", rango.fin)
			.order("fecha_programada", { ascending: true });

		if (error) {
			console.error("Error al cargar turnos:", error);
			setMensaje("No se pudieron cargar los turnos.");
		} else {
			setTurnos(data || []);
		}
		setCargando(false);
	};

	const cargarCitasHoy = async () => {
		const fecha = hoyLocal();
		const { data, error } = await supabase
			.from("citas")
			.select(
				"id_cita, fecha_estudio, tipo_estudio, nombre_paciente, pacientes(id_paciente, nombre)",
			)
			.gte("fecha_estudio", `${fecha}T00:00:00`)
			.lte("fecha_estudio", `${fecha}T23:59:59`)
			.not("estado", "eq", "cancelada")
			.order("fecha_estudio", { ascending: true });

		if (!error) setCitasHoy(data || []);
	};

	const obtenerSiguienteCodigo = () => generarCodigoTurno(turnos.length + 1);

	const obtenerDestinoCita = (cita) =>
		destinosCitas[cita.id_cita] ||
		resolverDestinoTurnoDesdeEstudios([
			{
				descripcion_estudio: cita.tipo_estudio,
				area: cita.tipo_estudio,
			},
		]);

	const crearTurno = async ({ cita = null } = {}) => {
		const pacienteNombre =
			cita?.pacientes?.nombre ||
			cita?.nombre_paciente ||
			pacienteSeleccionado?.nombre ||
			nombreManual;

		if (!pacienteNombre?.trim()) {
			setMensaje("Selecciona o escribe un paciente para crear el turno.");
			return;
		}

		const destinoSeleccionado = cita ? obtenerDestinoCita(cita) : destino;
		const payload = {
			id_paciente: cita?.pacientes?.id_paciente || pacienteSeleccionado?.id_paciente || null,
			id_cita: cita?.id_cita || null,
			codigo_turno: obtenerSiguienteCodigo(),
			nombre_paciente: pacienteNombre.trim(),
			area: cita ? destinoSeleccionado : area.trim() || destinoSeleccionado || "Laboratorio",
			destino: destinoSeleccionado || null,
			prioridad: Number(prioridad) || 0,
			fecha_programada: cita ? fechaLocalAISO(cita.fecha_estudio) : new Date().toISOString(),
			creado_por: user?.id || null,
		};

		const { error } = await supabase.from("turnos_pacientes").insert(payload);
		if (error) {
			console.error("Error al crear turno:", error);
			setMensaje(`No se pudo crear el turno: ${error.message}`);
			return;
		}

		setMensaje(`Turno ${payload.codigo_turno} creado para ${obtenerNombrePrivado(payload.nombre_paciente)}.`);
		setBusquedaPaciente("");
		setPacienteSeleccionado(null);
		setNombreManual("");
		await cargarTurnos();
	};

	const actualizarTurno = async (idTurno, cambios) => {
		const { error } = await supabase
			.from("turnos_pacientes")
			.update(cambios)
			.eq("id_turno", idTurno);
		if (error) {
			console.error("Error al actualizar turno:", error);
			setMensaje(`No se pudo actualizar el turno: ${error.message}`);
			return;
		}
		await cargarTurnos();
	};

	const llamarTurno = (turno) =>
		actualizarTurno(turno.id_turno, {
			estado: TURNO_ESTADOS.LLAMADO,
			destino: turno.destino || destino,
			llamado_en: new Date().toISOString(),
		});

	return (
		<PageLayout
			empleadoData={empleadoData}
			formatRol={formatRol}
			getPrimerNombre={(nombre) => getPrimerNombre(nombre, user)}>
			<main className="turnos-main">
				<header className="turnos-header">
					<div>
						<h1>Turnos de sala</h1>
						<p>Gestiona la cola y envia avisos a la pantalla de espera.</p>
					</div>
					<a className="turnos-tv-link" href="/sala-espera" target="_blank" rel="noreferrer">
						Abrir pantalla
					</a>
				</header>

				{mensaje && (
					<div className="turnos-alert" role="status">
						{mensaje}
						<button type="button" onClick={() => setMensaje("")} aria-label="Cerrar mensaje">
							x
						</button>
					</div>
				)}

				<section className="turnos-grid">
					<div className="turnos-panel turnos-create-panel">
						<h2>Nuevo turno</h2>
						<div className="turnos-field">
							<label>Paciente</label>
							<input
								type="text"
								value={busquedaPaciente}
								onChange={(event) => {
									setBusquedaPaciente(event.target.value);
									setPacienteSeleccionado(null);
									setNombreManual(event.target.value);
								}}
								placeholder="Buscar o escribir nombre"
							/>
							{pacientes.length > 0 && (
								<div className="turnos-results">
									{pacientes.map((paciente) => (
										<button
											type="button"
											key={paciente.id_paciente}
											onClick={() => {
												setPacienteSeleccionado(paciente);
												setBusquedaPaciente(paciente.nombre);
												setNombreManual(paciente.nombre);
												setPacientes([]);
											}}>
											<strong>{paciente.nombre}</strong>
											<span>{paciente.telefono || `#${paciente.id_paciente}`}</span>
										</button>
									))}
								</div>
							)}
						</div>

						<div className="turnos-form-row">
							<div className="turnos-field">
								<label>Area</label>
								<input value={area} onChange={(event) => setArea(event.target.value)} />
							</div>
							<div className="turnos-field">
								<label>Prioridad</label>
								<select value={prioridad} onChange={(event) => setPrioridad(event.target.value)}>
									<option value="0">Normal</option>
									<option value="1">Preferente</option>
									<option value="2">Urgente</option>
								</select>
							</div>
						</div>

						<div className="turnos-field">
							<label>Destino al llamar</label>
							<select
								value={destino || "Laboratorio"}
								onChange={(event) => setDestino(event.target.value)}
							>
								{TURNO_DESTINOS.map((item) => (
									<option key={item} value={item} label={item}>
										{item}
									</option>
								))}
							</select>
						</div>

						<button type="button" className="turnos-primary" onClick={() => crearTurno()}>
							Crear turno {obtenerSiguienteCodigo()}
						</button>
					</div>

					<div className="turnos-panel turnos-citas-panel">
						<h2>Citas de hoy</h2>
						<div className="turnos-citas-list">
							{citasHoy.length === 0 ? (
								<p className="turnos-empty">No hay citas pendientes para hoy.</p>
							) : (
								citasHoy.map((cita) => (
									<div className="turnos-cita" key={cita.id_cita}>
										<div>
											<strong>{cita.pacientes?.nombre || cita.nombre_paciente || "Sin nombre"}</strong>
											<span>
												{formatHora(cita.fecha_estudio)} - {cita.tipo_estudio || "Sin estudio"}
											</span>
										</div>
										<select
											aria-label={`Destino para ${cita.pacientes?.nombre || cita.nombre_paciente || "cita"}`}
											value={obtenerDestinoCita(cita)}
											onChange={(event) =>
												setDestinosCitas((actuales) => ({
													...actuales,
													[cita.id_cita]: event.target.value,
												}))
											}>
											{TURNO_DESTINOS.map((item) => (
												<option key={item} value={item} label={item}>
													{item}
												</option>
											))}
										</select>
										<button type="button" onClick={() => crearTurno({ cita })}>
											Agregar
										</button>
									</div>
								))
							)}
						</div>
					</div>
				</section>

				<section className="turnos-board">
					<div className="turnos-column">
						<div className="turnos-column-header">
							<h2>En espera</h2>
							<span>{turnosEnEspera.length}</span>
						</div>
						{cargando ? (
							<p className="turnos-empty">Cargando...</p>
						) : turnosEnEspera.length === 0 ? (
							<p className="turnos-empty">La cola esta vacia.</p>
						) : (
							turnosEnEspera.map((turno) => (
								<article className="turno-card" key={turno.id_turno}>
									<div className="turno-card-main">
										<span className="turno-code">{turno.codigo_turno}</span>
										<div>
											<strong>{obtenerNombrePrivado(turno.nombre_paciente)}</strong>
											<span>{turno.area} - {formatHora(turno.fecha_programada)}</span>
										</div>
									</div>
									<div className="turno-actions">
										<button type="button" onClick={() => llamarTurno(turno)}>
											Llamar
										</button>
										<button
											type="button"
											className="secondary"
											onClick={() =>
												actualizarTurno(turno.id_turno, { estado: TURNO_ESTADOS.CANCELADO })
											}>
											Cancelar
										</button>
									</div>
								</article>
							))
						)}
					</div>

					<div className="turnos-column">
						<div className="turnos-column-header">
							<h2>Llamados</h2>
							<span>{turnosLlamados.length}</span>
						</div>
						{turnosLlamados.length === 0 ? (
							<p className="turnos-empty">Sin llamados activos.</p>
						) : (
							turnosLlamados.map((turno) => (
								<article className="turno-card called" key={turno.id_turno}>
									<div className="turno-card-main">
										<span className="turno-code">{turno.codigo_turno}</span>
										<div>
											<strong>{obtenerNombrePrivado(turno.nombre_paciente)}</strong>
											<span>{turno.destino || "Sin destino"} - {formatHora(turno.llamado_en)}</span>
										</div>
									</div>
									<div className="turno-actions">
										<button
											type="button"
											onClick={() =>
												actualizarTurno(turno.id_turno, {
													estado: TURNO_ESTADOS.EN_ATENCION,
												})
											}>
											En atencion
										</button>
										<button
											type="button"
											className="secondary"
											onClick={() =>
												actualizarTurno(turno.id_turno, {
													estado: TURNO_ESTADOS.ATENDIDO,
													atendido_en: new Date().toISOString(),
												})
											}>
											Atendido
										</button>
										<button
											type="button"
											className="ghost"
											onClick={() =>
												actualizarTurno(turno.id_turno, {
													estado: TURNO_ESTADOS.AUSENTE,
												})
											}>
											Ausente
										</button>
									</div>
								</article>
							))
						)}
					</div>

					<div className="turnos-column compact">
						<div className="turnos-column-header">
							<h2>Finalizados</h2>
							<span>{turnosFinalizados.length}</span>
						</div>
						{turnosFinalizados.length === 0 ? (
							<p className="turnos-empty">Sin historial de hoy.</p>
						) : (
							turnosFinalizados.map((turno) => (
								<div className="turno-mini" key={turno.id_turno}>
									<span>{turno.codigo_turno}</span>
									<strong>{TURNO_ESTADO_LABELS[turno.estado]}</strong>
								</div>
							))
						)}
					</div>
				</section>
			</main>
		</PageLayout>
	);
};

export default Turnos;
