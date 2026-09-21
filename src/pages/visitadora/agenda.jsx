import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../components/page-layout.jsx";
import ModalNotificacion from "../../components/ModalNotificacion";
import { useEmpleadoActual } from "../../hooks/use-empleado-actual";
import { useDirectorioMedicos } from "../../hooks/use-directorio-medicos";
import {
	useAgendaVisitas,
	useCancelarVisitaAgenda,
	useEliminarCitaAgenda,
	useReprogramarVisita,
} from "../../hooks/use-agenda-visitas";
import { etiquetaTipoVisita } from "../../utils/crm-visitadora";
import { exportarAgenda } from "../../utils/exportar-informe-visitas";
import {
	diaDeLaSemana,
	etiquetaSemana,
	hoyEnMexico,
	lunesDeLaSemana,
	MESES,
	semanaDesplazada,
	sumarDias,
} from "../../utils/semanas-visitadora";
import ModalConfirmarEliminacion from "../../components/ModalConfirmarEliminacion";
import { franjaDeCita, HORAS_AGENDA, horaDeFranja } from "../../utils/agenda-horas";
import ModalCita from "./componentes/modal-cita";
import ModalRegistroVisita from "./componentes/modal-registro-visita";
import EditarVisitaRegistrada from "./componentes/editar-visita-registrada";
import "./visitadora.css";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const primerDiaDelMes = (fecha) => `${fecha.slice(0, 7)}-01`;
const mesDesplazado = (fecha, meses) => {
	const [anio, mes] = fecha.split("-").map(Number);
	const movida = new Date(Date.UTC(anio, mes - 1 + meses, 1));
	return movida.toISOString().slice(0, 10);
};
const ultimoDiaDelMes = (fecha) => sumarDias(mesDesplazado(primerDiaDelMes(fecha), 1), -1);

const Agenda = () => {
	const { empleadoData, formatRol, getPrimerNombre } = useEmpleadoActual();
	const navegar = useNavigate();
	const [vista, setVista] = useState("semana");
	const [fecha, setFecha] = useState(hoyEnMexico());
	const [zona, setZona] = useState("");
	const [modal, setModal] = useState(null);
	const [citaElegida, setCitaElegida] = useState(null);
	const [citaAEliminar, setCitaAEliminar] = useState(null);
	const [notificacion, setNotificacion] = useState({ isOpen: false, mensaje: "", tipo: "exito" });

	const { medicos } = useDirectorioMedicos();
	const reprogramar = useReprogramarVisita();
	const cancelar = useCancelarVisitaAgenda();
	const eliminar = useEliminarCitaAgenda();

	const rango = useMemo(() => {
		if (vista === "dia") return { desde: fecha, hasta: fecha };
		if (vista === "mes") {
			return { desde: primerDiaDelMes(fecha), hasta: ultimoDiaDelMes(fecha) };
		}
		const lunes = lunesDeLaSemana(fecha);
		return { desde: lunes, hasta: sumarDias(lunes, 6) };
	}, [vista, fecha]);

	const { data: citas = [], isLoading, error } = useAgendaVisitas(rango);

	// La cancelada desaparece del día: tachada seguía ocupando lugar en la
	// columna y estorbaba para leer lo que sí queda por hacer. El renglón no se
	// borra de la base, así que el reporte sigue sabiendo que ese día se canceló.
	const visibles = useMemo(
		() =>
			citas.filter(
				(cita) => cita.estatus !== "cancelada" && (!zona || cita.zona === zona),
			),
		[citas, zona],
	);

	// Las zonas salen de lo que sí se dibuja: si la única visita de una zona se
	// canceló, esa zona dejaría el filtro apuntando a una lista vacía.
	const zonas = useMemo(
		() =>
			[
				...new Set(
					citas
						.filter((cita) => cita.estatus !== "cancelada")
						.map((cita) => cita.zona)
						.filter(Boolean),
				),
			].sort(),
		[citas],
	);

	const avisar = (mensaje, tipo = "exito") => setNotificacion({ isOpen: true, mensaje, tipo });

	// La agenda se planta donde quedó la visita que se acaba de guardar. Sin
	// esto, cambiarle el día la mandaba a otra semana y desaparecía de la
	// pantalla sin decir a dónde se fue; lo mismo si el filtro de zona ya no la
	// deja pasar.
	const seguirALaVisita = (guardada) => {
		if (!guardada?.fecha) return;
		setFecha(guardada.fecha);
		if (zona && guardada.zona !== zona) setZona("");
	};

	const mover = (pasos) => {
		if (vista === "dia") return setFecha(sumarDias(fecha, pasos));
		if (vista === "mes") return setFecha(mesDesplazado(primerDiaDelMes(fecha), pasos));
		return setFecha(semanaDesplazada(lunesDeLaSemana(fecha), pasos));
	};

	const etiquetaRango = () => {
		if (vista === "dia") return fecha;
		if (vista === "mes") {
			const [anio, mes] = fecha.split("-").map(Number);
			return `${MESES[mes - 1]} ${anio}`;
		}
		return etiquetaSemana(lunesDeLaSemana(fecha));
	};

	// Se exporta lo que se está viendo, con el filtro de zona ya aplicado: es la
	// hoja que imprime para salir a la ruta.
	const exportar = () => {
		try {
			exportarAgenda(
				visibles,
				{ titulo: etiquetaRango(), etiquetaTipo: etiquetaTipoVisita },
				`Agenda_${rango.desde}_a_${rango.hasta}`,
			);
		} catch (fallo) {
			avisar(fallo.message || "No se pudo generar el archivo.", "error");
		}
	};

	const pedirReprogramacion = async (cita) => {
		// Un prompt es deliberado: en el celular es un toque y un teclado de
		// fecha; un modal más sería otra pantalla que estorba en la calle.
		const nueva = window.prompt("¿Para qué fecha la movemos? (AAAA-MM-DD)", cita.fecha);
		if (!nueva || !/^\d{4}-\d{2}-\d{2}$/.test(nueva)) return;
		try {
			await reprogramar.mutateAsync({ cita, fecha: nueva });
			avisar(`Visita movida al ${nueva}.`);
		} catch (fallo) {
			avisar(fallo.message || "No se pudo reprogramar.", "error");
		}
	};

	const tarjetaCita = (cita) => (
		<div key={cita.id_agenda} className={`visitadora-cita ${cita.estatus}`}>
			{/* Sin médico del catálogo no hay expediente al cual ir: llevar a la
			    ficha mandaba a una pantalla que sólo sabía decir que el médico no
			    estaba en el directorio. */}
			{cita.id_doctor ? (
				<button
					type="button"
					className="visitadora-enlace"
					onClick={() => navegar(`/visitadora/medico/${cita.id_doctor}`)}>
					{cita.hora ? `${cita.hora.slice(0, 5)} · ` : ""}
					{cita.medico_nombre}
				</button>
			) : (
				<span>
					{cita.hora ? `${cita.hora.slice(0, 5)} · ` : ""}
					{cita.medico_nombre}{" "}
					<span className="visitadora-pastilla suelto">sin expediente</span>
				</span>
			)}
			<div className="visitadora-ficha-dato">{etiquetaTipoVisita(cita.tipo_visita)}</div>
			{cita.objetivo && <div className="visitadora-recorte">{cita.objetivo}</div>}
			{cita.estatus === "realizada" && (
				<div className="visitadora-ficha-dato">✓ Registrada</div>
			)}
			<div className="visitadora-pastillas">
				{cita.estatus === "programada" && (
					<>
						<button
							type="button"
							className="visitadora-enlace"
							onClick={() => {
								setCitaElegida(cita);
								setModal("registro");
							}}>
							Registrar
						</button>
						<button type="button" className="visitadora-enlace" onClick={() => pedirReprogramacion(cita)}>
							Mover
						</button>
						<button
							type="button"
							className="visitadora-enlace peligro"
							onClick={async () => {
								await cancelar.mutateAsync(cita.id_agenda);
								avisar("Visita cancelada.");
							}}>
							Cancelar
						</button>
					</>
				)}
				{/* Editar y eliminar siguen disponibles después de registrar: la
				    visita ya hecha se corrige (se equivocó de médico, de hora) o se
				    quita si quedó duplicada. Lo registrado en el informe no se
				    toca desde aquí. */}
				<button
					type="button"
					className="visitadora-enlace"
					onClick={() => {
						setCitaElegida(cita);
						// La visita ya registrada se corrige con el formulario
						// completo; la que sigue programada, con los datos de la
						// cita, que es lo único que existe todavía.
						setModal(cita.estatus === "realizada" ? "editar-registro" : "cita");
					}}>
					Editar
				</button>
				<button
					type="button"
					className="visitadora-enlace peligro"
					onClick={() => setCitaAEliminar(cita)}>
					Eliminar
				</button>
			</div>
		</div>
	);

	// Los días que dibuja el calendario: uno solo en la vista de día, la semana
	// completa en la de semana.
	const diasVisibles = useMemo(() => {
		if (vista === "dia") return [{ dia: fecha, nombre: DIAS[(diaDeLaSemana(fecha) - 1) % 7] }];
		const lunes = lunesDeLaSemana(fecha);
		return DIAS.map((nombre, indice) => ({ dia: sumarDias(lunes, indice), nombre }));
	}, [vista, fecha]);

	const porFranja = useMemo(() => {
		const mapa = new Map();
		for (const cita of visibles) {
			const franja = franjaDeCita(cita);
			if (franja === null) continue;
			const clave = `${cita.fecha} ${franja}`;
			mapa.set(clave, [...(mapa.get(clave) ?? []), cita]);
		}
		return mapa;
	}, [visibles]);

	const sinHoraPorDia = useMemo(() => {
		const mapa = new Map();
		for (const cita of visibles) {
			if (franjaDeCita(cita) !== null) continue;
			mapa.set(cita.fecha, [...(mapa.get(cita.fecha) ?? []), cita]);
		}
		return mapa;
	}, [visibles]);

	const porDia = useMemo(() => {
		const mapa = new Map();
		for (const cita of visibles) {
			mapa.set(cita.fecha, [...(mapa.get(cita.fecha) ?? []), cita]);
		}
		return mapa;
	}, [visibles]);

	const diasDelMes = useMemo(() => {
		if (vista !== "mes") return [];
		const primero = primerDiaDelMes(fecha);
		const ultimo = ultimoDiaDelMes(fecha);
		const dias = [];
		for (let dia = primero; dia <= ultimo; dia = sumarDias(dia, 1)) dias.push(dia);
		return dias;
	}, [vista, fecha]);

	return (
		<PageLayout empleadoData={empleadoData} formatRol={formatRol} getPrimerNombre={getPrimerNombre}>
			<div className="visitadora-pagina">
				<div className="visitadora-encabezado">
					<h1 className="visitadora-titulo">Agenda de visitas</h1>
					<div className="visitadora-navegador">
						<button type="button" onClick={() => mover(-1)} aria-label="Anterior">◀</button>
						<span>{etiquetaRango()}</span>
						<button type="button" onClick={() => mover(1)} aria-label="Siguiente">▶</button>
					</div>
					<div className="visitadora-acciones">
						{["dia", "semana", "mes"].map((opcion) => (
							<button
								key={opcion}
								type="button"
								className={vista === opcion ? "visitadora-boton-primario" : ""}
								onClick={() => setVista(opcion)}>
								{opcion === "dia" ? "Día" : opcion === "semana" ? "Semana" : "Mes"}
							</button>
						))}
						<button type="button" onClick={() => setFecha(hoyEnMexico())}>Hoy</button>
						<button type="button" onClick={exportar} disabled={visibles.length === 0}>
							Exportar Excel
						</button>
						<button
							type="button"
							className="visitadora-boton-primario"
							onClick={() => {
								setCitaElegida(null);
								setModal("cita");
							}}>
							+ Programar visita
						</button>
					</div>
				</div>

				<div className="visitadora-barra-filtros">
					<select aria-label="Zona" value={zona} onChange={(evento) => setZona(evento.target.value)}>
						<option value="">Todas las zonas</option>
						{zonas.map((valor) => (
							<option key={valor} value={valor}>{valor}</option>
						))}
					</select>
					<span className="visitadora-ficha-dato">{visibles.length} visitas</span>
				</div>

				{error && <p className="visitadora-error">No se pudo cargar la agenda: {error.message}</p>}
				{isLoading && <p>Cargando…</p>}

				{!isLoading && visibles.length === 0 && (
					<p className="visitadora-vacio">No hay visitas programadas en este periodo.</p>
				)}

				{(
					<>
						{(vista === "semana" || vista === "dia") && (
							// Calendario de verdad: las horas en el costado y un hueco por
							// día y hora, para que las visitas dejen de salir revueltas en
							// una lista y se vea cuándo hay espacio libre.
							<div
								className={`visitadora-calendario ${vista}`}
								style={{ "--columnas": vista === "dia" ? 1 : DIAS.length }}>
								<div className="visitadora-calendario-fila encabezado">
									<span className="visitadora-hora" />
									{diasVisibles.map(({ dia, nombre }) => (
										<div key={dia} className="visitadora-calendario-dia-titulo">
											<strong>{nombre}</strong> {dia.slice(8, 10)}
											<button
												type="button"
												className="visitadora-enlace"
												onClick={() => {
													setCitaElegida(null);
													setFecha(dia);
													setModal("cita");
												}}>
												+
											</button>
										</div>
									))}
								</div>

								{/* Arriba, lo que todavía no tiene hora: se programó el día
								    pero el consultorio no dio horario. */}
								<div className="visitadora-calendario-fila sinhora">
									<span className="visitadora-hora">Sin hora</span>
									{diasVisibles.map(({ dia }) => (
										<div key={dia} className="visitadora-calendario-celda">
											{(sinHoraPorDia.get(dia) ?? []).map(tarjetaCita)}
										</div>
									))}
								</div>

								{HORAS_AGENDA.map((hora) => (
									<div key={hora} className="visitadora-calendario-fila">
										<span className="visitadora-hora">{horaDeFranja(hora)}</span>
										{diasVisibles.map(({ dia }) => (
											<div key={`${dia}-${hora}`} className="visitadora-calendario-celda">
												{(porFranja.get(`${dia} ${hora}`) ?? []).map(tarjetaCita)}
											</div>
										))}
									</div>
								))}
							</div>
						)}

						{vista === "mes" && (
							<div className="visitadora-mes">
								{diasDelMes.map((dia) => (
									<div
										key={dia}
										className={`visitadora-mes-celda ${dia === hoyEnMexico() ? "hoy" : ""}`}>
										<strong>{dia.slice(8, 10)}</strong>
										{(porDia.get(dia) ?? []).map((cita) => (
											<div key={cita.id_agenda} className="visitadora-recorte">
												{cita.medico_nombre}
											</div>
										))}
									</div>
								))}
							</div>
						)}

					</>
				)}

				{modal === "cita" && (
					<ModalCita
						isOpen
						cita={citaElegida}
						medicos={medicos}
						fecha={vista === "mes" ? primerDiaDelMes(fecha) : fecha}
						idEmpleado={empleadoData?.id_empleado}
						onClose={() => setModal(null)}
						onGuardado={(mensaje, guardada) => {
							setModal(null);
							seguirALaVisita(guardada);
							avisar(mensaje);
						}}
						onError={(mensaje) => avisar(mensaje, "error")}
					/>
				)}

				{modal === "editar-registro" && citaElegida && (
					<EditarVisitaRegistrada
						cita={citaElegida}
						medico={
							medicos.find((medico) => medico.id_doctor === citaElegida.id_doctor) ?? {
								nombre_completo: citaElegida.medico_nombre,
								especialidad: citaElegida.especialidad,
							}
						}
						idEmpleado={empleadoData?.id_empleado}
						onClose={() => setModal(null)}
						onGuardado={(mensaje) => {
							setModal(null);
							avisar(mensaje);
						}}
						onError={(mensaje) => avisar(mensaje, "error")}
					/>
				)}

				{modal === "registro" && citaElegida && (
					<ModalRegistroVisita
						isOpen
						cita={citaElegida}
						medico={
							medicos.find((medico) => medico.id_doctor === citaElegida.id_doctor) ?? {
								nombre_completo: citaElegida.medico_nombre,
								especialidad: citaElegida.especialidad,
							}
						}
						idEmpleado={empleadoData?.id_empleado}
						onClose={() => setModal(null)}
						onGuardado={(mensaje) => {
							setModal(null);
							avisar(mensaje);
						}}
						onError={(mensaje) => avisar(mensaje, "error")}
					/>
				)}

				<ModalConfirmarEliminacion
					isOpen={Boolean(citaAEliminar)}
					onClose={() => setCitaAEliminar(null)}
					onConfirm={async () => {
						try {
							await eliminar.mutateAsync(citaAEliminar.id_agenda);
							avisar("Visita eliminada de la agenda.");
						} catch (fallo) {
							avisar(fallo.message || "No se pudo eliminar la visita.", "error");
						} finally {
							setCitaAEliminar(null);
						}
					}}
					tipo="visita"
					nombreElemento={citaAEliminar?.medico_nombre ?? ""}
				/>

				<ModalNotificacion
					isOpen={notificacion.isOpen}
					onClose={() => setNotificacion({ ...notificacion, isOpen: false })}
					mensaje={notificacion.mensaje}
					tipo={notificacion.tipo}
				/>
			</div>
		</PageLayout>
	);
};

export default Agenda;
