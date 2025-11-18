import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase-client';
import { useAuth } from '../context/auth-context';
import './CalifornIA.css';
import californIA from '../assets/CalifornIA.png';
import usericon from '../assets/usericon.png';
import btnrad from '../assets/btnrad.png';
import btnlab from '../assets/btnlab.png';
import notiIcon from '../assets/notificaciones.png';

const Dashboard = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [empleadoData, setEmpleadoData] = useState(null);
  const [stats, setStats] = useState({
    pacientes: 0,
    estudios: 0,
    usuarios: 0
  });
  const [loading, setLoading] = useState(true);
  const menuRef = useRef(null);

  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Obtener datos del usuario actual
  useEffect(() => {
    const fetchEmpleadoData = async () => {
      if (!user) return;

      try {
        const { data: perfil, error: perfilError } = await supabase
          .from('perfiles_usuario')
          .select('id_empleado, nombre')
          .eq('id', user.id)
          .single();

        if (perfilError || !perfil) return;

        if (perfil.id_empleado) {
          const { data: empleado } = await supabase
            .from('empleados')
            .select('nombre, puesto, cedula_profesional')
            .eq('id_empleado', perfil.id_empleado)
            .single();

          if (empleado) {
            setEmpleadoData(empleado);
          } else if (perfil.nombre) {
            setEmpleadoData({ nombre: perfil.nombre, puesto: null });
          }
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmpleadoData();
  }, [user]);

  // Cargar estadísticas
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Contar pacientes
        const { count: pacientesCount } = await supabase
          .from('paciente')
          .select('*', { count: 'exact', head: true });

        // Contar usuarios/empleados
        const { count: usuariosCount } = await supabase
          .from('empleados')
          .select('*', { count: 'exact', head: true });

        // Contar estudios (si existe la tabla)
        const { count: estudiosCount } = await supabase
          .from('estudios')
          .select('*', { count: 'exact', head: true });

        setStats({
          pacientes: pacientesCount || 0,
          estudios: estudiosCount || 0,
          usuarios: usuariosCount || 0
        });
      } catch (error) {
        console.error('Error al cargar estadísticas:', error);
      }
    };

    fetchStats();
  }, []);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
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

  const formatPuesto = (puesto) => {
    if (!puesto) return 'Usuario';

    const puestos = {
      'administrador': 'Administrador',
      'radiologo': 'Radiólogo - Director',
      'medico': 'Médico',
      'tecnico_radiologia': 'Técnico en Radiología',
      'quimico': 'Químico',
      'recepcionista': 'Recepcionista',
      'desarrollador': 'Desarrollador'
    };

    return puestos[puesto] || puesto;
  };

  const puedeInvitarUsuarios = () => {
    if (!empleadoData || !empleadoData.puesto) return false;
    const puestosAutorizados = ['desarrollador', 'administrador'];
    return puestosAutorizados.includes(empleadoData.puesto);
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <img
            src={notiIcon}
            alt="Notificaciones"
            className="notification-icon"
          />
          <h1 className="header-title">
            {empleadoData ? formatPuesto(empleadoData.puesto) : 'Cargando...'}
          </h1>
        </div>

        <nav className="header-menu">
          <button onClick={() => navigate('/dashboard')} className="menu-link active">
            INICIO
          </button>
          {/* <button onClick={() => navigate('/usuarios')} className="menu-link">
            USUARIOS
          </button> */}
          <button onClick={() => navigate('/pacientes')} className="menu-link">
            PACIENTES
          </button>
        </nav>

        <div className="header-right" ref={menuRef}>
          <span className="user-name">
            {empleadoData ? getPrimerNombre(empleadoData.nombre) : 'Cargando...'}
          </span>
          <img
            src={usericon}
            alt="Usuario"
            className="user-avatar"
            onClick={toggleMenu}
          />
          {menuOpen && (
            <div className="user-dropdown-menu">
              <button className="close-menu-btn" onClick={toggleMenu}>✕</button>
              <button className="menu-item">Perfil</button>
              <button className="menu-item">Accesos</button>
              <button className="menu-item">Plantillas</button>
              <button className="menu-item menu-item-logout" onClick={handleLogout}>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-content">
          {/* Welcome Section */}
          <div className="welcome-section">
            <div className="welcome-text">
              <h2 className="welcome-title">
                Bienvenido, {empleadoData ? getPrimerNombre(empleadoData.nombre) : 'Usuario'}
              </h2>
              <p className="welcome-subtitle">
                Confianza médica, potenciada con Inteligencia Artificial
              </p>
            </div>
            <img src={californIA} alt="CalifornIA" className="california-logo" />
          </div>

          {/* Stats Cards */}
          <div className="stats-section">
            <div className="stat-card">
              <div className="stat-icon patients">👥</div>
              <div className="stat-info">
                <span className="stat-number">{stats.pacientes}</span>
                <span className="stat-label">Pacientes</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon studies">📊</div>
              <div className="stat-info">
                <span className="stat-number">{stats.estudios}</span>
                <span className="stat-label">Estudios</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon users">👨‍⚕️</div>
              <div className="stat-info">
                <span className="stat-number">{stats.usuarios}</span>
                <span className="stat-label">Usuarios</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="quick-actions-section">
            <h3 className="section-title">Accesos Rápidos</h3>
            
            <div className="actions-grid">
              <div className="action-card radiologia" onClick={() => handleNavigation('/radiologia')}>
                <div className="action-card-content">
                  <img src={btnrad} alt="Radiología" className="action-icon" />
                  <h4 className="action-title">Radiología</h4>
                  <p className="action-description">
                    Análisis de rayos X con IA para detección de patologías
                  </p>
                </div>
                <button className="action-button">
                  Acceder →
                </button>
              </div>

              <div className="action-card laboratorio" onClick={() => handleNavigation('/laboratorio')}>
                <div className="action-card-content">
                  <img src={btnlab} alt="Laboratorio" className="action-icon" />
                  <h4 className="action-title">Laboratorio</h4>
                  <p className="action-description">
                    Gestión y análisis de estudios de laboratorio clínico
                  </p>
                </div>
                <button className="action-button">
                  Acceder →
                </button>
              </div>

              {/* <div className="action-card pacientes" onClick={() => handleNavigation('/pacientes')}>
                <div className="action-card-content">
                  <div className="action-icon-text">👥</div>
                  <h4 className="action-title">Pacientes</h4>
                  <p className="action-description">
                    Gestión completa de expedientes de pacientes
                  </p>
                </div>
                <button className="action-button">
                  Acceder →
                </button>
              </div> */}

              {puedeInvitarUsuarios() && (
                <div className="action-card usuarios" onClick={() => handleNavigation('/usuarios')}>
                  <div className="action-card-content">
                    <div className="action-icon-text">⚙️</div>
                    <h4 className="action-title">Administración</h4>
                    <p className="action-description">
                      Gestión de usuarios y configuración del sistema
                    </p>
                  </div>
                  <button className="action-button">
                    Acceder →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="recent-activity-section">
            <h3 className="section-title">Actividad Reciente</h3>
            <div className="activity-container">
              <div className="activity-placeholder">
                <span className="placeholder-icon">📋</span>
                <p className="placeholder-text">No hay actividad reciente</p>
                <p className="placeholder-subtext">La actividad del sistema aparecerá aquí</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="dashboard-footer">
        <p className="footer-disclaimer">
          <span className="disclaimer-icon">⚕️</span>
          La información generada por CalifornIA tiene únicamente fines de apoyo clínico.
          Cualquier resultado debe interpretarse como orientación y validarse por un especialista.
        </p>
      </footer>
    </div>
  );
};

export default Dashboard;