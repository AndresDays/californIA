import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './sidebar-home.css';
import inicioIcono from '../assets/inicioIcono.png';
import pacienteIcono from '../assets/pacienteIcono.png';
import nuevoPacienteIcono from '../assets/nuevoPacienteIcono.png';
import imprimirIcono from '../assets/imprimirIcono.png';
import entregaIcono from '../assets/entregaIcono.png';
import recepcionIcono from '../assets/recepcionIcono.png';
import dineroIcono from '../assets/dineroIcono.png';
import doctorIcono from '../assets/doctorIcono.png';
import ventasIcono from '../assets/ventasIcono.png';
import pacientesIcono from '../assets/pacientesIcono.png';
import configuracionIcono from '../assets/configuracionIcono.png';

const SidebarHome = () => {
  const navigate = useNavigate();
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const submenuTimeoutRef = useRef(null);

  const sidebarItems = [
    {
      id: 'inicio',
      icon: inicioIcono,
      label: 'Inicio',
      path: '/dashboard'
    },
    {
      id: 'nuevo-paciente',
      icon: nuevoPacienteIcono,
      label: 'Nuevo Paciente',
      path: '/nuevo-paciente'
    },
    {
      id: 'captura',
      icon: imprimirIcono,
      label: 'Captura',
      path: '/captura'
    },
    {
      id: 'entrega',
      icon: entregaIcono,
      label: 'Entrega',
      path: '/entrega-resultados'
    },
    {
      id: 'recepcion',
      icon: recepcionIcono,
      label: 'Recepción',
      path: '/dashboard',
      hasSubmenu: true,
      submenu: [
        { id: 'editar-solicitud', label: 'Editar Solicitud', path: '/editar-solicitud' },
        { id: 'cotizacion', label: 'Cotización', path: '/cotizacion' },
        { id: 'historial', label: 'Historial', path: '/historial' }
      ]
    },
    {
      id: 'cierre-caja',
      icon: dineroIcono,
      label: 'Cierre Caja',
      path: '/cierre-caja'
    },
    {
      id: 'pacientes',
      icon: pacientesIcono,
      label: 'Pacientes',
      path: '/pacientes'
    },
    {
      id: 'doctores',
      icon: doctorIcono,
      label: 'Doctores',
      path: '/doctores'
    },
    {
      id: 'reportes',
      icon: ventasIcono,
      label: 'Reportes',
      path: '/reporte-ventas'
    },
    {
      id: 'usuarios',
      icon: pacienteIcono,
      label: 'Usuarios',
      path: '/usuarios'
    },
    {
      id: 'configuracion',
      icon: configuracionIcono,
      label: 'Configuración',
      path: '/dashboard',
      hasSubmenu: true,
      submenu: [
        { id: 'estudios', label: 'Estudios', path: '/configuracion/estudios' },
        { id: 'recipientes', label: 'Recipientes', path: '/configuracion/recipientes' },
        { id: 'analitos', label: 'Analitos', path: '/configuracion/analitos' },
        { id: 'metodo', label: 'Método', path: '/configuracion/metodo' },
        { id: 'paquetes', label: 'Paquetes', path: '/configuracion/paquetes' },
        { id: 'tecnica', label: 'Técnica', path: '/configuracion/tecnica' },
        { id: 'precios', label: 'Precios', path: '/configuracion/precios' },
        { id: 'equipos', label: 'Equipos', path: '/configuracion/equipos' },
        { id: 'areas', label: 'Areas', path: '/configuracion/areas' },
        { id: 'nivel-mar', label: 'Nivel del Mar', path: '/configuracion/nivel' },
        { id: 'tipo-muestra', label: 'Tipo de Muestra', path: '/configuracion/tipo-muestra' },
        { id: 'video-tutoriales', label: 'Video Tutoriales', path: '/configuracion/video-tutoriales' }
      ]
    }
  ];

  const handleSubmenuEnter = (itemId) => {
    if (submenuTimeoutRef.current) {
      clearTimeout(submenuTimeoutRef.current);
    }
    setActiveSubmenu(itemId);
  };

  const handleSubmenuLeave = () => {
    submenuTimeoutRef.current = setTimeout(() => {
      setActiveSubmenu(null);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (submenuTimeoutRef.current) {
        clearTimeout(submenuTimeoutRef.current);
      }
    };
  }, []);

  return (
    <aside className="sidebar-home">
      {sidebarItems.map((item) => (
        <div
          key={item.id}
          className="sidebar-home-item-container"
          onMouseEnter={() => item.hasSubmenu && handleSubmenuEnter(item.id)}
          onMouseLeave={() => item.hasSubmenu && handleSubmenuLeave()}
        >
          <button
            className={`sidebar-home-item ${item.hasSubmenu ? 'has-submenu' : ''}`}
            onClick={() => navigate(item.path)}
            title={item.hasSubmenu ? null : item.label}
          >
            <img src={item.icon} alt={item.label} className="sidebar-home-icon" />
          </button>

          {item.hasSubmenu && activeSubmenu === item.id && (
            <div
              className={`sidebar-home-submenu ${item.id === 'configuracion' ? 'grid-layout open-up' : ''}`}
              onMouseEnter={() => handleSubmenuEnter(item.id)}
              onMouseLeave={() => handleSubmenuLeave()}
            >
              <div className="submenu-header">{item.label}</div>
              <div className="submenu-items">
                {item.submenu.map((subItem) => (
                  <button
                    key={subItem.id}
                    className="submenu-item"
                    onClick={() => navigate(subItem.path)}
                  >
                    {subItem.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </aside>
  );
};

export default SidebarHome;