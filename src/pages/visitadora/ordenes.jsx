import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../components/page-layout.jsx";
import ModalNotificacion from "../../components/ModalNotificacion";
import { useEmpleadoActual } from "../../hooks/use-empleado-actual";
import { useDirectorioMedicos, useGuardarEbudaicom } from "../../hooks/use-directorio-medicos";
import { useOrdenesEntregadas } from "../../hooks/use-ordenes-medicas";
import { ESTADOS_EBUDAICOM, etiquetaEbudaicom } from "../../utils/crm-visitadora";
import { hoyEnMexico, sumarDias } from "../../utils/semanas-visitadora";
import ModalOrden from "./componentes/modal-orden";
import "./visitadora.css";

// Dos controles que se llevan igual: talonarios entregados y usuarios de
// eBudaicom. Comparten pantalla porque son las dos listas de "a quién le falta
// algo" que ella revisa antes de salir a la ruta.
const Ordenes = () => {
	const { empleadoData, formatRol, getPrimerNombre } = useEmpleadoActual();
	const navegar = useNavigate();
	const hoy = hoyEnMexico();
	const [pestana, setPestana] = useState("ordenes");
	const [modalAbierto, setModalAbierto] = useState(false);
	const [notificacion, setNotificacion] = useState({ isOpen: false, mensaje: "", tipo: "exito" });

	const { medicos } = useDirectorioMedicos();
	const { data: entregas = [], isLoading, error } = useOrdenesEntregadas({});
	const guardarEbudaicom = useGuardarEbudaicom();

	const avisar = (mensaje, tipo = "exito") => setNotificacion({ isOpen: true, mensaje, tipo });

	const nombrePorId = useMemo(
		() => new Map(medicos.map((medico) => [medico.id_doctor, medico.nombre_completo])),
		[medicos],
	);

	// Por renovar: lo que ya venció y lo que vence en los próximos quince días,
	// que es lo que alcanza a surtir antes de que el médico se quede sin hojas.
	const porRenovar = useMemo(() => {
		const limite = sumarDias(hoy, 15);
		return entregas
			.filter((entrega) => entrega.fecha_renovacion && entrega.fecha_renovacion <= limite)
			.sort((uno, otro) => uno.fecha_renovacion.localeCompare(otro.fecha_renovacion));
	}, [entregas, hoy]);

	const pendientesEbudaicom = useMemo(
		() => medicos.filter((medico) => (medico.ebudaicom?.estado ?? "pendiente") === "pendiente"),
		[medicos],
	);

	return (
		<PageLayout empleadoData={empleadoData} formatRol={formatRol} getPrimerNombre={getPrimerNombre}>
			<div className="visitadora-pagina">
				<div className="visitadora-encabezado">
					<h1 className="visitadora-titulo">Órdenes y eBudaicom</h1>
					<div className="visitadora-acciones">
						<button type="button" className="visitadora-boton-primario" onClick={() => setModalAbierto(true)}>
							+ Registrar entrega
						</button>
					</div>
				</div>

				<div className="visitadora-pestanas" role="tablist">
					<button type="button" role="tab" aria-selected={pestana === "ordenes"} onClick={() => setPestana("ordenes")}>
						Órdenes entregadas
					</button>
					<button type="button" role="tab" aria-selected={pestana === "renovar"} onClick={() => setPestana("renovar")}>
						Por renovar ({porRenovar.length})
					</button>
					<button type="button" role="tab" aria-selected={pestana === "ebudaicom"} onClick={() => setPestana("ebudaicom")}>
						eBudaicom ({pendientesEbudaicom.length} pendientes)
					</button>
				</div>

				{error && <p className="visitadora-error">No se pudieron cargar las entregas: {error.message}</p>}
				{isLoading && <p>Cargando…</p>}

				{(pestana === "ordenes" || pestana === "renovar") && (
					<div className="visitadora-lista">
						{(pestana === "ordenes" ? entregas : porRenovar).length === 0 && (
							<p className="visitadora-vacio">
								{pestana === "ordenes"
									? "Todavía no hay entregas registradas."
									: "Nadie tiene órdenes por renovar en los próximos quince días."}
							</p>
						)}
						{(pestana === "ordenes" ? entregas : porRenovar).map((entrega) => (
							<div key={entrega.id_entrega} className="visitadora-ficha-medico">
								<button
									type="button"
									className="visitadora-ficha-nombre visitadora-enlace"
									onClick={() => navegar(`/visitadora/medico/${entrega.id_doctor}`)}>
									{nombrePorId.get(entrega.id_doctor) ?? `Médico ${entrega.id_doctor}`}
								</button>
								<span className="visitadora-ficha-dato">
									{entrega.cantidad} órdenes entregadas el {entrega.fecha_entrega}
								</span>
								{entrega.tipo_orden && <span className="visitadora-ficha-dato">{entrega.tipo_orden}</span>}
								{entrega.folios && <span className="visitadora-ficha-dato">Folios: {entrega.folios}</span>}
								{entrega.fecha_renovacion && (
									<span className="visitadora-pastillas">
										<span
											className={`visitadora-pastilla ${entrega.fecha_renovacion < hoy ? "vencido" : "pendiente"}`}>
											{entrega.fecha_renovacion < hoy
												? `Vencido desde ${entrega.fecha_renovacion}`
												: `Renovar el ${entrega.fecha_renovacion}`}
										</span>
									</span>
								)}
								{entrega.observaciones && (
									<span className="visitadora-ficha-dato">{entrega.observaciones}</span>
								)}
							</div>
						))}
					</div>
				)}

				{pestana === "ebudaicom" && (
					<div className="visitadora-lista">
						{medicos.length === 0 && <p className="visitadora-vacio">El directorio está vacío.</p>}
						{medicos.map((medico) => (
							<div key={medico.id_doctor} className="visitadora-ficha-medico">
								<button
									type="button"
									className="visitadora-ficha-nombre visitadora-enlace"
									onClick={() => navegar(`/visitadora/medico/${medico.id_doctor}`)}>
									{medico.nombre_completo}
								</button>
								<span className="visitadora-ficha-dato">
									{etiquetaEbudaicom(medico.ebudaicom?.estado ?? "pendiente")}
									{medico.ebudaicom?.fecha_creacion ? ` · desde ${medico.ebudaicom.fecha_creacion}` : ""}
								</span>
								<label htmlFor={`ebudaicom-${medico.id_doctor}`} className="visitadora-ficha-dato">
									Estado
								</label>
								<select
									id={`ebudaicom-${medico.id_doctor}`}
									value={medico.ebudaicom?.estado ?? "pendiente"}
									onChange={async (evento) => {
										try {
											await guardarEbudaicom.mutateAsync({
												id_doctor: medico.id_doctor,
												estado: evento.target.value,
												usuario: medico.ebudaicom?.usuario ?? null,
												fecha_creacion:
													evento.target.value === "pendiente"
														? medico.ebudaicom?.fecha_creacion ?? null
														: medico.ebudaicom?.fecha_creacion ?? hoy,
												id_empleado: empleadoData?.id_empleado ?? null,
											});
											avisar("eBudaicom actualizado.");
										} catch (fallo) {
											avisar(fallo.message || "No se pudo actualizar.", "error");
										}
									}}>
									{ESTADOS_EBUDAICOM.map((estado) => (
										<option key={estado.valor} value={estado.valor}>{estado.etiqueta}</option>
									))}
								</select>
							</div>
						))}
					</div>
				)}

				{modalAbierto && (
					<ModalOrden
						isOpen
						medicos={medicos}
						idEmpleado={empleadoData?.id_empleado}
						onClose={() => setModalAbierto(false)}
						onGuardado={(mensaje) => {
							setModalAbierto(false);
							avisar(mensaje);
						}}
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

export default Ordenes;
