import { useEffect, useState } from "react";
import calendarioIcono from "../../../assets/calendarioIcono.png";
import editarIconoV2 from "../../../assets/editarIconoV2.png";
import lupaIcono from "../../../assets/lupaIcono.png";
import pacienteIcono from "../../../assets/pacienteIcono.png";
import solicitudIcono from "../../../assets/solicitudIcono.png";
import PageLayout from "../../../components/page-layout.jsx";
import { useEmpleadoActual } from "../../../hooks/use-empleado-actual";
import { supabase } from "../../../lib/supabase-client";
import { useBusquedaPersistente } from "../../../hooks/use-busqueda-persistente";
import "./paquetes.css";

const Paquetes = () => {
	const { empleadoData, formatRol, getPrimerNombre } = useEmpleadoActual();

	const [buscarPaquete, setBuscarPaquete] = useBusquedaPersistente("paquetes:paquete");
	const [paquetes, setPaquetes] = useState([]);
	const [totalPaquetes, setTotalPaquetes] = useState(0);
	const [clavePerfil, setClavePerfil] = useState("");
	const [descripcionPerfil, setDescripcionPerfil] = useState("");
	const [condicionesPaciente, setCondicionesPaciente] = useState("");
	const [diasProceso, setDiasProceso] = useState("");
	const [busquedaEstudio, setBusquedaEstudio] = useBusquedaPersistente("paquetes:estudio");
	const [estudiosDelPaquete, setEstudiosDelPaquete] = useState([]);
	const [modoEdicion, setModoEdicion] = useState(false);
	const [paqueteSeleccionado, setPaqueteSeleccionado] = useState(null);

	useEffect(() => {
		cargarPaquetes();
	}, [buscarPaquete]);

	const cargarPaquetes = async () => {
		try {
			let query = supabase.from("paquetes").select("*", { count: "exact" });
			if (buscarPaquete.trim())
				query = query.or(
					`clave.ilike.%${buscarPaquete}%,descripcion.ilike.%${buscarPaquete}%,condiciones.ilike.%${buscarPaquete}%`,
				);
			const { data, error, count } = await query.order("id", { ascending: true });
			if (error) throw error;
			setTotalPaquetes(count || 0);
			setPaquetes(data || []);
		} catch (error) {
			console.error("Error al cargar paquetes:", error);
		}
	};

	const cargarEstudiosDelPaquete = async (idPaquete) => {
		try {
			const { data, error } = await supabase
				.from("paquetes_estudios")
				.select(`id, orden, estudios_lab_catalogo (id, clave, descripcion)`)
				.eq("id_paquete", idPaquete)
				.order("orden", { ascending: true });
			if (error) throw error;
			setEstudiosDelPaquete(
				data?.map((pe) => ({
					id_relacion: pe.id,
					id_estudio: pe.estudios_lab_catalogo.id,
					clave: pe.estudios_lab_catalogo.clave,
					descripcion: pe.estudios_lab_catalogo.descripcion,
					orden: pe.orden,
				})) || [],
			);
		} catch (error) {
			console.error("Error al cargar estudios del paquete:", error);
		}
	};

	const handleBuscarEstudio = async (e) => {
		e.preventDefault();
		if (!busquedaEstudio.trim()) {
			globalThis.mostrarNotificacion("Por favor, ingresa una clave o descripción de estudio", "advertencia");
			return;
		}
		try {
			const { data, error } = await supabase
				.from("estudios_lab_catalogo")
				.select("id, clave, descripcion")
				.or(
					`clave.ilike.%${busquedaEstudio}%,descripcion.ilike.%${busquedaEstudio}%`,
				)
				.limit(1)
				.single();
			if (error) {
				if (error.code === "PGRST116") globalThis.mostrarNotificacion("No se encontró ningún estudio", "advertencia");
				else throw error;
				return;
			}
			if (estudiosDelPaquete.some((e) => e.id_estudio === data.id)) {
				globalThis.mostrarNotificacion("Este estudio ya está agregado al paquete", "advertencia");
				return;
			}
			await agregarEstudioAlPaquete(data);
		} catch (error) {
			console.error("Error al buscar estudio:", error);
			globalThis.mostrarNotificacion("Error al buscar el estudio", "error");
		}
	};

	const agregarEstudioAlPaquete = async (estudio) => {
		if (!paqueteSeleccionado) {
			globalThis.mostrarNotificacion("Primero debes seleccionar o guardar un paquete", "advertencia");
			return;
		}
		try {
			const { data, error } = await supabase
				.from("paquetes_estudios")
				.insert([
					{
						id_paquete: paqueteSeleccionado,
						id_estudio: estudio.id,
						orden: estudiosDelPaquete.length + 1,
					},
				])
				.select()
				.single();
			if (error) throw error;
			setEstudiosDelPaquete([
				...estudiosDelPaquete,
				{
					id_relacion: data.id,
					id_estudio: estudio.id,
					clave: estudio.clave,
					descripcion: estudio.descripcion,
					orden: estudiosDelPaquete.length + 1,
				},
			]);
			setBusquedaEstudio("");
		} catch (error) {
			console.error("Error al agregar estudio:", error);
			globalThis.mostrarNotificacion("Error al agregar el estudio", "error");
		}
	};

	const eliminarEstudioDelPaquete = async (idRelacion, idEstudio) => {
		if (!window.confirm("¿Está seguro de eliminar este estudio del paquete?"))
			return;
		try {
			const { error } = await supabase
				.from("paquetes_estudios")
				.delete()
				.eq("id", idRelacion);
			if (error) throw error;
			setEstudiosDelPaquete(
				estudiosDelPaquete.filter((e) => e.id_estudio !== idEstudio),
			);
		} catch (error) {
			console.error("Error:", error);
			globalThis.mostrarNotificacion("Error al eliminar el estudio", "error");
		}
	};

	const limpiarFormulario = () => {
		setClavePerfil("");
		setDescripcionPerfil("");
		setCondicionesPaciente("");
		setDiasProceso("");
		setBusquedaEstudio("");
		setEstudiosDelPaquete([]);
		setModoEdicion(false);
		setPaqueteSeleccionado(null);
	};

	const handleGuardar = async () => {
		if (!clavePerfil.trim() || !descripcionPerfil.trim()) {
			globalThis.mostrarNotificacion("Por favor, completa al menos la clave y descripción", "advertencia");
			return;
		}
		try {
			const { data, error } = await supabase
				.from("paquetes")
				.insert([
					{
						clave: clavePerfil,
						descripcion: descripcionPerfil,
						condiciones: condicionesPaciente,
						dias_proceso: parseInt(diasProceso) || 0,
					},
				])
				.select()
				.single();
			if (error) throw error;
			globalThis.mostrarNotificacion("Paquete guardado correctamente");
			setPaqueteSeleccionado(data.id);
			setModoEdicion(true);
			cargarPaquetes();
		} catch (error) {
			console.error("Error:", error);
			globalThis.mostrarNotificacion("Error al guardar paquete", "error");
		}
	};

	const handleCargarCambios = async () => {
		if (!paqueteSeleccionado) {
			globalThis.mostrarNotificacion("Por favor, selecciona un paquete para actualizar", "advertencia");
			return;
		}
		try {
			const { error } = await supabase
				.from("paquetes")
				.update({
					clave: clavePerfil,
					descripcion: descripcionPerfil,
					condiciones: condicionesPaciente,
					dias_proceso: parseInt(diasProceso) || 0,
				})
				.eq("id", paqueteSeleccionado);
			if (error) throw error;
			globalThis.mostrarNotificacion("Paquete actualizado correctamente");
			cargarPaquetes();
		} catch (error) {
			console.error("Error:", error);
			globalThis.mostrarNotificacion("Error al actualizar paquete", "error");
		}
	};

	const cargarPaqueteParaEditar = async (paquete) => {
		setClavePerfil(paquete.clave || "");
		setDescripcionPerfil(paquete.descripcion || "");
		setCondicionesPaciente(paquete.condiciones || "");
		setDiasProceso(paquete.dias_proceso?.toString() || "");
		setModoEdicion(true);
		setPaqueteSeleccionado(paquete.id);
		await cargarEstudiosDelPaquete(paquete.id);
	};

	return (
		<PageLayout
			empleadoData={empleadoData}
			formatRol={formatRol}
			getPrimerNombre={getPrimerNombre}>
			<div className="agregar-paquetes-wrapper">
				<div className="agregar-paquetes-header">
					<h1 className="agregar-paquetes-title">Agregar Paquetes</h1>
				</div>

				<div className="agregar-paquetes-content">
					<div className="panel-formulario-paquetes">
						<div className="campo-paquete-icon">
							<img src={lupaIcono} alt="Clave" className="icono-campo-paquete" />
							<input
								type="text"
								placeholder="Clave del Perfil"
								value={clavePerfil}
								onChange={(e) => setClavePerfil(e.target.value)}
								className="input-paquete-icon"
							/>
						</div>
						<div className="campo-paquete-icon">
							<img
								src={solicitudIcono}
								alt="Descripción"
								className="icono-campo-paquete"
							/>
							<input
								type="text"
								placeholder="Descripcion del Perfil"
								value={descripcionPerfil}
								onChange={(e) => setDescripcionPerfil(e.target.value)}
								className="input-paquete-icon"
							/>
						</div>
						<div className="campo-paquete-icon">
							<img
								src={pacienteIcono}
								alt="Paciente"
								className="icono-campo-paquete"
							/>
							<input
								type="text"
								placeholder="Condiciones del Paciente"
								value={condicionesPaciente}
								onChange={(e) => setCondicionesPaciente(e.target.value)}
								className="input-paquete-icon"
							/>
						</div>
						<div className="campo-paquete-icon">
							<img
								src={calendarioIcono}
								alt="Días"
								className="icono-campo-paquete"
							/>
							<input
								type="number"
								placeholder="Dias de Proceso"
								value={diasProceso}
								onChange={(e) => setDiasProceso(e.target.value)}
								className="input-paquete-icon"
							/>
						</div>

						<form onSubmit={handleBuscarEstudio} className="campo-busqueda-paquete">
							<input
								type="text"
								placeholder="Search..."
								value={busquedaEstudio}
								onChange={(e) => setBusquedaEstudio(e.target.value)}
								className="input-busqueda-paquete"
								disabled={!paqueteSeleccionado}
							/>
							<button
								type="submit"
								className="btn-buscar-paquete"
								disabled={!paqueteSeleccionado}>
								<img src={lupaIcono} alt="Buscar" className="icono-buscar-paquete" />
							</button>
						</form>

						{paqueteSeleccionado && (
							<div className="tabla-estudios-paquete-container">
								<table className="tabla-estudios-paquete">
									<thead>
										<tr>
											<th>Clave</th>
											<th>Descripcion</th>
											<th>Eliminar</th>
										</tr>
									</thead>
									<tbody>
										{estudiosDelPaquete.length === 0 ? (
											<tr>
												<td colSpan="3" className="sin-estudios-paquete">
													No hay estudios agregados
												</td>
											</tr>
										) : (
											estudiosDelPaquete.map((estudio) => (
												<tr key={estudio.id_estudio}>
													<td>{estudio.clave}</td>
													<td>{estudio.descripcion}</td>
													<td>
														<button
															className="btn-eliminar-estudio-paquete"
															onClick={() =>
																eliminarEstudioDelPaquete(
																	estudio.id_relacion,
																	estudio.id_estudio,
																)
															}>
															✖
														</button>
													</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
						)}

						<div className="botones-formulario-paquetes">
							<button className="btn-guardar-paquete" onClick={handleGuardar}>
								Guardar
							</button>
							<button className="btn-nuevo-paquete" onClick={limpiarFormulario}>
								Nuevo
							</button>
							<button className="btn-cargar-cambios" onClick={handleCargarCambios}>
								Cargar Cambios
							</button>
						</div>
					</div>

					<div className="panel-tabla-paquetes">
						<div className="buscar-paquetes-header">
							<span className="label-buscar-paquete">Buscar:</span>
							<input
								type="text"
								value={buscarPaquete}
								onChange={(e) => setBuscarPaquete(e.target.value)}
								className="input-buscar-paquetes"
							/>
						</div>

						<div className="tabla-paquetes-container">
							<table className="tabla-paquetes">
								<thead>
									<tr>
										<th>Clave</th>
										<th>Descripcion</th>
										<th>Condiciones</th>
										<th>Acciones</th>
									</tr>
								</thead>
								<tbody>
									{paquetes.length === 0 ? (
										<tr>
											<td colSpan="4" className="sin-paquetes">
												No hay paquetes para mostrar
											</td>
										</tr>
									) : (
										paquetes.map((paquete) => (
											<tr key={paquete.id}>
												<td>{paquete.clave}</td>
												<td>{paquete.descripcion}</td>
												<td>{paquete.condiciones}</td>
												<td>
													<button
														className="btn-editar-estudio-tabla"
														onClick={() => cargarPaqueteParaEditar(paquete)}
														title="Editar paquete">
														<img
															src={editarIconoV2}
															alt="Editar"
															className="icono-accion"
														/>
													</button>
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
						<div className="contador-paquetes">
							Mostrando registros del 1 al {paquetes.length} de un total de{" "}
							{totalPaquetes}
						</div>
					</div>
				</div>
			</div>
		</PageLayout>
	);
};

export default Paquetes;
