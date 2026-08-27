import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import PageLayout from "../../components/page-layout.jsx";
import ModalNotificacion from "../../components/ModalNotificacion";
import { useEmpleadoActual } from "../../hooks/use-empleado-actual";
import {
	useGuardarDiaProgramacion,
	useImportarProgramacion,
	useProgramacionSemanal,
} from "../../hooks/use-programacion-visitas";
import { useDoctores } from "../../hooks/use-doctores";
import { leerProgramacionSemanal } from "../../utils/importar-informe-visitas";
import { exportarProgramacionSemanal } from "../../utils/exportar-informe-visitas";
import {
	etiquetaSemana,
	hoyEnMexico,
	lunesDeLaSemana,
	semanaDesplazada,
} from "../../utils/semanas-visitadora";
import { nombreDoctor } from "../../utils/comisiones-medicos";
import "./visitadora.css";

const DIAS = [
	{ numero: 1, nombre: "Lunes" },
	{ numero: 2, nombre: "Martes" },
	{ numero: 3, nombre: "Miércoles" },
	{ numero: 4, nombre: "Jueves" },
	{ numero: 5, nombre: "Viernes" },
];

const claveDeNombre = (valor) =>
	String(valor || "")
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/^(dr|dra|doctor|doctora)\.?\s+/, "")
		.replace(/[^a-z0-9]+/g, " ")
		.trim();

const ProgramacionSemanal = () => {
	const { empleadoData, formatRol, getPrimerNombre } = useEmpleadoActual();
	const [lunes, setLunes] = useState(lunesDeLaSemana(hoyEnMexico()));
	// Lo capturado y todavía sin guardar. Lo que ya está en la base no se copia
	// al estado: se lee directo, y esto sólo guarda encima lo que se editó.
	const [ediciones, setEdiciones] = useState({});
	const [semanaEnEdicion, setSemanaEnEdicion] = useState(lunes);
	const [previa, setPrevia] = useState(null);
	const [notificacion, setNotificacion] = useState({ isOpen: false, mensaje: "", tipo: "exito" });
	const archivoRef = useRef(null);

	const { data: guardados = [], isLoading, error } = useProgramacionSemanal({ semanaInicio: lunes });
	const { data: doctoresResult } = useDoctores({ buscar: "", pagina: 1, porPagina: 1000 });
	const guardarDia = useGuardarDiaProgramacion();
	const importarProgramacion = useImportarProgramacion();

	const doctores = useMemo(() => doctoresResult?.data ?? [], [doctoresResult]);

	const guardadosPorDia = useMemo(() => {
		const porDia = {};
		for (const dia of guardados) {
			porDia[dia.dia_semana] = {
				zona: dia.zona ?? "",
				objetivos: dia.objetivos ?? "",
				medicos: (dia.medicos_programados ?? [])
					.map((medico) => (typeof medico === "string" ? medico : medico?.nombre))
					.filter(Boolean)
					.join(", "),
			};
		}
		return porDia;
	}, [guardados]);

	// Al cambiar de semana se descarta lo que se había escrito sin guardar, para
	// no arrastrar la ruta de una semana a la de al lado.
	if (semanaEnEdicion !== lunes) {
		setSemanaEnEdicion(lunes);
		setEdiciones({});
	}

	const avisar = (mensaje, tipo = "exito") => setNotificacion({ isOpen: true, mensaje, tipo });

	const valor = (dia, campo) =>
		ediciones[dia]?.[campo] ?? guardadosPorDia[dia]?.[campo] ?? "";

	const cambiar = (dia, campo) => (evento) => {
		const nuevo = evento.target.value;
		setEdiciones((previas) => ({
			...previas,
			[dia]: { ...guardadosPorDia[dia], ...previas[dia], [campo]: nuevo },
		}));
	};

	const doctoresPorNombre = useMemo(
		() =>
			new Map(doctores.map((doctor) => [claveDeNombre(nombreDoctor(doctor)), doctor.id_doctor])),
		[doctores],
	);

	const aListaDeMedicos = (texto) =>
		String(texto || "")
			.split(",")
			.map((nombre) => nombre.trim())
			.filter(Boolean)
			.map((nombre) => ({
				nombre,
				id_doctor: doctoresPorNombre.get(claveDeNombre(nombre)) ?? null,
			}));

	const guardar = async (dia) => {
		try {
			await guardarDia.mutateAsync({
				id_empleado: empleadoData?.id_empleado ?? null,
				semana_inicio: lunes,
				dia_semana: dia,
				zona: valor(dia, "zona"),
				objetivos: valor(dia, "objetivos"),
				medicos_programados: aListaDeMedicos(valor(dia, "medicos")),
			});
			avisar("Día guardado.");
		} catch (fallo) {
			avisar(fallo.message || "No se pudo guardar el día.", "error");
		}
	};

	// La ruta se repite semana a semana: se traen zonas y objetivos, y los
	// médicos se ajustan a mano.
	const copiarSemanaAnterior = async () => {
		try {
			const anterior = semanaDesplazada(lunes, -1);
			const { supabase } = await import("../../lib/supabase-client");
			const { data, error: fallo } = await supabase
				.from("programacion_visitas")
				.select("dia_semana, zona, objetivos, medicos_programados")
				.eq("semana_inicio", anterior);
			if (fallo) throw fallo;
			if (!data?.length) {
				avisar("La semana anterior no tiene programación capturada.", "error");
				return;
			}
			const porDia = {};
			for (const dia of data) {
				porDia[dia.dia_semana] = {
					zona: dia.zona ?? "",
					objetivos: dia.objetivos ?? "",
					medicos: (dia.medicos_programados ?? [])
						.map((medico) => (typeof medico === "string" ? medico : medico?.nombre))
						.filter(Boolean)
						.join(", "),
				};
			}
			setEdiciones((previas) => ({ ...previas, ...porDia }));
			avisar("Se copió la semana anterior. Revisa y guarda cada día.");
		} catch (fallo) {
			avisar(fallo.message || "No se pudo copiar la semana anterior.", "error");
		}
	};

	const elegirArchivo = async (evento) => {
		const archivo = evento.target.files?.[0];
		evento.target.value = "";
		if (!archivo) return;
		try {
			const libro = XLSX.read(await archivo.arrayBuffer(), { cellDates: true });
			const { filas, advertencias } = leerProgramacionSemanal(libro);
			if (filas.length === 0 && advertencias.length === 0) {
				avisar("El archivo no trae programación que importar.", "error");
				return;
			}
			setPrevia({ filas, advertencias });
		} catch (fallo) {
			avisar(`No se pudo leer el archivo: ${fallo.message}`, "error");
		}
	};

	const confirmarImportacion = async () => {
		try {
			const aGuardar = previa.filas.map((fila) => ({
				id_empleado: empleadoData?.id_empleado ?? null,
				semana_inicio: lunes,
				dia_semana: fila.dia_semana,
				zona: fila.zona,
				objetivos: fila.objetivos,
				medicos_programados: fila.medicos_programados.map((nombre) => ({
					nombre,
					id_doctor: doctoresPorNombre.get(claveDeNombre(nombre)) ?? null,
				})),
			}));
			await importarProgramacion.mutateAsync(aGuardar);
			avisar(`Se importaron ${aGuardar.length} días.`);
		} catch (fallo) {
			avisar(fallo.message || "No se pudo importar la programación.", "error");
		} finally {
			setPrevia(null);
		}
	};

	const exportar = () =>
		exportarProgramacionSemanal(
			[
				{
					nombre: etiquetaSemana(lunes).slice(0, 31),
					titulo: `PROGRAMACION SEMANAL ${etiquetaSemana(lunes).toUpperCase()}`,
					dias: DIAS.map((dia) => ({
						dia_semana: dia.numero,
						zona: valor(dia.numero, "zona"),
						objetivos: valor(dia.numero, "objetivos"),
						medicos_programados: aListaDeMedicos(valor(dia.numero, "medicos")),
					})),
				},
			],
			`Programacion_semanal_${lunes}`,
		);

	return (
		<PageLayout
			empleadoData={empleadoData}
			formatRol={formatRol}
			getPrimerNombre={getPrimerNombre}>
			<div className="visitadora-pagina">
				<div className="visitadora-encabezado">
					<h1 className="visitadora-titulo">Programación semanal</h1>
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
						<button type="button" onClick={copiarSemanaAnterior}>
							Copiar semana anterior
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

				{error && (
					<p className="visitadora-error">
						No se pudo cargar la programación: {error.message}
					</p>
				)}
				{isLoading && <p>Cargando…</p>}

				<div className="visitadora-tabla-contenedor">
					<table className="visitadora-tabla programacion">
						<thead>
							<tr>
								<th>Día</th>
								<th>Zona</th>
								<th>Médicos programados</th>
								<th>Objetivos</th>
								<th>Acción</th>
							</tr>
						</thead>
						<tbody>
							{DIAS.map((dia) => {
								const medicos = aListaDeMedicos(valor(dia.numero, "medicos"));
								return (
									<tr key={dia.numero}>
										<td className="visitadora-dia">{dia.nombre}</td>
										<td>
											<input
												type="text"
												aria-label={`Zona del ${dia.nombre}`}
												value={valor(dia.numero, "zona")}
												onChange={cambiar(dia.numero, "zona")}
											/>
										</td>
										<td>
											<textarea
												rows={3}
												aria-label={`Médicos del ${dia.nombre}`}
												placeholder="Separa los nombres con comas"
												value={valor(dia.numero, "medicos")}
												onChange={cambiar(dia.numero, "medicos")}
											/>
											<div className="visitadora-fichas">
												{medicos.map((medico) => (
													<span
														key={medico.nombre}
														className={`visitadora-ficha ${
															medico.id_doctor ? "ligada" : ""
														}`}>
														{medico.nombre}
													</span>
												))}
											</div>
										</td>
										<td>
											<textarea
												rows={3}
												aria-label={`Objetivos del ${dia.nombre}`}
												value={valor(dia.numero, "objetivos")}
												onChange={cambiar(dia.numero, "objetivos")}
											/>
										</td>
										<td>
											<button
												type="button"
												className="visitadora-enlace"
												onClick={() => guardar(dia.numero)}>
												Guardar
											</button>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>

				<p className="visitadora-nota">
					La ficha verde es un médico que ya existe en el catálogo. Los grises están
					pendientes de dar de alta, y hasta entonces no cuentan para las comisiones.
				</p>

				{previa && (
					<div className="visitadora-modal-fondo" role="dialog" aria-modal="true">
						<div className="visitadora-modal ancho">
							<h2>Revisar antes de importar</h2>
							<p>
								Entrarán <strong>{previa.filas.length}</strong> días en la semana{" "}
								{etiquetaSemana(lunes)}.
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
									disabled={previa.filas.length === 0 || importarProgramacion.isPending}>
									{importarProgramacion.isPending ? "Importando…" : "Importar"}
								</button>
							</div>
						</div>
					</div>
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

export default ProgramacionSemanal;
