import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import agregarPacienteBtn from '../assets/agregarPacienteBtn.png';
import editarIcono from '../assets/editarIcono.png';
import eliminarIconoV2 from '../assets/eliminarIconoV2.png';
import imprimirTablaBtn from '../assets/imprimirTablaBtn.png';
import Header from '../components/header-principal.jsx';
import ModalConfirmarEliminacion from '../components/ModalConfirmarEliminacion';
import ModalNotificacion from '../components/ModalNotificacion';
import SidebarHome from '../components/sidebar-home.jsx';
import { useAuth } from '../context/auth-context.jsx';
import { supabase } from '../lib/supabase-client.js';
import ModalAgregarPaciente from './laboratorio/componentes/modal-agregar-paciente.jsx';
import './pacientes.css';

const Pacientes = () => {
  const { user } = useAuth();
	const navigate = useNavigate();
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef(null);

  const [empleadoData, setEmpleadoData] = useState(null);
  const [buscarPaciente, setBuscarPaciente] = useState('');
  const [pacientes, setPacientes] = useState([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPacientes, setTotalPacientes] = useState(0);
  const [modalAgregarPacienteOpen, setModalAgregarPacienteOpen] = useState(false);
  const [pacienteEditar, setPacienteEditar] = useState(null);
  const pacientesPorPagina = 500;
  const [modalEliminarOpen, setModalEliminarOpen] = useState(false);
  const [pacienteAEliminar, setPacienteAEliminar] = useState(null);

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
    cargarPacientes();
  }, [paginaActual, buscarPaciente]);

  const [notificacion, setNotificacion] = useState({
  isOpen: false,
  mensaje: '',
  tipo: 'exito'
});

const mostrarNotificacion = (mensaje, tipo = 'exito') => {
  setNotificacion({
    isOpen: true,
    mensaje,
    tipo
  });
};

const confirmarEliminarPaciente = async () => {
  if (!pacienteAEliminar) return;

  try {
    const { error } = await supabase
      .from('pacientes')
      .delete()
      .eq('id_paciente', pacienteAEliminar.id);

    if (error) throw error;

    mostrarNotificacion('Paciente eliminado correctamente', 'exito');
    cargarPacientes();
  } catch (error) {
    console.error('Error al eliminar paciente:', error);
    mostrarNotificacion('Error al eliminar paciente: ' + error.message, 'error');
  } finally {
    setPacienteAEliminar(null);
  }
};

const handleGuardarPacienteModal = async (pacienteData, isEditMode) => {
  try {
    if (isEditMode) {
      const { error } = await supabase
        .from('pacientes')
        .update({
          nombre: pacienteData.nombre,
          apellido_paterno: pacienteData.apellido_paterno,
          apellido_materno: pacienteData.apellido_materno,
          primer_nombre: pacienteData.primer_nombre,
          fecha_nacimiento: pacienteData.fecha_nacimiento,
          edad: pacienteData.edad,
          sexo: pacienteData.sexo,
          direccion: pacienteData.direccion,
          cedula: pacienteData.cedula,
          condicion_especial: pacienteData.condicion_especial,
          email: pacienteData.email,
          pais: pacienteData.pais,
          telefono: pacienteData.telefono,
          updated_at: new Date().toISOString()
        })
        .eq('id_paciente', pacienteData.id);

      if (error) throw error;
      mostrarNotificacion('Paciente actualizado correctamente', 'exito');
    } else {
      const { error } = await supabase
        .from('pacientes')
        .insert([pacienteData]);

      if (error) throw error;
      mostrarNotificacion('Paciente guardado correctamente', 'exito');
    }

    cargarPacientes();
    setModalAgregarPacienteOpen(false);
  } catch (error) {
    console.error('Error al guardar paciente:', error);
    mostrarNotificacion('Error al guardar paciente: ' + error.message, 'error');
  }
};

  const cargarPacientes = async () => {
    try {
      let query = supabase
        .from('pacientes')
        .select('*', { count: 'exact' });

      if (buscarPaciente.trim()) {
        query = query.or(
          `nombre.ilike.%${buscarPaciente}%,` +
          `apellido_paterno.ilike.%${buscarPaciente}%,` +
          `apellido_materno.ilike.%${buscarPaciente}%,` +
          `email.ilike.%${buscarPaciente}%`
        );
      }

      const desde = (paginaActual - 1) * pacientesPorPagina;
      const hasta = desde + pacientesPorPagina - 1;

      const { data, error, count } = await query
        .range(desde, hasta)
        .order('id_paciente', { ascending: true });

      if (error) throw error;

      setTotalPacientes(count || 0);

      const pacientesFormateados = data?.map(paciente => ({
        id: paciente.id_paciente,
        apellidoPaterno: paciente.apellido_paterno || '',
        apellidoMaterno: paciente.apellido_materno || '',
        nombre: paciente.primer_nombre || paciente.nombre || '',
        edad: calcularEdad(paciente.fecha_nacimiento),
        sexo: paciente.sexo || '',
        telefono: paciente.telefono || '',
        email: paciente.email || '',
        fechaNacimiento: paciente.fecha_nacimiento || '',
        direccion: paciente.direccion || '',
        cedula: paciente.cedula || '',
        condicionEspecial: paciente.condicion_especial || '',
        pais: paciente.pais || 'México',
        fechaRegistro: new Date(paciente.created_at || Date.now()).toLocaleString('es-MX', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      })) || [];

      setPacientes(pacientesFormateados);
    } catch (error) {
      console.error('Error al cargar pacientes:', error);
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

  const handleAgregarPaciente = () => {
    setPacienteEditar(null);
    setModalAgregarPacienteOpen(true);
  };

  const handleEditarPaciente = (paciente) => {
    setPacienteEditar(paciente);
    setModalAgregarPacienteOpen(true);
  };

  const handleEliminarPaciente = async (paciente) => {
    setPacienteAEliminar(paciente);
    setModalEliminarOpen(true);
    }

  const handleImprimirTabla = () => {
    window.print();
  };

  const paginaSiguiente = () => {
    if (paginaActual * pacientesPorPagina < totalPacientes) {
      setPaginaActual(paginaActual + 1);
    }
  };

  const paginaAnterior = () => {
    if (paginaActual > 1) {
      setPaginaActual(paginaActual - 1);
    }
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

  const pacienteInicio = (paginaActual - 1) * pacientesPorPagina + 1;
  const pacienteFin = Math.min(paginaActual * pacientesPorPagina, totalPacientes);

  return (
		<div className="admin-pacientes-wrapper">
			<Header
				menuOpen={menuOpen}
				setMenuOpen={setMenuOpen}
				menuRef={menuRef}
				empleadoData={empleadoData}
				formatRol={formatRol}
				getPrimerNombre={getPrimerNombre}
				user={user}
				handleLogout={handleLogout}
				currentPage="pacientes"
			/>

			<SidebarHome />

			<div className="admin-pacientes-header">
				<h1 className="admin-pacientes-title">Administrar Pacientes</h1>
			</div>

			<div className="admin-pacientes-content">
				<div className="controles-admin-pacientes">
					<div className="botones-accion-admin">
						<button className="btn-agregar-paciente" onClick={handleAgregarPaciente}>
							<img
								src={agregarPacienteBtn}
								alt="Agregar Paciente"
								className="btn-action-img"
							/>
						</button>
						<button className="btn-imprimir-tabla" onClick={handleImprimirTabla}>
							<img
								src={imprimirTablaBtn}
								alt="Imprimir Tabla"
								className="btn-action-img"
							/>
						</button>
					</div>
				</div>

				<div className="busqueda-admin">
					<input
						type="text"
						placeholder="Busca Pacientes Aqui..."
						value={buscarPaciente}
						onChange={(e) => {
							setBuscarPaciente(e.target.value);
							setPaginaActual(1);
						}}
						className="input-buscar-admin"
					/>
				</div>

				<div className="paginacion-superior">
					<button
						className="btn-paginacion"
						onClick={paginaAnterior}
						disabled={paginaActual === 1}>
						&#8249;
					</button>
					<span className="info-paginacion">
						Mostrando: {pacienteInicio}-{pacienteFin} de {totalPacientes}
					</span>
					<button
						className="btn-paginacion"
						onClick={paginaSiguiente}
						disabled={paginaActual * pacientesPorPagina >= totalPacientes}>
						&#8250;
					</button>
				</div>

				<div className="tabla-admin-pacientes-container">
					<table className="tabla-admin-pacientes">
						<thead>
							<tr>
								<th>ID</th>
								<th>Apellido paterno</th>
								<th>Apellido Materno</th>
								<th>Nombre</th>
								<th>Edad</th>
								<th>Sexo</th>
								<th>Telefono</th>
								<th>Email</th>
								<th>Fecha Registro</th>
								<th>Accion</th>
							</tr>
						</thead>
						<tbody>
							{pacientes.length === 0 ? (
								<tr>
									<td colSpan="10" className="sin-pacientes">
										No hay pacientes para mostrar
									</td>
								</tr>
							) : (
								pacientes.map((paciente) => (
									<tr key={paciente.id}>
										<td>{paciente.id}</td>
										<td>{paciente.apellidoPaterno}</td>
										<td>{paciente.apellidoMaterno}</td>
										<td>{paciente.nombre}</td>
										<td>{paciente.edad} años</td>
										<td>{paciente.sexo}</td>
										<td>{paciente.telefono}</td>
										<td>{paciente.email}</td>
										<td>{paciente.fechaRegistro}</td>
										<td>
											<div className="acciones-paciente">
												<button
													className="btn-editar-paciente"
													onClick={() => handleEditarPaciente(paciente)}
													title="Editar paciente">
													<img
														src={editarIcono}
														alt="Editar"
														className="btn-edit-icon"
													/>
												</button>
												<button
													className="btn-eliminar-paciente"
													onClick={() => handleEliminarPaciente(paciente)}
													title="Eliminar paciente">
													<img
														src={eliminarIconoV2}
														alt="Eliminar"
														className="icono-eliminar"
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
			</div>
			<ModalAgregarPaciente
				isOpen={modalAgregarPacienteOpen}
				onClose={() => setModalAgregarPacienteOpen(false)}
				onGuardar={handleGuardarPacienteModal}
				pacienteEditar={pacienteEditar}
			/>

			<ModalConfirmarEliminacion
				isOpen={modalEliminarOpen}
				onClose={() => {
					setModalEliminarOpen(false);
					setPacienteAEliminar(null);
				}}
				onConfirm={confirmarEliminarPaciente}
				tipo="paciente"
				nombreElemento={
					pacienteAEliminar
						? `${pacienteAEliminar.nombre} ${pacienteAEliminar.apellidoPaterno} ${pacienteAEliminar.apellidoMaterno}`
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
	);
};

export default Pacientes;
