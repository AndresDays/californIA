import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import calendarioIcono from '../assets/calendarioIcono.png';
import dineroIcono from '../assets/dineroIcono.png';
import editarIcono from '../assets/editarIcono.png';
import estudiosIcono from '../assets/estudiosIcono.png';
import LabBtn from '../assets/labBtn.png';
import californIA from '../assets/logoCalifornIA.png';
import nuevaCitaBtn from '../assets/nuevaCitaBtn.png';
import pacientesIcono from '../assets/pacientesIcono.png';
import RadBtn from '../assets/radBtn.png';
import EditarCitaModal from '../components/editar-cita-modal';
import Header from '../components/header-principal';
import NuevaCitaModal from '../components/nueva-cita-modal';
import '../components/nueva-cita-modal.css';
import SidebarHome from '../components/sidebar-home';
import { useAuth } from '../context/auth-context';
import { supabase } from '../lib/supabase-client';
import './CalifornIA.css';

const Dashboard = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [empleadoData, setEmpleadoData] = useState(null);
  const [stats, setStats] = useState({
    totalPacientes: 0,
    citasHoy: 0,
    estudiosRealizados: 0,
    ingresos: 0
  });
  const [pacientesProximos, setPacientesProximos] = useState([]);
  const [estadisticasSemanales, setEstadisticasSemanales] = useState([]);

  const [modalNuevaCitaOpen, setModalNuevaCitaOpen] = useState(false);
  const [modalEditarCitaOpen, setModalEditarCitaOpen] = useState(false);
  const [citaEditando, setCitaEditando] = useState(null);

  const [tipoGrafica, setTipoGrafica] = useState('pacientes');
  const [vistaGrafica, setVistaGrafica] = useState('semana');
  const [sucursalFiltro, setSucursalFiltro] = useState('');
  const [sucursales, setSucursales] = useState([]);

  const menuRef = useRef(null);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

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
    cargarEstadisticas();
    cargarPacientesProximos();
    cargarSucursales();
    cargarEstadisticasSemanales();
  }, [user]);

  useEffect(() => {
    cargarEstadisticasSemanales();
  }, [vistaGrafica, sucursalFiltro]);

  const cargarEstadisticas = async () => {
    try {
      const { count: totalPac } = await supabase
        .from('pacientes')
        .select('*', { count: 'exact', head: true });

      const ahora = new Date();
      const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;

      const { count: citasHoy } = await supabase
        .from('citas')
        .select('*', { count: 'exact', head: true })
        .gte('fecha_estudio', hoy)
        .lt('fecha_estudio', `${hoy}T23:59:59`)
        .not('estado', 'eq', 'cancelada');

      const { data: citasCompletadas } = await supabase
        .from('citas')
        .select('tipo_estudio, fecha_estudio')
        .eq('estado', 'completada');

      const ahoraCompleto = new Date();
      const horaActualStr = `${ahoraCompleto.getFullYear()}-${String(ahoraCompleto.getMonth() + 1).padStart(2, '0')}-${String(ahoraCompleto.getDate()).padStart(2, '0')}T${String(ahoraCompleto.getHours()).padStart(2, '0')}:${String(ahoraCompleto.getMinutes()).padStart(2, '0')}:00`;

      const totalEstudiosRealizados = citasCompletadas?.reduce((total, cita) => {
        if (cita.fecha_estudio > horaActualStr) return total;

        if (cita.tipo_estudio) {
          const estudios = cita.tipo_estudio.split(',').map(e => e.trim()).filter(e => e);
          return total + (estudios.length > 0 ? estudios.length : 1);
        }

        return total + 1;
      }, 0) || 0;

      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const finMes = new Date();
      finMes.setMonth(finMes.getMonth() + 1);
      finMes.setDate(1);
      finMes.setHours(0, 0, 0, 0);

      const inicioMesStr = `${inicioMes.getFullYear()}-${String(inicioMes.getMonth() + 1).padStart(2, '0')}-${String(inicioMes.getDate()).padStart(2, '0')}T00:00:00`;
      const finMesStr = `${finMes.getFullYear()}-${String(finMes.getMonth() + 1).padStart(2, '0')}-${String(finMes.getDate()).padStart(2, '0')}T00:00:00`;

      const { data: citasCompletadasMes } = await supabase
        .from('citas')
        .select('monto, fecha_estudio')
        .eq('estado', 'completada')
        .gte('fecha_estudio', inicioMesStr)
        .lt('fecha_estudio', finMesStr);

      const ingresosMes = citasCompletadasMes?.reduce((total, cita) => {
        if (cita.fecha_estudio > horaActualStr) return total;
        return total + (parseFloat(cita.monto) || 0);
      }, 0) || 0;

      setStats({
        totalPacientes: totalPac || 0,
        citasHoy: citasHoy || 0,
        estudiosRealizados: totalEstudiosRealizados,
        ingresos: ingresosMes
      });
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  const cargarPacientesProximos = async () => {
    try {
      const ahora = new Date();
      const horaLocal = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}T${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}:00`;

      const { data, error } = await supabase
        .from('citas')
        .select(`
          id_cita,
          fecha_estudio,
          estado,
          tipo_estudio,
          monto,
          id_sucursal,
          id_cliente,
          id_empresa,
          id_tipo_estudio,
          nombre_paciente,
          telefono_paciente,

          pacientes (
            nombre,
            telefono,
            id_paciente
          ),
          sucursales (
            id_sucursal,
            nombre
          ),
          clientes (
            id_cliente,
            nombre
          ),
          empresas (
            id_empresa,
            nombre
          ),
          tipos_estudio (
            id_tipo_estudio,
            nombre
          )
        `)
        .gte('fecha_estudio', horaLocal)
        .not('estado', 'in', '(completada,cancelada)')
        .order('fecha_estudio', { ascending: true })
        .limit(5);


      if (error) throw error;
      setPacientesProximos(data || []);
    } catch (error) {
      console.error('Error al cargar pacientes próximos:', error);
    }
  };

  const cargarSucursales = async () => {
    try {
      const { data, error } = await supabase
        .from('sucursales')
        .select('id_sucursal, nombre')
        .order('nombre');

      if (error) throw error;
      setSucursales(data || []);
    } catch (error) {
      console.error('Error al cargar sucursales:', error);
    }
  };

  const cargarEstadisticasSemanales = async () => {
    try {
      let query = supabase
        .from('citas')
        .select('fecha_estudio, tipo_estudio, id_sucursal, monto, estado');

      if (sucursalFiltro) {
        query = query.eq('id_sucursal', sucursalFiltro);
      }

      const hoy = new Date();
      let inicio, fin, labels, numPeriodos;

      if (vistaGrafica === 'semana') {
        const diaSemana = hoy.getDay();
        inicio = new Date(hoy);
        inicio.setDate(hoy.getDate() - diaSemana);
        inicio.setHours(0, 0, 0, 0);

        fin = new Date(inicio);
        fin.setDate(inicio.getDate() + 7);

        labels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        numPeriodos = 7;

      } else if (vistaGrafica === 'mes') {
        inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

        const diasEnMes = fin.getDate();
        numPeriodos = Math.ceil(diasEnMes / 7);
        labels = [];
        for (let i = 0; i < numPeriodos; i++) {
          labels.push(`Sem ${i + 1}`);
        }

      } else {
        inicio = new Date(hoy.getFullYear(), 0, 1);
        fin = new Date(hoy.getFullYear() + 1, 0, 1);

        labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        numPeriodos = 12;
      }

      const inicioStr = `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, '0')}-${String(inicio.getDate()).padStart(2, '0')}T00:00:00`;
      const finStr = `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, '0')}-${String(fin.getDate()).padStart(2, '0')}T00:00:00`;

      query = query
        .gte('fecha_estudio', inicioStr)
        .lt('fecha_estudio', finStr);

      const { data, error} = await query;
      if (error) throw error;

      const ahoraCompleto = new Date();
      const horaActualStr = `${ahoraCompleto.getFullYear()}-${String(ahoraCompleto.getMonth() + 1).padStart(2, '0')}-${String(ahoraCompleto.getDate()).padStart(2, '0')}T${String(ahoraCompleto.getHours()).padStart(2, '0')}:${String(ahoraCompleto.getMinutes()).padStart(2, '0')}:00`;

      const contadoresRadiologia = new Array(numPeriodos).fill(0);
      const contadoresLaboratorio = new Array(numPeriodos).fill(0);
      const ingresosRadiologia = new Array(numPeriodos).fill(0);
      const ingresosLaboratorio = new Array(numPeriodos).fill(0);

      data?.forEach(estudio => {
        if (estudio.estado === 'cancelada') return;

        const fecha = new Date(estudio.fecha_estudio);
        let indice;

        if (vistaGrafica === 'semana') {
          indice = fecha.getDay();
        } else if (vistaGrafica === 'mes') {
          const dia = fecha.getDate();
          indice = Math.floor((dia - 1) / 7);
        } else {
          indice = fecha.getMonth();
        }

        const tipo = estudio.tipo_estudio?.toLowerCase() || '';
        const monto = parseFloat(estudio.monto) || 0;

        if (tipo.includes('radio') || tipo.includes('rayos') || tipo.includes('rx')) {
          contadoresRadiologia[indice]++;
          if (estudio.estado === 'completada' && estudio.fecha_estudio <= horaActualStr) {
            ingresosRadiologia[indice] += monto;
          }
        } else {
          contadoresLaboratorio[indice]++;
          if (estudio.estado === 'completada' && estudio.fecha_estudio <= horaActualStr) {
            ingresosLaboratorio[indice] += monto;
          }
        }
      });

      const estadisticas = labels.map((label, index) => {
        let esActual = false;
        if (vistaGrafica === 'semana') {
          esActual = index === hoy.getDay();
        } else if (vistaGrafica === 'mes') {
          const semanaActual = Math.floor((hoy.getDate() - 1) / 7);
          esActual = index === semanaActual;
        } else {
          esActual = index === hoy.getMonth();
        }

        return {
          label,
          radiologia: contadoresRadiologia[index],
          laboratorio: contadoresLaboratorio[index],
          total: contadoresRadiologia[index] + contadoresLaboratorio[index],
          ingresosRadiologia: ingresosRadiologia[index],
          ingresosLaboratorio: ingresosLaboratorio[index],
          ingresosTotal: ingresosRadiologia[index] + ingresosLaboratorio[index],
          esActual
        };
      });

      setEstadisticasSemanales(estadisticas);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  const handleCitaCreada = (nuevaCita) => {
    cargarEstadisticas();
    cargarPacientesProximos();
    cargarEstadisticasSemanales();
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
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

  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatHora = (fecha) => {
    return new Date(fecha).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

    const getNombrePaciente = (cita) => {
        if (cita.pacientes?.nombre) {
          return cita.pacientes.nombre;
        }
        return cita.nombre_paciente || 'Sin nombre';
      };

  return (
    <div className="dashboard-container">
      <Header
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        menuRef={menuRef}
        empleadoData={empleadoData}
        formatRol={formatRol}
        getPrimerNombre={getPrimerNombre}
        user={user}
        handleLogout={handleLogout}
      />

      <SidebarHome />

      <main className="dashboard-main">
        <div className="dashboard-content-wrapper">
          <div className="content-header">
            <div>
              <h1 className="welcome-title">
                Bienvenido, {empleadoData ? getPrimerNombre(empleadoData.nombre) : 'Usuario'}
              </h1>
              <p className="welcome-subtitle">
                Aquí está lo que está pasando en las clínicas hoy
              </p>
            </div>
            <button
              className="btn-new-appointment"
              onClick={() => setModalNuevaCitaOpen(true)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                boxShadow: 'none',
                outline: 'none'
              }}
            >
              <img
                src={nuevaCitaBtn}
                alt="Nueva Cita"
                className="btn-new-appointment-img"
                style={{
                  height: '80px',
                  width: 'auto',
                  display: 'block',
                  transform: 'scale(2)',
                  transformOrigin: 'right center'
                }}
              />
            </button>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon patients">
                <img src={pacientesIcono} alt="Pacientes" className="stat-icon-img" />
              </div>
              <div className="stat-content">
                <p className="stat-label">Total Pacientes</p>
                <h2 className="stat-value">{stats.totalPacientes}</h2>
                <p className="stat-change positive">+12.5% vs mes anterior</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon appointments">
                <img src={calendarioIcono} alt="Citas" className="stat-icon-img" />
              </div>
              <div className="stat-content">
                <p className="stat-label">Citas Hoy</p>
                <h2 className="stat-value">{stats.citasHoy}</h2>
                <p className="stat-change neutral">Agenda del día</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon studies">
                <img src={estudiosIcono} alt="Estudios" className="stat-icon-img" />
              </div>
              <div className="stat-content">
                <p className="stat-label">Estudios Realizados</p>
                <h2 className="stat-value">{stats.estudiosRealizados}</h2>
                <p className="stat-change positive">+8.2% esta semana</p>
              </div>
            </div>

            <div
              className="stat-card clickable"
              onClick={() => setTipoGrafica(tipoGrafica === 'pacientes' ? 'ingresos' : 'pacientes')}
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-icon revenue">
                <img
                  src={tipoGrafica === 'pacientes' ? dineroIcono : pacientesIcono}
                  alt={tipoGrafica === 'pacientes' ? 'Ingresos' : 'Pacientes'}
                  className="stat-icon-img"
                />
              </div>
              <div className="stat-content">
                <p className="stat-label">
                  {tipoGrafica === 'pacientes' ? 'Ingresos del Mes' : 'Pacientes de Hoy'}
                </p>
                <h2 className="stat-value">
                  {tipoGrafica === 'pacientes'
                    ? stats.ingresos >= 1000
                      ? `$${(stats.ingresos / 1000).toFixed(1)}k`
                      : `$${stats.ingresos.toFixed(0)}`
                    : stats.citasHoy
                  }
                </h2>
                <p className="stat-change positive">
                  {tipoGrafica === 'pacientes'
                    ? 'Solo citas completadas'
                    : 'Click para ver gráfica de pacientes'
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="main-content-grid">
            <div className="quick-access-section">
              <h3 className="section-title">Módulos Principales</h3>
              <div className="modules-grid">
                <div
                  className="module-card radiology"
                  onClick={() => navigate('/radiologia')}
                >
                  <img src={RadBtn} alt="Radiología" className="module-btn-img" />
                </div>

                <div
                  className="module-card laboratory"
                  onClick={() => navigate('/laboratorio')}
                >
                  <img src={LabBtn} alt="Laboratorio" className="module-btn-img" />
                </div>
              </div>

              <div className="logo-container">
                <img src={californIA} alt="CalifornIA" className="california-logo" />
              </div>
            </div>

            <div className="appointments-section">
              <div className="section-header">
                <h3 className="section-title">
                  {tipoGrafica === 'pacientes' ? 'Estadísticas de Pacientes' : 'Estadísticas de Ingresos'}
                </h3>
                <div className="chart-controls">
                  <div className="view-toggle">
                    <button
                      className={`toggle-btn ${vistaGrafica === 'semana' ? 'active' : ''}`}
                      onClick={() => setVistaGrafica('semana')}
                    >
                      Semana
                    </button>
                    <button
                      className={`toggle-btn ${vistaGrafica === 'mes' ? 'active' : ''}`}
                      onClick={() => setVistaGrafica('mes')}
                    >
                      Mes
                    </button>
                    <button
                      className={`toggle-btn ${vistaGrafica === 'ano' ? 'active' : ''}`}
                      onClick={() => setVistaGrafica('ano')}
                    >
                      Año
                    </button>
                  </div>
                  <select
                    value={sucursalFiltro}
                    onChange={(e) => setSucursalFiltro(e.target.value)}
                    className="sucursal-filter"
                  >
                    <option value="">Todas las sucursales</option>
                    {sucursales.map(sucursal => (
                      <option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>
                        {sucursal.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="chart-container">
                {tipoGrafica === 'pacientes' ? (
                  <div className="chart-bars">
                    {estadisticasSemanales.map((stat, index) => {
                      const maxTotal = Math.max(...estadisticasSemanales.map(s => s.total), 1);
                      const alturaRadiologia = (stat.radiologia / maxTotal) * 100;
                      const alturaLaboratorio = (stat.laboratorio / maxTotal) * 100;

                      return (
                        <div key={index} className="chart-bar-wrapper">
                          <div className="chart-bar-container">
                            <div className="chart-bar-stack">
                              {stat.laboratorio > 0 && (
                                <div
                                  className={`chart-bar laboratorio ${stat.esActual ? 'current' : ''}`}
                                  style={{ height: `${alturaLaboratorio}%` }}
                                  title={`Laboratorio: ${stat.laboratorio}`}
                                >
                                  {stat.laboratorio > 0 && (
                                    <span className="bar-value">{stat.laboratorio}</span>
                                  )}
                                </div>
                              )}
                              {stat.radiologia > 0 && (
                                <div
                                  className={`chart-bar radiologia ${stat.esActual ? 'current' : ''}`}
                                  style={{ height: `${alturaRadiologia}%` }}
                                  title={`Radiología: ${stat.radiologia}`}
                                >
                                  {stat.radiologia > 0 && (
                                    <span className="bar-value">{stat.radiologia}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className={`chart-label ${stat.esActual ? 'current' : ''}`}>
                            {stat.label}
                            {stat.esActual && <span className="current-indicator">●</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="line-chart">
                    <svg className="line-chart-svg" viewBox="0 0 800 300">
                      {[0, 1, 2, 3, 4].map(i => (
                        <line
                          key={`grid-${i}`}
                          x1="40"
                          y1={40 + i * 50}
                          x2="780"
                          y2={40 + i * 50}
                          stroke="rgba(73, 178, 212, 0.1)"
                          strokeWidth="1"
                        />
                      ))}

                      {(() => {
                        const maxIngreso = Math.max(
                          ...estadisticasSemanales.map(s => Math.max(s.ingresosRadiologia, s.ingresosLaboratorio, s.ingresosTotal)),
                          1
                        );
                        const width = 740;
                        const height = 220;
                        const padding = 40;
                        const step = width / Math.max(estadisticasSemanales.length - 1, 1);

                        const getY = (value) => padding + height - (value / maxIngreso) * height;

                        const pathRadiologia = estadisticasSemanales
                          .map((stat, i) => `${i === 0 ? 'M' : 'L'} ${padding + i * step} ${getY(stat.ingresosRadiologia)}`)
                          .join(' ');

                        const pathLaboratorio = estadisticasSemanales
                          .map((stat, i) => `${i === 0 ? 'M' : 'L'} ${padding + i * step} ${getY(stat.ingresosLaboratorio)}`)
                          .join(' ');

                        const pathTotal = estadisticasSemanales
                          .map((stat, i) => `${i === 0 ? 'M' : 'L'} ${padding + i * step} ${getY(stat.ingresosTotal)}`)
                          .join(' ');

                        return (
                          <>
                            <path
                              d={pathTotal}
                              fill="none"
                              stroke="#53B9DB"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />

                            <path
                              d={pathRadiologia}
                              fill="none"
                              stroke="#106DA0"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />

                            <path
                              d={pathLaboratorio}
                              fill="none"
                              stroke="#49B2D4"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />

                            {estadisticasSemanales.map((stat, i) => (
                              <g key={i}>
                                <circle
                                  cx={padding + i * step}
                                  cy={getY(stat.ingresosTotal)}
                                  r="5"
                                  fill="#53B9DB"
                                  stroke="white"
                                  strokeWidth="2"
                                />

                                <circle
                                  cx={padding + i * step}
                                  cy={getY(stat.ingresosRadiologia)}
                                  r="4"
                                  fill="#106DA0"
                                  stroke="white"
                                  strokeWidth="2"
                                />

                                <circle
                                  cx={padding + i * step}
                                  cy={getY(stat.ingresosLaboratorio)}
                                  r="4"
                                  fill="#49B2D4"
                                  stroke="white"
                                  strokeWidth="2"
                                />
                              </g>
                            ))}

                            {estadisticasSemanales.map((stat, i) => (
                              <text
                                key={`label-${i}`}
                                x={padding + i * step}
                                y="280"
                                textAnchor="middle"
                                fill={stat.esActual ? '#53B9DB' : 'rgba(255, 255, 255, 0.7)'}
                                fontSize="12"
                                fontWeight={stat.esActual ? '700' : '400'}
                              >
                                {stat.label}
                              </text>
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                )}

                <div className="chart-legend">
                  {tipoGrafica === 'pacientes' ? (
                    <>
                      <div className="legend-item">
                        <div className="legend-color radiologia"></div>
                        <span>Radiología ({estadisticasSemanales.reduce((sum, s) => sum + s.radiologia, 0)})</span>
                      </div>
                      <div className="legend-item">
                        <div className="legend-color laboratorio"></div>
                        <span>Laboratorio ({estadisticasSemanales.reduce((sum, s) => sum + s.laboratorio, 0)})</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="legend-item">
                        <div className="legend-color line-radiologia"></div>
                        <span>Radiología (${estadisticasSemanales.reduce((sum, s) => sum + s.ingresosRadiologia, 0).toLocaleString()})</span>
                      </div>
                      <div className="legend-item">
                        <div className="legend-color line-laboratorio"></div>
                        <span>Laboratorio (${estadisticasSemanales.reduce((sum, s) => sum + s.ingresosLaboratorio, 0).toLocaleString()})</span>
                      </div>
                      <div className="legend-item">
                        <div className="legend-color line-total"></div>
                        <span>Total (${estadisticasSemanales.reduce((sum, s) => sum + s.ingresosTotal, 0).toLocaleString()})</span>
                      </div>
                    </>
                  )}
                  <div className="legend-item">
                    <div className="legend-color current"></div>
                    <span>
                      {vistaGrafica === 'semana' ? 'Hoy' : vistaGrafica === 'mes' ? 'Semana actual' : 'Mes actual'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="recent-patients-section">
            <div className="section-header">
              <h3 className="section-title">Próximas Citas</h3>
              <button className="btn-see-more">Ver todas</button>
            </div>

            <div className="patients-table-container">
              <table className="patients-table">
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Sucursal</th>
                    <th>Estudio</th>
                    <th>Hora</th>
                    <th>Precio</th>
                    <th>Editar</th>
                  </tr>
                </thead>
                <tbody>
                  {pacientesProximos.length > 0 ? (
                    pacientesProximos.map((cita) => (
                      <tr key={cita.id_cita}>
                        <td>
                          <div className="patient-cell">
                            <div className="patient-avatar">
                              {getNombrePaciente(cita).charAt(0)}
                            </div>
                            <span>{getNombrePaciente(cita)}</span>
                          </div>
                        </td>
                        <td>
                          <span className="sucursal-value">
                            {cita.sucursales?.nombre || 'Sin sucursal'}
                          </span>
                        </td>
                        <td>
                          <span className="estudio-value">
                            {cita.tipo_estudio || 'Sin especificar'}
                          </span>
                        </td>
                        <td>
                          <div className="time-cell">
                            <span className="time-value">{formatHora(cita.fecha_estudio)}</span>
                            <span className="date-value">{formatFecha(cita.fecha_estudio)}</span>
                          </div>
                        </td>
                        <td>
                          <span className="price-value">
                            ${Number(cita.monto || 0).toFixed(2)}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn-edit-cita"
                            onClick={() => {
                              setCitaEditando(cita);
                              setModalEditarCitaOpen(true);
                            }}
                            title="Editar cita"
                          >
                            <img src={editarIcono} alt="Editar" className="btn-edit-icon" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="empty-cell">
                        No hay citas próximas programadas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <footer className="dashboard-footer">
        <p className="footer-disclaimer">
          La información generada por CalifornIA tiene únicamente fines de apoyo clínico.
          Cualquier resultado debe interpretarse como orientación y validarse por un especialista.
        </p>
      </footer>

      <NuevaCitaModal
        isOpen={modalNuevaCitaOpen}
        onClose={() => setModalNuevaCitaOpen(false)}
        onCitaCreada={handleCitaCreada}
      />

      <EditarCitaModal
        isOpen={modalEditarCitaOpen}
        onClose={() => {
          setModalEditarCitaOpen(false);
          setCitaEditando(null);
        }}
        cita={citaEditando}
        onCitaActualizada={handleCitaCreada}
      />
    </div>
  );
};

export default Dashboard;