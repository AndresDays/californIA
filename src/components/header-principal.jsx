import React from 'react';
import { useNavigate } from 'react-router-dom';
import notiIcon from '../assets/notificaciones.png';
import usericon from '../assets/usericon.png';
import './header.css';

const Header = ({ 
  menuOpen, 
  setMenuOpen, 
  menuRef, 
  empleadoData, 
  formatRol, 
  getPrimerNombre, 
  user, 
  handleLogout,
  currentPage = 'inicio'
}) => {
  const navigate = useNavigate();

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const handleNavigatePerfil = () => {
    navigate('/perfil');
    setMenuOpen(false);
  };

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <img src={notiIcon} alt="Notificaciones" className="notification-icon" />
        <h1 className="header-title">
          {empleadoData ? formatRol(empleadoData.rol) : 'Cargando...'}
        </h1>
      </div>

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
            <button className="menu-item" onClick={handleNavigatePerfil}>Perfil</button>
            <button className="menu-item">Accesos</button>
            <button className="menu-item">Plantillas</button>
            <button className="menu-item menu-item-logout" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;