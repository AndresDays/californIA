import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageLayout from "../../components/page-layout.jsx";
import ModalNotificacion from "../../components/ModalNotificacion";
import { useEmpleadoActual } from "../../hooks/use-empleado-actual";
import { useMedico, useGuardarVisorDicom } from "../../hooks/use-directorio-medicos";
import { useVisitasDeMedico } from "../../hooks/use-visitas-medicas";
import { useTareasDeMedico, useCompletarTarea } from "../../hooks/use-tareas-seguimiento";
import { useOrdenesEntregadas, useServiciosPorEspecialidad } from "../../hooks/use-ordenes-medicas";
import { useAgendaDeMedico } from "../../hooks/use-agenda-visitas";
import {
	ESTADOS_VISORDICOM,
	diasParaCumpleanos,
	enlaceMapa,
	enlaceWhatsApp,
	etiquetaConvenio,
	etiquetaVisorDicom,
	etiquetaEstatus,
	etiquetaTipoTarea,
	etiquetaTipoVisita,
	proximaVisitaSugerida,
} from "../../utils/crm-visitadora";
import { hoyEnMexico } from "../../utils/semanas-visitadora";
import ModalMedico from "./componentes/modal-medico";
import ModalRegistroVisita from "./componentes/modal-registro-visita";
import ModalConvenio from "./componentes/modal-convenio";
import ModalTarea from "./componentes/modal-tarea";
import ModalOrden from "./componentes/modal-orden";
import ModalCita from "./componentes/modal-cita";
import "./visitadora.css";

const PESTANAS = [
	{ id: "datos", etiqueta: "Datos" },
	{ id: "convenio", etiqueta: "Convenio" },
	{ id: "visitas", etiqueta: "Visitas" },
	{ id: "agenda", etiqueta: "Agenda" },
	{ id: "seguimientos", etiqueta: "Seguimientos" },
	{ id: "ordenes", etiqueta: "Órdenes" },
	{ id: "visordicom", etiqueta: "VisorDICOM" },
	{ id: "servicios", etiqueta: "Servicios" },
];

const dato = (etiqueta, valor) =>
	valor ? (
		<p className="visitadora-ficha-dato">
			<strong>{etiqueta}:</strong> {valor}
		</p>
	) : null;

const FichaMedico = () => {
	const { empleadoData, formatRol, getPrimerNombre } = useEmpleadoActual();
	const { idDoctor } = useParams();
	const navegar = useNavigate();
	const { medico, isLoading, error } = useMedico(idDoctor);
	const { data: visitas = [] } = useVisitasDeMedico(idDoctor);
	const { data: tareas = [] } = useTareasDeMedico(idDoctor);
	const { data: ordenes = [] } = useOrdenesEntregadas({ idDoctor });
	const { data: citas = [] } = useAgendaDeMedico(idDoctor);
	const { data: servicios = [] } = useServiciosPorEspecialidad(medico?.especialidad);
	const completarTarea = useCompletarTarea();
	const guardarVisorDicom = useGuardarVisorDicom();

	const [pestana, setPestana] = useState("datos");
	const [modal, setModal] = useState(null);
	const [notificacion, setNotificacion] = useState({ isOpen: false, mensaje: "", tipo: "exito" });

	const avisar = (mensaje, tipo = "exito") => setNotificacion({ isOpen: true, mensaje, tipo });
	const cerrarConAviso = (mensaje) => {
		setModal(null);
		avisar(mensaje);
	};

	const ultimaVisita = visitas[0]?.fecha ?? null;
	const proximaCita = useMemo(
		() =>
			citas
				.filter((cita) => cita.estatus === "programada" && cita.fecha >= hoyEnMexico())
				.sort((uno, otro) => uno.fecha.localeCompare(otro.fecha))[0] ?? null,
		[citas],
	);
	const faltanCumple = diasParaCumpleanos(medico?.fecha_nacimiento);

	if (isLoading) {
		return (
			<PageLayout empleadoData={empleadoData} formatRol={formatRol} getPrimerNombre={getPrimerNombre}>
				<div className="visitadora-pagina">Cargando expediente…</div>
			</PageLayout>
		);
	}

	if (error || !medico) {
		return (
			<PageLayout empleadoData={empleadoData} formatRol={formatRol} getPrimerNombre={getPrimerNombre}>
				<div className="visitadora-pagina">
					<p className="visitadora-error">
						{error
							? `No se pudo cargar el expediente: ${error.message}`
							: "Este médico no está en el catálogo, así que todavía no tiene expediente. " +
								"Pasa cuando la visita se capturó con el nombre escrito a mano: dalo de alta en " +
								"el directorio y sus visitas se le podrán ligar."}
					</p>
					<button type="button" onClick={() => navegar("/visitadora/directorio")}>
						Volver al directorio
					</button>
				</div>
			</PageLayout>
		);
	}

	const whatsapp = enlaceWhatsApp(medico.whatsapp || medico.telefono);
	const mapa = enlaceMapa(medico);

	return (
		<PageLayout empleadoData={empleadoData} formatRol={formatRol} getPrimerNombre={getPrimerNombre}>
			<div className="visitadora-pagina">
				<div className="visitadora-encabezado">
					<h1 className="visitadora-titulo">{medico.nombre_completo}</h1>
					<span className={`visitadora-pastilla ${medico.estatus}`}>{etiquetaEstatus(medico.estatus)}</span>
					<span className="visitadora-pastilla">{etiquetaConvenio(medico.tipo_convenio)}</span>
					<div className="visitadora-acciones">
						<button type="button" className="visitadora-boton-primario" onClick={() => setModal("visita")}>
							Registrar visita
						</button>
						<button type="button" onClick={() => setModal("cita")}>Programar</button>
						<button type="button" onClick={() => setModal("tarea")}>Pendiente</button>
						<button type="button" onClick={() => setModal("editar")}>Editar</button>
					</div>
				</div>

				<div className="visitadora-acciones-rapidas">
					{medico.telefono && <a href={`tel:${medico.telefono}`}>📞 Llamar</a>}
					{whatsapp && (
						<a href={whatsapp} target="_blank" rel="noreferrer">💬 WhatsApp</a>
					)}
					{medico.email && <a href={`mailto:${medico.email}`}>✉️ Correo</a>}
					{mapa && (
						<a href={mapa} target="_blank" rel="noreferrer">🗺️ Cómo llegar</a>
					)}
				</div>

				<div className="visitadora-tarjetas">
					<div className="visitadora-tarjeta">
						<span className="visitadora-tarjeta-clave">Última visita</span>
						<span className="visitadora-tarjeta-valor">{ultimaVisita ?? "—"}</span>
					</div>
					<div className="visitadora-tarjeta">
						<span className="visitadora-tarjeta-clave">Próxima visita</span>
						<span className="visitadora-tarjeta-valor">
							{proximaCita?.fecha ??
								proximaVisitaSugerida(ultimaVisita, medico.frecuencia_visita_dias) ??
								"—"}
						</span>
					</div>
					<div className="visitadora-tarjeta">
						<span className="visitadora-tarjeta-clave">Visitas registradas</span>
						<span className="visitadora-tarjeta-valor">{visitas.length}</span>
					</div>
					<div className="visitadora-tarjeta">
						<span className="visitadora-tarjeta-clave">Cumpleaños</span>
						<span className="visitadora-tarjeta-valor">
							{medico.fecha_nacimiento
								? faltanCumple === 0
									? "¡Hoy!"
									: `En ${faltanCumple} días`
								: "—"}
						</span>
					</div>
				</div>

				<div className="visitadora-pestanas" role="tablist">
					{PESTANAS.map((opcion) => (
						<button
							key={opcion.id}
							type="button"
							role="tab"
							aria-selected={pestana === opcion.id}
							onClick={() => setPestana(opcion.id)}>
							{opcion.etiqueta}
						</button>
					))}
				</div>

				{pestana === "datos" && (
					<div className="visitadora-historial">
						{dato("Especialidad", medico.especialidad)}
						{dato("Teléfono", medico.telefono)}
						{dato("WhatsApp", medico.whatsapp)}
						{dato("Correo", medico.email)}
						{dato("Hospital o clínica", medico.hospital)}
						{dato("Consultorio", medico.direccion_consultorio)}
						{dato("Zona", medico.zona)}
						{dato("Horario de consulta", medico.horario_consulta)}
						{dato("Cumpleaños", medico.fecha_nacimiento)}
						{dato("Frecuencia de visita", medico.frecuencia_visita_dias && `cada ${medico.frecuencia_visita_dias} días`)}
						{dato("Cómo se obtuvo el contacto", medico.origen_contacto)}
						{/* Las notas se acumulan con su fecha —cada visita programada
						    puede dejar una—, así que se respetan los renglones. */}
						{medico.notas && (
							<>
								<p className="visitadora-historial-titulo">Notas</p>
								<p className="visitadora-notas">{medico.notas}</p>
							</>
						)}
					</div>
				)}

				{pestana === "convenio" && (
					<div className="visitadora-historial">
						<p className="visitadora-historial-titulo">Convenio vigente</p>
						{medico.convenio ? (
							<>
								{dato("Tipo", etiquetaConvenio(medico.convenio.tipo))}
								{dato("Condiciones", medico.convenio.condiciones)}
								{dato("Vigente desde", medico.convenio.vigente_desde)}
								{dato("Órdenes", medico.convenio.usa_ordenes_clinica ? "De Clínica California" : "Propias del médico")}
								{dato("Puntos", medico.convenio.maneja_puntos ? "Sí maneja puntos" : "No maneja puntos")}
							</>
						) : (
							<p className="visitadora-ficha-dato">Todavía no tiene convenio registrado.</p>
						)}
						<div className="visitadora-modal-acciones">
							<button type="button" className="visitadora-boton-primario" onClick={() => setModal("convenio")}>
								{medico.convenio ? "Cambiar convenio" : "Registrar convenio"}
							</button>
						</div>
					</div>
				)}

				{pestana === "visitas" && (
					<div className="visitadora-lista">
						{visitas.length === 0 && <p className="visitadora-vacio">Sin visitas registradas.</p>}
						{visitas.map((visita) => (
							<div key={visita.id_visita} className="visitadora-ficha-medico">
								<span className="visitadora-ficha-nombre">{visita.fecha}</span>
								{visita.tipo_visita && (
									<span className="visitadora-ficha-dato">{etiquetaTipoVisita(visita.tipo_visita)}</span>
								)}
								{dato("Actividades", visita.actividades || visita.objetivo)}
								{dato("Comentarios del médico", visita.comentarios_medico)}
								{dato("Observaciones", visita.observaciones || visita.resultado)}
								{dato("Convenio", visita.tipo_convenio)}
								{dato("Seguimiento", visita.seguimiento)}
								{dato("Próximo seguimiento", visita.fecha_seguimiento)}
							</div>
						))}
					</div>
				)}

				{pestana === "agenda" && (
					<div className="visitadora-lista">
						{citas.length === 0 && <p className="visitadora-vacio">Sin visitas programadas.</p>}
						{citas.map((cita) => (
							<div key={cita.id_agenda} className="visitadora-ficha-medico">
								<span className="visitadora-ficha-nombre">
									{cita.fecha} {cita.hora ? cita.hora.slice(0, 5) : ""}
								</span>
								<span className="visitadora-ficha-dato">{etiquetaTipoVisita(cita.tipo_visita)}</span>
								{dato("Objetivo", cita.objetivo)}
								{dato("Resultado", cita.resultado)}
								<span className="visitadora-pastillas">
									<span className="visitadora-pastilla">{cita.estatus}</span>
								</span>
							</div>
						))}
					</div>
				)}

				{pestana === "seguimientos" && (
					<div className="visitadora-lista">
						{tareas.length === 0 && <p className="visitadora-vacio">Sin pendientes.</p>}
						{tareas.map((tarea) => (
							<div key={tarea.id_tarea} className="visitadora-ficha-medico">
								<span className="visitadora-ficha-nombre">{etiquetaTipoTarea(tarea.tipo)}</span>
								<span className="visitadora-ficha-dato">Para el {tarea.fecha_objetivo}</span>
								{dato("Detalle", tarea.descripcion)}
								<span className="visitadora-pastillas">
									<span className={`visitadora-pastilla ${tarea.estado}`}>{tarea.estado}</span>
								</span>
								{tarea.estado === "pendiente" && (
									<button
										type="button"
										className="visitadora-enlace"
										onClick={async () => {
											await completarTarea.mutateAsync({ idTarea: tarea.id_tarea });
											avisar("Pendiente marcado como hecho.");
										}}>
										Marcar como hecho
									</button>
								)}
							</div>
						))}
					</div>
				)}

				{pestana === "ordenes" && (
					<>
						<div className="visitadora-acciones">
							<button type="button" className="visitadora-boton-primario" onClick={() => setModal("orden")}>
								+ Registrar entrega
							</button>
						</div>
						<div className="visitadora-lista">
							{ordenes.length === 0 && <p className="visitadora-vacio">Sin órdenes entregadas.</p>}
							{ordenes.map((orden) => (
								<div key={orden.id_entrega} className="visitadora-ficha-medico">
									<span className="visitadora-ficha-nombre">
										{orden.cantidad} órdenes · {orden.fecha_entrega}
									</span>
									{dato("Tipo", orden.tipo_orden)}
									{dato("Folios", orden.folios)}
									{dato("Renovar el", orden.fecha_renovacion)}
									{dato("Observaciones", orden.observaciones)}
								</div>
							))}
						</div>
					</>
				)}

				{pestana === "visordicom" && (
					<div className="visitadora-historial">
						<p className="visitadora-historial-titulo">VisorDICOM</p>
						{dato("Estado", etiquetaVisorDicom(medico.visordicom?.estado ?? "pendiente"))}
						{dato("Usuario", medico.visordicom?.usuario)}
						{dato("Fecha de creación", medico.visordicom?.fecha_creacion)}
						<label htmlFor="visordicom-estado">Cambiar estado</label>
						<select
							id="visordicom-estado"
							value={medico.visordicom?.estado ?? "pendiente"}
							onChange={async (evento) => {
								await guardarVisorDicom.mutateAsync({
									id_doctor: medico.id_doctor,
									estado: evento.target.value,
									fecha_creacion:
										evento.target.value === "pendiente"
											? medico.visordicom?.fecha_creacion ?? null
											: medico.visordicom?.fecha_creacion ?? hoyEnMexico(),
									usuario: medico.visordicom?.usuario ?? null,
									id_empleado: empleadoData?.id_empleado ?? null,
								});
								avisar("VisorDICOM actualizado.");
							}}>
							{ESTADOS_VISORDICOM.map((estado) => (
								<option key={estado.valor} value={estado.valor}>{estado.etiqueta}</option>
							))}
						</select>
					</div>
				)}

				{pestana === "servicios" && (
					<div className="visitadora-historial">
						<p className="visitadora-historial-titulo">
							Qué ofrecerle a un médico de {medico.especialidad || "esta especialidad"}
						</p>
						{servicios.length === 0 ? (
							<p className="visitadora-ficha-dato">
								Todavía no hay servicios sugeridos para esta especialidad.
							</p>
						) : (
							<ul>
								{servicios.map((servicio) => (
									<li key={servicio.id_servicio}>
										<strong>{servicio.nombre_servicio}</strong> ({servicio.categoria})
										{servicio.descripcion ? ` — ${servicio.descripcion}` : ""}
									</li>
								))}
							</ul>
						)}
					</div>
				)}

				{modal === "editar" && (
					<ModalMedico
						isOpen
						medico={medico}
						idEmpleado={empleadoData?.id_empleado}
						onClose={() => setModal(null)}
						onGuardado={cerrarConAviso}
						onError={(mensaje) => avisar(mensaje, "error")}
					/>
				)}
				{modal === "visita" && (
					<ModalRegistroVisita
						isOpen
						medico={medico}
						cita={proximaCita}
						idEmpleado={empleadoData?.id_empleado}
						onClose={() => setModal(null)}
						onGuardado={cerrarConAviso}
						onError={(mensaje) => avisar(mensaje, "error")}
					/>
				)}
				{modal === "convenio" && (
					<ModalConvenio
						isOpen
						medico={medico}
						idEmpleado={empleadoData?.id_empleado}
						onClose={() => setModal(null)}
						onGuardado={cerrarConAviso}
						onError={(mensaje) => avisar(mensaje, "error")}
					/>
				)}
				{modal === "tarea" && (
					<ModalTarea
						isOpen
						medico={medico}
						idEmpleado={empleadoData?.id_empleado}
						onClose={() => setModal(null)}
						onGuardado={cerrarConAviso}
						onError={(mensaje) => avisar(mensaje, "error")}
					/>
				)}
				{modal === "orden" && (
					<ModalOrden
						isOpen
						medico={medico}
						idEmpleado={empleadoData?.id_empleado}
						onClose={() => setModal(null)}
						onGuardado={cerrarConAviso}
						onError={(mensaje) => avisar(mensaje, "error")}
					/>
				)}
				{modal === "cita" && (
					<ModalCita
						isOpen
						medico={medico}
						fecha={hoyEnMexico()}
						idEmpleado={empleadoData?.id_empleado}
						onClose={() => setModal(null)}
						onGuardado={cerrarConAviso}
						onError={(mensaje) => avisar(mensaje, "error")}
					/>
				)}

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

export default FichaMedico;
