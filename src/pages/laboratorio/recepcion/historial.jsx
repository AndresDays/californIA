import React, { useEffect, useState } from "react";
import lupaIcono from "../../../assets/lupaIcono.png";
import notaIcono from "../../../assets/notaIcono.png";
import pacienteIcono from "../../../assets/pacienteIcono.png";
import PageLayout from "../../../components/page-layout.jsx";
import { useEmpleadoActual } from "../../../hooks/use-empleado-actual";
import { supabase } from "../../../lib/supabase-client";
import { useBusquedaPersistente } from "../../../hooks/use-busqueda-persistente";
import "./historial.css";

const Historial = () => {
	const { empleadoData, formatRol, getPrimerNombre } = useEmpleadoActual();

	const [buscarCliente, setBuscarCliente] = useBusquedaPersistente("historial:cliente");
	const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
	const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
	const [historialVisitas, setHistorialVisitas] = useState([]);
	const [visitaSeleccionada, setVisitaSeleccionada] = useState(null);
	const [estudiosVisita, setEstudiosVisita] = useState([]);

	const buscarPaciente = async () => {
		if (!buscarCliente.trim()) return;
		try {
			const query = supabase
				.from("pacientes")
				.select("id_paciente, nombre, sexo, fecha_nacimiento, telefono, email")
				.limit(10);
			const isNumeric = !isNaN(buscarCliente.trim());
			const { data, error } = isNumeric
				? await query.or(
						`nombre.ilike.%${buscarCliente}%,id_paciente.eq.${buscarCliente}`,
					)
				: await query.ilike("nombre", `%${buscarCliente}%`);
			if (error) throw error;
			setResultadosBusqueda(data || []);
			if (data && data.length === 1) seleccionarPaciente(data[0]);
		} catch (err) {
			console.error("Error al buscar paciente:", err);
		}
	};

	const seleccionarPaciente = async (paciente) => {
		setPacienteSeleccionado(paciente);
		setResultadosBusqueda([]);
		setBuscarCliente(paciente.nombre);
		setVisitaSeleccionada(null);
		setEstudiosVisita([]);
		await cargarHistorialVisitas(paciente.id_paciente);
	};

	const cargarHistorialVisitas = async (idPaciente) => {
		try {
			const [ventasResp, radiologiaResp] = await Promise.all([
				supabase
					.from("ventas")
					.select(
						`
				id_venta, folio, fecha_venta, total, pago_recibido,
				estudios_venta (id_estudio_venta, descripcion_estudio, estado_validacion)
			`,
					)
					.eq("id_paciente", idPaciente)
					.eq("estado", "activo")
					.order("fecha_venta", { ascending: false }),
				supabase
					.from("estudios_radiologia")
					.select("id_estudio, id_venta, tipo_estudio, descripcion, estado, fecha_estudio")
					.eq("id_paciente", idPaciente)
					.order("fecha_estudio", { ascending: false }),
			]);
			if (ventasResp.error) throw ventasResp.error;
			if (radiologiaResp.error) throw radiologiaResp.error;

			const ventas = (ventasResp.data || []).map((venta) => ({
				...venta,
				tipo_historial: "venta",
			}));
			const idsVentas = new Set(ventas.map((venta) => venta.id_venta).filter(Boolean));
			const visitasRadiologia = (radiologiaResp.data || [])
				.filter((estudio) => !estudio.id_venta || !idsVentas.has(estudio.id_venta))
				.map((estudio) => ({
					id_venta: `radiologia-${estudio.id_estudio}`,
					folio: `IMG-${estudio.id_estudio}`,
					fecha_venta: estudio.fecha_estudio,
					tipo_historial: "radiologia",
					estudios_radiologia: [estudio],
				}));

			setHistorialVisitas(
				[...ventas, ...visitasRadiologia].sort(
					(a, b) => new Date(b.fecha_venta || 0) - new Date(a.fecha_venta || 0),
				),
			);
		} catch (err) {
			console.error("Error al cargar historial:", err);
			setHistorialVisitas([]);
		}
	};

	const seleccionarVisita = async (venta) => {
		setVisitaSeleccionada(venta);
		if (venta.tipo_historial === "radiologia") {
			setEstudiosVisita(
				(venta.estudios_radiologia || []).map((estudio) => ({
					...estudio,
					id_estudio_venta: `radiologia-${estudio.id_estudio}`,
					tipo_origen: "radiologia",
					descripcion_estudio:
						[estudio.tipo_estudio, estudio.descripcion].filter(Boolean).join(" - ") ||
						"Estudio de imagen",
					estado_validacion: estudio.estado,
					analitos: [],
				})),
			);
			return;
		}
		await cargarEstudiosConAnalitos(venta.id_venta);
	};

	const cargarEstudiosConAnalitos = async (idVenta) => {
		try {
			const { data: estudiosVenta, error: errorEstudios } = await supabase
				.from("estudios_venta")
				.select("*")
				.eq("id_venta", idVenta)
				.order("id_estudio_venta");
			if (errorEstudios) throw errorEstudios;
			const { data: estudiosRadiologia, error: errorRadiologia } = await supabase
				.from("estudios_radiologia")
				.select("id_estudio, tipo_estudio, descripcion, estado, fecha_estudio")
				.eq("id_venta", idVenta)
				.order("fecha_estudio", { ascending: false });
			if (errorRadiologia) throw errorRadiologia;
			const estudiosConAnalitos = await Promise.all(
				estudiosVenta.map(async (estudio) => {
					const { data: relacionesAnalitos, error: errorRelaciones } = await supabase
						.from("estudio_analitos")
						.select("*")
						.eq("clave_estudio", estudio.clave_estudio)
						.order("orden", { ascending: true });
					if (errorRelaciones || !relacionesAnalitos?.length)
						return { ...estudio, analitos: [] };
					const analitosConDetalles = await Promise.all(
						relacionesAnalitos.map(async (relacion) => {
							const { data: analitoDetalle, error: errorDetalle } = await supabase
								.from("analitos")
								.select("*")
								.eq("id_analito", relacion.id_analito)
								.single();
							if (errorDetalle || !analitoDetalle) return null;
							let resultadoGuardado = "";
							if (estudio.resultados) {
								try {
									const r = JSON.parse(estudio.resultados);
									resultadoGuardado = r[analitoDetalle.clave] || "";
								} catch (e) {}
							}
							return {
								id_analito: analitoDetalle.id_analito,
								clave: analitoDetalle.clave,
								descripcion: analitoDetalle.descripcion,
								unidades: analitoDetalle.unidad || "",
								referencia: analitoDetalle.valor_referencia_texto || "",
								tipo_resultado: analitoDetalle.tipo_resultado || "Numerico",
								resultado: resultadoGuardado,
								orden: relacion.orden,
							};
						}),
					);
					return {
						...estudio,
						analitos: analitosConDetalles.filter((a) => a !== null),
					};
				}),
			);
			const estudiosImagen = (estudiosRadiologia || []).map((estudio) => ({
				...estudio,
				id_estudio_venta: `radiologia-${estudio.id_estudio}`,
				tipo_origen: "radiologia",
				descripcion_estudio:
					[estudio.tipo_estudio, estudio.descripcion].filter(Boolean).join(" - ") ||
					"Estudio de imagen",
				estado_validacion: estudio.estado,
				analitos: [],
			}));
			setEstudiosVisita([...estudiosConAnalitos, ...estudiosImagen]);
		} catch (err) {
			console.error("Error al cargar estudios:", err);
			setEstudiosVisita([]);
		}
	};

	const calcularEdad = (fechaNacimiento) => {
		if (!fechaNacimiento) return "N/A";
		const hoy = new Date();
		const nac = new Date(fechaNacimiento);
		let edad = hoy.getFullYear() - nac.getFullYear();
		const mes = hoy.getMonth() - nac.getMonth();
		if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
		return `${edad} años`;
	};

	const formatFecha = (fecha) => {
		if (!fecha) return "N/A";
		return new Date(fecha).toLocaleDateString("es-MX", {
			day: "2-digit",
			month: "2-digit",
			year: "2-digit",
		});
	};
	const formatHora = (fecha) => {
		if (!fecha) return "N/A";
		return new Date(fecha).toLocaleTimeString("es-MX", {
			hour: "2-digit",
			minute: "2-digit",
		});
	};
	const formatFechaLarga = (fecha) => {
		if (!fecha) return "N/A";
		return new Date(fecha).toLocaleDateString("es-MX", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		});
	};

	const obtenerIconoEstado = (estado) => {
		switch (estado) {
			case "guardado":
				return "📄";
			case "validado":
				return "✓";
			default:
				return "🕐";
		}
	};

	const obtenerTextoEstado = (estado) => {
		if (estado === "validado") return "Validado";
		if (estado === "guardado") return "Guardado";
		if (estado === "interpretado") return "Interpretado";
		if (estado === "subido" || estado === "recibido") return "Recibido";
		return "En Captura";
	};

	return (
		<PageLayout
			empleadoData={empleadoData}
			formatRol={formatRol}
			getPrimerNombre={getPrimerNombre}>
			<div className="historial-wrapper">
				<div className="historial-header">
					<h1 className="historial-title">Historial</h1>
				</div>

				<div className="historial-content">
					<div className="panel-izquierdo">
						<div className="buscar-cliente-grupo">
							<img
								src={pacienteIcono}
								alt="Paciente"
								className="icono-buscar-hist"
							/>
							<input
								type="text"
								placeholder="Buscar Cliente..."
								value={buscarCliente}
								onChange={(e) => setBuscarCliente(e.target.value)}
								onKeyPress={(e) => e.key === "Enter" && buscarPaciente()}
								className="input-buscar-cliente"
							/>
							<button className="btn-buscar" onClick={buscarPaciente}>
								<img src={lupaIcono} alt="Buscar" className="icono-buscar-hist" />
							</button>
						</div>

						{resultadosBusqueda.length > 1 && (
							<div className="dropdown-resultados">
								{resultadosBusqueda.map((pac) => (
									<div
										key={pac.id_paciente}
										className="dropdown-item"
										onClick={() => seleccionarPaciente(pac)}>
										{pac.nombre}
									</div>
								))}
							</div>
						)}

						{pacienteSeleccionado && (
							<div className="datos-paciente-card">
								<div className="dato-row">
									<span className="dato-label">Nombre:</span>
									<span className="dato-valor">{pacienteSeleccionado.nombre}</span>
								</div>
								<div className="dato-row">
									<span className="dato-label">Sexo:</span>
									<span className="dato-valor">
										{pacienteSeleccionado.sexo || "-"}
									</span>
									<span className="dato-label">Edad:</span>
									<span className="dato-valor">
										{calcularEdad(pacienteSeleccionado.fecha_nacimiento)}
									</span>
									<span className="dato-label">Fecha Nac.:</span>
									<span className="dato-valor">
										{formatFechaLarga(pacienteSeleccionado.fecha_nacimiento)}
									</span>
								</div>
								<div className="dato-row">
									<span className="dato-label">Teléfono:</span>
									<span className="dato-valor">
										{pacienteSeleccionado.telefono || "-"}
									</span>
									<span className="dato-label">Email:</span>
									<span className="dato-valor">
										{pacienteSeleccionado.email || "-"}
									</span>
								</div>
							</div>
						)}

						<div className="historial-visitas-section">
							<h2 className="section-title-hist turquesa">Historial del Paciente</h2>
							<div className="tabla-historial-container">
								<table className="tabla-historial">
									<thead>
										<tr>
											<th>Folio</th>
											<th>Fecha</th>
											<th>Hora</th>
										</tr>
									</thead>
									<tbody>
										{historialVisitas.length === 0 ? (
											<tr>
												<td colSpan="3" className="sin-historial">
													{pacienteSeleccionado
														? "Sin visitas registradas"
														: "Busque un paciente"}
												</td>
											</tr>
										) : (
											historialVisitas.map((visita) => (
												<tr
													key={visita.id_venta}
													onClick={() => seleccionarVisita(visita)}
													className={
														visitaSeleccionada?.id_venta === visita.id_venta
															? "selected"
															: ""
													}>
													<td>{visita.folio}</td>
													<td>{formatFecha(visita.fecha_venta)}</td>
													<td>{formatHora(visita.fecha_venta)}</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
						</div>
					</div>

					<div className="panel-derecho">
						{visitaSeleccionada ? (
							<>
								<div className="visita-info-bar">
									<span>
										<strong>Folio:</strong>{" "}
										<span className="folio-highlight">
											{visitaSeleccionada.folio}
										</span>
									</span>
									<span>
										<strong>Fecha:</strong>{" "}
										{formatFechaLarga(visitaSeleccionada.fecha_venta)}
									</span>
									<span>
										<strong>Hora:</strong>{" "}
										{formatHora(visitaSeleccionada.fecha_venta)}
									</span>
								</div>
								<div className="estudios-paciente-section">
									<h2 className="section-title-hist amarillo">
										Estudios del Paciente
									</h2>
									<div className="tabla-estudios-hist-container">
										<table className="tabla-estudios-hist">
											<thead>
												<tr>
													<th>Estado</th>
													<th>Clave</th>
													<th>Descripción</th>
													<th>Resultado</th>
													<th>Unidades</th>
													<th>Referencia</th>
												</tr>
											</thead>
											<tbody>
												{estudiosVisita.length === 0 ? (
													<tr>
														<td colSpan="6" className="sin-estudios-hist">
															Cargando estudios...
														</td>
													</tr>
												) : (
													estudiosVisita.map((estudio) => (
														<React.Fragment key={estudio.id_estudio_venta}>
															<tr className="fila-estudio-hist">
																<td colSpan="6">
																	<div className="estudio-header-hist">
																		<span
																			className={`icono-estado-hist estado-${estudio.estado_validacion || "captura"}`}>
																			{obtenerIconoEstado(estudio.estado_validacion)}
																		</span>
																		<span className="estudio-nombre-hist">
																			{estudio.descripcion_estudio}
																		</span>
																		<span
																			className={`badge-estado-hist estado-${estudio.estado_validacion || "captura"}`}>
																			{obtenerTextoEstado(estudio.estado_validacion)}
																		</span>
																		{estudio.tipo_origen === "radiologia" && estudio.id_estudio && (
																			<a
																				className="link-visor-hist"
																				href={`/visor-paciente/${estudio.id_estudio}`}
																				target="_blank"
																				rel="noopener noreferrer">
																				Abrir visor
																			</a>
																		)}
																	</div>
																</td>
															</tr>
															{estudio.tipo_origen === "radiologia" ? (
																<tr>
																	<td colSpan="6" className="sin-analitos">
																		Estudio de imagen registrado en radiología
																	</td>
																</tr>
															) : estudio.analitos.length > 0 ? (
																estudio.analitos.map((analito) =>
																	analito.tipo_resultado === "Subtitulo" ? (
																		<tr
																			key={analito.id_analito}
																			className="fila-subtitulo-hist">
																			<td colSpan="6">{analito.descripcion}</td>
																		</tr>
																	) : (
																		<tr
																			key={analito.id_analito}
																			className="fila-analito-hist">
																			<td></td>
																			<td className="clave-analito">
																				{analito.clave}
																			</td>
																			<td>{analito.descripcion}</td>
																			<td
																				className={`resultado-valor ${analito.resultado ? "tiene-resultado" : ""}`}>
																				{analito.resultado || "-"}
																			</td>
																			<td className="unidades-text">
																				{analito.unidades}
																			</td>
																			<td className="referencia-text">
																				{analito.referencia}
																			</td>
																		</tr>
																	),
																)
															) : (
																<tr>
																	<td colSpan="6" className="sin-analitos">
																		Sin analitos configurados
																	</td>
																</tr>
															)}
														</React.Fragment>
													))
												)}
											</tbody>
										</table>
									</div>
								</div>
							</>
						) : (
							<div className="empty-state-derecho">
								<img src={notaIcono} alt="Nota" className="empty-icon-img" />
								<p>Seleccione una visita del historial para ver los estudios</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</PageLayout>
	);
};

export default Historial;
