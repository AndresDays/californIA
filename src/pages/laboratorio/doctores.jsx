import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { useEmpleadoActual } from "../../hooks/use-empleado-actual";
import { supabase } from "../../lib/supabase-client";
import { useDoctores } from "../../hooks/use-doctores";
import { useBusquedaPersistente } from "../../hooks/use-busqueda-persistente";
import {
	buscarDuplicadoRegistro,
	crearMensajeRegistroDuplicado,
} from "../../utils/duplicados-registro.js";
import {
	actualizarDoctorConAuthentication,
	crearDoctorConAuthentication,
} from "../../utils/doctores-auth.js";
import ModalAgregarDoctor from "./componentes/modal-agregar-doctor";
import { useModalPersistente } from "../../hooks/use-campo-persistente";

const Doctores = () => {
	const { empleadoData, formatRol, getPrimerNombre } = useEmpleadoActual();
	const queryClient = useQueryClient();
	const [buscarDoctor, setBuscarDoctor] = useBusquedaPersistente("doctores:termino");
	const [paginaActual, setPaginaActual] = useState(1);
	const [doctorEditar, setDoctorEditar] = useState(null);
	// Si el navegador descarta la página, el modal se reabre con lo capturado en
	// lugar de dejar al usuario en la lista creyendo que perdió el alta.
	const [modalAbierto, setModalAbierto] = useModalPersistente("modal-doctor:abierto:doctores", {
		persistir: !doctorEditar,
	});
	const [modalEliminarOpen, setModalEliminarOpen] = useState(false);
	const [doctorAEliminar, setDoctorAEliminar] = useState(null);
	const [duplicadoPendiente, setDuplicadoPendiente] = useState(null);
	const [notificacion, setNotificacion] = useState({
		isOpen: false,
		mensaje: "",
		tipo: "exito",
	});
	const doctoresPorPagina = 500;

	const { data: doctoresResult } = useDoctores({ buscar: buscarDoctor, pagina: paginaActual, porPagina: doctoresPorPagina });
	const totalDoctores = doctoresResult?.count ?? 0;
	const doctoresRaw = doctoresResult?.data ?? [];

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

	const doctores = doctoresRaw.map((doctor) => ({
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
		auth_uuid: doctor.auth_uuid || "",
		esRadiologo: Boolean(doctor.es_radiologo),
		especialidad: doctor.especialidad || "",
			tipoDoctor: ["particular", "institucion"].includes(doctor.tipo_doctor)
				? doctor.tipo_doctor
				: "particular",
			institucion: doctor.institucion || "",
			fechaRegistro: new Date(doctor.created_at || Date.now()).toLocaleString("es-MX", {
			day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
		}),
	}));

	const refrescarDoctores = () => {
		queryClient.invalidateQueries({ queryKey: ['doctores'] });
	};

	const handleGuardarDoctor = async (doctorData, isEditMode) => {
		const insertarDoctor = async () => {
			await crearDoctorConAuthentication(supabase, doctorData);
			mostrarNotificacion("Doctor agregado correctamente en Authentication", "exito");
			refrescarDoctores();
			setModalAbierto(false);
		};

		try {
			if (isEditMode) {
				await actualizarDoctorConAuthentication(supabase, doctorData);
				mostrarNotificacion("Doctor actualizado correctamente", "exito");
			} else {
				const duplicado = await buscarDuplicadoRegistro({
					supabase,
					tabla: "doctores",
					registro: doctorData,
					idCampo: "id_doctor",
				});
				if (duplicado) {
					setDuplicadoPendiente({
						mensaje: crearMensajeRegistroDuplicado({ tipo: "doctor", duplicado }),
						onConfirm: insertarDoctor,
					});
					return;
				}

				await insertarDoctor();
			}
			if (isEditMode) {
				refrescarDoctores();
				setModalAbierto(false);
			}
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
			refrescarDoctores();
			mostrarNotificacion("Doctor eliminado correctamente", "exito");
		} catch (error) {
			console.error("Error al eliminar doctor:", error);
			mostrarNotificacion("Error al eliminar doctor", "error");
		} finally {
			setDoctorAEliminar(null);
		}
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
						<ModalConfirmarEliminacion
							isOpen={Boolean(duplicadoPendiente)}
							onClose={() => setDuplicadoPendiente(null)}
							onConfirm={() => duplicadoPendiente?.onConfirm?.()}
							titulo="Registro duplicado"
							mensaje={duplicadoPendiente?.mensaje}
							textoConfirmar="Agregar de todos modos"
							textoCancelar="Cancelar"
							mostrarAdvertencia={false}
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
