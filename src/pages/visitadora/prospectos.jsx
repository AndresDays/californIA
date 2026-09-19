import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../components/page-layout.jsx";
import ModalNotificacion from "../../components/ModalNotificacion";
import { useEmpleadoActual } from "../../hooks/use-empleado-actual";
import { useDirectorioMedicos } from "../../hooks/use-directorio-medicos";
import { useVisitasMedicas } from "../../hooks/use-visitas-medicas";
import { coincideBusqueda } from "../../utils/crm-visitadora";
import ModalMedico from "./componentes/modal-medico";
import ModalConvenio from "./componentes/modal-convenio";
import "./visitadora.css";

const INTERES = { alto: "Interés alto", medio: "Interés medio", bajo: "Interés bajo" };

// El embudo: los prospectos ordenados por qué tan cerca están de firmar, para
// saber a quién vale la pena volver esta semana.
const Prospectos = () => {
	const { empleadoData, formatRol, getPrimerNombre } = useEmpleadoActual();
	const navegar = useNavigate();
	const { medicos, isLoading, error } = useDirectorioMedicos();
	const [busqueda, setBusqueda] = useState("");
	const [modal, setModal] = useState(null);
	const [elegido, setElegido] = useState(null);
	const [notificacion, setNotificacion] = useState({ isOpen: false, mensaje: "", tipo: "exito" });

	// Se cuentan las visitas de todo el histórico para saber cuántas veces se le
	// ha ido a ver a un prospecto antes de que decida.
	const { data: visitas = [] } = useVisitasMedicas({ desde: "2000-01-01", hasta: "2100-01-01" });

	const visitasPorDoctor = useMemo(() => {
		const conteo = new Map();
		for (const visita of visitas) {
			if (!visita.id_doctor) continue;
			conteo.set(visita.id_doctor, (conteo.get(visita.id_doctor) ?? 0) + 1);
		}
		return conteo;
	}, [visitas]);

	const prospectos = useMemo(
		() =>
			medicos
				.filter((medico) => medico.estatus === "prospecto" && coincideBusqueda(medico, busqueda))
				.sort((uno, otro) => (otro.probabilidad_cierre ?? 0) - (uno.probabilidad_cierre ?? 0)),
		[medicos, busqueda],
	);

	const avisar = (mensaje, tipo = "exito") => setNotificacion({ isOpen: true, mensaje, tipo });

	return (
		<PageLayout empleadoData={empleadoData} formatRol={formatRol} getPrimerNombre={getPrimerNombre}>
			<div className="visitadora-pagina">
				<div className="visitadora-encabezado">
					<h1 className="visitadora-titulo">Prospectos</h1>
					<div className="visitadora-acciones">
						<button
							type="button"
							className="visitadora-boton-primario"
							onClick={() => {
								setElegido(null);
								setModal("nuevo");
							}}>
							+ Nuevo prospecto
						</button>
					</div>
				</div>

				<div className="visitadora-barra-filtros">
					<input
						className="visitadora-buscador"
						type="search"
						aria-label="Buscar prospecto"
						placeholder="Buscar prospecto"
						value={busqueda}
						onChange={(evento) => setBusqueda(evento.target.value)}
					/>
					<span className="visitadora-ficha-dato">{prospectos.length} prospectos</span>
				</div>

				{error && <p className="visitadora-error">No se pudo cargar: {error.message}</p>}
				{isLoading && <p>Cargando…</p>}
				{!isLoading && prospectos.length === 0 && (
					<p className="visitadora-vacio">Todavía no hay prospectos capturados.</p>
				)}

				<div className="visitadora-lista">
					{prospectos.map((medico) => (
						<div key={medico.id_doctor} className="visitadora-ficha-medico">
							<button
								type="button"
								className="visitadora-ficha-nombre visitadora-enlace"
								onClick={() => navegar(`/visitadora/medico/${medico.id_doctor}`)}>
								{medico.nombre_completo}
							</button>
							<span className="visitadora-ficha-dato">{medico.especialidad || "Sin especialidad"}</span>
							{medico.hospital && <span className="visitadora-ficha-dato">{medico.hospital}</span>}
							{medico.telefono && <span className="visitadora-ficha-dato">Tel. {medico.telefono}</span>}
							{medico.origen_contacto && (
								<span className="visitadora-ficha-dato">Contacto: {medico.origen_contacto}</span>
							)}
							{medico.fecha_primer_contacto && (
								<span className="visitadora-ficha-dato">Primer contacto: {medico.fecha_primer_contacto}</span>
							)}
							<span className="visitadora-ficha-dato">
								{visitasPorDoctor.get(medico.id_doctor) ?? 0} visitas ·{" "}
								{medico.ultima_visita ? `última ${medico.ultima_visita}` : "sin visitas"}
							</span>
							{medico.servicios_ofrecidos && (
								<span className="visitadora-ficha-dato">Se le ofreció: {medico.servicios_ofrecidos}</span>
							)}
							<span className="visitadora-pastillas">
								{medico.interes && <span className="visitadora-pastilla">{INTERES[medico.interes]}</span>}
								{medico.probabilidad_cierre !== null && medico.probabilidad_cierre !== undefined && (
									<span className="visitadora-pastilla">{medico.probabilidad_cierre}% de cierre</span>
								)}
								{medico.zona && <span className="visitadora-pastilla">{medico.zona}</span>}
							</span>
							<button
								type="button"
								className="visitadora-enlace"
								onClick={() => {
									setElegido(medico);
									setModal("convenio");
								}}>
								✓ Convertir en médico activo
							</button>
						</div>
					))}
				</div>

				{modal === "nuevo" && (
					<ModalMedico
						isOpen
						idEmpleado={empleadoData?.id_empleado}
						onClose={() => setModal(null)}
						onGuardado={(mensaje, idDoctor) => {
							setModal(null);
							avisar(mensaje);
							if (idDoctor) navegar(`/visitadora/medico/${idDoctor}`);
						}}
						onError={(mensaje) => avisar(mensaje, "error")}
					/>
				)}

				{modal === "convenio" && elegido && (
					<ModalConvenio
						isOpen
						medico={elegido}
						idEmpleado={empleadoData?.id_empleado}
						onClose={() => setModal(null)}
						onGuardado={(mensaje) => {
							setModal(null);
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

export default Prospectos;
