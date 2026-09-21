import { useMemo, useState } from "react";
import PageLayout from "../../components/page-layout.jsx";
import ModalNotificacion from "../../components/ModalNotificacion";
import { useEmpleadoActual } from "../../hooks/use-empleado-actual";
import { useDirectorioMedicos } from "../../hooks/use-directorio-medicos";
import { useVisitasMedicas } from "../../hooks/use-visitas-medicas";
import { useTareasSeguimiento } from "../../hooks/use-tareas-seguimiento";
import { useOrdenesEntregadas } from "../../hooks/use-ordenes-medicas";
import {
	RENGLONES_RESUMEN,
	construirReporte,
	conveniosCapturados,
	exportarReporteExcel,
	exportarReportePdf,
} from "../../utils/reporte-crm";
import { etiquetaTipoVisita } from "../../utils/crm-visitadora";
import { hoyEnMexico, lunesDeLaSemana, sumarDias } from "../../utils/semanas-visitadora";
import "./visitadora.css";

const PERIODOS = [
	{ id: "dia", etiqueta: "Día" },
	{ id: "semana", etiqueta: "Semana" },
	{ id: "mes", etiqueta: "Mes" },
	{ id: "libre", etiqueta: "Personalizado" },
];

const rangoDe = (periodo, fecha) => {
	if (periodo === "dia") return { desde: fecha, hasta: fecha };
	if (periodo === "mes") {
		const primero = `${fecha.slice(0, 7)}-01`;
		const [anio, mes] = primero.split("-").map(Number);
		const siguiente = new Date(Date.UTC(anio, mes, 1)).toISOString().slice(0, 10);
		return { desde: primero, hasta: sumarDias(siguiente, -1) };
	}
	const lunes = lunesDeLaSemana(fecha);
	return { desde: lunes, hasta: sumarDias(lunes, 6) };
};

const Reportes = () => {
	const { empleadoData, formatRol, getPrimerNombre } = useEmpleadoActual();
	const [periodo, setPeriodo] = useState("semana");
	const [fecha, setFecha] = useState(hoyEnMexico());
	const [libre, setLibre] = useState({ desde: hoyEnMexico(), hasta: hoyEnMexico() });
	const [filtros, setFiltros] = useState({ idDoctor: "", especialidad: "", zona: "", tipoConvenio: "" });
	const [notificacion, setNotificacion] = useState({ isOpen: false, mensaje: "", tipo: "exito" });

	const rango = periodo === "libre" ? libre : rangoDe(periodo, fecha);

	const { medicos } = useDirectorioMedicos();
	// El histórico completo hace falta para dos cosas: saber si un médico es
	// nuevo (su primera visita de siempre) y llenar los filtros de convenio.
	const { data: historico = [], isLoading, error } = useVisitasMedicas({
		desde: "2000-01-01",
		hasta: "2100-01-01",
	});
	const { data: tareas = [] } = useTareasSeguimiento({});
	const { data: ordenes = [] } = useOrdenesEntregadas({});

	const convenios = useMemo(
		() => medicos.map((medico) => medico.convenio).filter(Boolean),
		[medicos],
	);

	const reporte = useMemo(
		() =>
			construirReporte({
				desde: rango.desde,
				hasta: rango.hasta,
				visitas: historico,
				historicoVisitas: historico,
				tareas,
				ordenes,
				convenios,
				medicos,
				filtros,
			}),
		[rango.desde, rango.hasta, historico, tareas, ordenes, convenios, medicos, filtros],
	);

	const opciones = (campo) =>
		[...new Set(historico.map((visita) => String(visita[campo] || "").trim()).filter(Boolean))].sort();

	const cambiarFiltro = (campo) => (evento) =>
		setFiltros((previos) => ({ ...previos, [campo]: evento.target.value }));

	const exportar = (formato) => {
		try {
			const nombre = `Reporte_${rango.desde}_a_${rango.hasta}`;
			if (formato === "excel") exportarReporteExcel(reporte, nombre);
			else exportarReportePdf(reporte, nombre);
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
					<h1 className="visitadora-titulo">Reportes</h1>
					<div className="visitadora-acciones">
						{PERIODOS.map((opcion) => (
							<button
								key={opcion.id}
								type="button"
								className={periodo === opcion.id ? "visitadora-boton-primario" : ""}
								onClick={() => setPeriodo(opcion.id)}>
								{opcion.etiqueta}
							</button>
						))}
						<button type="button" onClick={() => exportar("excel")}>Exportar Excel</button>
						<button type="button" onClick={() => exportar("pdf")}>Exportar PDF</button>
					</div>
				</div>

				<div className="visitadora-barra-filtros">
					{periodo === "libre" ? (
						<>
							<input
								type="date"
								aria-label="Desde"
								value={libre.desde}
								onChange={(evento) => setLibre({ ...libre, desde: evento.target.value })}
							/>
							<input
								type="date"
								aria-label="Hasta"
								value={libre.hasta}
								onChange={(evento) => setLibre({ ...libre, hasta: evento.target.value })}
							/>
						</>
					) : (
						<input
							type="date"
							aria-label="Fecha del reporte"
							value={fecha}
							onChange={(evento) => setFecha(evento.target.value)}
						/>
					)}
					<select aria-label="Médico" value={filtros.idDoctor} onChange={cambiarFiltro("idDoctor")}>
						<option value="">Todos los médicos</option>
						{medicos.map((medico) => (
							<option key={medico.id_doctor} value={medico.id_doctor}>{medico.nombre_completo}</option>
						))}
					</select>
					<select aria-label="Especialidad" value={filtros.especialidad} onChange={cambiarFiltro("especialidad")}>
						<option value="">Todas las especialidades</option>
						{opciones("especialidad").map((valor) => (
							<option key={valor} value={valor}>{valor}</option>
						))}
					</select>
					<select aria-label="Zona" value={filtros.zona} onChange={cambiarFiltro("zona")}>
						<option value="">Todas las zonas</option>
						{opciones("zona").map((valor) => (
							<option key={valor} value={valor}>{valor}</option>
						))}
					</select>
					<select aria-label="Tipo de convenio" value={filtros.tipoConvenio} onChange={cambiarFiltro("tipoConvenio")}>
						<option value="">Todos los convenios</option>
						{conveniosCapturados(historico).map((valor) => (
							<option key={valor} value={valor}>{valor}</option>
						))}
					</select>
				</div>

				<p className="visitadora-ficha-dato">
					Del {rango.desde} al {rango.hasta}
				</p>

				{error && <p className="visitadora-error">No se pudo cargar: {error.message}</p>}
				{isLoading && <p>Cargando…</p>}

				<div className="visitadora-tarjetas">
					{RENGLONES_RESUMEN.map(([etiqueta, clave]) => (
						<div key={clave} className="visitadora-tarjeta">
							<span className="visitadora-tarjeta-clave">{etiqueta}</span>
							<span className="visitadora-tarjeta-valor">{reporte[clave]}</span>
						</div>
					))}
				</div>

				<div className="visitadora-tabla-contenedor">
					<table className="visitadora-tabla informe">
						<thead>
							<tr>
								<th>Fecha</th>
								<th>Médico</th>
								<th>Especialidad</th>
								<th>Zona</th>
								<th>Tipo</th>
								<th>Actividades</th>
								<th>Observaciones</th>
								<th>Convenio</th>
							</tr>
						</thead>
						<tbody>
							{reporte.detalle.length === 0 && (
								<tr>
									<td colSpan={8}>No hay visitas en este periodo con esos filtros.</td>
								</tr>
							)}
							{reporte.detalle.map((visita) => (
								<tr key={visita.id_visita}>
									<td>{visita.fecha}</td>
									<td>{visita.medico_nombre}</td>
									<td>{visita.especialidad}</td>
									<td>{visita.zona}</td>
									<td>{visita.tipo_visita ? etiquetaTipoVisita(visita.tipo_visita) : ""}</td>
									<td className="visitadora-celda-larga">
										<div className="visitadora-recorte">{visita.actividades || visita.objetivo}</div>
									</td>
									<td className="visitadora-celda-larga">
										<div className="visitadora-recorte">{visita.observaciones || visita.resultado}</div>
									</td>
									<td className="visitadora-celda-convenio">{visita.tipo_convenio}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

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

export default Reportes;
