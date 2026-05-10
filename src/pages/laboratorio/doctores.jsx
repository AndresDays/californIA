import { useEffect, useState } from "react";
import agregarDoctorBtn from "../../assets/agregarDoctorBtn.png";
import editarIcono from "../../assets/editarIcono.png";
import eliminarIconoV2 from "../../assets/eliminarIconoV2.png";
import imprimirTablaBtn from "../../assets/imprimirTablaBtn.png";
import {
	AdminCatalogIconButton,
	AdminCatalogPage,
	AdminCatalogPagination,
	AdminCatalogTable,
} from "../../components/admin-catalog.jsx";
import ModalConfirmarEliminacion from "../../components/ModalConfirmarEliminacion";
import ModalNotificacion from "../../components/ModalNotificacion";
import PageLayout from "../../components/page-layout.jsx";
import { useAuth } from "../../context/auth-context";
import { supabase } from "../../lib/supabase-client";
import ModalAgregarDoctor from "./componentes/modal-agregar-doctor";

const Doctores = () => {
	const { user } = useAuth();
	const [buscarDoctor, setBuscarDoctor] = useState("");
	const [doctores, setDoctores] = useState([]);
	const [totalDoctores, setTotalDoctores] = useState(0);
	const [paginaActual, setPaginaActual] = useState(1);
	const [modalAbierto, setModalAbierto] = useState(false);
	const [doctorEditar, setDoctorEditar] = useState(null);
	const [modalEliminarOpen, setModalEliminarOpen] = useState(false);
	const [doctorAEliminar, setDoctorAEliminar] = useState(null);
	const [empleadoData, setEmpleadoData] = useState(null);
	const [notificacion, setNotificacion] = useState({
		isOpen: false,
		mensaje: "",
		tipo: "exito",
	});
	const doctoresPorPagina = 500;

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
		cargarDoctores();
	}, [buscarDoctor, paginaActual]);

	const mostrarNotificacion = (mensaje, tipo = "exito") =>
		setNotificacion({ isOpen: true, mensaje, tipo });

	const calcularEdad = (fechaNacimiento) => {
		if (!fechaNacimiento) return 0;
		const hoy = new Date();
		const nacimiento = new Date(fechaNacimiento);
		let edad = hoy.getFullYear() - nacimiento.getFullYear();
		const mes = hoy.getMonth() - nacimiento.getMonth();
		if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
		return edad;
	};

	const cargarDoctores = async () => {
		try {
			let query = supabase.from("doctores").select("*", { count: "exact" });
			if (buscarDoctor.trim()) {
				query = query.or(
					`nombre.ilike.%${buscarDoctor}%,apellido_paterno.ilike.%${buscarDoctor}%,apellido_materno.ilike.%${buscarDoctor}%,email.ilike.%${buscarDoctor}%`,
				);
			}
			const desde = (paginaActual - 1) * doctoresPorPagina;
			const hasta = desde + doctoresPorPagina - 1;
			const { data, error, count } = await query.order("id_doctor", {
				ascending: true,
			}).range(desde, hasta);
			if (error) throw error;
			setTotalDoctores(count || 0);
			setDoctores(
				data?.map((doctor) => ({
					id: doctor.id_doctor,
					apellidoPaterno: doctor.apellido_paterno || "",
					apellidoMaterno: doctor.apellido_materno || "",
					nombre: doctor.primer_nombre || doctor.nombre || "",
					edad: calcularEdad(doctor.fecha_nacimiento),
					sexo: doctor.sexo || "",
					fechaNacimiento: doctor.fecha_nacimiento || "",
					telefono: doctor.telefono || "",
					email: doctor.email || "",
					usuario: doctor.usuario || "",
					contrasena: doctor.contrasena || "",
					fechaRegistro: new Date(doctor.created_at || Date.now()).toLocaleString(
						"es-MX",
						{
							day: "2-digit",
							month: "2-digit",
							year: "numeric",
							hour: "2-digit",
							minute: "2-digit",
						},
					),
				})) || [],
			);
		} catch (error) {
			console.error("Error al cargar doctores:", error);
		}
	};

	const handleGuardarDoctor = async (doctorData, isEditMode) => {
		try {
			if (isEditMode) {
				const { error } = await supabase
					.from("doctores")
					.update({
						nombre: doctorData.nombre,
						apellido_paterno: doctorData.apellido_paterno,
						apellido_materno: doctorData.apellido_materno,
						primer_nombre: doctorData.primer_nombre,
						fecha_nacimiento: doctorData.fecha_nacimiento,
						edad: doctorData.edad,
						sexo: doctorData.sexo,
						email: doctorData.email,
						telefono: doctorData.telefono,
						usuario: doctorData.usuario,
						contrasena: doctorData.contrasena,
						updated_at: new Date().toISOString(),
					})
					.eq("id_doctor", doctorData.id);
				if (error) throw error;
				mostrarNotificacion("Doctor actualizado correctamente", "exito");
			} else {
				const { error } = await supabase.from("doctores").insert([doctorData]);
				if (error) throw error;
				mostrarNotificacion("Doctor agregado correctamente", "exito");
			}
			cargarDoctores();
			setModalAbierto(false);
		} catch (error) {
			console.error("Error al guardar doctor:", error);
			throw error;
		}
	};

	const confirmarEliminarDoctor = async () => {
		if (!doctorAEliminar) return;
		try {
			const { error } = await supabase
				.from("doctores")
				.delete()
				.eq("id_doctor", doctorAEliminar.id);
			if (error) throw error;
			cargarDoctores();
			mostrarNotificacion("Doctor eliminado correctamente", "exito");
		} catch (error) {
			console.error("Error al eliminar doctor:", error);
			mostrarNotificacion("Error al eliminar doctor", "error");
		} finally {
			setDoctorAEliminar(null);
		}
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

	const doctorInicio = totalDoctores ? (paginaActual - 1) * doctoresPorPagina + 1 : 0;
	const doctorFin = Math.min(paginaActual * doctoresPorPagina, totalDoctores);
	const paginaAnterior = () => setPaginaActual((pagina) => Math.max(1, pagina - 1));
	const paginaSiguiente = () => {
		if (paginaActual * doctoresPorPagina < totalDoctores) {
			setPaginaActual((pagina) => pagina + 1);
		}
	};

	const doctorRows = doctores.map((doctor) => (
		<tr key={doctor.id}>
			<td>{doctor.id}</td>
			<td>{doctor.apellidoPaterno}</td>
			<td>{doctor.apellidoMaterno}</td>
			<td>{doctor.nombre}</td>
			<td>{doctor.edad} años</td>
			<td>{doctor.sexo}</td>
			<td>{doctor.telefono}</td>
			<td>{doctor.email}</td>
			<td>{doctor.fechaRegistro}</td>
			<td>
				<div className="admin-catalog-row-actions">
					<button
						type="button"
						className="admin-catalog-row-button"
						onClick={() => {
							setDoctorEditar(doctor);
							setModalAbierto(true);
						}}
						title="Editar doctor"
						aria-label="Editar doctor">
						<img src={editarIcono} alt="Editar" className="admin-catalog-row-icon edit" />
					</button>
					<button
						type="button"
						className="admin-catalog-row-button"
						onClick={() => {
							setDoctorAEliminar(doctor);
							setModalEliminarOpen(true);
						}}
						title="Eliminar doctor"
						aria-label="Eliminar doctor">
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
				title="Administrar Doctores"
				actions={
					<>
						<AdminCatalogIconButton
							label="Agregar Doctor"
							icon={agregarDoctorBtn}
							onClick={() => {
								setDoctorEditar(null);
								setModalAbierto(true);
							}}
						/>
						<AdminCatalogIconButton
							label="Imprimir Tabla"
							icon={imprimirTablaBtn}
							onClick={() => window.print()}
						/>
					</>
				}
				searchValue={buscarDoctor}
				onSearchChange={(value) => {
					setBuscarDoctor(value);
					setPaginaActual(1);
				}}
				searchPlaceholder="Busca Doctores Aqui..."
				pagination={
					<AdminCatalogPagination
						start={doctorInicio}
						end={doctorFin}
						total={totalDoctores}
						onPrevious={paginaAnterior}
						onNext={paginaSiguiente}
						previousDisabled={paginaActual === 1}
						nextDisabled={paginaActual * doctoresPorPagina >= totalDoctores}
					/>
				}
				afterContent={
					<>
						<ModalAgregarDoctor
							isOpen={modalAbierto}
							onClose={() => setModalAbierto(false)}
							onSave={handleGuardarDoctor}
							doctorEditar={doctorEditar}
						/>
						<ModalConfirmarEliminacion
							isOpen={modalEliminarOpen}
							onClose={() => {
								setModalEliminarOpen(false);
								setDoctorAEliminar(null);
							}}
							onConfirm={confirmarEliminarDoctor}
							tipo="doctor"
							nombreElemento={
								doctorAEliminar
									? `${doctorAEliminar.nombre} ${doctorAEliminar.apellidoPaterno} ${doctorAEliminar.apellidoMaterno}`
									: ""
							}
						/>
						<ModalNotificacion
							isOpen={notificacion.isOpen}
							onClose={() => setNotificacion({ ...notificacion, isOpen: false })}
							mensaje={notificacion.mensaje}
							tipo={notificacion.tipo}
						/>
					</>
				}>
				<AdminCatalogTable
					columns={[
						"ID",
						"Apellido paterno",
						"Apellido Materno",
						"Nombre",
						"Edad",
						"Sexo",
						"Telefono",
						"Email",
						"Fecha Registro",
						"Accion",
					]}
					rows={doctorRows}
					emptyMessage="No hay doctores para mostrar"
					emptyColSpan={10}
				/>
			</AdminCatalogPage>
		</PageLayout>
	);
};

export default Doctores;
