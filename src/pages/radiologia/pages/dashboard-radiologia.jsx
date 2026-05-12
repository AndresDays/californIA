import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase-client';
import { useAuth } from '../../../context/auth-context';
import Header from '../../../components/header-principal';
import Sidebar from '../../../components/sidebar';
import SidebarHome from '../../../components/sidebar-home';
import ModalNotificacion from '../../../components/ModalNotificacion';
import useSidebar from '../../../utils/use-sidebar';
import TarjetaEstudio from '../componentes/TarjetaEstudio';
import lupaIcono from '../../../assets/lupaIcono.png';
import {
  EVENTOS_SOLICITUD,
  registrarEventoSolicitud,
} from '../../../utils/solicitud-auditoria';
import './DashboardRadiologia.css';

const ESTADOS_FILTRO = [
  { id: 'todos', label: 'Todos' },
  { id: 'POR ASIGNAR', label: 'Por tomar/subir' },
  { id: 'ASIGNADO', label: 'Asignados' },
  { id: 'EN PROCESO', label: 'En proceso' },
  { id: 'COMPLETADO', label: 'Completados' }
];

const BUCKET_RADIOLOGIA = 'radiologia';
const IMAGEN_MAX_SIZE = 500 * 1024 * 1024;

const limpiarNombreArchivo = (nombre = '') =>
  nombre
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'imagen';

const DashboardRadiologia = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { sidebarOpen, setSidebarOpen, isMobile } = useSidebar();
  const menuRef = useRef(null);
  const inputImagenRef = useRef(null);
  const estudioParaSubirRef = useRef(null);

  const [empleadoData, setEmpleadoData] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [estudios, setEstudios] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [estudioSeleccionado, setEstudioSeleccionado] = useState(null);
  const [subiendoImagenId, setSubiendoImagenId] = useState(null);
  const [notificacion, setNotificacion] = useState({
    isOpen: false,
    mensaje: '',
    tipo: 'exito'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmpleadoData = async () => {
      if (!user?.id) return;

      try {
        const { data: empleado, error } = await supabase
          .from('empleados')
          .select('id_empleado, nombre, rol')
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
          descripcion,
          estado,
          storage_path,
          id_venta,
          id_estudio_venta,
          sucursal,
          fecha_estudio,
          ventas:id_venta (
            folio
          ),
          pacientes:id_paciente (
            id_paciente,
            nombre,
            telefono
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
          descripcionEstudio: estudio.descripcion,
          nombrePaciente: nombreCompleto,
          horaFecha: horaFecha,
          sucursal: estudio.sucursal || 'Sin sucursal',
          estado: estudio.estado,
          tieneImagen: Boolean(estudio.storage_path),
          idPaciente: paciente?.id_paciente,
          telefonoPaciente: paciente?.telefono || '',
          folio: estudio.ventas?.folio || '',
          idVenta: estudio.id_venta,
          idEstudioVenta: estudio.id_estudio_venta
        };
      }) || [];

      setEstudios(estudiosFormateados);
    } catch (error) {
      console.error('Error al cargar estudios:', error);
      mostrarNotificacion('Error al cargar los estudios', 'error');
    } finally {
      setLoading(false);
    }
  };

  const mostrarNotificacion = (mensaje, tipo = 'exito') => {
    setNotificacion({
      isOpen: true,
      mensaje,
      tipo
    });
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
    setEstudioSeleccionado(estudio);
  };

  const handleSeleccionarImagen = (estudio) => {
    estudioParaSubirRef.current = estudio;
    inputImagenRef.current?.click();
  };

  const handleImagenSeleccionada = async (event) => {
    const archivo = event.target.files?.[0];
    const estudio = estudioParaSubirRef.current;
    event.target.value = '';

    if (!archivo || !estudio) return;

    if (archivo.size > IMAGEN_MAX_SIZE) {
      mostrarNotificacion('El archivo debe pesar menos de 500MB', 'error');
      return;
    }

    setSubiendoImagenId(estudio.id);
    try {
      const nombreSeguro = limpiarNombreArchivo(archivo.name);
      const archivoPath = `${estudio.id}/${Date.now()}-${nombreSeguro}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_RADIOLOGIA)
        .upload(archivoPath, archivo, {
          cacheControl: '3600',
          contentType: archivo.type || 'application/octet-stream',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('estudios_radiologia')
        .update({
          storage_path: archivoPath,
          estado: 'EN PROCESO',
          ...(empleadoData?.id_empleado ? { id_tecnico: empleadoData.id_empleado } : {}),
          updated_at: new Date().toISOString()
        })
        .eq('id_estudio', estudio.id);

      if (updateError) throw updateError;
      await registrarEventoSolicitud(supabase, {
        id_venta: estudio.idVenta,
        evento: EVENTOS_SOLICITUD.IMAGEN_SUBIDA,
        descripcion: `Imagen subida para ${estudio.descripcionEstudio || estudio.tipoEstudio}`,
        empleado: empleadoData,
        user,
        entidad_tipo: 'estudio_radiologia',
        entidad_id: estudio.id,
        detalles: {
          storage_path: archivoPath,
          id_estudio_venta: estudio.idEstudioVenta
        }
      });

      mostrarNotificacion('Imagen subida al estudio pendiente', 'exito');
      setEstudioSeleccionado(null);
      cargarEstudios();
    } catch (error) {
      console.error('Error al subir imagen:', error);
      mostrarNotificacion('Error al subir la imagen del estudio', 'error');
    } finally {
      estudioParaSubirRef.current = null;
      setSubiendoImagenId(null);
    }
  };

  const handleAsignar = async (estudio) => {
    try {
      const { error } = await supabase
        .from('estudios_radiologia')
        .update({ 
          estado: 'ASIGNADO',
          updated_at: new Date().toISOString()
        })
        .eq('id_estudio', estudio.id);

      if (error) throw error;

      mostrarNotificacion('Estudio asignado correctamente', 'exito');
      setEstudioSeleccionado(null);
      cargarEstudios(); // Recargar lista
    } catch (error) {
      console.error('Error al asignar estudio:', error);
      mostrarNotificacion('Error al asignar el estudio', 'error');
    }
  };

  const tiposEstudio = Array.from(
    new Set(estudios.map(estudio => estudio.tipoEstudio).filter(Boolean))
  );

  const conteosPorEstado = ESTADOS_FILTRO.reduce((conteos, estado) => {
    conteos[estado.id] = estado.id === 'todos'
      ? estudios.length
      : estudios.filter(estudio => estudio.estado === estado.id).length;
    return conteos;
  }, {});

  const estudiosFiltrados = estudios.filter(estudio => {
    const cumpleBusqueda = estudio.nombrePaciente.toLowerCase().includes(busqueda.toLowerCase()) ||
                          estudio.tipoEstudio.toLowerCase().includes(busqueda.toLowerCase()) ||
                          estudio.sucursal.toLowerCase().includes(busqueda.toLowerCase());
    
    const cumpleTipo = filtroTipo === 'todos' || estudio.tipoEstudio === filtroTipo;
    const cumpleEstado = filtroEstado === 'todos' || estudio.estado === filtroEstado;

    return cumpleBusqueda && cumpleTipo && cumpleEstado;
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
    await signOut();
    navigate('/login');
  };

  return (
    <div className="dashboard-radiologia-wrapper">
      <Header
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        menuRef={menuRef}
        empleadoData={empleadoData}
        formatRol={formatRol}
        getPrimerNombre={getPrimerNombre}
        user={user}
        handleLogout={handleLogout}
        currentPage="radiologia"
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {isMobile ? (
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      ) : (
        <SidebarHome />
      )}

      <div className="dashboard-radiologia-content">
        <div className="radiologia-top-bar">
          <div className="radiologia-filtros-panel">
            <div className="radiologia-chip-group" aria-label="Filtrar por estado">
              {ESTADOS_FILTRO.map(estado => (
                <button
                  key={estado.id}
                  type="button"
                  className={`radiologia-chip ${filtroEstado === estado.id ? 'activo' : ''}`}
                  onClick={() => setFiltroEstado(estado.id)}
                >
                  <span>{estado.label}</span>
                  <strong>{conteosPorEstado[estado.id] || 0}</strong>
                </button>
              ))}
            </div>

            <div className="radiologia-toolbar">
              <div className="radiologia-tipo-segmentos" aria-label="Filtrar por estudio">
                <button
                  type="button"
                  className={`radiologia-tipo-chip ${filtroTipo === 'todos' ? 'activo' : ''}`}
                  onClick={() => setFiltroTipo('todos')}
                >
                  Todos tipos
                </button>
                {tiposEstudio.map(tipo => (
                  <button
                    key={tipo}
                    type="button"
                    className={`radiologia-tipo-chip ${filtroTipo === tipo ? 'activo' : ''}`}
                    onClick={() => setFiltroTipo(tipo)}
                  >
                    {tipo}
                  </button>
                ))}
              </div>

              <div className="buscador-radiologia">
                <img src={lupaIcono} alt="Buscar" className="icono-lupa" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar paciente, estudio o sucursal"
                  className="input-buscar-radiologia"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid-estudios">
          <input
            ref={inputImagenRef}
            type="file"
            className="radiologia-input-archivo"
            accept=".dcm,.dicom,application/dicom,image/*"
            onChange={handleImagenSeleccionada}
          />
          {loading ? (
            <div className="sin-estudios">
              <p>Cargando estudios...</p>
            </div>
          ) : estudiosFiltrados.length === 0 ? (
            <div className="sin-estudios">
              <p>No hay estudios para mostrar</p>
            </div>
          ) : (
            estudiosFiltrados.map(estudio => (
              <TarjetaEstudio
                key={estudio.id}
                tipoEstudio={estudio.tipoEstudio}
                descripcionEstudio={estudio.descripcionEstudio}
                nombrePaciente={estudio.nombrePaciente}
                horaFecha={estudio.horaFecha}
                sucursal={estudio.sucursal}
                estado={estudio.estado}
                tieneImagen={estudio.tieneImagen}
                subiendoImagen={subiendoImagenId === estudio.id}
                onVerDetalles={() => handleVerDetalles(estudio)}
                onSubirImagen={() => handleSeleccionarImagen(estudio)}
                onAsignar={() => handleAsignar(estudio)}
                onClick={() => handleVerEstudio(estudio)}
              />
            ))
          )}
        </div>
      </div>

      {estudioSeleccionado && (
        <div className="radiologia-detalle-overlay" onClick={() => setEstudioSeleccionado(null)}>
          <aside className="radiologia-detalle-panel" onClick={(event) => event.stopPropagation()}>
            <div className="radiologia-detalle-header">
              <div>
                <span className="radiologia-detalle-eyebrow">{estudioSeleccionado.tipoEstudio}</span>
                <h2>Detalle del estudio</h2>
              </div>
              <button
                type="button"
                className="radiologia-detalle-cerrar"
                onClick={() => setEstudioSeleccionado(null)}
                aria-label="Cerrar detalle"
              >
                ×
              </button>
            </div>

            <div className="radiologia-detalle-body">
              <div className="radiologia-detalle-dato principal">
                <span>Paciente</span>
                <strong>{estudioSeleccionado.nombrePaciente}</strong>
              </div>
              <div className="radiologia-detalle-grid">
                <div className="radiologia-detalle-dato">
                  <span>Estado</span>
                  <strong>{estudioSeleccionado.estado}</strong>
                </div>
                <div className="radiologia-detalle-dato">
                  <span>Sucursal</span>
                  <strong>{estudioSeleccionado.sucursal}</strong>
                </div>
                <div className="radiologia-detalle-dato">
                  <span>Fecha / hora</span>
                  <strong>{estudioSeleccionado.horaFecha}</strong>
                </div>
                <div className="radiologia-detalle-dato">
                  <span>Estudio solicitado</span>
                  <strong>{estudioSeleccionado.descripcionEstudio || estudioSeleccionado.tipoEstudio}</strong>
                </div>
                <div className="radiologia-detalle-dato">
                  <span>ID estudio</span>
                  <strong>{estudioSeleccionado.id}</strong>
                </div>
              </div>
            </div>

            <div className="radiologia-detalle-acciones">
              <button
                type="button"
                className="radiologia-btn-secundario"
                onClick={() => handleSeleccionarImagen(estudioSeleccionado)}
              >
                {estudioSeleccionado.tieneImagen ? 'Reemplazar imagen' : 'Subir imagen'}
              </button>
              <button
                type="button"
                className="radiologia-btn-secundario"
                onClick={() => handleAsignar(estudioSeleccionado)}
              >
                Asignar estudio
              </button>
              <button
                type="button"
                className="radiologia-btn-principal"
                onClick={() => handleVerEstudio(estudioSeleccionado)}
              >
                Ver en visor
              </button>
            </div>
          </aside>
        </div>
      )}

      <ModalNotificacion
        isOpen={notificacion.isOpen}
        onClose={() => setNotificacion({ ...notificacion, isOpen: false })}
        mensaje={notificacion.mensaje}
        tipo={notificacion.tipo}
      />
    </div>
  );
};

export default DashboardRadiologia;
