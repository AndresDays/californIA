import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase-client';
import { useAuth } from '../../../context/auth-context';
import Header from '../../../components/header-principal';
import SidebarHome from '../../../components/sidebar-home';
import TarjetaEstudio from '../componentes/TarjetaEstudio';
import lupaIcono from '../../../assets/lupaIcono.png';
import './DashboardRadiologia.css';

const DashboardRadiologia = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [empleadoData, setEmpleadoData] = useState(null);
  const [estudios, setEstudios] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [loading, setLoading] = useState(true);

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
    cargarEstudios();
  }, []);

  const cargarEstudios = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('estudios_radiologia')
        .select(`
          id_estudio,
          tipo_estudio,
          estado,
          sucursal,
          fecha_estudio,
          pacientes:id_paciente (
            id_paciente,
            nombre
          )
        `)
        .order('fecha_estudio', { ascending: false });

      if (error) throw error;

      // Formatear los datos para las tarjetas
      const estudiosFormateados = data?.map(estudio => {
        const paciente = estudio.pacientes;
        const nombreCompleto = paciente 
          ? `${paciente.nombre}`.trim()
          : 'Paciente Desconocido';

        // Formatear fecha/hora
        const fechaEstudio = new Date(estudio.fecha_estudio);
        const hoy = new Date();
        const esHoy = fechaEstudio.toDateString() === hoy.toDateString();
        
        const horaFecha = esHoy 
          ? fechaEstudio.toLocaleTimeString('es-MX', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true 
            })
          : fechaEstudio.toLocaleDateString('es-MX', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit'
            });

        return {
          id: estudio.id_estudio,
          tipoEstudio: estudio.tipo_estudio,
          nombrePaciente: nombreCompleto,
          horaFecha: horaFecha,
          sucursal: estudio.sucursal || 'Sin sucursal',
          estado: estudio.estado,
          idPaciente: paciente?.id_paciente
        };
      }) || [];

      setEstudios(estudiosFormateados);
    } catch (error) {
      console.error('Error al cargar estudios:', error);
      alert('Error al cargar los estudios');
    } finally {
      setLoading(false);
    }
  };

  const handleCrearGrupo = () => {
    // TODO: Implementar modal para crear grupo
    alert('Crear nuevo grupo - Por implementar');
  };

  const handleVerEstudio = (estudio) => {
    // Navegar al visor DICOM con el ID del estudio
    navigate(`/visor-dicom/${estudio.id}`, { 
      state: { 
        estudio: estudio 
      } 
    });
  };

  const handleVerDetalles = (estudio) => {
    console.log('Ver detalles de:', estudio);
    // TODO: Abrir modal con detalles del estudio
  };

  const handleAsignar = async (estudio) => {
    // TODO: Implementar lógica de asignación
    try {
      const { error } = await supabase
        .from('estudios_radiologia')
        .update({ 
          estado: 'ASIGNADO',
          updated_at: new Date().toISOString()
        })
        .eq('id_estudio', estudio.id);

      if (error) throw error;

      alert('Estudio asignado correctamente');
      cargarEstudios(); // Recargar lista
    } catch (error) {
      console.error('Error al asignar estudio:', error);
      alert('Error al asignar el estudio');
    }
  };

  const estudiosFilrados = estudios.filter(estudio => {
    const cumpleBusqueda = estudio.nombrePaciente.toLowerCase().includes(busqueda.toLowerCase()) ||
                          estudio.tipoEstudio.toLowerCase().includes(busqueda.toLowerCase()) ||
                          estudio.sucursal.toLowerCase().includes(busqueda.toLowerCase());
    
    const cumpleTipo = filtroTipo === 'todos' || estudio.tipoEstudio === filtroTipo;

    return cumpleBusqueda && cumpleTipo;
  });

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
    <div className="dashboard-radiologia-wrapper">
      <Header
        empleadoData={empleadoData}
        formatRol={formatRol}
        getPrimerNombre={getPrimerNombre}
        user={user}
        handleLogout={handleLogout}
        currentPage="radiologia"
      />

      <SidebarHome />

      <div className="dashboard-radiologia-content">
        <div className="radiologia-top-bar">
          <button className="btn-crear-grupo" onClick={handleCrearGrupo}>
            <span className="icon-grupo">👥</span>
            Crear Grupo
          </button>

          <div className="radiologia-controles">
            <div className="filtro-tipo">
              <label>Estudios</label>
              <select 
                value={filtroTipo} 
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="select-tipo-estudio"
              >
                <option value="todos">Todos</option>
                <option value="DX">DX</option>
                <option value="US">US</option>
                <option value="CT">CT</option>
                <option value="XR">XR</option>
                <option value="MR">MR</option>
              </select>
            </div>

            <div className="buscador-radiologia">
              <img src={lupaIcono} alt="Buscar" className="icono-lupa" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder=""
                className="input-buscar-radiologia"
              />
            </div>
          </div>
        </div>

        <div className="grid-estudios">
          {loading ? (
            <div className="sin-estudios">
              <p>Cargando estudios...</p>
            </div>
          ) : estudiosFilrados.length === 0 ? (
            <div className="sin-estudios">
              <p>No hay estudios para mostrar</p>
            </div>
          ) : (
            estudiosFilrados.map(estudio => (
              <TarjetaEstudio
                key={estudio.id}
                tipoEstudio={estudio.tipoEstudio}
                nombrePaciente={estudio.nombrePaciente}
                horaFecha={estudio.horaFecha}
                sucursal={estudio.sucursal}
                estado={estudio.estado}
                onVerDetalles={() => handleVerDetalles(estudio)}
                onAsignar={() => handleAsignar(estudio)}
                onClick={() => handleVerEstudio(estudio)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardRadiologia;