import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../components/page-layout.jsx";
import ModalNotificacion from "../../components/ModalNotificacion";
import { useEmpleadoActual } from "../../hooks/use-empleado-actual";
import { useDirectorioMedicos } from "../../hooks/use-directorio-medicos";
import { usePacientesReferidos } from "../../hooks/use-pacientes-referidos";
import {
	construirReferidos,
	exportarReferidosExcel,
	totalesReferidos,
} from "../../utils/pacientes-referidos";
import { coincideBusqueda, etiquetaConvenio } from "../../utils/crm-visitadora";
import { hoyEnMexico, lunesDeLaSemana, sumarDias } from "../../utils/semanas-visitadora";
import "./visitadora.css";

const primerDiaDelMes = (fecha) => `${fecha.slice(0, 7)}-01`;

// Los tres rangos que ella pide de memoria; para cualquier otro están los dos
// campos de fecha, que es lo que se guarda como filtro real.
const ATAJOS = [
	{ id: "mes", etiqueta: "Este mes" },
	{ id: "semana", etiqueta: "Esta semana" },
	{ id: "anio", etiqueta: "Este año" },
];

const pesos = (valor) =>
	Number(valor).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

const Referidos = () => {
	const { empleadoData, formatRol, getPrimerNombre } = useEmpleadoActual();
	const navegar = useNavigate();
	const hoy = hoyEnMexico();
	const [rango, setRango] = useState({ desde: primerDiaDelMes(hoy), hasta: hoy });
	const [busqueda, setBusqueda] = useState("");
	const [notificacion, setNotificacion] = useState({ isOpen: false, mensaje: "", tipo: "exito" });

	const { medicos } = useDirectorioMedicos();
	const { data: ventas = [], isLoading, error } = usePacientesReferidos(rango);

	const filas = useMemo(() => construirReferidos({ ventas, medicos }), [ventas, medicos]);
	const visibles = useMemo(
		() => filas.filter((fila) => coincideBusqueda({ nombre_completo: fila.nombre, especialidad: fila.especialidad, zona: fila.zona }, busqueda)),
		[filas, busqueda],
	);
	const totales = useMemo(() => totalesReferidos(visibles), [visibles]);

	const aplicarAtajo = (id) => {
		if (id === "semana") return setRango({ desde: lunesDeLaSemana(hoy), hasta: hoy });
		if (id === "anio") return setRango({ desde: `${hoy.slice(0, 4)}-01-01`, hasta: hoy });
		return setRango({ desde: primerDiaDelMes(hoy), hasta: hoy });
	};

	const exportar = () => {
		try {
			exportarReferidosExcel(visibles, rango, `Pacientes_referidos_${rango.desde}_a_${rango.hasta}`);
		} catch (fallo) {
			setNotificacion({
				isOpen: true,
				mensaje: fallo.message || "No se pudo generar el archivo.",
				tipo: "error",
			});
		}
	};

	return (
		<PageLayout empleadoData={empleadoData} formatRol={formatRol} getPrimerNombre={getPrimerNombre}>
			<div className="visitadora-pagina">
				<div className="visitadora-encabezado">
					<h1 className="visitadora-titulo">Pacientes referidos por médico</h1>
					<div className="visitadora-acciones">
						{ATAJOS.map((atajo) => (
							<button key={atajo.id} type="button" onClick={() => aplicarAtajo(atajo.id)}>
								{atajo.etiqueta}
							</button>
						))}
						<button type="button" className="visitadora-boton-primario" onClick={exportar}>
							Exportar Excel
						</button>
					</div>
				</div>

				<div className="visitadora-barra-filtros">
					<label htmlFor="referidos-desde" className="visitadora-ficha-dato">Desde</label>
					<input
						id="referidos-desde"
						type="date"
						value={rango.desde}
						max={rango.hasta}
						onChange={(evento) => setRango({ ...rango, desde: evento.target.value })}
					/>
					<label htmlFor="referidos-hasta" className="visitadora-ficha-dato">Hasta</label>
					<input
						id="referidos-hasta"
						type="date"
						value={rango.hasta}
						min={rango.desde}
						onChange={(evento) => setRango({ ...rango, hasta: evento.target.value })}
					/>
					<input
						className="visitadora-buscador"
						type="search"
						aria-label="Buscar médico"
						placeholder="Buscar médico, especialidad o zona"
						value={busqueda}
						onChange={(evento) => setBusqueda(evento.target.value)}
					/>
				</div>

				<div className="visitadora-tarjetas">
					<div className="visitadora-tarjeta">
						<span className="visitadora-tarjeta-clave">Médicos que refirieron</span>
						<span className="visitadora-tarjeta-valor">{totales.medicos}</span>
					</div>
					<div className="visitadora-tarjeta">
						<span className="visitadora-tarjeta-clave">Pacientes referidos</span>
						<span className="visitadora-tarjeta-valor">{totales.pacientes}</span>
					</div>
					<div className="visitadora-tarjeta">
						<span className="visitadora-tarjeta-clave">Órdenes</span>
						<span className="visitadora-tarjeta-valor">{totales.ordenes}</span>
					</div>
					<div className="visitadora-tarjeta">
						<span className="visitadora-tarjeta-clave">Facturado</span>
						<span className="visitadora-tarjeta-valor">{pesos(totales.facturado)}</span>
					</div>
				</div>

				{error && <p className="visitadora-error">No se pudo cargar: {error.message}</p>}
				{isLoading && <p>Cargando…</p>}
				{!isLoading && visibles.length === 0 && (
					<p className="visitadora-vacio">
						Ningún médico refirió pacientes en estas fechas.
					</p>
				)}

				<div className="visitadora-tabla-contenedor">
					<table className="visitadora-tabla informe">
						<thead>
							<tr>
								<th>Médico</th>
								<th>Especialidad</th>
								<th>Zona</th>
								<th>Convenio</th>
								<th>Pacientes</th>
								<th>Órdenes</th>
								<th>Facturado</th>
							</tr>
						</thead>
						<tbody>
							{visibles.map((fila) => (
								<tr key={fila.id_doctor}>
									<td>
										<button
											type="button"
											className="visitadora-enlace"
											onClick={() => navegar(`/visitadora/medico/${fila.id_doctor}`)}>
											{fila.nombre}
										</button>
									</td>
									<td>{fila.especialidad}</td>
									<td>{fila.zona}</td>
									<td>{fila.tipo_convenio ? etiquetaConvenio(fila.tipo_convenio) : ""}</td>
									<td>{fila.pacientes}</td>
									<td>{fila.ordenes}</td>
									<td>{pesos(fila.facturado)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				<p className="visitadora-ficha-dato">
					Del {rango.desde} al {rango.hasta} · {sumarDias(rango.hasta, 0) === hoy ? "incluye hoy" : "periodo cerrado"}
				</p>

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

export default Referidos;
