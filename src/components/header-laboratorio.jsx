import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { supabase } from '../lib/supabase-client';
import './header-lab.css';
import californIA from '../assets/CalifornIA.png';
import usericon from '../assets/usericon.png';

const HeaderLab = ({ tipo = 'default' }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [empleado, setEmpleado] = useState(null);
  const menuRef = useRef(null);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEmpleado = async () => {
      if (!user?.id) {
        setEmpleado(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('empleados')
          .select('*')
          .eq('auth_uuid', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error al obtener empleado:', error);
          return;
        }

        setEmpleado(data);
      } catch (error) {
        console.error('Error en fetchEmpleado:', error);
      }
    };

    fetchEmpleado();
  }, [user]);

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

  const headerClass = tipo === 'azul' ? 'app-header azul' : 'app-header';

  return (
    <header className={headerClass}>
      <div className="header-center">
        <img src={californIA} alt="CalifornIA" className="header-logo" />
      </div>

      <div className="header-right" ref={menuRef}>
        <span className="user-name">
          {empleado?.nombre || 'Cargando...'}
        </span>
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