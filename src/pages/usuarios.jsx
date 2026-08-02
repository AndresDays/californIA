import { useEffect, useState } from "react";
import agregarUsuarioBtn from "../assets/agregarUsuarioBtn.png";
import editarIcono from "../assets/editarIcono.png";
import eliminarIconoV2 from "../assets/eliminarIconoV2.png";
import {
	AdminCatalogIconButton,
	AdminCatalogPage,
	AdminCatalogPagination,
	AdminCatalogTable,
} from "../components/admin-catalog.jsx";
import ModalAgregarUsuario from "../components/ModalAgregarUsuario";
import ModalConfirmarEliminacion from "../components/ModalConfirmarEliminacion";
import ModalNotificacion from "../components/ModalNotificacion";
import PageLayout from "../components/page-layout.jsx";
import { useAuth } from "../context/auth-context";
import { supabase } from "../lib/supabase-client";
import { buildEmpleadoUpdatePayload, etiquetaRolUsuario } from "../utils/usuarios-auth";
import { obtenerMensajeErrorFuncion } from "../utils/supabase-functions";

const Usuarios = () => {
	const { empleadoData } = useAuth();

	const [buscarUsuario, setBuscarUsuario] = useState("");
	const [usuarios, setUsuarios] = useState([]);
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
	const [sucursales, setSucursales] = useState([]);
	const usuariosPorPagina = 500;

	useEffect(() => {
		cargarUsuarios();
	}, [paginaActual, buscarUsuario]);

	useEffect(() => {
		cargarSucursales();
	}, []);

	const formatRol = etiquetaRolUsuario;

	const cargarSucursales = async () => {
		try {
			const { data, error } = await supabase
				.from("sucursales")
				.select("id_sucursal, nombre")
				.order("nombre");
			if (error) throw error;
			setSucursales(data || []);
		} catch (error) {
			console.error("Error al cargar sucursales:", error);
			setSucursales([]);
		}
	};

	const cargarUsuarios = async () => {
		try {
			let query = supabase.from("empleados").select("*", { count: "exact" });
			if (buscarUsuario.trim())
				query = query.or(
					`nombre.ilike.%${buscarUsuario}%,usuario.ilike.%${buscarUsuario}%,rol.ilike.%${buscarUsuario}%,sucursal.ilike.%${buscarUsuario}%`,
				);
			const desde = (paginaActual - 1) * usuariosPorPagina;
			const { data, error, count } = await query
				.range(desde, desde + usuariosPorPagina - 1)
				.order("id_empleado", { ascending: true });
			if (error) throw error;
			setTotalUsuarios(count || 0);
			setUsuarios(
				data?.map((usuario) => ({
					id: usuario.id_empleado,
					numero: usuario.id_empleado,
					nombre: usuario.nombre || "",
					usuario: usuario.usuario || "-",
					rol: usuario.rol || "",
					rolLabel: formatRol(usuario.rol) || "-",
					sucursal: usuario.sucursal || "",
					sucursalLabel: usuario.sucursal || "-",
					email: usuario.email || "",
					telefono: usuario.telefono || "",
					auth_uuid: usuario.auth_uuid || "",
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
				const updateData = buildEmpleadoUpdatePayload(usuarioData);
				const { error } = await supabase
					.from("empleados")
					.update(updateData)
					.eq("id_empleado", usuarioData.id);
				if (error) throw error;
				if (usuarioData.contrasena?.trim()) {
					if (!usuarioData.auth_uuid) {
						throw new Error(
							"Este empleado no está ligado a Supabase Auth. Crea o vincula su usuario de Authentication primero.",
						);
					}
					const { error: authError } = await supabase.functions.invoke("admin-users", {
						body: {
							action: "updatePassword",
							auth_uuid: usuarioData.auth_uuid,
							password: usuarioData.contrasena,
						},
					});
					if (authError) throw authError;
				}
				mostrarNotificacion("Usuario actualizado correctamente", "exito");
			} else {
				const { error } = await supabase.functions.invoke("admin-users", {
					body: {
						action: "create",
						usuario: usuarioData,
					},
				});
				if (error) throw error;
				mostrarNotificacion(
					"Usuario agregado correctamente en Authentication y empleados",
					"exito",
				);
			}
			cargarUsuarios();
			setModalAgregarOpen(false);
		} catch (error) {
			console.error("Error:", error);
			const mensaje = await obtenerMensajeErrorFuncion(error);
			mostrarNotificacion("Error al guardar usuario: " + mensaje, "error");
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
		if (!nombreCompleto) return empleadoData?.email?.split("@")[0] || "Usuario";
		return nombreCompleto;
	};

	const usuarioInicio = totalUsuarios ? (paginaActual - 1) * usuariosPorPagina + 1 : 0;
	const usuarioFin = Math.min(paginaActual * usuariosPorPagina, totalUsuarios);
	const paginaAnterior = () => setPaginaActual((pagina) => Math.max(1, pagina - 1));
	const paginaSiguiente = () => {
		if (paginaActual * usuariosPorPagina < totalUsuarios) {
			setPaginaActual((pagina) => pagina + 1);
		}
	};

	const usuarioRows = usuarios.map((usuario, index) => (
		<tr key={usuario.id}>
			<td>{usuarioInicio + index}</td>
			<td>{usuario.nombre}</td>
			<td>{usuario.usuario}</td>
			<td>{usuario.rolLabel}</td>
			<td>{usuario.sucursalLabel}</td>
			<td>
				<span
					className={`admin-catalog-status ${
						usuario.estado === "Activado" ? "success" : "danger"
					}`}>
					{usuario.estado}
				</span>
			</td>
			<td>{usuario.ultimoLogin}</td>
			<td>
				<div className="admin-catalog-row-actions">
					<button
						type="button"
						className="admin-catalog-row-button"
						onClick={() => {
							setUsuarioEditar(usuario);
							setModalAgregarOpen(true);
						}}
						title="Editar usuario"
						aria-label="Editar usuario">
						<img src={editarIcono} alt="Editar" className="admin-catalog-row-icon edit" />
					</button>
					<button
						type="button"
						className="admin-catalog-row-button"
						onClick={() => {
							setUsuarioAEliminar(usuario);
							setModalEliminarOpen(true);
						}}
						title="Eliminar usuario"
						aria-label="Eliminar usuario">
						<img src={eliminarIconoV2} alt="Eliminar" className="admin-catalog-row-icon" />
					</button>
				</div>
			</td>
		</tr>
	));

	return (
		<PageLayout
			empleadoData={empleadoData}
			formatRol={formatRol}
			getPrimerNombre={getPrimerNombre}>
			<AdminCatalogPage
				title="Administrar Usuarios"
				actions={
					<AdminCatalogIconButton
						label="Agregar Usuario"
						icon={agregarUsuarioBtn}
						onClick={() => {
							setUsuarioEditar(null);
							setModalAgregarOpen(true);
						}}
					/>
				}
				searchValue={buscarUsuario}
				onSearchChange={(value) => {
					setBuscarUsuario(value);
					setPaginaActual(1);
				}}
				searchPlaceholder="Busca Usuarios Aqui..."
				pagination={
					<AdminCatalogPagination
						start={usuarioInicio}
						end={usuarioFin}
						total={totalUsuarios}
						onPrevious={paginaAnterior}
						onNext={paginaSiguiente}
						previousDisabled={paginaActual === 1}
						nextDisabled={paginaActual * usuariosPorPagina >= totalUsuarios}
					/>
				}
				afterContent={
					<>
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
							sucursales={sucursales}
						/>
					</>
				}>
				<AdminCatalogTable
					columns={[
						"ID",
						"Nombre",
						"Usuario",
						"Rol",
						"Sucursal",
						"Estado",
						"Ultimo login",
						"Acciones",
					]}
					rows={usuarioRows}
					emptyMessage="No hay usuarios para mostrar"
					emptyColSpan={8}
				/>
			</AdminCatalogPage>
		</PageLayout>
	);
};

export default Usuarios;
