import { useEffect, useState } from "react";
import PageLayout from "../../../components/page-layout.jsx";
import { useAuth } from "../../../context/auth-context";
import { supabase } from "../../../lib/supabase-client";
import ModalAgregar from "../componentes/modal-agregar";
import Tabla from "../componentes/tabla";
import "./administrar-niveles.css";

const AdministrarNiveles = () => {
	const { user } = useAuth();

	const [buscarNivel, setBuscarNivel] = useState("");
	const [niveles, setNiveles] = useState([]);
	const [registrosPorPagina, setRegistrosPorPagina] = useState(10);
	const [paginaActual, setPaginaActual] = useState(1);
	const [totalNiveles, setTotalNiveles] = useState(0);
	const [modalOpen, setModalOpen] = useState(false);
	const [modoEdicion, setModoEdicion] = useState(false);
	const [nivelEditando, setNivelEditando] = useState(null);
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
		cargarNiveles();
	}, [paginaActual, registrosPorPagina, buscarNivel]);

	const cargarNiveles = async () => {
		try {
			let query = supabase.from("niveles_mar").select("*", { count: "exact" });
			if (buscarNivel.trim()) query = query.ilike("nombre", `%${buscarNivel}%`);
			const desde = (paginaActual - 1) * registrosPorPagina;
			const { data, error, count } = await query
				.range(desde, desde + registrosPorPagina - 1)
				.order("id", { ascending: true });
			if (error) throw error;
			setTotalNiveles(count || 0);
			setNiveles(data || []);
		} catch (error) {
			console.error("Error al cargar niveles:", error);
		}
	};

	const handleGuardarNivel = async (nombre) => {
		try {
			if (modoEdicion && nivelEditando) {
				const { error } = await supabase
					.from("niveles_mar")
					.update({ nombre })
					.eq("id", nivelEditando.id);
				if (error) throw error;
				alert("Nivel actualizado correctamente");
			} else {
				const { error } = await supabase.from("niveles_mar").insert([{ nombre }]);
				if (error) throw error;
				alert("Nivel agregado correctamente");
			}
			cargarNiveles();
			setModalOpen(false);
			setModoEdicion(false);
			setNivelEditando(null);
		} catch (error) {
			console.error("Error al guardar nivel:", error);
			alert("Error al guardar el nivel");
		}
	};

	const handleEditarNivel = async (id) => {
		try {
			const { data, error } = await supabase
				.from("niveles_mar")
				.select("*")
				.eq("id", id)
				.single();
			if (error) throw error;
			setModoEdicion(true);
			setNivelEditando(data);
			setModalOpen(true);
		} catch (error) {
			console.error("Error:", error);
			alert("Error al cargar el nivel");
		}
	};

	const nivelInicio = (paginaActual - 1) * registrosPorPagina + 1;
	const nivelFin = Math.min(paginaActual * registrosPorPagina, totalNiveles);
	const totalPaginas = Math.ceil(totalNiveles / registrosPorPagina);

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
			<div className="admin-niveles-wrapper">
				<div className="admin-niveles-header">
					<h1 className="admin-niveles-title">Administrar Niveles</h1>
				</div>
				<div className="admin-niveles-content">
					<div className="controles-superiores-niveles">
						<button
							className="btn-agregar-nivel"
							onClick={() => {
								setModoEdicion(false);
								setNivelEditando(null);
								setModalOpen(true);
							}}>
							Agregar Nivel
						</button>
					</div>
					<div className="controles-tabla-niveles">
						<div className="mostrar-registros-niveles">
							<span>Mostrar</span>
							<select
								value={registrosPorPagina}
								onChange={(e) => {
									setRegistrosPorPagina(parseInt(e.target.value));
									setPaginaActual(1);
								}}
								className="select-registros-niveles">
								<option value="10">10</option>
								<option value="25">25</option>
								<option value="50">50</option>
								<option value="100">100</option>
							</select>
							<span>registros</span>
						</div>
						<div className="buscar-niveles-grupo">
							<span>Buscar:</span>
							<input
								type="text"
								value={buscarNivel}
								onChange={(e) => {
									setBuscarNivel(e.target.value);
									setPaginaActual(1);
								}}
								className="input-buscar-niveles"
							/>
						</div>
					</div>
					<Tabla
						headers={["Nivel"]}
						datos={niveles.map((n) => ({ id: n.id, nivel: n.nombre }))}
						paginaInicio={nivelInicio}
						onEditar={handleEditarNivel}
						textoVacio="No hay niveles para mostrar"
					/>
					<div className="paginacion-niveles">
						<div className="contador-niveles">
							Mostrando registros del {nivelInicio} al {nivelFin} de un total de{" "}
							{totalNiveles}
						</div>
						<div className="botones-paginacion-niveles">
							<button
								className="btn-pag-niveles"
								onClick={() => setPaginaActual((p) => p - 1)}
								disabled={paginaActual === 1}>
								Anterior
							</button>
							{[...Array(totalPaginas)].map((_, i) => (
								<button
									key={i + 1}
									className={`btn-pag-numero-niveles ${paginaActual === i + 1 ? "activo" : ""}`}
									onClick={() => setPaginaActual(i + 1)}>
									{i + 1}
								</button>
							))}
							<button
								className="btn-pag-niveles"
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
						setNivelEditando(null);
					}}
					onGuardar={handleGuardarNivel}
					titulo={modoEdicion ? "Editar" : "Agregar Nivel"}
					placeholder={modoEdicion ? "Editar Nivel" : "Ingresar Nivel"}
					icono="⚙️"
					valorInicial={modoEdicion ? nivelEditando?.nombre : ""}
					modoEdicion={modoEdicion}
				/>
			</div>
		</PageLayout>
	);
};

export default AdministrarNiveles;
