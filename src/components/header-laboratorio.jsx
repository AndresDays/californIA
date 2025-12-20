import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase-client';
import { useAuth } from '../context/auth-context';
import './header-lab.css';
import californIA from '../assets/CalifornIA.png';
import usericon from '../assets/usericon.png';

const HeaderLab = ({ tipo = 'default' }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [empleadoData, setEmpleadoData] = useState(null);
  const menuRef = useRef(null);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Cerrar menú al hacer clic fuera
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

  // Obtener datos del usuario
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
            setEmpleadoData({
              nombre: empleado.nombre || perfil.nombre,
              puesto: empleado.puesto,
              cedula: empleado.cedula_profesional
            });
          }
        } else {
          setEmpleadoData({
            nombre: perfil.nombre || user.email,
            puesto: 'Usuario',
            cedula: null
          });
        }
      } catch (error) {
        console.error('Error al obtener datos del empleado:', error);
      }
    };

    fetchEmpleadoData();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // Determinar clase según el tipo
  const headerClass = tipo === 'azul' ? 'app-header azul' : 'app-header';

  return (
    <header className={headerClass}>
      <div className="header-center">
        <img src={californIA} alt="CalifornIA" className="header-logo" />
      </div>

      <div className="header-right" ref={menuRef}>
        <span className="user-name">Cuenta: {empleadoData?.nombre || 'Cargando...'}</span>
        <img
          src={usericon}
          alt="Usuario"
          className="user-avatar"
          onClick={() => setMenuOpen(!menuOpen)}
        />
        
        {menuOpen && (
          <div className="user-dropdown-menu">
            <button className="close-menu-btn" onClick={() => setMenuOpen(false)}>×</button>
            <button onClick={() => navigate('/dashboard')} className="menu-item">Dashboard</button>
            <button onClick={() => navigate('/laboratorio')} className="menu-item">Laboratorio</button>
            <button onClick={() => navigate('/captura')} className="menu-item">Captura</button>
            <button onClick={() => navigate('/recepcion')} className="menu-item">Recepción</button>
            <button onClick={() => navigate('/usuarios')} className="menu-item">Usuarios</button>
            <button onClick={() => navigate('/pacientes')} className="menu-item">Pacientes</button>
            <button onClick={handleLogout} className="menu-item logout">Cerrar Sesión</button>
          </div>
        )}
      </div>
    </header>
  );
};

export default HeaderLab;