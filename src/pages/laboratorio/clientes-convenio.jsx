import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AdminCatalogPage,
	AdminCatalogTable,
} from "../../components/admin-catalog.jsx";
import ModalConfirmarEliminacion from "../../components/ModalConfirmarEliminacion";
import ModalNotificacion from "../../components/ModalNotificacion";
import PageLayout from "../../components/page-layout.jsx";
import { useEmpleadoActual } from "../../hooks/use-empleado-actual";
import { supabase } from "../../lib/supabase-client";
import { useBusquedaPersistente } from "../../hooks/use-busqueda-persistente";
import {
	MODULOS_ACCESO_CLIENTE,
	combinarClientesConAccesos,
	correoDeUsuarioCliente,
	eliminarAccesoCliente,
	guardarAccesoCliente,
	normalizarUsuarioCliente,
	validarAccesoCliente,
} from "../../utils/clientes-accesos";
import { normalizarNombreDuplicado } from "../../utils/duplicados-registro";
import "./clientes-convenio.css";

const cargarClientesConAccesos = async () => {
	const { data: clientes, error } = await supabase
		.from("clientes")
		.select("id_cliente, nombre, activo")
		.order("nombre");
	if (error) throw error;

	const { data: accesos, error: errorAccesos } = await supabase
		.from("clientes_accesos")
		.select("id, id_cliente, modulo, usuario, email, activo");
	if (errorAccesos) throw errorAccesos;

	return combinarClientesConAccesos(clientes || [], accesos || []);
};

const ModalAccesoCliente = ({ isOpen, cliente, modulo, acceso, onClose, onGuardar }) => {
	const [usuario, setUsuario] = useState("");
	const [contrasena, setContrasena] = useState("");
	const [error, setError] = useState("");
	const [guardando, setGuardando] = useState(false);
	const esNuevo = !acceso;

	useEffect(() => {
		if (!isOpen) return;
		setUsuario(acceso?.usuario || "");
		setContrasena("");
		setError("");
		setGuardando(false);
	}, [isOpen, acceso]);

	if (!isOpen) return null;

	const etiquetaModulo =
		MODULOS_ACCESO_CLIENTE.find((item) => item.id === modulo)?.etiqueta || modulo;

	const guardar = async () => {
		const aviso = validarAccesoCliente({ usuario, contrasena, esNuevo });
		if (aviso) {
			setError(aviso);
			return;
		}
		setError("");
		setGuardando(true);
		try {
			await onGuardar({ usuario: normalizarUsuarioCliente(usuario), contrasena });
		} catch (err) {
			setError(err?.message || "No se pudo guardar el acceso");
			setGuardando(false);
			return;
		}
		setGuardando(false);
	};

	return (
		<>
			<div className="acceso-cliente-overlay" onClick={guardando ? undefined : onClose} />
			<div
				className="acceso-cliente-modal"
				role="dialog"
				aria-modal="true"
				aria-label={`Acceso de ${etiquetaModulo}`}>
				<h2>Acceso de {etiquetaModulo}</h2>
				<p className="acceso-cliente-cliente">{cliente?.nombre}</p>
				<p className="acceso-cliente-ayuda">
					{modulo === "imagen"
						? "Entra a radiología y ve sólo los estudios de las órdenes capturadas a nombre de este convenio."
						: "Entra a la pantalla de resultados y ve sólo las órdenes de laboratorio de este convenio."}
				</p>

				<label className="acceso-cliente-label" htmlFor="acceso-usuario">
					Usuario <span aria-hidden="true">*</span>
				</label>
				<input
					id="acceso-usuario"
					type="text"
					className="acceso-cliente-input"
					value={usuario}
					disabled={guardando}
					placeholder="medisim-lab"
					autoCapitalize="none"
					autoCorrect="off"
					spellCheck={false}
					onChange={(e) => {
						setUsuario(e.target.value);
						setError("");
					}}
				/>
				{/* El usuario se guarda sin acentos ni espacios: se ve cómo va a
				    quedar antes de guardarlo, que es lo que se le va a dictar al
				    convenio por teléfono. */}
				{normalizarUsuarioCliente(usuario) !== usuario.trim() &&
					normalizarUsuarioCliente(usuario) !== "" && (
						<p className="acceso-cliente-nota">
							Se guardará como <strong>{normalizarUsuarioCliente(usuario)}</strong>
						</p>
					)}

				<label className="acceso-cliente-label" htmlFor="acceso-contrasena">
					Contraseña {esNuevo && <span aria-hidden="true">*</span>}
				</label>
				<input
					id="acceso-contrasena"
					type="password"
					className="acceso-cliente-input"
					value={contrasena}
					disabled={guardando}
					placeholder={esNuevo ? "" : "Déjala vacía para conservar la actual"}
					onChange={(e) => {
						setContrasena(e.target.value);
						setError("");
					}}
				/>

				{error && <p className="acceso-cliente-error">{error}</p>}

				<div className="acceso-cliente-footer">
					<button type="button" className="btn-acceso-cancelar" onClick={onClose} disabled={guardando}>
						Cancelar
					</button>
					<button type="button" className="btn-acceso-guardar" onClick={guardar} disabled={guardando}>
						{guardando ? "Guardando..." : "Guardar acceso"}
					</button>
				</div>
			</div>
		</>
	);
};

const ClientesConvenio = () => {
	const { empleadoData, formatRol, getPrimerNombre } = useEmpleadoActual();
	const queryClient = useQueryClient();
	const [buscar, setBuscar] = useBusquedaPersistente("clientes-convenio:termino");
	const [accesoEditar, setAccesoEditar] = useState(null);
	const [accesoEliminar, setAccesoEliminar] = useState(null);
	const [notificacion, setNotificacion] = useState({ isOpen: false, mensaje: "", tipo: "exito" });

	const { data: clientes = [], isLoading, error } = useQuery({
		queryKey: ["clientes-convenio"],
		queryFn: cargarClientesConAccesos,
		staleTime: 1000 * 60,
	});

	const mostrarNotificacion = (mensaje, tipo = "exito") =>
		setNotificacion({ isOpen: true, mensaje, tipo });

	const refrescar = () => queryClient.invalidateQueries({ queryKey: ["clientes-convenio"] });

	// La búsqueda es sobre lo ya cargado -son unas decenas de convenios- y sin
	// acentos, que es como se teclea con el teléfono en la mano.
	const clientesFiltrados = useMemo(() => {
		const termino = normalizarNombreDuplicado(buscar);
		if (!termino) return clientes;
		return clientes.filter((cliente) =>
			normalizarNombreDuplicado(cliente.nombre).includes(termino),
		);
	}, [clientes, buscar]);

	const guardarAcceso = async ({ usuario, contrasena }) => {
		await guardarAccesoCliente(supabase, {
			id_cliente: accesoEditar.cliente.id_cliente,
			modulo: accesoEditar.modulo,
			usuario,
			// El correo interno se arma del usuario y nadie lo teclea: existe sólo
			// porque el proveedor de identidad autentica correos.
			email: correoDeUsuarioCliente(usuario),
			contrasena,
			nombre: accesoEditar.cliente.nombre,
		});
		setAccesoEditar(null);
		refrescar();
		mostrarNotificacion("Acceso guardado correctamente");
	};

	const confirmarEliminar = async () => {
		try {
			await eliminarAccesoCliente(supabase, {
				id_cliente: accesoEliminar.cliente.id_cliente,
				modulo: accesoEliminar.modulo,
			});
			refrescar();
			mostrarNotificacion("Acceso eliminado correctamente");
		} catch (err) {
			mostrarNotificacion(err?.message || "No se pudo eliminar el acceso", "error");
		} finally {
			setAccesoEliminar(null);
		}
	};

	const filas = clientesFiltrados.map((cliente) => (
		<tr key={cliente.id_cliente}>
			<td>{cliente.id_cliente}</td>
			<td>{cliente.nombre}</td>
			{MODULOS_ACCESO_CLIENTE.map(({ id, etiqueta }) => {
				const acceso = cliente.accesos?.[id];
				return (
					<td key={id}>
						<div className="acceso-celda">
							<span className={`acceso-estado${acceso ? " con-acceso" : ""}`}>
								{acceso ? acceso.usuario : "Sin acceso"}
							</span>
							<div className="acceso-acciones">
								<button
									type="button"
									className="acceso-boton"
									onClick={() => setAccesoEditar({ cliente, modulo: id, acceso })}>
									{acceso ? "Editar" : "Crear"}
								</button>
								{acceso && (
									<button
										type="button"
										className="acceso-boton peligro"
										onClick={() => setAccesoEliminar({ cliente, modulo: id, etiqueta })}>
										Quitar
									</button>
								)}
							</div>
						</div>
					</td>
				);
			})}
		</tr>
	));

	return (
		<PageLayout
			empleadoData={empleadoData}
			formatRol={formatRol}
			getPrimerNombre={getPrimerNombre}>
			<AdminCatalogPage
				title="Clientes de convenio"
				searchValue={buscar}
				onSearchChange={setBuscar}
				searchPlaceholder="Busca un convenio..."
				afterContent={
					<>
						<ModalAccesoCliente
							isOpen={Boolean(accesoEditar)}
							cliente={accesoEditar?.cliente}
							modulo={accesoEditar?.modulo}
							acceso={accesoEditar?.acceso}
							onClose={() => setAccesoEditar(null)}
							onGuardar={guardarAcceso}
						/>
						<ModalConfirmarEliminacion
							isOpen={Boolean(accesoEliminar)}
							onClose={() => setAccesoEliminar(null)}
							onConfirm={confirmarEliminar}
							titulo="Quitar acceso"
							mensaje={`Se quitará el acceso de ${accesoEliminar?.etiqueta || ""} de ${accesoEliminar?.cliente?.nombre || ""}. Dejará de poder entrar a la plataforma.`}
							textoConfirmar="Quitar acceso"
							textoCancelar="Cancelar"
						/>
						<ModalNotificacion
							isOpen={notificacion.isOpen}
							onClose={() => setNotificacion({ ...notificacion, isOpen: false })}
							mensaje={notificacion.mensaje}
							tipo={notificacion.tipo}
						/>
					</>
				}>
				<p className="clientes-convenio-ayuda">
					Cada convenio puede tener dos accesos: el de imagen entra a radiología y
					el de laboratorio a su pantalla de resultados. Sólo ven las órdenes que
					recepción capturó a su nombre.
				</p>
				{error && <p className="clientes-convenio-error">No se pudieron cargar los clientes.</p>}
				<AdminCatalogTable
					columns={["ID", "Cliente", "Acceso imagen", "Acceso laboratorio"]}
					rows={filas}
					emptyMessage={isLoading ? "Cargando clientes..." : "No hay clientes para mostrar"}
					emptyColSpan={4}
				/>
			</AdminCatalogPage>
		</PageLayout>
	);
};

export default ClientesConvenio;
