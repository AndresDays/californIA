import { useEffect, useState } from "react";
import agregarUsuarioBtn from "../assets/agregarUsuarioBtn.png";
import editarIcono from "../assets/editarIcono.png";
import eliminarIconoV2 from "../assets/eliminarIconoV2.png";
import ModalAgregarUsuario from "../components/ModalAgregarUsuario";
import ModalConfirmarEliminacion from "../components/ModalConfirmarEliminacion";
import ModalNotificacion from "../components/ModalNotificacion";
import PageLayout from "../components/page-layout.jsx";
import { useAuth } from "../context/auth-context";
import { supabase } from "../lib/supabase-client";
import "./usuarios.css";

const Usuarios = () => {
	const { user } = useAuth();

	const [empleadoData, setEmpleadoData] = useState(null);
	const [buscarUsuario, setBuscarUsuario] = useState("");
	const [usuarios, setUsuarios] = useState([]);
	const [registrosPorPagina, setRegistrosPorPagina] = useState(10);
	const [paginaActual, setPaginaActual] = useState(1);
	const [totalUsuarios, setTotalUsuarios] = useState(0);
	const [modalEliminarOpen, setModalEliminarOpen] = useState(false);
	const [usuarioAEliminar, setUsuarioAEliminar] = useState(null);
	const [notificacion, setNotificacion] = useState({
		isOpen: false,
		mensaje: "",
		tipo: "exito",
	});
	const [modalAgregarOpen, setModalAgregarOpen] = useState(false);
	const [usuarioEditar, setUsuarioEditar] = useState(null);

	useEffect(() => {
		const fetchEmpleadoData = async () => {
			if (!user?.id) return;
			try {
				const { data: empleado, error } = await supabase
					.from("empleados")
					.select("nombre, rol")
					.eq("auth_uuid", user.id)
					.maybeSingle();
				if (!error && empleado) setEmpleadoData(empleado);
			} catch (error) {
				console.error("Error:", error);
			}
		};
		fetchEmpleadoData();
	}, [user]);

	useEffect(() => {
		cargarUsuarios();
	}, [paginaActual, registrosPorPagina, buscarUsuario]);

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

	const cargarUsuarios = async () => {
		try {
			let query = supabase.from("empleados").select("*", { count: "exact" });
			if (buscarUsuario.trim())
				query = query.or(
					`nombre.ilike.%${buscarUsuario}%,usuario.ilike.%${buscarUsuario}%,rol.ilike.%${buscarUsuario}%,sucursal.ilike.%${buscarUsuario}%`,
				);
			const desde = (paginaActual - 1) * registrosPorPagina;
			const { data, error, count } = await query
				.range(desde, desde + registrosPorPagina - 1)
				.order("id_empleado", { ascending: true });
			if (error) throw error;
			setTotalUsuarios(count || 0);
			setUsuarios(
				data?.map((usuario) => ({
					id: usuario.id_empleado,
					numero: usuario.id_empleado,
					nombre: usuario.nombre || "",
					usuario: usuario.usuario || "-",
					rol: formatRol(usuario.rol) || "-",
					sucursal: usuario.sucursal || "-",
					estado: usuario.activo ? "Activado" : "Desactivado",
					ultimoLogin: usuario.ultimo_login
						? new Date(usuario.ultimo_login).toLocaleString("es-MX", {
								day: "2-digit",
								month: "2-digit",
								year: "numeric",
								hour: "2-digit",
								minute: "2-digit",
							})
						: "-",
				})) || [],
			);
		} catch (error) {
			console.error("Error al cargar usuarios:", error);
		}
	};

	const mostrarNotificacion = (mensaje, tipo = "exito") =>
		setNotificacion({ isOpen: true, mensaje, tipo });

	const handleGuardarUsuario = async (usuarioData, isEditMode) => {
		try {
			if (isEditMode) {
				const updateData = {
					nombre: usuarioData.nombre,
					usuario: usuarioData.usuario,
					rol: usuarioData.rol,
					sucursal: usuarioData.sucursal,
					email: usuarioData.email,
					telefono: usuarioData.telefono,
					activo: usuarioData.activo,
					updated_at: new Date().toISOString(),
				};
				if (usuarioData.contrasena?.trim())
					updateData.contrasena = usuarioData.contrasena;
				const { error } = await supabase
					.from("empleados")
					.update(updateData)
					.eq("id_empleado", usuarioData.id);
				if (error) throw error;
				mostrarNotificacion("Usuario actualizado correctamente", "exito");
			} else {
				const { error } = await supabase
					.from("empleados")
					.insert([
						{
							nombre: usuarioData.nombre,
							usuario: usuarioData.usuario,
							contrasena: usuarioData.contrasena,
							rol: usuarioData.rol,
							sucursal: usuarioData.sucursal,
							email: usuarioData.email,
							telefono: usuarioData.telefono,
							activo: usuarioData.activo,
						},
					]);
				if (error) throw error;
				mostrarNotificacion("Usuario agregado correctamente", "exito");
			}
			cargarUsuarios();
			setModalAgregarOpen(false);
		} catch (error) {
			console.error("Error:", error);
			mostrarNotificacion("Error al guardar usuario: " + error.message, "error");
		}
	};

	const confirmarEliminarUsuario = async () => {
		if (!usuarioAEliminar) return;
		try {
			const { error } = await supabase
				.from("empleados")
				.delete()
				.eq("id_empleado", usuarioAEliminar.id);
			if (error) throw error;
			cargarUsuarios();
			mostrarNotificacion("Usuario eliminado correctamente", "exito");
		} catch (error) {
			console.error("Error:", error);
			mostrarNotificacion("Error al eliminar usuario", "error");
		} finally {
			setUsuarioAEliminar(null);
		}
	};

	const getPrimerNombre = (nombreCompleto) => {
		if (!nombreCompleto) return user?.email?.split("@")[0] || "Usuario";
		return nombreCompleto;
	};

	const usuarioInicio = (paginaActual - 1) * registrosPorPagina + 1;
	const usuarioFin = Math.min(paginaActual * registrosPorPagina, totalUsuarios);
	const totalPaginas = Math.ceil(totalUsuarios / registrosPorPagina);

	return (
		<PageLayout
			empleadoData={empleadoData}
			formatRol={formatRol}
			getPrimerNombre={getPrimerNombre}>
			<div className="admin-usuarios-wrapper">
				<div className="admin-usuarios-header">
					<h1 className="admin-usuarios-title">Administrar usuarios</h1>
				</div>

				<div className="admin-usuarios-content">
					<div className="controles-usuarios-top">
						<button
							className="btn-agregar-usuario"
							onClick={() => {
								setUsuarioEditar(null);
								setModalAgregarOpen(true);
							}}>
							<img
								src={agregarUsuarioBtn}
								alt="Agregar Usuario"
								className="icono-btn-usuario"
							/>
						</button>
					</div>

					<div className="controles-mostrar-buscar">
						<div className="mostrar-registros">
							<span>Mostrar</span>
							<select
								value={registrosPorPagina}
								onChange={(e) => {
									setRegistrosPorPagina(parseInt(e.target.value));
									setPaginaActual(1);
								}}
								className="select-registros">
								<option value="10">10</option>
								<option value="25">25</option>
								<option value="50">50</option>
								<option value="100">100</option>
							</select>
							<span>registros</span>
						</div>
						<div className="buscar-usuarios-grupo">
							<span>Buscar:</span>
							<input
								type="text"
								value={buscarUsuario}
								onChange={(e) => {
									setBuscarUsuario(e.target.value);
									setPaginaActual(1);
								}}
								className="input-buscar-usuarios"
							/>
						</div>
					</div>

					<div className="tabla-usuarios-container">
						<table className="tabla-usuarios">
							<thead>
								<tr>
									<th>ID</th>
									<th>Nombre</th>
									<th>Usuario</th>
									<th>Rol</th>
									<th>Sucursal</th>
									<th>Estado</th>
									<th>Ultimo login</th>
									<th>Acciones</th>
								</tr>
							</thead>
							<tbody>
								{usuarios.length === 0 ? (
									<tr>
										<td colSpan="8" className="sin-usuarios">
											No hay usuarios para mostrar
										</td>
									</tr>
								) : (
									usuarios.map((usuario, index) => (
										<tr key={usuario.id}>
											<td>{usuarioInicio + index}</td>
											<td>{usuario.nombre}</td>
											<td>{usuario.usuario}</td>
											<td>{usuario.rol}</td>
											<td>{usuario.sucursal}</td>
											<td>
												<span
													className={`estado-badge ${usuario.estado === "Activado" ? "activado" : "desactivado"}`}>
													{usuario.estado}
												</span>
											</td>
											<td>{usuario.ultimoLogin}</td>
											<td>
												<div className="acciones-usuarios">
													<button
														className="btn-editar-usuario"
														onClick={() => {
															setUsuarioEditar(usuario);
															setModalAgregarOpen(true);
														}}
														title="Editar usuario">
														<img
															src={editarIcono}
															alt="Editar"
															className="btn-edit-icon"
														/>
													</button>
													<button
														className="btn-eliminar-usuario"
														onClick={() => {
															setUsuarioAEliminar(usuario);
															setModalEliminarOpen(true);
														}}
														title="Eliminar usuario">
														<img
															src={eliminarIconoV2}
															alt="Eliminar"
															className="icono-eliminar-usuario"
														/>
													</button>
												</div>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

					<div className="paginacion-inferior">
						<div className="contador-usuarios">
							Mostrando registros del {usuarioInicio} al {usuarioFin} de un total de{" "}
							{totalUsuarios}
						</div>
						<div className="botones-paginacion">
							<button
								className="btn-pag"
								onClick={() => setPaginaActual((p) => p - 1)}
								disabled={paginaActual === 1}>
								Anterior
							</button>
							{[...Array(totalPaginas)].map((_, i) => (
								<button
									key={i + 1}
									className={`btn-pag-numero ${paginaActual === i + 1 ? "activo" : ""}`}
									onClick={() => setPaginaActual(i + 1)}>
									{i + 1}
								</button>
							))}
							<button
								className="btn-pag"
								onClick={() => setPaginaActual((p) => p + 1)}
								disabled={paginaActual >= totalPaginas}>
								Siguiente
							</button>
						</div>
					</div>
				</div>

				<ModalConfirmarEliminacion
					isOpen={modalEliminarOpen}
					onClose={() => {
						setModalEliminarOpen(false);
						setUsuarioAEliminar(null);
					}}
					onConfirm={confirmarEliminarUsuario}
					tipo="usuario"
					nombreElemento={usuarioAEliminar?.nombre || ""}
				/>
				<ModalNotificacion
					isOpen={notificacion.isOpen}
					onClose={() => setNotificacion({ ...notificacion, isOpen: false })}
					mensaje={notificacion.mensaje}
					tipo={notificacion.tipo}
				/>
				<ModalAgregarUsuario
					isOpen={modalAgregarOpen}
					onClose={() => setModalAgregarOpen(false)}
					onGuardar={handleGuardarUsuario}
					usuarioEditar={usuarioEditar}
				/>
			</div>
		</PageLayout>
	);
};

export default Usuarios;
