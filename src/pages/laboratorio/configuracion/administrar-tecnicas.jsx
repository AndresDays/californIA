import { useEffect, useState } from "react";
import PageLayout from "../../../components/page-layout.jsx";
import { useAuth } from "../../../context/auth-context";
import { supabase } from "../../../lib/supabase-client";
import { useBusquedaPersistente } from "../../../hooks/use-busqueda-persistente";
import ModalAgregar from "../componentes/modal-agregar.jsx";
import Tabla from "../componentes/tabla";
import "./administrar-tecnicas.css";

const AdministrarTecnicas = () => {
	const { user } = useAuth();

	const [buscarTecnica, setBuscarTecnica] = useBusquedaPersistente("tecnicas:termino");
	const [tecnicas, setTecnicas] = useState([]);
	const [registrosPorPagina, setRegistrosPorPagina] = useState(10);
	const [paginaActual, setPaginaActual] = useState(1);
	const [totalTecnicas, setTotalTecnicas] = useState(0);
	const [modalOpen, setModalOpen] = useState(false);
	const [modoEdicion, setModoEdicion] = useState(false);
	const [tecnicasEditando, setTecnicasEditando] = useState(null);
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
		cargarTecnicas();
	}, [paginaActual, registrosPorPagina, buscarTecnica]);

	const cargarTecnicas = async () => {
		try {
			let query = supabase.from("tecnicas").select("*", { count: "exact" });
			if (buscarTecnica.trim()) query = query.ilike("nombre", `%${buscarTecnica}%`);
			const desde = (paginaActual - 1) * registrosPorPagina;
			const { data, error, count } = await query
				.range(desde, desde + registrosPorPagina - 1)
				.order("id", { ascending: true });
			if (error) throw error;
			setTotalTecnicas(count || 0);
			setTecnicas(data || []);
		} catch (error) {
			console.error("Error al cargar tecnicas:", error);
		}
	};

	const handleGuardarTecnica = async (nombre) => {
		try {
			if (modoEdicion && tecnicasEditando) {
				const { error } = await supabase
					.from("tecnicas")
					.update({ nombre })
					.eq("id", tecnicasEditando.id);
				if (error) throw error;
				alert("Tecnica actualizada correctamente");
			} else {
				const { error } = await supabase.from("tecnicas").insert([{ nombre }]);
				if (error) throw error;
				alert("Tecnica agregada correctamente");
			}
			cargarTecnicas();
			setModalOpen(false);
			setModoEdicion(false);
			setTecnicasEditando(null);
		} catch (error) {
			console.error("Error al guardar tecnica:", error);
			alert("Error al guardar tecnica");
		}
	};

	const handleEditarTecnica = async (id) => {
		try {
			const { data, error } = await supabase
				.from("tecnicas")
				.select("*")
				.eq("id", id)
				.single();
			if (error) throw error;
			setModoEdicion(true);
			setTecnicasEditando(data);
			setModalOpen(true);
		} catch (error) {
			console.error("Error:", error);
			alert("Error al cargar tecnica");
		}
	};

	const tecnicaInicio = (paginaActual - 1) * registrosPorPagina + 1;
	const tecnicaFin = Math.min(paginaActual * registrosPorPagina, totalTecnicas);
	const totalPaginas = Math.ceil(totalTecnicas / registrosPorPagina);

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
			<div className="admin-tecnicas-wrapper">
				<div className="admin-tecnicas-header">
					<h1 className="admin-tecnicas-title">Administrar Tecnicas</h1>
				</div>

				<div className="admin-tecnicas-content">
					<div className="controles-superiores-tecnicas">
						<button
							className="btn-agregar-tecnica"
							onClick={() => {
								setModalOpen(true);
								setModoEdicion(false);
								setTecnicasEditando(null);
							}}>
							Agregar Tecnica
						</button>
					</div>

					<div className="controles-tabla-tecnicas">
						<div className="mostrar-registros-tecnicas">
							<span>Mostrar</span>
							<select
								value={registrosPorPagina}
								onChange={(e) => {
									setRegistrosPorPagina(parseInt(e.target.value));
									setPaginaActual(1);
								}}
								className="select-registros-tecnicas">
								<option value="10">10</option>
								<option value="25">25</option>
								<option value="50">50</option>
								<option value="100">100</option>
							</select>
							<span>registros</span>
						</div>
						<div className="buscar-tecnicas-grupo">
							<span>Buscar:</span>
							<input
								type="text"
								value={buscarTecnica}
								onChange={(e) => {
									setBuscarTecnica(e.target.value);
									setPaginaActual(1);
								}}
								className="input-buscar-tecnicas"
							/>
						</div>
					</div>

					<Tabla
						headers={["Tecnica"]}
						datos={tecnicas.map((t) => ({ id: t.id, tecnica: t.nombre }))}
						paginaInicio={tecnicaInicio}
						onEditar={handleEditarTecnica}
						textoVacio="No hay tecnicas para mostrar"
					/>

					<div className="paginacion-tecnicas">
						<div className="contador-tecnicas">
							Mostrando registros del {tecnicaInicio} al {tecnicaFin} de un total de{" "}
							{totalTecnicas}
						</div>
						<div className="botones-paginacion-tecnicas">
							<button
								className="btn-pag-tecnicas"
								onClick={() => setPaginaActual((p) => p - 1)}
								disabled={paginaActual === 1}>
								Anterior
							</button>
							{[...Array(totalPaginas)].map((_, i) => (
								<button
									key={i + 1}
									className={`btn-pag-numero-tecnicas ${paginaActual === i + 1 ? "activo" : ""}`}
									onClick={() => setPaginaActual(i + 1)}>
									{i + 1}
								</button>
							))}
							<button
								className="btn-pag-tecnicas"
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
						setTecnicasEditando(null);
					}}
					onGuardar={handleGuardarTecnica}
					titulo={modoEdicion ? "Editar" : "Agregar Tecnica"}
					placeholder={modoEdicion ? "Editar Tecnica" : "Ingresar Tecnica"}
					icono="⚙️"
					valorInicial={modoEdicion ? tecnicasEditando?.nombre : ""}
					modoEdicion={modoEdicion}
				/>
			</div>
		</PageLayout>
	);
};

export default AdministrarTecnicas;
