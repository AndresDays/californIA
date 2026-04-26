import { useEffect, useState } from "react";
import PageLayout from "../../../components/page-layout.jsx";
import { useAuth } from "../../../context/auth-context";
import { supabase } from "../../../lib/supabase-client";
import ModalAgregar from "../componentes/modal-agregar.jsx";
import Tabla from "../componentes/tabla";
import "./tipo_muestra.css";

const TipoMuestra = () => {
	const { user } = useAuth();

	const [buscarMuestra, setBuscarMuestra] = useState("");
	const [muestras, setMuestras] = useState([]);
	const [registrosPorPagina, setRegistrosPorPagina] = useState(10);
	const [paginaActual, setPaginaActual] = useState(1);
	const [totalMuestras, setTotalMuestras] = useState(0);
	const [modalOpen, setModalOpen] = useState(false);
	const [modoEdicion, setModoEdicion] = useState(false);
	const [muestraEditando, setMuestraEditando] = useState(null);
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
		cargarMuestras();
	}, [paginaActual, registrosPorPagina, buscarMuestra]);

	const cargarMuestras = async () => {
		try {
			let query = supabase.from("tipo_muestra").select("*", { count: "exact" });
			if (buscarMuestra.trim())
				query = query.ilike("categoria", `%${buscarMuestra}%`);
			const desde = (paginaActual - 1) * registrosPorPagina;
			const { data, error, count } = await query
				.range(desde, desde + registrosPorPagina - 1)
				.order("id", { ascending: true });
			if (error) throw error;
			setTotalMuestras(count || 0);
			setMuestras(data || []);
		} catch (error) {
			console.error("Error al cargar muestras:", error);
		}
	};

	const handleGuardarMuestra = async (categoria) => {
		try {
			if (modoEdicion && muestraEditando) {
				const { error } = await supabase
					.from("tipo_muestra")
					.update({ categoria })
					.eq("id", muestraEditando.id);
				if (error) throw error;
				alert("Muestra actualizada correctamente");
			} else {
				const { error } = await supabase
					.from("tipo_muestra")
					.insert([{ categoria }]);
				if (error) throw error;
				alert("Muestra agregada correctamente");
			}
			cargarMuestras();
			setModalOpen(false);
			setModoEdicion(false);
			setMuestraEditando(null);
		} catch (error) {
			console.error("Error al guardar muestra:", error);
			alert("Error al guardar la muestra");
		}
	};

	const handleEditarMuestra = async (id) => {
		try {
			const { data, error } = await supabase
				.from("tipo_muestra")
				.select("*")
				.eq("id", id)
				.single();
			if (error) throw error;
			setModoEdicion(true);
			setMuestraEditando(data);
			setModalOpen(true);
		} catch (error) {
			console.error("Error:", error);
			alert("Error al cargar la muestra");
		}
	};

	const muestraInicio = (paginaActual - 1) * registrosPorPagina + 1;
	const muestraFin = Math.min(paginaActual * registrosPorPagina, totalMuestras);
	const totalPaginas = Math.ceil(totalMuestras / registrosPorPagina);

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
			<div className="tipo-muestra-wrapper">
				<div className="tipo-muestra-header">
					<h1 className="tipo-muestra-title">Tipo de Muestra</h1>
				</div>
				<div className="tipo-muestra-content">
					<div className="controles-superiores-muestra">
						<button
							className="btn-agregar-muestra"
							onClick={() => {
								setModoEdicion(false);
								setMuestraEditando(null);
								setModalOpen(true);
							}}>
							Agregar Tipo de Muestra
						</button>
					</div>
					<div className="controles-tabla-muestra">
						<div className="mostrar-registros-muestra">
							<span>Mostrar</span>
							<select
								value={registrosPorPagina}
								onChange={(e) => {
									setRegistrosPorPagina(parseInt(e.target.value));
									setPaginaActual(1);
								}}
								className="select-registros-muestra">
								<option value="10">10</option>
								<option value="25">25</option>
								<option value="50">50</option>
								<option value="100">100</option>
							</select>
							<span>registros</span>
						</div>
						<div className="buscar-muestra-grupo">
							<span>Buscar:</span>
							<input
								type="text"
								value={buscarMuestra}
								onChange={(e) => {
									setBuscarMuestra(e.target.value);
									setPaginaActual(1);
								}}
								className="input-buscar-muestra"
							/>
						</div>
					</div>
					<Tabla
						headers={["Categoria"]}
						datos={muestras.map((m) => ({ id: m.id, categoria: m.categoria }))}
						paginaInicio={muestraInicio}
						onEditar={handleEditarMuestra}
						textoVacio="No hay tipos de muestra para mostrar"
					/>
					<div className="paginacion-muestra">
						<div className="contador-muestra">
							Mostrando registros del {muestraInicio} al {muestraFin} de un total de{" "}
							{totalMuestras}
						</div>
						<div className="botones-paginacion-muestra">
							<button
								className="btn-pag-muestra"
								onClick={() => setPaginaActual((p) => p - 1)}
								disabled={paginaActual === 1}>
								Anterior
							</button>
							{[...Array(totalPaginas)].map((_, i) => (
								<button
									key={i + 1}
									className={`btn-pag-numero-muestra ${paginaActual === i + 1 ? "activo" : ""}`}
									onClick={() => setPaginaActual(i + 1)}>
									{i + 1}
								</button>
							))}
							<button
								className="btn-pag-muestra"
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
						setMuestraEditando(null);
					}}
					onGuardar={handleGuardarMuestra}
					titulo={modoEdicion ? "Editar" : "Agregar Muestra"}
					placeholder={modoEdicion ? "Editar Muestra" : "Ingresar Muestra"}
					icono="⚙️"
					valorInicial={modoEdicion ? muestraEditando?.categoria : ""}
					modoEdicion={modoEdicion}
				/>
			</div>
		</PageLayout>
	);
};

export default TipoMuestra;
