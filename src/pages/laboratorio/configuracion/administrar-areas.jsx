import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../../components/header-principal.jsx';
import Layout from '../../../components/layout.jsx';
import SidebarHome from '../../../components/sidebar-home.jsx';
import { useAuth } from '../../../context/auth-context';
import { supabase } from '../../../lib/supabase-client';
import ModalAgregar from '../componentes/modal-agregar.jsx';
import './administrar-areas.css';

const AdministrarAreas = () => {
  const { user } = useAuth();
	const navigate = useNavigate();
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef(null);

  const [buscarArea, setBuscarArea] = useState('');
  const [areas, setAreas] = useState([]);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(10);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalAreas, setTotalAreas] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [areasEditando, setAreasEditando] = useState(null);

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
    cargarAreas();
  }, [paginaActual, registrosPorPagina, buscarArea]);

  const cargarAreas = async () => {
    try {
      let query = supabase
        .from('areas')
        .select('*', { count: 'exact' });

      if (buscarArea.trim()) {
        query = query.ilike('nombre', `%${buscarArea}%`);
      }

      const desde = (paginaActual - 1) * registrosPorPagina;
      const hasta = desde + registrosPorPagina - 1;

      const { data, error, count } = await query
        .range(desde, hasta)
        .order('id', { ascending: true });

      if (error) throw error;

      setTotalAreas(count || 0);
      setAreas(data || []);
    } catch (error) {
      console.error('Error al cargar areas:', error);
    }
  };

  const handleAgregarArea = () => {
        setModalOpen(true);
        setModoEdicion(false);
        setAreasEditando(null);
      };

      const handleGuardarArea = async (nombre) => {
        try {
          if (modoEdicion && areasEditando) {
            const { error } = await supabase
              .from('areas')
              .update({ nombre: nombre })
              .eq('id', areasEditando.id);

            if (error) throw error;

            alert('Area actualizada correctamente');
          } else {
            const { error } = await supabase
              .from('areas')
              .insert([{ nombre: nombre }]);

            if (error) throw error;

            alert('Area agregada correctamente');
          }

          cargarAreas();
          setModalOpen(false);
          setModoEdicion(false);
          setAreasEditando(null);
        } catch (error) {
          console.error('Error al guardar area:', error);
          alert('Error al guardar area');
        }
      };

  const handleEditarArea = async (id) => {
    try {
      const { data, error } = await supabase
        .from('areas')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setModoEdicion(true);
      setAreasEditando(data);
      setModalOpen(true);
    } catch (error) {
      console.error('Error al cargar area para editar:', error);
      alert('Error al cargar area');
    }
  };

  const paginaSiguiente = () => {
    if (paginaActual * registrosPorPagina < totalAreas) {
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

  const areaInicio = (paginaActual - 1) * registrosPorPagina + 1;
  const areaFin = Math.min(paginaActual * registrosPorPagina, totalAreas);
  const totalPaginas = Math.ceil(totalAreas / registrosPorPagina);

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
			<div className="admin-areas-wrapper">
				<Header
					menuOpen={menuOpen}
					setMenuOpen={setMenuOpen}
					menuRef={menuRef}
					empleadoData={empleadoData}
					formatRol={formatRol}
					getPrimerNombre={getPrimerNombre}
					user={user}
					handleLogout={handleLogout}
					currentPage="administrar-areas"
				/>

				<SidebarHome />

				<div className="admin-areas-header">
					<h1 className="admin-areas-title">Administrar Areas</h1>
				</div>

				<div className="admin-areas-content">
					<div className="controles-superiores-areas">
						<button className="btn-agregar-area" onClick={handleAgregarArea}>
							Agregar Area
						</button>
					</div>

					<div className="controles-tabla-areas">
						<div className="mostrar-registros-areas">
							<span>Mostrar</span>
							<select
								value={registrosPorPagina}
								onChange={(e) => {
									setRegistrosPorPagina(parseInt(e.target.value));
									setPaginaActual(1);
								}}
								className="select-registros-areas">
								<option value="10">10</option>
								<option value="25">25</option>
								<option value="50">50</option>
								<option value="100">100</option>
							</select>
							<span>registros</span>
						</div>

						<div className="buscar-areas-grupo">
							<span>Buscar:</span>
							<input
								type="text"
								value={buscarArea}
								onChange={(e) => {
									setBuscarArea(e.target.value);
									setPaginaActual(1);
								}}
								className="input-buscar-areas"
							/>
						</div>
					</div>

					<div className="tabla-areas-container">
						<table className="tabla-areas">
							<thead>
								<tr>
									<th># ⬍</th>
									<th>Area ⬍</th>
									<th>Acciones ⬍</th>
								</tr>
							</thead>
							<tbody>
								{areas.length === 0 ? (
									<tr>
										<td colSpan="3" className="sin-areas">
											No hay areas para mostrar
										</td>
									</tr>
								) : (
									areas.map((area, index) => (
										<tr key={area.id}>
											<td>{areaInicio + index}</td>
											<td>{area.nombre}</td>
											<td>
												<button
													className="btn-editar-area"
													onClick={() => handleEditarArea(area.id)}
													title="Editar area">
													✏️
												</button>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

					<div className="paginacion-areas">
						<div className="contador-areas">
							Mostrando registros del {areaInicio} al {areaFin} de un total de{" "}
							{totalAreas}
						</div>

						<div className="botones-paginacion-areas">
							<button
								className="btn-pag-areas"
								onClick={paginaAnterior}
								disabled={paginaActual === 1}>
								Anterior
							</button>

							{[...Array(totalPaginas)].map((_, i) => (
								<button
									key={i + 1}
									className={`btn-pag-numero-areas ${paginaActual === i + 1 ? "activo" : ""}`}
									onClick={() => irAPagina(i + 1)}>
									{i + 1}
								</button>
							))}

							<button
								className="btn-pag-areas"
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
						setAreasEditando(null);
					}}
					onGuardar={handleGuardarArea}
					titulo={modoEdicion ? "Editar" : "Agregar Area"}
					placeholder={modoEdicion ? "Editar Area" : "Ingresar Area"}
					icono="⚙️"
					valorInicial={modoEdicion ? areasEditando?.nombre : ""}
					modoEdicion={modoEdicion}
				/>
			</div>
		</Layout>
	);
};

export default AdministrarAreas;
