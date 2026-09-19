import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../components/page-layout.jsx";
import { useEmpleadoActual } from "../../hooks/use-empleado-actual";
import { useDirectorioMedicos } from "../../hooks/use-directorio-medicos";
import { useAgendaVisitas } from "../../hooks/use-agenda-visitas";
import { useTareasSeguimiento } from "../../hooks/use-tareas-seguimiento";
import { useVisitasMedicas } from "../../hooks/use-visitas-medicas";
import { cumpleanosProximos, etiquetaTipoTarea, visitaVencida, proximaVisitaSugerida } from "../../utils/crm-visitadora";
import { hoyEnMexico, lunesDeLaSemana, rangoSemanaLaboral, sumarDias } from "../../utils/semanas-visitadora";
import "./visitadora.css";

// Lo primero que se ve al entrar: qué toca hoy y cómo va la semana. Cada
// tarjeta es un botón que lleva a su lista, para no tener que buscarla.
const Panel = () => {
	const { empleadoData, formatRol, getPrimerNombre } = useEmpleadoActual();
	const navegar = useNavigate();
	const hoy = hoyEnMexico();
	const semana = rangoSemanaLaboral(lunesDeLaSemana(hoy));
	// `getPrimerNombre` espera el nombre, no el empleado completo: pasarle el
	// objeto imprimía "Hola, [object Object]". Del nombre se toma la primera
	// palabra, que es como saluda el resto de la aplicación.
	const saludo = String(getPrimerNombre?.(empleadoData?.nombre) ?? "").trim().split(/\s+/)[0];

	const { medicos } = useDirectorioMedicos();
	const { data: citasHoy = [] } = useAgendaVisitas({ desde: hoy, hasta: hoy });
	const { data: citasSemana = [] } = useAgendaVisitas(semana);
	const { data: tareas = [] } = useTareasSeguimiento({ estado: "pendiente" });
	const { data: visitasSemana = [] } = useVisitasMedicas(semana);

	const pendientesHoy = useMemo(
		() => tareas.filter((tarea) => tarea.fecha_objetivo <= hoy),
		[tareas, hoy],
	);
	const llamadas = pendientesHoy.filter((tarea) => tarea.tipo === "llamada");
	const seguimientos = pendientesHoy.filter((tarea) => tarea.tipo === "seguimiento");
	const cumpleanos = useMemo(() => cumpleanosProximos(medicos, 7, hoy), [medicos, hoy]);

	// "Médicos por visitar": los activos cuya siguiente visita, según su propia
	// frecuencia, ya se pasó y no tienen nada agendado por delante.
	const porVisitar = useMemo(() => {
		const agendados = new Set(
			citasSemana
				.filter((cita) => cita.estatus === "programada")
				.map((cita) => cita.id_doctor),
		);
		return medicos.filter((medico) => {
			if (medico.estatus !== "activo" || agendados.has(medico.id_doctor)) return false;
			const ultima = medico.ultima_visita ?? null;
			const sugerida = proximaVisitaSugerida(ultima, medico.frecuencia_visita_dias);
			return sugerida ? visitaVencida(sugerida, hoy) : false;
		});
	}, [medicos, citasSemana, hoy]);

	const nuevosProspectos = useMemo(
		() =>
			medicos.filter(
				(medico) =>
					medico.estatus === "prospecto" &&
					String(medico.fecha_primer_contacto || "") >= semana.desde,
			).length,
		[medicos, semana.desde],
	);

	const conveniosSemana = useMemo(
		() =>
			medicos.filter(
				(medico) => String(medico.convenio?.vigente_desde || "") >= semana.desde,
			).length,
		[medicos, semana.desde],
	);

	const tarjeta = (clave, valor, destino) => (
		<button
			key={clave}
			type="button"
			className="visitadora-tarjeta accionable"
			onClick={() => navegar(destino)}>
			<span className="visitadora-tarjeta-clave">{clave}</span>
			<span className="visitadora-tarjeta-valor">{valor}</span>
		</button>
	);

	return (
		<PageLayout empleadoData={empleadoData} formatRol={formatRol} getPrimerNombre={getPrimerNombre}>
			<div className="visitadora-pagina">
				<div className="visitadora-encabezado">
					<h1 className="visitadora-titulo">
						Hola{saludo ? `, ${saludo}` : ""} · {hoy}
					</h1>
					<div className="visitadora-acciones">
						<button type="button" className="visitadora-boton-primario" onClick={() => navegar("/visitadora/agenda")}>
							Ver mi agenda
						</button>
						<button type="button" onClick={() => navegar("/visitadora/directorio")}>
							Directorio
						</button>
					</div>
				</div>

				<div className="visitadora-panel-bloque">
					<h2 className="visitadora-panel-titulo">Hoy</h2>
					<div className="visitadora-tarjetas">
						{tarjeta("Visitas programadas", citasHoy.filter((cita) => cita.estatus === "programada").length, "/visitadora/agenda")}
						{tarjeta("Seguimientos pendientes", seguimientos.length, "/visitadora/pendientes")}
						{tarjeta("Llamadas pendientes", llamadas.length, "/visitadora/pendientes")}
						{tarjeta("Médicos por visitar", porVisitar.length, "/visitadora/directorio")}
						{tarjeta("Cumpleaños de la semana", cumpleanos.length, "/visitadora/pendientes")}
						{tarjeta("Tareas pendientes", pendientesHoy.length, "/visitadora/pendientes")}
					</div>
				</div>

				{cumpleanos.some(({ faltan }) => faltan === 0) && (
					<div className="visitadora-historial">
						<p className="visitadora-historial-titulo">Hoy es su cumpleaños</p>
						<ul>
							{cumpleanos
								.filter(({ faltan }) => faltan === 0)
								.map(({ medico }) => (
									<li key={medico.id_doctor}>
										🎂 {medico.nombre_completo}
									</li>
								))}
						</ul>
					</div>
				)}

				<div className="visitadora-panel-bloque">
					<h2 className="visitadora-panel-titulo">Esta semana</h2>
					<div className="visitadora-tarjetas">
						{tarjeta("Visitas registradas", visitasSemana.length, "/visitadora/informe")}
						{tarjeta("Nuevos prospectos", nuevosProspectos, "/visitadora/prospectos")}
						{tarjeta("Convenios nuevos", conveniosSemana, "/visitadora/directorio")}
						{tarjeta("Visitas programadas", citasSemana.length, "/visitadora/agenda")}
						{tarjeta("Resultados registrados", visitasSemana.filter((visita) => visita.resultado).length, "/visitadora/reportes")}
					</div>
				</div>

				{pendientesHoy.length > 0 && (
					<div className="visitadora-historial">
						<p className="visitadora-historial-titulo">Lo primero de hoy</p>
						<ul>
							{pendientesHoy.slice(0, 6).map((tarea) => (
								<li key={tarea.id_tarea}>
									<strong>{etiquetaTipoTarea(tarea.tipo)}</strong>
									{tarea.medico_nombre ? ` · ${tarea.medico_nombre}` : ""}
									{tarea.fecha_objetivo < hoy ? ` · vencido desde el ${tarea.fecha_objetivo}` : ""}
								</li>
							))}
						</ul>
					</div>
				)}

				{citasHoy.length === 0 && pendientesHoy.length === 0 && (
					<p className="visitadora-vacio">
						Hoy no tienes nada agendado. Programa una visita desde la agenda o revisa a quién le
						toca seguimiento en el directorio.
					</p>
				)}

				<p className="visitadora-ficha-dato">
					Semana del {semana.desde} al {sumarDias(semana.desde, 6)}
				</p>
			</div>
		</PageLayout>
	);
};

export default Panel;
