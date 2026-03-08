import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../../components/header-principal.jsx';
import Layout from '../../../components/layout.jsx';
import SidebarHome from '../../../components/sidebar-home.jsx';
import { useAuth } from '../../../context/auth-context';
import { supabase } from '../../../lib/supabase-client';
import ModalAgregar from '../componentes/modal-agregar';
import Tabla from '../componentes/tabla';
import './administrar-equipos.css';

const AdministrarEquipos = () => {
  const { user } = useAuth();
	const navigate = useNavigate();
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef(null);

  const [buscarEquipo, setBuscarEquipo] = useState('');
  const [equipos, setEquipos] = useState([]);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(10);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalEquipos, setTotalEquipos] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [equiposEditando, setEquiposEditando] = useState(null);

  const [empleadoData, setEmpleadoData] = useState(null);

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
    cargarEquipos();
  }, [paginaActual, registrosPorPagina, buscarEquipo]);

  const cargarEquipos = async () => {
    try {
      let query = supabase
        .from('equipos_lab')
        .select('*', { count: 'exact' });

      if (buscarEquipo.trim()) {
        query = query.ilike('nombre', `%${buscarEquipo}%`);
      }

      const desde = (paginaActual - 1) * registrosPorPagina;
      const hasta = desde + registrosPorPagina - 1;

      const { data, error, count } = await query
        .range(desde, hasta)
        .order('id', { ascending: true });

      if (error) throw error;

      setTotalEquipos(count || 0);
      setEquipos(data || []);
    } catch (error) {
      console.error('Error al cargar equipos:', error);
    }
  };

  const handleAgregarEquipo = () => {
    setModalOpen(true);
    setModoEdicion(false);
    setEquiposEditando(null);
  };

  const handleGuardarEquipo = async (nombre) => {
    try {
      if (modoEdicion && equiposEditando) {
        const { error } = await supabase
          .from('equipos_lab')
          .update({ nombre: nombre })
          .eq('id', equiposEditando.id);

        if (error) throw error;

        alert('Equipo actualizado correctamente');
      } else {
        const { error } = await supabase
          .from('equipos_lab')
          .insert([{ nombre: nombre }]);

        if (error) throw error;

        alert('Equipo agregado correctamente');
      }

      cargarEquipos();
      setModalOpen(false);
      setModoEdicion(false);
      setEquiposEditando(null);
    } catch (error) {
      console.error('Error al guardar equipo:', error);
      alert('Error al guardar el equipo');
    }
  };

  const handleEditarEquipo = async (id) => {
    try {
      const { data, error } = await supabase
        .from('equipos_lab')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setModoEdicion(true);
      setEquiposEditando(data);
      setModalOpen(true);
    } catch (error) {
      console.error('Error al cargar equipo para editar:', error);
      alert('Error al cargar el equipo');
    }
  };

  const paginaSiguiente = () => {
    if (paginaActual * registrosPorPagina < totalEquipos) {
      setPaginaActual(paginaActual + 1);
    }
  };

  const paginaAnterior = () => {
    if (paginaActual > 1) {
      setPaginaActual(paginaActual - 1);
    }
  };

  const irAPagina = (pagina) => {
    setPaginaActual(pagina);
  };

  const equipoInicio = (paginaActual - 1) * registrosPorPagina + 1;
  const equipoFin = Math.min(paginaActual * registrosPorPagina, totalEquipos);
  const totalPaginas = Math.ceil(totalEquipos / registrosPorPagina);

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
			<div className="admin-equipos-wrapper">
				<Header
					menuOpen={menuOpen}
					setMenuOpen={setMenuOpen}
					menuRef={menuRef}
					empleadoData={empleadoData}
					formatRol={formatRol}
					getPrimerNombre={getPrimerNombre}
					user={user}
					handleLogout={handleLogout}
					currentPage="administrar-equipos"
				/>

				<SidebarHome />

				<div className="admin-equipos-header">
					<h1 className="admin-equipos-title">Administrar Equipos</h1>
				</div>

				<div className="admin-equipos-content">
					<div className="controles-superiores-equipos">
						<button className="btn-agregar-equipo" onClick={handleAgregarEquipo}>
							Agregar Equipo
						</button>
					</div>

					<div className="controles-tabla-equipos">
						<div className="mostrar-registros-equipos">
							<span>Mostrar</span>
							<select
								value={registrosPorPagina}
								onChange={(e) => {
									setRegistrosPorPagina(parseInt(e.target.value));
									setPaginaActual(1);
								}}
								className="select-registros-equipos">
								<option value="10">10</option>
								<option value="25">25</option>
								<option value="50">50</option>
							</select>
							<span>registros</span>
						</div>

						<div className="buscar-equipos-grupo">
							<span>Buscar:</span>
							<input
								type="text"
								value={buscarEquipo}
								onChange={(e) => {
									setBuscarEquipo(e.target.value);
									setPaginaActual(1);
								}}
								className="input-buscar-equipos"
							/>
						</div>
					</div>

					<Tabla
						headers={["Equipo"]}
						datos={equipos.map((e) => ({ id: e.id, equipo: e.nombre }))}
						paginaInicio={equipoInicio}
						onEditar={handleEditarEquipo}
						textoVacio="No hay equipos para mostrar"
					/>

					<div className="paginacion-equipos">
						<div className="contador-equipos">
							Mostrando registros del {equipoInicio} al {equipoFin} de un total de{" "}
							{totalEquipos}
						</div>

						<div className="botones-paginacion-equipos">
							<button
								className="btn-pag-equipos"
								onClick={paginaAnterior}
								disabled={paginaActual === 1}>
								Anterior
							</button>

							{[...Array(totalPaginas)].map((_, i) => (
								<button
									key={i + 1}
									className={`btn-pag-numero-equipos ${paginaActual === i + 1 ? "activo" : ""}`}
									onClick={() => irAPagina(i + 1)}>
									{i + 1}
								</button>
							))}

							<button
								className="btn-pag-equipos"
								onClick={paginaSiguiente}
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
						setEquiposEditando(null);
					}}
					onGuardar={handleGuardarEquipo}
					titulo={modoEdicion ? "Editar" : "Agregar Equipo"}
					placeholder={modoEdicion ? "Editar Equipo" : "Ingresar Equipo"}
					icono="⚙️"
					valorInicial={modoEdicion ? equiposEditando?.nombre : ""}
					modoEdicion={modoEdicion}
				/>
			</div>
		</Layout>
	);
};

export default AdministrarEquipos;
