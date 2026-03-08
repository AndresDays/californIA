import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import editarIcono from '../../assets/editarIcono.png';
import eliminarIconoV2 from '../../assets/eliminarIconoV2.png';
import Header from '../../components/header-principal.jsx';
import Layout from '../../components/layout.jsx';
import ModalConfirmarEliminacion from '../../components/ModalConfirmarEliminacion';
import ModalNotificacion from '../../components/ModalNotificacion';
import SidebarHome from '../../components/sidebar-home.jsx';
import { useAuth } from '../../context/auth-context';
import { supabase } from '../../lib/supabase-client';
import ModalAgregarDoctor from './componentes/modal-agregar-doctor';
import './doctores.css';

const Doctores = () => {
  const { user } = useAuth();
	const navigate = useNavigate();
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef(null);

  const [buscarDoctor, setBuscarDoctor] = useState('');
  const [doctores, setDoctores] = useState([]);
  const [totalDoctores, setTotalDoctores] = useState(0);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [doctorEditar, setDoctorEditar] = useState(null);

  const [modalEliminarOpen, setModalEliminarOpen] = useState(false);
  const [doctorAEliminar, setDoctorAEliminar] = useState(null);

  const [empleadoData, setEmpleadoData] = useState(null);
  const [notificacion, setNotificacion] = useState({
  isOpen: false,
  mensaje: '',
  tipo: 'exito'
});

  useEffect(() => {
    const fetchEmpleadoData = async () => {
      if (!user?.id) return;

      try {
        const { data: empleado, error } = await supabase
          .from('empleados')
          .select('nombre, rol')
          .eq('auth_uuid', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error al obtener empleado:', error);
          return;
        }

        if (empleado) {
          setEmpleadoData(empleado);
        }
      } catch (error) {
        console.error('Error al obtener datos del empleado:', error);
      }
    };

    fetchEmpleadoData();
  }, [user]);

  useEffect(() => {
    cargarDoctores();
  }, [buscarDoctor]);

  const mostrarNotificacion = (mensaje, tipo = 'exito') => {
    setNotificacion({
      isOpen: true,
      mensaje,
      tipo
    });
  };

  const cargarDoctores = async () => {
    try {
      let query = supabase
        .from('doctores')
        .select('*', { count: 'exact' })

      if (buscarDoctor.trim()) {
        query = query.or(
          `nombre.ilike.%${buscarDoctor}%,` +
          `apellido_paterno.ilike.%${buscarDoctor}%,` +
          `apellido_materno.ilike.%${buscarDoctor}%,` +
          `email.ilike.%${buscarDoctor}%`
        );
      }

      const { data, error, count } = await query.order('id_doctor', { ascending: true });

      if (error) throw error;

      setTotalDoctores(count || 0);

      const doctoresFormateados = data?.map(doctor => ({
        id: doctor.id_doctor,
        apellidoPaterno: doctor.apellido_paterno || '',
        apellidoMaterno: doctor.apellido_materno || '',
        nombre: doctor.primer_nombre || doctor.nombre || '',
        edad: calcularEdad(doctor.fecha_nacimiento),
        sexo: doctor.sexo || '',
        fechaNacimiento: doctor.fecha_nacimiento || '',
        telefono: doctor.telefono || '',
        email: doctor.email || '',
        usuario: doctor.usuario || '',
        contrasena: doctor.contrasena || '',
        fechaRegistro: new Date(doctor.created_at || Date.now()).toLocaleString('es-MX', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      })) || [];

      setDoctores(doctoresFormateados);
    } catch (error) {
      console.error('Error al cargar doctores:', error);
    }
  };

  const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return 0;
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  };

  const handleAgregarDoctor = () => {
    setDoctorEditar(null);
    setModalAbierto(true);
  };

  const handleEditarDoctor = (doctor) => {
    setDoctorEditar(doctor);
    setModalAbierto(true);
  };

  const handleGuardarDoctor = async (doctorData, isEditMode) => {
    try {
      if (isEditMode) {
        const { error } = await supabase
          .from('doctores')
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
            updated_at: new Date().toISOString()
          })
          .eq('id_doctor', doctorData.id);

        if (error) throw error;
        mostrarNotificacion('Doctor actualizado correctamente', 'exito');
      } else {
        const { error } = await supabase
          .from('doctores')
          .insert([doctorData]);

        if (error) throw error;
        mostrarNotificacion('Doctor agregado correctamente', 'exito');
      }

      cargarDoctores();
      setModalAbierto(false);
    } catch (error) {
      console.error('Error al guardar doctor:', error);
      throw error;
    }
  };

  const handleEliminarDoctor = (doctor) => {
    setDoctorAEliminar(doctor);
    setModalEliminarOpen(true);
  };

  const confirmarEliminarDoctor = async () => {
    if (!doctorAEliminar) return;

    try {
      const { error } = await supabase
        .from('doctores')
        .delete()
        .eq('id_doctor', doctorAEliminar.id);

      if (error) throw error;

      cargarDoctores();
      mostrarNotificacion('Doctor eliminado correctamente', 'exito');
    } catch (error) {
      console.error('Error al eliminar doctor:', error);
      mostrarNotificacion('Error al eliminar doctor', 'error');
    } finally {
      setDoctorAEliminar(null);
    }
  };

  const handleImprimirTabla = () => {
    window.print();
  };

  const handleExportarExcel = () => {
    alert('Exportar a Excel');
  };

  const handleExportarPDF = () => {
    alert('Exportar a PDF');
  };

  const getPrimerNombre = (nombreCompleto) => {
    if (!nombreCompleto) return user?.email?.split('@')[0] || 'Usuario';
    return nombreCompleto;
  };

  const formatRol = (rol) => {
    if (!rol) return 'Usuario';

    const roles = {
      'admin': 'Administrador',
      'administrador': 'Administrador',
      'radiologo': 'Radiólogo - Director',
      'doctor': 'Médico',
      'medico': 'Médico',
      'tecnico_radiologia': 'Técnico en Radiología',
      'tecnico': 'Técnico',
      'quimico': 'Químico',
      'recepcionista': 'Recepcionista',
      'desarrollador': 'Desarrollador'
    };

    return roles[rol] || rol;
  };

  const handleLogout = async () => {
    const { signOut } = useAuth();
    await signOut();
    navigate('/login');
  };

  return (
		<Layout>
			<div className="admin-doctores-wrapper">
				<Header
					menuOpen={menuOpen}
					setMenuOpen={setMenuOpen}
					menuRef={menuRef}
					empleadoData={empleadoData}
					formatRol={formatRol}
					getPrimerNombre={getPrimerNombre}
					user={user}
					handleLogout={handleLogout}
					currentPage="doctores"
				/>

				<SidebarHome />

				<div className="admin-doctores-header">
					<h1 className="admin-doctores-title">Administrar Doctores</h1>
				</div>

				<div className="admin-doctores-content">
					<div className="controles-admin-doctores">
						<div className="botones-accion-doctores">
							<button className="btn-agregar-doctor" onClick={handleAgregarDoctor}>
								Agregar Doctor
							</button>
							<button
								className="btn-imprimir-tabla-doc"
								onClick={handleImprimirTabla}>
								Imprimir tabla
							</button>
						</div>
					</div>

					<div className="exportacion-busqueda">
						<div className="botones-exportacion">
							<button className="btn-exportar" onClick={handleExportarExcel}>
								Excel
							</button>
							<button className="btn-exportar" onClick={handleExportarPDF}>
								PDF
							</button>
						</div>

						<div className="busqueda-doctores">
							<label>Buscar:</label>
							<input
								type="text"
								value={buscarDoctor}
								onChange={(e) => setBuscarDoctor(e.target.value)}
								className="input-buscar-doctores"
							/>
						</div>
					</div>

					<div className="tabla-admin-doctores-container">
						<table className="tabla-admin-doctores">
							<thead>
								<tr>
									<th>Apellido paterno</th>
									<th>Apellido Materno</th>
									<th>Nombre</th>
									<th>Edad</th>
									<th>Sexo</th>
									<th>Fecha nacimiento</th>
									<th>Telefono</th>
									<th>Email</th>
									<th>Usuario</th>
									<th>Contraseña</th>
									<th>Fecha registro</th>
									<th>Accion</th>
								</tr>
							</thead>
							<tbody>
								{doctores.length === 0 ? (
									<tr>
										<td colSpan="12" className="sin-doctores">
											No hay doctores para mostrar
										</td>
									</tr>
								) : (
									doctores.map((doctor) => (
										<tr key={doctor.id}>
											<td>{doctor.apellidoPaterno}</td>
											<td>{doctor.apellidoMaterno}</td>
											<td>{doctor.nombre}</td>
											<td>{doctor.edad}</td>
											<td>{doctor.sexo}</td>
											<td>{doctor.fechaNacimiento}</td>
											<td>{doctor.telefono}</td>
											<td>{doctor.email}</td>
											<td>{doctor.usuario}</td>
											<td>{doctor.contrasena}</td>
											<td>{doctor.fechaRegistro}</td>
											<td>
												<div className="acciones-doctores">
													<button
														className="btn-editar-doctor"
														onClick={() => handleEditarDoctor(doctor)}
														title="Editar doctor">
														<img
															src={editarIcono}
															alt="Editar"
															className="btn-edit-icon"
														/>
													</button>
													<button
														className="btn-eliminar-doctor"
														onClick={() => handleEliminarDoctor(doctor)}
														title="Eliminar doctor">
														<img
															src={eliminarIconoV2}
															alt="Eliminar"
															className="icono-eliminar-doctor"
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

					<div className="contador-registros">
						Mostrando registros del 1 al {doctores.length} de un total de{" "}
						{totalDoctores}
					</div>
				</div>

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
			</div>
		</Layout>
	);
};

export default Doctores;
