import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import PageLayout from "../../components/page-layout.jsx";
import ModalNotificacion from "../../components/ModalNotificacion";
import ModalConfirmarEliminacion from "../../components/ModalConfirmarEliminacion";
import { useEmpleadoActual } from "../../hooks/use-empleado-actual";
import {
	useEliminarVisita,
	useImportarVisitas,
	useVisitasMedicas,
} from "../../hooks/use-visitas-medicas";
import { useDoctores } from "../../hooks/use-doctores";
import { leerInformeVisitas } from "../../utils/importar-informe-visitas";
import { exportarInformeVisitas } from "../../utils/exportar-informe-visitas";
import {
	etiquetaSemana,
	hoyEnMexico,
	lunesDeLaSemana,
	rangoSemanaLaboral,
	semanaDesplazada,
} from "../../utils/semanas-visitadora";
import { nombreDoctor } from "../../utils/comisiones-medicos";
import ModalVisita from "./componentes/modal-visita";
import "./visitadora.css";

const COLUMNAS = ["Fecha", "Médico / Empresa", "Especialidad", "Ubicación", "Actividades", "Convenio", "Acción"];

// Se compara sin acentos ni mayúsculas porque el nombre del Excel casi nunca
// coincide letra por letra con el del catálogo.
const claveDeNombre = (valor) =>
	String(valor || "")
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/^(dr|dra|doctor|doctora)\.?\s+/, "")
		.replace(/[^a-z0-9]+/g, " ")
		.trim();

const InformeVisitas = () => {
	const { empleadoData, formatRol, getPrimerNombre } = useEmpleadoActual();
	const [lunes, setLunes] = useState(lunesDeLaSemana(hoyEnMexico()));
	const [visitaEditar, setVisitaEditar] = useState(null);
	const [modalAbierto, setModalAbierto] = useState(false);
	const [visitaAEliminar, setVisitaAEliminar] = useState(null);
	const [previa, setPrevia] = useState(null);
	const [notificacion, setNotificacion] = useState({ isOpen: false, mensaje: "", tipo: "exito" });
	const archivoRef = useRef(null);

	const { desde, hasta } = rangoSemanaLaboral(lunes);
	const { data: visitas = [], isLoading, error } = useVisitasMedicas({ desde, hasta });
	const { data: doctoresResult } = useDoctores({ buscar: "", pagina: 1, porPagina: 1000 });
	const eliminarVisita = useEliminarVisita();
	const importarVisitas = useImportarVisitas();

	const doctores = useMemo(() => doctoresResult?.data ?? [], [doctoresResult]);

	const doctoresPorNombre = useMemo(() => {
		const mapa = new Map();
		for (const doctor of doctores) {
			mapa.set(claveDeNombre(nombreDoctor(doctor)), doctor.id_doctor);
		}
		return mapa;
	}, [doctores]);

	const resumen = useMemo(
		() => ({
			visitas: visitas.length,
			ligadas: visitas.filter((visita) => visita.id_doctor).length,
			convenio: visitas.filter((visita) => {
				const tipo = String(visita.tipo_convenio || "").toUpperCase();
				return tipo && !tipo.includes("N/A") && !tipo.includes("PENDIENTE");
			}).length,
			pendientes: visitas.filter((visita) =>
				String(visita.tipo_convenio || "").toUpperCase().includes("PENDIENTE"),
			).length,
		}),
		[visitas],
	);

	const avisar = (mensaje, tipo = "exito") => setNotificacion({ isOpen: true, mensaje, tipo });

	const elegirArchivo = async (evento) => {
		const archivo = evento.target.files?.[0];
		evento.target.value = "";
		if (!archivo) return;
		try {
			const libro = XLSX.read(await archivo.arrayBuffer(), { cellDates: true });
			const { filas, advertencias } = leerInformeVisitas(libro);
			if (filas.length === 0 && advertencias.length === 0) {
				avisar("El archivo no trae visitas que importar.", "error");
				return;
			}
			// Nunca se guarda directo: primero se enseña lo que va a entrar y lo
			// que quedó fuera, y la persona confirma.
			setPrevia({ filas, advertencias });
		} catch (fallo) {
			avisar(`No se pudo leer el archivo: ${fallo.message}`, "error");
		}
	};

	const confirmarImportacion = async () => {
		try {
			// `hoja` y `renglon` sólo sirven para señalar el origen en la revisión
			// previa; no son columnas de la tabla.
			const aInsertar = previa.filas.map((visita) => ({
				fecha: visita.fecha,
				medico_nombre: visita.medico_nombre,
				especialidad: visita.especialidad,
				ubicacion: visita.ubicacion,
				actividades: visita.actividades,
				comentarios_medico: visita.comentarios_medico,
				observaciones: visita.observaciones,
				seguimiento: visita.seguimiento,
				tipo_convenio: visita.tipo_convenio,
				id_empleado: empleadoData?.id_empleado ?? null,
				id_doctor: doctoresPorNombre.get(claveDeNombre(visita.medico_nombre)) ?? null,
			}));
			await importarVisitas.mutateAsync(aInsertar);
			avisar(`Se importaron ${aInsertar.length} visitas.`);
		} catch (fallo) {
			avisar(fallo.message || "No se pudieron importar las visitas.", "error");
		} finally {
			setPrevia(null);
		}
	};

	const exportar = () =>
		exportarInformeVisitas(
			[{ nombre: etiquetaSemana(lunes).slice(0, 31), visitas, semana: etiquetaSemana(lunes) }],
			`Reporte_visitas_${desde}`,
		);

	const confirmarEliminar = async () => {
		try {
			await eliminarVisita.mutateAsync(visitaAEliminar.id_visita);
			avisar("Visita eliminada.");
		} catch (fallo) {
			avisar(fallo.message || "No se pudo eliminar la visita.", "error");
		} finally {
			setVisitaAEliminar(null);
		}
	};

	return (
		<PageLayout
			empleadoData={empleadoData}
			formatRol={formatRol}
			getPrimerNombre={getPrimerNombre}>
			<div className="visitadora-pagina">
				<div className="visitadora-encabezado">
					<h1 className="visitadora-titulo">Informe de visitas médicas</h1>
					<div className="visitadora-navegador">
						<button
							type="button"
							onClick={() => setLunes(semanaDesplazada(lunes, -1))}
							aria-label="Semana anterior">
							◀
						</button>
						<span>{etiquetaSemana(lunes)}</span>
						<button
							type="button"
							onClick={() => setLunes(semanaDesplazada(lunes, 1))}
							aria-label="Semana siguiente">
							▶
						</button>
					</div>
					<div className="visitadora-acciones">
						<button
							type="button"
							className="visitadora-boton-primario"
							onClick={() => {
								setVisitaEditar(null);
								setModalAbierto(true);
							}}>
							+ Nueva visita
						</button>
						<button type="button" onClick={() => archivoRef.current?.click()}>
							Importar Excel
						</button>
						<button type="button" onClick={exportar}>
							Exportar
						</button>
						<input
							ref={archivoRef}
							type="file"
							accept=".xlsx,.xls"
							onChange={elegirArchivo}
							hidden
						/>
					</div>
				</div>

				<div className="visitadora-tarjetas">
					<div className="visitadora-tarjeta">
						<span className="visitadora-tarjeta-clave">Visitas</span>
						<span className="visitadora-tarjeta-valor">{resumen.visitas}</span>
					</div>
					<div className="visitadora-tarjeta">
						<span className="visitadora-tarjeta-clave">Ligadas al catálogo</span>
						<span className="visitadora-tarjeta-valor">{resumen.ligadas}</span>
					</div>
					<div className="visitadora-tarjeta">
						<span className="visitadora-tarjeta-clave">Con convenio</span>
						<span className="visitadora-tarjeta-valor">{resumen.convenio}</span>
					</div>
					<div className="visitadora-tarjeta">
						<span className="visitadora-tarjeta-clave">Pendientes</span>
						<span className="visitadora-tarjeta-valor">{resumen.pendientes}</span>
					</div>
				</div>

				{error && (
					<p className="visitadora-error">No se pudo cargar el informe: {error.message}</p>
				)}

				<div className="visitadora-tabla-contenedor">
					<table className="visitadora-tabla">
						<thead>
							<tr>
								{COLUMNAS.map((columna) => (
									<th key={columna}>{columna}</th>
								))}
							</tr>
						</thead>
						<tbody>
							{isLoading && (
								<tr>
									<td colSpan={COLUMNAS.length}>Cargando…</td>
								</tr>
							)}
							{!isLoading && visitas.length === 0 && (
								<tr>
									<td colSpan={COLUMNAS.length}>
										No hay visitas capturadas en esta semana.
									</td>
								</tr>
							)}
							{visitas.map((visita) => (
								<tr key={visita.id_visita}>
									<td>{visita.fecha}</td>
									<td>
										{visita.medico_nombre}{" "}
										{visita.id_doctor ? (
											<span className="visitadora-pastilla ligado">ligado</span>
										) : (
											<span className="visitadora-pastilla suelto">sin ligar</span>
										)}
									</td>
									<td>{visita.especialidad}</td>
									<td>{visita.ubicacion}</td>
									<td className="visitadora-celda-larga">{visita.actividades}</td>
									<td>{visita.tipo_convenio}</td>
									<td>
										<button
											type="button"
											className="visitadora-enlace"
											onClick={() => {
												setVisitaEditar(visita);
												setModalAbierto(true);
											}}>
											Ver / editar
										</button>
										<button
											type="button"
											className="visitadora-enlace peligro"
											onClick={() => setVisitaAEliminar(visita)}>
											Eliminar
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				{previa && (
					<div className="visitadora-modal-fondo" role="dialog" aria-modal="true">
						<div className="visitadora-modal ancho">
							<h2>Revisar antes de importar</h2>
							<p>
								Entrarán <strong>{previa.filas.length}</strong> visitas.
								{previa.advertencias.length > 0 &&
									` ${previa.advertencias.length} renglones se quedan fuera.`}
							</p>
							{previa.advertencias.length > 0 && (
								<ul className="visitadora-advertencias">
									{previa.advertencias.map((aviso) => (
										<li key={`${aviso.hoja}-${aviso.renglon}-${aviso.motivo}`}>
											<strong>
												{aviso.hoja}
												{aviso.renglon ? ` · renglón ${aviso.renglon}` : ""}
											</strong>
											: {aviso.motivo}
										</li>
									))}
								</ul>
							)}
							<div className="visitadora-modal-acciones">
								<button type="button" onClick={() => setPrevia(null)}>
									Cancelar
								</button>
								<button
									type="button"
									className="visitadora-boton-primario"
									onClick={confirmarImportacion}
									disabled={previa.filas.length === 0 || importarVisitas.isPending}>
									{importarVisitas.isPending ? "Importando…" : "Importar"}
								</button>
							</div>
						</div>
					</div>
				)}

				{modalAbierto && (
				<ModalVisita
					key={visitaEditar?.id_visita ?? "nueva"}
					isOpen={modalAbierto}
					visita={visitaEditar}
					doctores={doctores}
					semana={{ desde, hasta }}
					idEmpleado={empleadoData?.id_empleado}
					onClose={() => setModalAbierto(false)}
					onGuardado={(mensaje) => {
						setModalAbierto(false);
						avisar(mensaje);
					}}
					onError={(mensaje) => avisar(mensaje, "error")}
				/>
				)}

				<ModalConfirmarEliminacion
					isOpen={Boolean(visitaAEliminar)}
					onClose={() => setVisitaAEliminar(null)}
					onConfirm={confirmarEliminar}
					tipo="visita"
					nombreElemento={visitaAEliminar?.medico_nombre ?? ""}
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

export default InformeVisitas;
