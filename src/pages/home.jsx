import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase-client'
import { useAuth } from '../context/auth-context'
import './CalifornIA.css';
import enviarInv from '../assets/enviar.png';
import californIA from '../assets/CalifornIA.png';
import usericon from '../assets/usericon.png';
import btnrad from '../assets/btnrad.png';
import btnlab from '../assets/btnlab.png';

const Dashboard = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [empleadoData, setEmpleadoData] = useState(null)
  const [loading, setLoading] = useState(true)
  const menuRef = useRef(null)

   const { user, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchEmpleadoData = async () => {
      if (!user) return

      try {
        // Obtener perfil del usuario
        const { data: perfil, error: perfilError } = await supabase
          .from('perfiles_usuario')
          .select('id_empleado')
          .eq('id', user.id)
          .single()

        if (perfilError) {
          console.error('Error al obtener perfil:', perfilError)
          setLoading(false)
          return
        }

        if (perfil && perfil.id_empleado) {
          // Obtener datos del empleado
          const { data: empleado, error: empleadoError } = await supabase
            .from('empleados')
            .select('nombre, puesto, cedula_profesional')
            .eq('id_empleado', perfil.id_empleado)
            .single()

          if (empleadoError) {
            console.error('Error al obtener empleado:', empleadoError)
          } else {
            setEmpleadoData(empleado)
          }
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEmpleadoData()
  }, [user])
  const toggleMenu = () => {
    setMenuOpen(!menuOpen)
  }

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  const handleNavigation = (path) => {
    navigate(path)
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const getPrimerNombre = (nombreCompleto) => {
    if (!nombreCompleto) return user?.email?.split('@')[0] || 'Usuario'
    return nombreCompleto.split(' ')[0]
  }

  return (
    <div className="container">
      <header className="header">
        <div className="header-left">
          <span className="notification-icon">🔔</span>
          <h1 className="title">Radiólogo - Director</h1>
        </div>

        <nav className="menu">
    <a href="/usuarios" className="menu-link">USUARIOS</a>
    <a href="/pacientes" className="menu-link">PACIENTES</a>
  </nav>
        
        <div className="header-right" ref={menuRef}>
          <span className="user-name">{empleadoData ? getPrimerNombre(empleadoData.nombre) : user?.email?.split('@')[0]}</span>
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
                <button className="menu-item menu-item-logout" onClick={handleLogout}>Cerrar sesión</button>
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
            onClick={() => handleNavigation('/radiologia')}
            alt="Radiología" 
            className="card-button"
          />

          <img 
            src={btnlab}
            onClick={() => handleNavigation('/laboratorio')}
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

export default Dashboard;