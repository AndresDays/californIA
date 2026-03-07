import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../../components/header-principal.jsx";
import Layout from "../../../components/layout.jsx";
import ModalConfirmarEliminacion from "../../../components/ModalConfirmarEliminacion";
import ModalNotificacion from "../../../components/ModalNotificacion";
import SidebarHome from "../../../components/sidebar-home.jsx";
import { useAuth } from "../../../context/auth-context";
import { supabase } from "../../../lib/supabase-client";
import ModalAgregarAnalitoEstudio from "../componentes/modal-agregar-analito-estudio";
import ModalAnalito from "../componentes/modal-analito";
import "./Analitos.css";

const Analitos = () => {
	const { user } = useAuth();
	const navigate = useNavigate();

	const [buscarEstudio, setBuscarEstudio] = useState("");
	const [buscarAnalito, setBuscarAnalito] = useState("");
	const [analitos, setAnalitos] = useState([]);
	const [totalAnalitos, setTotalAnalitos] = useState(0);

	const [estudiosDisponibles, setEstudiosDisponibles] = useState([]);
	const [estudiosEncontrados, setEstudiosEncontrados] = useState([]);
	const [showBusquedaEstudios, setShowBusquedaEstudios] = useState(false);
	const [estudioSeleccionado, setEstudioSeleccionado] = useState(null);

	const [analitosEstudio, setAnalitosEstudio] = useState([]);

	const [modalOpen, setModalOpen] = useState(false);
	const [modoEdicion, setModoEdicion] = useState(false);
	const [analitoEditando, setAnalitoEditando] = useState(null);

	const [modalAgregarOpen, setModalAgregarOpen] = useState(false);

	const [empleadoData, setEmpleadoData] = useState(null);

	const [notificacion, setNotificacion] = useState({
		isOpen: false,
		mensaje: "",
		tipo: "exito",
	});

	const [confirmarEliminacion, setConfirmarEliminacion] = useState({
		isOpen: false,
		onConfirm: null,
		titulo: "",
		mensaje: "",
	});

	useEffect(() => {
		const fetchEmpleadoData = async () => {
			if (!user?.id) return;

			try {
				const { data: empleado, error } = await supabase
					.from("empleados")
					.select("nombre, rol")
					.eq("auth_uuid", user.id)
					.maybeSingle();

				if (error) {
					console.error("Error al obtener empleado:", error);
					return;
				}

				if (empleado) {
					setEmpleadoData(empleado);
				}
			} catch (error) {
				console.error("Error al obtener datos del empleado:", error);
			}
		};

		fetchEmpleadoData();
	}, [user]);

	useEffect(() => {
		cargarAnalitos();
		cargarEstudiosDisponibles();
	}, []);

	useEffect(() => {
		if (buscarAnalito.trim()) {
			cargarAnalitos();
		}
	}, [buscarAnalito]);

	useEffect(() => {
		if (estudioSeleccionado) {
			cargarAnalitosDelEstudio();
		} else {
			setAnalitosEstudio([]);
		}
	}, [estudioSeleccionado]);

	const mostrarNotificacion = (mensaje, tipo = "exito") => {
		setNotificacion({
			isOpen: true,
			mensaje,
			tipo,
		});
	};

	const cerrarNotificacion = () => {
		setNotificacion({
			isOpen: false,
			mensaje: "",
			tipo: "exito",
		});
	};

	const mostrarConfirmacion = (titulo, mensaje, onConfirm) => {
		setConfirmarEliminacion({
			isOpen: true,
			titulo,
			mensaje,
			onConfirm,
		});
	};

	const cerrarConfirmacion = () => {
		setConfirmarEliminacion({
			isOpen: false,
			onConfirm: null,
			titulo: "",
			mensaje: "",
		});
	};

	const cargarEstudiosDisponibles = async () => {
		try {
			const { data, error } = await supabase
				.from("estudios_lab_catalogo")
				.select("id, clave, descripcion")
				.order("clave");

			if (error) throw error;
			setEstudiosDisponibles(data || []);
		} catch (error) {
			console.error("Error al cargar estudios:", error);
			mostrarNotificacion("Error al cargar estudios", "error");
		}
	};

	const buscarEstudios = (termino) => {
		if (termino.length < 2) {
			setEstudiosEncontrados([]);
			setShowBusquedaEstudios(false);
			return;
		}

		const encontrados = estudiosDisponibles.filter(
			(est) =>
				est.clave.toLowerCase().includes(termino.toLowerCase()) ||
				est.descripcion.toLowerCase().includes(termino.toLowerCase()),
		);

		setEstudiosEncontrados(encontrados);
		setShowBusquedaEstudios(encontrados.length > 0);
	};

	const seleccionarEstudio = (estudio) => {
		setEstudioSeleccionado(estudio);
		setBuscarEstudio(`${estudio.clave} - ${estudio.descripcion}`);
		setShowBusquedaEstudios(false);
	};

	const cargarAnalitosDelEstudio = async () => {
		if (!estudioSeleccionado) return;

		try {
			const { data, error } = await supabase
				.from("estudio_analitos")
				.select(
					`
          id_estudio_analito,
          orden,
          analitos (
            id_analito,
            clave,
            descripcion,
            tipo_resultado
          )
        `,
				)
				.eq("clave_estudio", estudioSeleccionado.clave)
				.order("orden", { ascending: true });

			if (error) throw error;

			const analitosFormateados = data.map((item) => ({
				id_estudio_analito: item.id_estudio_analito,
				id_analito: item.analitos.id_analito,
				clave: item.analitos.clave,
				descripcion: item.analitos.descripcion,
				tipo_resultado: item.analitos.tipo_resultado || "Numerico",
				orden: item.orden,
			}));

			setAnalitosEstudio(analitosFormateados);
		} catch (error) {
			console.error("Error al cargar analitos del estudio:", error);
			setAnalitosEstudio([]);
			mostrarNotificacion("Error al cargar analitos del estudio", "error");
		}
	};

	const cargarAnalitos = async () => {
		try {
			let query = supabase.from("analitos").select("*", { count: "exact" });

			if (buscarAnalito.trim()) {
				query = query.or(
					`clave.ilike.%${buscarAnalito}%,descripcion.ilike.%${buscarAnalito}%`,
				);
			}

			const { data, error, count } = await query.order("id_analito", {
				ascending: true,
			});

			if (error) throw error;

			setTotalAnalitos(count || 0);
			setAnalitos(data || []);
		} catch (error) {
			console.error("Error al cargar analitos:", error);
			mostrarNotificacion("Error al cargar analitos", "error");
		}
	};

	const handleAgregarAnalitoAEstudio = () => {
		if (!estudioSeleccionado) {
			mostrarNotificacion("Por favor selecciona un estudio primero", "advertencia");
			return;
		}
		setModalAgregarOpen(true);
	};

	const handleGuardarAnalitoEstudio = async (analitosSeleccionados) => {
		if (!estudioSeleccionado) return;

		try {
			const { data: maxOrden } = await supabase
				.from("estudio_analitos")
				.select("orden")
				.eq("clave_estudio", estudioSeleccionado.clave)
				.order("orden", { ascending: false })
				.limit(1)
				.maybeSingle();

			let ordenActual = maxOrden ? maxOrden.orden : 0;

			const insertPromises = analitosSeleccionados.map((analito, index) => {
				return supabase.from("estudio_analitos").insert([
					{
						clave_estudio: estudioSeleccionado.clave,
						id_analito: analito.id_analito,
						orden: ordenActual + index + 1,
					},
				]);
			});

			const results = await Promise.all(insertPromises);

			const errores = results.filter((r) => r.error);

			if (errores.length > 0) {
				const duplicados = errores.filter((e) => e.error.code === "23505");
				if (duplicados.length > 0) {
					mostrarNotificacion(
						`${duplicados.length} analito(s) ya estaban agregados. Se agregaron los demás.`,
						"advertencia",
					);
				} else {
					throw errores[0].error;
				}
			} else {
				mostrarNotificacion(
					`${analitosSeleccionados.length} analito(s) agregados correctamente`,
					"exito",
				);
			}

			await cargarAnalitosDelEstudio();
			setModalAgregarOpen(false);
		} catch (error) {
			console.error("Error al agregar analitos al estudio:", error);
			mostrarNotificacion("Error al agregar analitos al estudio", "error");
		}
	};

	const handleEliminarAnalitoEstudio = (idEstudioAnalito) => {
		mostrarConfirmacion(
			"Eliminar Analito del Estudio",
			"¿Está seguro de eliminar este analito del estudio?",
			async () => {
				try {
					const { error } = await supabase
						.from("estudio_analitos")
						.delete()
						.eq("id_estudio_analito", idEstudioAnalito);

					if (error) throw error;

					mostrarNotificacion("Analito eliminado del estudio", "exito");
					await cargarAnalitosDelEstudio();
				} catch (error) {
					console.error("Error al eliminar analito del estudio:", error);
					mostrarNotificacion("Error al eliminar analito del estudio", "error");
				}
				cerrarConfirmacion();
			},
		);
	};

	const handleActualizarOrden = async (idEstudioAnalito, nuevoOrden) => {
		try {
			const { error } = await supabase
				.from("estudio_analitos")
				.update({ orden: nuevoOrden })
				.eq("id_estudio_analito", idEstudioAnalito);

			if (error) throw error;
			await cargarAnalitosDelEstudio();
		} catch (error) {
			console.error("Error al actualizar orden:", error);
			mostrarNotificacion("Error al actualizar orden", "error");
		}
	};

	const handleVistaPrevia = () => {
		if (!estudioSeleccionado) {
			mostrarNotificacion("Selecciona un estudio primero", "advertencia");
			return;
		}
		mostrarNotificacion("Vista previa del estudio", "info");
	};

	const handleGuardar = async () => {
		if (!estudioSeleccionado) {
			mostrarNotificacion(
				"Por favor, busca y selecciona un estudio primero",
				"advertencia",
			);
			return;
		}
		mostrarNotificacion("Configuración guardada correctamente", "exito");
	};

	const handleNuevo = () => {
		setBuscarEstudio("");
		setEstudioSeleccionado(null);
		setAnalitosEstudio([]);
	};

	const handleCrearAnalitos = () => {
		setModoEdicion(false);
		setAnalitoEditando(null);
		setModalOpen(true);
	};

	const handleEditarAnalito = async (idAnalito) => {
		try {
			const { data, error } = await supabase
				.from("analitos")
				.select("*")
				.eq("id_analito", idAnalito)
				.single();

			if (error) throw error;

			setModoEdicion(true);
			setAnalitoEditando(data);
			setModalOpen(true);
		} catch (error) {
			console.error("Error al cargar analito para editar:", error);
			mostrarNotificacion("Error al cargar el analito", "error");
		}
	};

	const handleEliminarAnalito = (idAnalito) => {
		mostrarConfirmacion(
			"Eliminar Analito",
			"¿Está seguro de eliminar este analito? Esta acción no se puede deshacer.",
			async () => {
				try {
					const { error } = await supabase
						.from("analitos")
						.delete()
						.eq("id_analito", idAnalito);

					if (error) throw error;

					mostrarNotificacion("Analito eliminado correctamente", "exito");
					await cargarAnalitos();
				} catch (error) {
					console.error("Error al eliminar analito:", error);
					mostrarNotificacion("Error al eliminar analito", "error");
				}
				cerrarConfirmacion();
			},
		);
	};

	const handleCloseModal = async () => {
		setModalOpen(false);
		setModoEdicion(false);
		setAnalitoEditando(null);
		await cargarAnalitos();
	};

	const getPrimerNombre = (nombreCompleto) => {
		if (!nombreCompleto) return user?.email?.split("@")[0] || "Usuario";
		return nombreCompleto;
	};

	const formatRol = (rol) => {
		if (!rol) return "Usuario";

		const roles = {
			admin: "Administrador",
			administrador: "Administrador",
			radiologo: "Radiólogo - Director",
			doctor: "Médico",
			medico: "Médico",
			tecnico_radiologia: "Técnico en Radiología",
			tecnico: "Técnico",
			quimico: "Químico",
			recepcionista: "Recepcionista",
			desarrollador: "Desarrollador",
		};

		return roles[rol] || rol;
	};

	const handleLogout = async () => {
		const { signOut } = useAuth();
		await signOut();
		navigate("/login");
	};

	return (
		<Layout>
			<div className="agregar-analitos-wrapper">
				<Header
					empleadoData={empleadoData}
					formatRol={formatRol}
					getPrimerNombre={getPrimerNombre}
					user={user}
					handleLogout={handleLogout}
					currentPage="analitos"
				/>

				<SidebarHome />

				<div className="agregar-analitos-header">
					<h1 className="agregar-analitos-title">Agregar Analitos a un Estudio</h1>
				</div>

				<div className="agregar-analitos-content">
					<div className="panel-buscar-estudio">
						<div className="buscar-estudio-grupo" style={{ position: "relative" }}>
							<span className="icon-buscar">🔍</span>
							<input
								type="text"
								placeholder="Buscar Estudio..."
								value={buscarEstudio}
								onChange={(e) => {
									setBuscarEstudio(e.target.value);
									buscarEstudios(e.target.value);
								}}
								className="input-buscar-estudio-analito"
							/>

							{showBusquedaEstudios && estudiosEncontrados.length > 0 && (
								<div className="search-results-estudios">
									{estudiosEncontrados.map((est) => (
										<div
											key={est.id}
											className="search-result-item-estudio"
											onClick={() => seleccionarEstudio(est)}>
											<strong>{est.clave}</strong> - {est.descripcion}
										</div>
									))}
								</div>
							)}
						</div>

						{estudioSeleccionado && (
							<div className="estudio-seleccionado-info">
								<strong>Estudio seleccionado:</strong>
								<div>{estudioSeleccionado.clave}</div>
								<div className="descripcion-estudio">
									{estudioSeleccionado.descripcion}
								</div>
							</div>
						)}

						{estudioSeleccionado && (
							<div className="tabla-analitos-estudio">
								<div className="header-tabla-estudio">
									<h3>Analitos del Estudio ({analitosEstudio.length})</h3>
									<button
										className="btn-agregar-analito-estudio"
										onClick={handleAgregarAnalitoAEstudio}>
										+ Agregar Analito
									</button>
								</div>

								<div className="lista-analitos-estudio">
									<table className="tabla-mini-analitos">
										<thead>
											<tr>
												<th>Orden</th>
												<th>Clave</th>
												<th>Descripción</th>
												<th>Tipo</th>
												<th>Acciones</th>
											</tr>
										</thead>
										<tbody>
											{analitosEstudio.map((analito) => (
												<tr key={analito.id_estudio_analito}>
													<td>
														<input
															type="number"
															value={analito.orden}
															onChange={(e) =>
																handleActualizarOrden(
																	analito.id_estudio_analito,
																	parseInt(e.target.value),
																)
															}
															className="input-orden"
															min="1"
														/>
													</td>
													<td>{analito.clave}</td>
													<td>{analito.descripcion}</td>
													<td>
														<span
															className={`badge-tipo ${analito.tipo_resultado?.toLowerCase()}`}>
															{analito.tipo_resultado}
														</span>
													</td>
													<td>
														<button
															className="btn-eliminar-analito-mini"
															onClick={() =>
																handleEliminarAnalitoEstudio(
																	analito.id_estudio_analito,
																)
															}
															title="Eliminar analito del estudio">
															✖
														</button>
													</td>
												</tr>
											))}
											{analitosEstudio.length === 0 && (
												<tr>
													<td colSpan="5" className="sin-analitos">
														No hay analitos agregados a este estudio
													</td>
												</tr>
											)}
										</tbody>
									</table>
								</div>
							</div>
						)}

						<button className="btn-vista-previa" onClick={handleVistaPrevia}>
							Vista Previa
						</button>

						<div className="botones-accion-analitos">
							<button className="btn-guardar-analitos" onClick={handleGuardar}>
								Guardar
							</button>
							<button className="btn-nuevo-analitos" onClick={handleNuevo}>
								Nuevo
							</button>
						</div>
					</div>

					<div className="panel-tabla-analitos">
						<div className="buscar-analitos-grupo">
							<input
								type="text"
								placeholder="Busca Analitos Aqui..."
								value={buscarAnalito}
								onChange={(e) => setBuscarAnalito(e.target.value)}
								className="input-buscar-analitos"
							/>
						</div>

						<div className="tabla-analitos-container">
							<table className="tabla-analitos">
								<thead>
									<tr>
										<th>#</th>
										<th>Clave ⬍</th>
										<th>Descripcion ⬍</th>
										<th>Acciones ⬍</th>
									</tr>
								</thead>
								<tbody>
									{analitos.length === 0 ? (
										<tr>
											<td colSpan="4" className="sin-analitos">
												No hay analitos para mostrar
											</td>
										</tr>
									) : (
										analitos.map((analito, index) => (
											<tr key={analito.id_analito}>
												<td>{index + 1}</td>
												<td>{analito.clave}</td>
												<td>{analito.descripcion}</td>
												<td>
													<div className="acciones-analitos">
														<button
															className="btn-editar-analito"
															onClick={() => handleEditarAnalito(analito.id_analito)}
															title="Editar analito">
															✏️
														</button>
														<button
															className="btn-eliminar-analito"
															onClick={() =>
																handleEliminarAnalito(analito.id_analito)
															}
															title="Eliminar analito">
															✖
														</button>
													</div>
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>

						<div className="contador-analitos">
							Mostrando registros del 1 al {analitos.length} de un total de{" "}
							{totalAnalitos}
						</div>

						<button className="btn-crear-analitos" onClick={handleCrearAnalitos}>
							Crear Analitos
						</button>
					</div>
				</div>

				<ModalAnalito
					isOpen={modalOpen}
					onClose={handleCloseModal}
					analitoInicial={modoEdicion ? analitoEditando : null}
					modoEdicion={modoEdicion}
				/>

				<ModalAgregarAnalitoEstudio
					isOpen={modalAgregarOpen}
					onClose={() => setModalAgregarOpen(false)}
					onGuardar={handleGuardarAnalitoEstudio}
					analitosDisponibles={analitos}
				/>

				<ModalNotificacion
					isOpen={notificacion.isOpen}
					onClose={cerrarNotificacion}
					mensaje={notificacion.mensaje}
					tipo={notificacion.tipo}
				/>

				<ModalConfirmarEliminacion
					isOpen={confirmarEliminacion.isOpen}
					onClose={cerrarConfirmacion}
					onConfirm={confirmarEliminacion.onConfirm}
					titulo={confirmarEliminacion.titulo}
					mensaje={confirmarEliminacion.mensaje}
				/>
			</div>
		</Layout>
	);
};

export default Analitos;
