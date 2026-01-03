import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Sidebar.css';
import californIA from '../assets/CalifornIA.png';
import inicioIcono from '../assets/inicioIcono.png';
import pacienteIcono from '../assets/pacienteIcono.png';
import imprimirIcono from '../assets/imprimirIcono.png';
import entregaIcono from '../assets/entregaIcono.png';
import recepcionIcono from '../assets/recepcionIcono.png';
import dineroIcono from '../assets/dineroIcono.png';
import doctorIcono from '../assets/doctorIcono.png';
import ventasIcono from '../assets/ventasIcono.png';
import configuracionIcono from '../assets/configuracionIcono.png';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState({});

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Inicio',
      icon: inicioIcono,
      path: '/laboratorio'
    },
    {
      id: 'nuevo-paciente',
      label: 'Nuevo Paciente',
      icon: pacienteIcono,
      path: '/nuevo-paciente'
    },
    {
      id: 'captura',
      label: 'Captura',
      icon: imprimirIcono,
      path: '/captura'
    },
    {
      id: 'entrega',
      label: 'Entrega Resultados',
      icon: entregaIcono,
      path: '/entrega-resultados'
    },
    {
      id: 'recepcion',
      label: 'Recepción',
      icon: recepcionIcono,
      path: '/',
      hasSubmenu: true,
      submenu: [
        {
          id: 'editar-solicitud',
          label: 'Editar Solicitud',
          icon: '○',
          path: '/editar-solicitud'
        },
        {
          id: 'cotizacion',
          label: 'Cotización',
          icon: '○',
          path: '/cotizacion'
        },
        {
          id: 'historial',
          label: 'Historial',
          icon: '○',
          path: '/historial'
        }
      ]
    },
    {
      id: 'cierre-caja',
      label: 'Cierre Caja',
      icon: dineroIcono,
      path: '/cierre-caja'
    },
    {
      id: 'doctores',
      label: 'Doctores',
      icon: doctorIcono,
      path: '/doctores'
    },
    {
      id: 'reportes',
      label: 'Reporte de Ventas',
      icon: ventasIcono,
      path: '/reporte-ventas'
    },
    {
      id: 'configuracion',
      label: 'Configuración',
      icon: configuracionIcono,
      path: '/configuracion',
      hasSubmenu: true,
      submenu: [
        {
          id: 'estudios',
          label: 'Estudios',
          icon: '○',
          path: '/configuracion/estudios'
        },
        {
          id: 'recipientes',
          label: 'Recipientes',
          icon: '○',
          path: '/configuracion/recipientes'
        },
        {
          id: 'analitos',
          label: 'Analitos',
          icon: '○',
          path: '/configuracion/analitos'
        },
        {
          id: 'metodo',
          label: 'Método',
          icon: '○',
          path: '/configuracion/metodo'
        },
        {
          id: 'paquetes',
          label: 'Paquetes',
          icon: '○',
          path: '/configuracion/paquetes'
        },
        {
          id: 'tecnica',
          label: 'Técnica',
          icon: '○',
          path: '/configuracion/tecnica'
        },
        {
          id: 'precios',
          label: 'Precios',
          icon: '○',
          path: '/configuracion/precios'
        },
        {
          id: 'equipos',
          label: 'Equipos',
          icon: '○',
          path: '/configuracion/equipos'
        },
        {
          id: 'areas',
          label: 'Areas',
          icon: '○',
          path: '/configuracion/areas'
        },
        {
          id: 'nivel-mar',
          label: 'Nivel del Mar',
          icon: '○',
          path: '/configuracion/nivel'
        },
        {
          id: 'tipo-muestra',
          label: 'Tipo de Muestra',
          icon: '○',
          path: '/configuracion/tipo-muestra'
        },
        {
          id: 'video-tutoriales',
          label: 'Video Tutoriales',
          icon: '○',
          path: '/configuracion/video-tutoriales'
        }
      ]
    }
  ];

  const toggleSubmenu = (itemId) => {
    setExpandedMenus(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleNavigate = (path) => {
    navigate(path);
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const isSubmenuActive = (submenu) => {
    return submenu?.some(item => location.pathname.startsWith(item.path));
  };

  useEffect(() => {
    const recepcionItem = menuItems.find(item => item.id === 'recepcion');
    if (recepcionItem && isSubmenuActive(recepcionItem.submenu)) {
      setExpandedMenus(prev => ({
        ...prev,
        recepcion: true
      }));
    }

    const configItem = menuItems.find(item => item.id === 'configuracion');
    if (configItem && isSubmenuActive(configItem.submenu)) {
      setExpandedMenus(prev => ({
        ...prev,
        configuracion: true
      }));
    }
  }, [location.pathname]);

  return (
    <>
      <button 
        className={`hamburger-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {isOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img 
            src={californIA} 
            alt="CalifornIA" 
            className="sidebar-logo"
          />
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <div key={item.id} className="sidebar-item-wrapper">
              <button
                className={`sidebar-item ${
                  isActive(item.path) || isSubmenuActive(item.submenu) ? 'active' : ''
                }`}
                onClick={() => {
                  if (item.hasSubmenu) {
                    toggleSubmenu(item.id);
                  } else {
                    handleNavigate(item.path);
                  }
                }}
              >
                <span className="sidebar-icon">
                  {typeof item.icon === 'string' && item.icon.includes('.png') ? (
                    <img src={item.icon} alt={item.label} className="sidebar-icon-img" />
                  ) : (
                    item.icon
                  )}
                </span>
                <span className="sidebar-label">{item.label}</span>
                {item.hasSubmenu && (
                  <span className={`submenu-arrow ${expandedMenus[item.id] ? 'expanded' : ''}`}>
                    ▼
                  </span>
                )}
              </button>

              {item.hasSubmenu && expandedMenus[item.id] && (
                <div className={`sidebar-submenu ${item.id === 'configuracion' ? 'grid-2-cols' : ''}`}>
                  {item.submenu.map((subItem) => (
                    <button
                      key={subItem.id}
                      className={`sidebar-subitem ${isActive(subItem.path) ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation(); 
                        handleNavigate(subItem.path);
                      }}
                    >
                      <span className="sidebar-subicon">{subItem.icon}</span>
                      <span className="sidebar-sublabel">{subItem.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p className="sidebar-version">CalifornIA v1.0</p>
          <p className="sidebar-copyright">© 2024</p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;