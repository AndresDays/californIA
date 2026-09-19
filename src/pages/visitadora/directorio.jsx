import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../components/page-layout.jsx";
import ModalNotificacion from "../../components/ModalNotificacion";
import { useEmpleadoActual } from "../../hooks/use-empleado-actual";
import { useDirectorioMedicos } from "../../hooks/use-directorio-medicos";
import {
	ESTATUS_MEDICO,
	TIPOS_CONVENIO,
	coincideBusqueda,
	cumpleHoy,
	etiquetaConvenio,
	etiquetaEstatus,
} from "../../utils/crm-visitadora";
import { hoyEnMexico } from "../../utils/semanas-visitadora";
import ModalMedico from "./componentes/modal-medico";
import "./visitadora.css";

const opciones = (medicos, campo) =>
	[...new Set(medicos.map((medico) => String(medico?.[campo] || "").trim()).filter(Boolean))].sort();

const Directorio = () => {
	const { empleadoData, formatRol, getPrimerNombre } = useEmpleadoActual();
	const navegar = useNavigate();
	const { medicos, isLoading, error } = useDirectorioMedicos();
	const [busqueda, setBusqueda] = useState("");
	const [filtros, setFiltros] = useState({
		especialidad: "",
		zona: "",
		hospital: "",
		convenio: "",
		estatus: "",
		cumpleanos: "",
	});
	const [modalAbierto, setModalAbierto] = useState(false);
	const [notificacion, setNotificacion] = useState({ isOpen: false, mensaje: "", tipo: "exito" });

	const hoy = hoyEnMexico();
	const mesActual = hoy.slice(5, 7);

	const cambiarFiltro = (campo) => (evento) =>
		setFiltros((previos) => ({ ...previos, [campo]: evento.target.value }));

	const visibles = useMemo(
		() =>
			medicos.filter((medico) => {
				if (!coincideBusqueda(medico, busqueda)) return false;
				if (filtros.especialidad && medico.especialidad !== filtros.especialidad) return false;
				if (filtros.zona && medico.zona !== filtros.zona) return false;
				if (filtros.hospital && medico.hospital !== filtros.hospital) return false;
				if (filtros.convenio && medico.tipo_convenio !== filtros.convenio) return false;
				if (filtros.estatus && medico.estatus !== filtros.estatus) return false;
				if (filtros.cumpleanos === "mes") {
					return String(medico.fecha_nacimiento || "").slice(5, 7) === mesActual;
				}
				if (filtros.cumpleanos === "hoy") return cumpleHoy(medico.fecha_nacimiento, hoy);
				return true;
			}),
		[medicos, busqueda, filtros, mesActual, hoy],
	);

	return (
		<PageLayout
			empleadoData={empleadoData}
			formatRol={formatRol}
			getPrimerNombre={getPrimerNombre}>
			<div className="visitadora-pagina">
				<div className="visitadora-encabezado">
					<h1 className="visitadora-titulo">Directorio médico</h1>
					<div className="visitadora-acciones">
						<button
							type="button"
							className="visitadora-boton-primario"
							onClick={() => setModalAbierto(true)}>
							+ Nuevo médico
						</button>
					</div>
				</div>

				<div className="visitadora-barra-filtros">
					<input
						className="visitadora-buscador"
						type="search"
						placeholder="Buscar por nombre, especialidad, hospital o teléfono"
						aria-label="Buscar médico"
						value={busqueda}
						onChange={(evento) => setBusqueda(evento.target.value)}
					/>
					<select aria-label="Especialidad" value={filtros.especialidad} onChange={cambiarFiltro("especialidad")}>
						<option value="">Todas las especialidades</option>
						{opciones(medicos, "especialidad").map((valor) => (
							<option key={valor} value={valor}>{valor}</option>
						))}
					</select>
					<select aria-label="Zona" value={filtros.zona} onChange={cambiarFiltro("zona")}>
						<option value="">Todas las zonas</option>
						{opciones(medicos, "zona").map((valor) => (
							<option key={valor} value={valor}>{valor}</option>
						))}
					</select>
					<select aria-label="Hospital" value={filtros.hospital} onChange={cambiarFiltro("hospital")}>
						<option value="">Todos los hospitales</option>
						{opciones(medicos, "hospital").map((valor) => (
							<option key={valor} value={valor}>{valor}</option>
						))}
					</select>
					<select aria-label="Convenio" value={filtros.convenio} onChange={cambiarFiltro("convenio")}>
						<option value="">Todos los convenios</option>
						{TIPOS_CONVENIO.map((tipo) => (
							<option key={tipo.valor} value={tipo.valor}>{tipo.etiqueta}</option>
						))}
					</select>
					<select aria-label="Estatus" value={filtros.estatus} onChange={cambiarFiltro("estatus")}>
						<option value="">Todos los estatus</option>
						{ESTATUS_MEDICO.map((estatus) => (
							<option key={estatus.valor} value={estatus.valor}>{estatus.etiqueta}</option>
						))}
					</select>
					<select aria-label="Cumpleaños" value={filtros.cumpleanos} onChange={cambiarFiltro("cumpleanos")}>
						<option value="">Cumpleaños: todos</option>
						<option value="hoy">Cumplen hoy</option>
						<option value="mes">Cumplen este mes</option>
					</select>
				</div>

				{error && <p className="visitadora-error">No se pudo cargar el directorio: {error.message}</p>}
				{isLoading && <p>Cargando…</p>}

				{!isLoading && visibles.length === 0 && (
					<p className="visitadora-vacio">
						Ningún médico coincide con lo que buscas. Cambia los filtros o da de alta uno nuevo.
					</p>
				)}

				<p className="visitadora-ficha-dato">{visibles.length} médicos</p>

				<div className="visitadora-lista">
					{visibles.map((medico) => (
						<button
							key={medico.id_doctor}
							type="button"
							className="visitadora-ficha-medico"
							onClick={() => navegar(`/visitadora/medico/${medico.id_doctor}`)}>
							<span className="visitadora-ficha-nombre">{medico.nombre_completo}</span>
							<span className="visitadora-ficha-dato">{medico.especialidad || "Sin especialidad"}</span>
							{medico.hospital && <span className="visitadora-ficha-dato">{medico.hospital}</span>}
							{medico.telefono && <span className="visitadora-ficha-dato">Tel. {medico.telefono}</span>}
							<span className="visitadora-pastillas">
								<span className={`visitadora-pastilla ${medico.estatus}`}>
									{etiquetaEstatus(medico.estatus)}
								</span>
								<span className="visitadora-pastilla">{etiquetaConvenio(medico.tipo_convenio)}</span>
								{medico.zona && <span className="visitadora-pastilla">{medico.zona}</span>}
								{cumpleHoy(medico.fecha_nacimiento, hoy) && (
									<span className="visitadora-pastilla vencido">🎂 Hoy cumple años</span>
								)}
							</span>
						</button>
					))}
				</div>

				{modalAbierto && (
					<ModalMedico
						isOpen={modalAbierto}
						idEmpleado={empleadoData?.id_empleado}
						onClose={() => setModalAbierto(false)}
						onGuardado={(mensaje, idDoctor) => {
							setModalAbierto(false);
							setNotificacion({ isOpen: true, mensaje, tipo: "exito" });
							if (idDoctor) navegar(`/visitadora/medico/${idDoctor}`);
						}}
						onError={(mensaje) => setNotificacion({ isOpen: true, mensaje, tipo: "error" })}
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

export default Directorio;
