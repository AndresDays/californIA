import { useEffect, useState } from "react";
import PageLayout from "../../../components/page-layout.jsx";
import { useAuth } from "../../../context/auth-context";
import { supabase } from "../../../lib/supabase-client";
import { useBusquedaPersistente } from "../../../hooks/use-busqueda-persistente";
import ModalAgregar from "../componentes/modal-agregar";
import Tabla from "../componentes/tabla";
import "./administrar-recipientes.css";

const AdministrarRecipientes = () => {
	const { user } = useAuth();

	const [buscarRecipiente, setBuscarRecipiente] = useBusquedaPersistente("recipientes:termino");
	const [recipientes, setRecipientes] = useState([]);
	const [registrosPorPagina, setRegistrosPorPagina] = useState(10);
	const [paginaActual, setPaginaActual] = useState(1);
	const [totalRecipientes, setTotalRecipientes] = useState(0);
	const [modalOpen, setModalOpen] = useState(false);
	const [modoEdicion, setModoEdicion] = useState(false);
	const [recipienteEditando, setRecipienteEditando] = useState(null);
	const [empleadoData, setEmpleadoData] = useState(null);

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
		cargarRecipientes();
	}, [paginaActual, registrosPorPagina, buscarRecipiente]);

	const cargarRecipientes = async () => {
		try {
			let query = supabase.from("recipientes").select("*", { count: "exact" });
			if (buscarRecipiente.trim())
				query = query.ilike("nombre", `%${buscarRecipiente}%`);
			const desde = (paginaActual - 1) * registrosPorPagina;
			const { data, error, count } = await query
				.range(desde, desde + registrosPorPagina - 1)
				.order("id", { ascending: true });
			if (error) throw error;
			setTotalRecipientes(count || 0);
			setRecipientes(data || []);
		} catch (error) {
			console.error("Error al cargar recipientes:", error);
		}
	};

	const handleEditarRecipiente = async (id) => {
		try {
			const { data, error } = await supabase
				.from("recipientes")
				.select("*")
				.eq("id", id)
				.single();
			if (error) throw error;
			setModoEdicion(true);
			setRecipienteEditando(data);
			setModalOpen(true);
		} catch (error) {
			console.error("Error al cargar recipiente:", error);
			alert("Error al cargar el recipiente");
		}
	};

	const handleGuardarRecipiente = async (nombre) => {
		try {
			if (modoEdicion && recipienteEditando) {
				const { error } = await supabase
					.from("recipientes")
					.update({ nombre })
					.eq("id", recipienteEditando.id);
				if (error) throw error;
				alert("Recipiente actualizado correctamente");
			} else {
				const { error } = await supabase.from("recipientes").insert([{ nombre }]);
				if (error) throw error;
				alert("Recipiente agregado correctamente");
			}
			cargarRecipientes();
			setModalOpen(false);
			setModoEdicion(false);
			setRecipienteEditando(null);
		} catch (error) {
			console.error("Error al guardar recipiente:", error);
			alert("Error al guardar el recipiente");
		}
	};

	const recipienteInicio = (paginaActual - 1) * registrosPorPagina + 1;
	const recipienteFin = Math.min(
		paginaActual * registrosPorPagina,
		totalRecipientes,
	);
	const totalPaginas = Math.ceil(totalRecipientes / registrosPorPagina);

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

	return (
		<PageLayout
			empleadoData={empleadoData}
			formatRol={formatRol}
			getPrimerNombre={getPrimerNombre}>
			<div className="admin-recipientes-wrapper">
				<div className="admin-recipientes-header">
					<h1 className="admin-recipientes-title">Administrar Recipientes</h1>
				</div>

				<div className="admin-recipientes-content">
					<div className="controles-superiores-recipientes">
						<button
							className="btn-agregar-recipiente"
							onClick={() => {
								setModoEdicion(false);
								setRecipienteEditando(null);
								setModalOpen(true);
							}}>
							Agregar Recipiente
						</button>
					</div>

					<div className="controles-tabla-recipientes">
						<div className="mostrar-registros-recipientes">
							<span>Mostrar</span>
							<select
								value={registrosPorPagina}
								onChange={(e) => {
									setRegistrosPorPagina(parseInt(e.target.value));
									setPaginaActual(1);
								}}
								className="select-registros-recipientes">
								<option value="10">10</option>
								<option value="25">25</option>
								<option value="50">50</option>
								<option value="100">100</option>
							</select>
							<span>registros</span>
						</div>
						<div className="buscar-recipientes-grupo">
							<span>Buscar:</span>
							<input
								type="text"
								value={buscarRecipiente}
								onChange={(e) => {
									setBuscarRecipiente(e.target.value);
									setPaginaActual(1);
								}}
								className="input-buscar-recipientes"
							/>
						</div>
					</div>

					<Tabla
						headers={["Recipiente"]}
						datos={recipientes.map((r) => ({ id: r.id, recipiente: r.nombre }))}
						paginaInicio={recipienteInicio}
						onEditar={handleEditarRecipiente}
						textoVacio="No hay recipientes para mostrar"
					/>

					<div className="paginacion-recipientes">
						<div className="contador-recipientes">
							Mostrando registros del {recipienteInicio} al {recipienteFin} de un
							total de {totalRecipientes}
						</div>
						<div className="botones-paginacion-recipientes">
							<button
								className="btn-pag-recipientes"
								onClick={() => setPaginaActual((p) => p - 1)}
								disabled={paginaActual === 1}>
								Anterior
							</button>
							{[...Array(totalPaginas)].map((_, i) => (
								<button
									key={i + 1}
									className={`btn-pag-numero-recipientes ${paginaActual === i + 1 ? "activo" : ""}`}
									onClick={() => setPaginaActual(i + 1)}>
									{i + 1}
								</button>
							))}
							<button
								className="btn-pag-recipientes"
								onClick={() => setPaginaActual((p) => p + 1)}
								disabled={paginaActual >= totalPaginas}>
								Siguiente
							</button>
						</div>
					</div>
				</div>

				<ModalAgregar
					isOpen={modalOpen}
					onClose={() => {
						setModalOpen(false);
						setModoEdicion(false);
						setRecipienteEditando(null);
					}}
					onGuardar={handleGuardarRecipiente}
					titulo={modoEdicion ? "Editar" : "Agregar Recipiente"}
					placeholder={modoEdicion ? "Editar Recipiente" : "Ingresar Recipiente"}
					icono="⚙️"
					valorInicial={modoEdicion ? recipienteEditando?.nombre : ""}
					modoEdicion={modoEdicion}
				/>
			</div>
		</PageLayout>
	);
};

export default AdministrarRecipientes;
