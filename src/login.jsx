import React, { useState, useEffect, useRef } from 'react';
import './CalifornIA.css';
import enviarInv from './assets/enviar.png';
import californIA from './assets/CalifornIA.png';
import usericon from './assets/usericon.png';
import btnrad from './assets/btnrad.png';
import btnlab from './assets/btnlab.png';

const CalifornIA = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

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
  return (
    <div className="container">
      <header className="header">
        <div className="header-left">
          <span className="notification-icon">🔔</span>
          <h1 className="title">Radiólogo - Director</h1>
        </div>

        <nav className="menu">
    <a href="#" className="menu-link">USUARIOS</a>
    <a href="#" className="menu-link">PACIENTES</a>
  </nav>
        
        <div className="header-right" ref={menuRef}>
          <span className="user-name">Juan Díaz</span>
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
                <button className="menu-item menu-item-logout">Cerrar sesión</button>
              </div>
            )}
     

        </div>
      </header>

      <main className="main-content">
        <div className="text-content">
          <h1 className='hero-title'>
            Confianza médica, potenciada <br />
            <span className='highlighted'>con Inteligencia Artificial.</span>
          </h1>

          <div className="logo-section">
            <img 
              src={californIA}
              alt="CalifornIA Logo" 
              className="californiia-logo"
            />
            <img 
              src={enviarInv}
              alt="Enviar Invitación" 
              className="invite-button-img"
            />
          </div>
        </div>

        <div className="cards-section">
          <img 
            src={btnrad} 
            alt="Radiología" 
            className="card-button"
          />

          <img 
            src={btnlab}
            alt="Laboratorio" 
            className="card-button"
          />
        </div>
      </main>

      <footer className="footer">
        <p className="disclaimer">
          La información generada por CalifornIA tiene únicamente fines de apoyo clínico. 
          Cualquier resultado debe interpretarse como orientación y validarse por un especialista.
        </p>
      </footer>
    </div>
  );
};

export default CalifornIA;