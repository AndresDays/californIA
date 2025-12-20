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
      }
    };

    fetchEmpleadoData();
  }, [user]);

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
          <button onClick={() => navigate('/usuarios')} className="menu-link">
            USUARIOS
          </button>
          <button onClick={() => navigate('/pacientes')} className="menu-link">
            PACIENTES
          </button>
        </nav>

        <div className="header-right" ref={menuRef}>
          <span className="user-name">
            {empleadoData ? getPrimerNombre(empleadoData.nombre) : 'Cargando..'}
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
        <div className="dashboard-hero">
          {/* Texto y logo a la izquierda */}
          <div className="hero-left">
            <h1 className="hero-title">
              Confianza médica, potenciada <br />
              <span className="hero-highlight">con Inteligencia Artificial.</span>
            </h1>
            
            <img 
              src={californIA} 
              alt="CalifornIA" 
              className="hero-logo"
            />
          </div>

          {/* Cards a la derecha */}
          <div className="hero-right">
            <img 
              src={btnrad} 
              alt="Radiología" 
              className="hero-btn-image"
              onClick={() => handleNavigation('/radiologia')}
            />

            <img 
              src={btnlab} 
              alt="Laboratorio" 
              className="hero-btn-image"
              onClick={() => handleNavigation('/laboratorio')}
            />
          </div>
        </div>
      </main>

      <footer className="dashboard-footer">
        <p className="footer-disclaimer">
          La información generada por CalifornIA tiene únicamente fines de apoyo clínico. 
          Cualquier resultado debe interpretarse como orientación y validarse por un especialista.
        </p>
      </footer>
    </div>
  );
};

export default Dashboard;