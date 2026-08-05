import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase-client';
import { useAuth } from '../../../context/auth-context';
import { useBusquedaPersistente } from '../../../hooks/use-busqueda-persistente';
import Header from '../../../components/header-principal';
import Sidebar from '../../../components/sidebar';
import SidebarHome from '../../../components/sidebar-home';
import ModalNotificacion from '../../../components/ModalNotificacion';
import useSidebar from '../../../utils/use-sidebar';
import TarjetaEstudio from '../componentes/TarjetaEstudio';
import ModalAsignar from '../componentes/ModalAsignar';
import lupaIcono from '../../../assets/lupaIcono.png';
import {
  esDoctorExterno,
  obtenerRestriccionDoctorExterno,
  puedeAsignarRadiologia,
} from '../../../utils/radiologia-permisos';
import { esRadiologoClinicoPermisos, normalizarRolPermisos } from '../../../utils/role-permissions';
import './DashboardRadiologia.css';

const ESTADOS_FILTRO = [
  { id: 'todos', label: 'Todos' },
  { id: 'POR ASIGNAR', label: 'Por tomar/subir' },
  { id: 'ASIGNADO', label: 'Asignados' },
  { id: 'EN PROCESO', label: 'En proceso' },
  { id: 'COMPLETADO', label: 'Completados' }
];

const TIPOS_ASIGNACION = {
  tecnico: {
    titulo: 'Asignar estudio a técnico',
    tabla: 'empleados',
    select: 'id_empleado, nombre, rol, especialidad',
    idKey: 'id_empleado',
    labelKey: 'nombre',
    sublabelKey: 'especialidad',
    columna: 'id_tecnico',
    actualKey: 'idTecnico',
    mensajeExito: 'Técnico asignado correctamente',
    filtrar: (persona) => normalizarRolPermisos(persona?.rol).includes('tecnico'),
  },
  referente: {
    titulo: 'Asignar estudio a médico referente',
    tabla: 'doctores',
    select: 'id_doctor, nombre, especialidad, activo',
    idKey: 'id_doctor',
    labelKey: 'nombre',
    sublabelKey: 'especialidad',
    columna: 'id_doctor',
    actualKey: 'idDoctor',
    mensajeExito: 'Médico referente asignado correctamente',
    filtrar: (persona) => persona?.activo !== false,
  },
  radiologo: {
    titulo: 'Asignar estudio a radiólogo',
    tabla: 'empleados',
    select: 'id_empleado, nombre, rol, especialidad',
    idKey: 'id_empleado',
    labelKey: 'nombre',
    sublabelKey: 'especialidad',
    columna: 'id_radiologo',
    actualKey: 'idRadiologo',
    mensajeExito: 'Radiólogo asignado correctamente',
    filtrar: (persona) => {
      const rol = normalizarRolPermisos(persona?.rol);
      return rol.includes('radiologo') || rol.includes('radiologa');
    },
  },
};

const obtenerIdDoctorSesionLocal = (user) => {
  const match = String(user?.id || '').match(/^doctor:(\d+)$/);
  if (!match) return null;
  const idDoctor = Number(match[1]);
  return Number.isFinite(idDoctor) ? idDoctor : null;
};

const DashboardRadiologia = () => {
  const { user, signOut, empleadoData: authEmpleadoData } = useAuth();
  const navigate = useNavigate();
  const { sidebarOpen, setSidebarOpen, isMobile } = useSidebar();
  const menuRef = useRef(null);

  const [empleadoData, setEmpleadoData] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [estudios, setEstudios] = useState([]);
  const [busqueda, setBusqueda] = useBusquedaPersistente('radiologia:termino');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [estudioSeleccionado, setEstudioSeleccionado] = useState(null);
  const [modalAsignar, setModalAsignar] = useState(null);
  const [notificacion, setNotificacion] = useState({
    isOpen: false,
    mensaje: '',
    tipo: 'exito'
  });
  const [loading, setLoading] = useState(true);
  const [empleadoCargado, setEmpleadoCargado] = useState(false);
  const esRadiologoClinico = esRadiologoClinicoPermisos(
    empleadoData?.rol || authEmpleadoData?.rol,
  );

  useEffect(() => {
    const fetchEmpleadoData = async () => {
      if (!user?.id) return;

      try {
        if (String(user.id).startsWith('doctor:')) {
          setEmpleadoData({
            nombre: authEmpleadoData?.nombre || user.email || 'Doctor externo',
            rol: 'doctor_externo',
            ...authEmpleadoData,
            id_doctor: authEmpleadoData?.id_doctor || obtenerIdDoctorSesionLocal(user),
          });
          setEmpleadoCargado(true);
          return;
        }

        if (esDoctorExterno(authEmpleadoData?.rol)) {
          setEmpleadoData(authEmpleadoData);
          setEmpleadoCargado(true);
          return;
        }

        let { data: empleado, error } = await supabase
          .from('empleados')
          .select('id_empleado, nombre, rol, id_doctor, especialidad')
          .eq('auth_uuid', user.id)
          .maybeSingle();

        if (
          (error?.code === '42703' || error?.code === 'PGRST204') &&
          String(error?.message || '').toLowerCase().includes('id_doctor')
        ) {
          const respuestaBase = await supabase
            .from('empleados')
            .select('id_empleado, nombre, rol, especialidad')
            .eq('auth_uuid', user.id)
            .maybeSingle();
          empleado = respuestaBase.data;
          error = respuestaBase.error;
        }

        if (error) {
          console.error('Error al obtener empleado:', error);
          return;
        }

        if (empleado) {
          if (esDoctorExterno(empleado.rol)) {
            let doctorQuery = supabase
              .from('doctores')
              .select('id_doctor, nombre, auth_uuid, es_radiologo, especialidad');
            doctorQuery = empleado.id_doctor
              ? doctorQuery.eq('id_doctor', empleado.id_doctor)
              : doctorQuery.eq('auth_uuid', user.id);
            let { data: doctorExterno, error: doctorError } = await doctorQuery.maybeSingle();
            if (
              (doctorError?.code === '42703' || doctorError?.code === 'PGRST204') &&
              (String(doctorError?.message || '').toLowerCase().includes('es_radiologo') ||
              String(doctorError?.message || '').toLowerCase().includes('especialidad'))
            ) {
              let doctorBaseQuery = supabase
                .from('doctores')
                .select('id_doctor, nombre, auth_uuid');
              doctorBaseQuery = empleado.id_doctor
                ? doctorBaseQuery.eq('id_doctor', empleado.id_doctor)
                : doctorBaseQuery.eq('auth_uuid', user.id);
              ({ data: doctorExterno } = await doctorBaseQuery.maybeSingle());
            }
            setEmpleadoData({
              ...empleado,
              id_doctor: empleado.id_doctor || doctorExterno?.id_doctor || null,
              doctor_nombre: doctorExterno?.nombre || null,
              es_radiologo: doctorExterno?.es_radiologo === true,
              especialidad: doctorExterno?.especialidad || empleado.especialidad || null,
            });
            return;
          }
          setEmpleadoData(empleado);
        }
      } catch (error) {
        console.error('Error al obtener datos del empleado:', error);
      } finally {
        setEmpleadoCargado(true);
      }
    };

    fetchEmpleadoData();
  }, [user, authEmpleadoData]);

  useEffect(() => {
    if (!user?.id) return;
    if (!empleadoCargado) return;
    cargarEstudios();
  }, [user?.id, empleadoCargado, empleadoData?.rol, empleadoData?.id_doctor]);

  const cargarEstudios = async () => {
    setLoading(true);
    try {
      const idDoctorSesionLocal = obtenerIdDoctorSesionLocal(user);
      const restriccionDoctorExterno = idDoctorSesionLocal
        ? { columna: 'id_doctor', valor: idDoctorSesionLocal }
        : obtenerRestriccionDoctorExterno(empleadoData);
      let query = supabase
        .from('estudios_radiologia')
        .select(`
          id_estudio,
          tipo_estudio,
          descripcion,
          estado,
          storage_path,
          id_doctor,
          id_radiologo,
          id_tecnico,
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
        `);

      if (restriccionDoctorExterno?.valor) {
        query = query.eq(restriccionDoctorExterno.columna, restriccionDoctorExterno.valor);
      } else if (restriccionDoctorExterno) {
        setEstudios([]);
        return;
      }

      const { data, error } = await query.order('fecha_estudio', { ascending: false });

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
          idEstudioVenta: estudio.id_estudio_venta,
          idDoctor: estudio.id_doctor,
          idRadiologo: estudio.id_radiologo,
          idTecnico: estudio.id_tecnico,
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

  const abrirAsignacion = (estudio) => {
    setModalAsignar({ paso: 'tipo', estudio });
  };

  const seleccionarTipoAsignacion = async (tipo) => {
    const config = TIPOS_ASIGNACION[tipo];
    const estudio = modalAsignar?.estudio;
    if (!config || !estudio) return;

    setModalAsignar({
      ...config,
      paso: 'persona',
      estudio,
      items: [],
      actual: estudio[config.actualKey] || null,
      seleccionado: estudio[config.actualKey] || null,
      loading: true,
    });

    try {
      const { data, error } = await supabase
        .from(config.tabla)
        .select(config.select)
        .order('nombre');
      if (error) throw error;

      setModalAsignar((modal) => modal?.paso === 'persona' && modal.columna === config.columna
        ? { ...modal, items: (data || []).filter(config.filtrar), loading: false }
        : modal);
    } catch (error) {
      console.error('Error al cargar personas para asignar:', error);
      mostrarNotificacion('Error al cargar personas para asignar', 'error');
      setModalAsignar(null);
    }
  };

  const confirmarAsignacion = async () => {
    if (!modalAsignar?.seleccionado || !modalAsignar?.estudio) return;

    try {
      const { error } = await supabase
        .from('estudios_radiologia')
        .update({
          [modalAsignar.columna]: modalAsignar.seleccionado,
          estado: 'ASIGNADO',
          updated_at: new Date().toISOString(),
        })
        .eq('id_estudio', modalAsignar.estudio.id);

      if (error) throw error;

      mostrarNotificacion(modalAsignar.mensajeExito, 'exito');
      setModalAsignar(null);
      setEstudioSeleccionado(null);
      cargarEstudios();
    } catch (error) {
      console.error('Error al asignar estudio:', error);
      mostrarNotificacion('Error al asignar el estudio', 'error');
    }
  };

  const tiposEstudio = Array.from(
    new Set(estudios.map(estudio => estudio.tipoEstudio).filter(Boolean))
  );
  const puedeAsignar = puedeAsignarRadiologia(empleadoData);

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
      'doctor_externo': 'Doctor externo Rayos X',
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

      {!esRadiologoClinico && (isMobile ? (
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      ) : (
        <SidebarHome />
      ))}

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
                onVerDetalles={() => handleVerDetalles(estudio)}
                onAsignar={puedeAsignar ? () => abrirAsignacion(estudio) : undefined}
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
              {puedeAsignar && (
                <button
                  type="button"
                  className="radiologia-btn-secundario"
                  onClick={() => abrirAsignacion(estudioSeleccionado)}
                >
                  Asignar estudio
                </button>
              )}
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

      {modalAsignar?.paso === 'tipo' && (
        <div className="radiologia-asignacion-overlay" onClick={() => setModalAsignar(null)}>
          <section className="radiologia-asignacion-tipo" onClick={(event) => event.stopPropagation()}>
            <div>
              <h2>Asignar estudio a</h2>
              <p>Elige el tipo de responsable que deseas asignar.</p>
            </div>
            <div className="radiologia-asignacion-opciones">
              <button type="button" onClick={() => seleccionarTipoAsignacion('tecnico')}>Técnico</button>
              <button type="button" onClick={() => seleccionarTipoAsignacion('referente')}>Médico referente</button>
              <button type="button" onClick={() => seleccionarTipoAsignacion('radiologo')}>Radiólogo</button>
            </div>
            <button type="button" className="radiologia-asignacion-cancelar" onClick={() => setModalAsignar(null)}>
              Cancelar
            </button>
          </section>
        </div>
      )}

      {modalAsignar?.paso === 'persona' && (
        <ModalAsignar
          config={modalAsignar}
          backdropClassName="radiologia-modal-asignar"
          onSeleccionar={(id) => setModalAsignar((modal) => ({ ...modal, seleccionado: id }))}
          onConfirmar={confirmarAsignacion}
          onCerrar={() => setModalAsignar(null)}
        />
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
