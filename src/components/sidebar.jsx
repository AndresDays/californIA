import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Sidebar.css';
import californIA from '../assets/CalifornIA.png';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState({});

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Inicio',
      icon: '🏠',
      path: '/laboratorio'
    },
    {
      id: 'nuevo-paciente',
      label: 'Nuevo Paciente',
      icon: '👤',
      path: '/nuevo-paciente'
    },
    {
      id: 'captura',
      label: 'Captura',
      icon: '📋',
      path: '/captura'
    },
    {
      id: 'entrega',
      label: 'Entrega Resultados',
      icon: '📄',
      path: '/entrega-resultados'
    },
    {
      id: 'recepcion',
      label: 'Recepción',
      icon: '🎯',
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
          id: 'plantas-trabajo',
          label: 'Plantas de Trabajo',
          icon: '○',
          path: '/plantas-trabajo'
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
      icon: '💰',
      path: '/cierre-caja'
    },
    {
      id: 'clientes',
      label: 'Clientes',
      icon: '👥',
      path: '/clientes'
    },
    {
      id: 'doctores',
      label: 'Doctores',
      icon: '👨‍⚕️',
      path: '/doctores'
    },
    {
      id: 'radiologia',
      label: 'Radiología',
      icon: '🩻',
      path: '/radiologia'
    },
    {
      id: 'reportes',
      label: 'Reporte de Ventas',
      icon: '📊',
      path: '/reporte-ventas'
    },
    {
      id: 'usuarios',
      label: 'Usuarios',
      icon: '👨‍💼',
      path: '/laboratorio/usuarios'
    },
    {
      id: 'configuracion',
      label: 'Configuración',
      icon: '⚙️',
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
    // En móvil, cerrar el sidebar después de navegar
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  // 🔧 FIX: Cambiar de === a .startsWith() para detectar mejor las rutas activas
  const isSubmenuActive = (submenu) => {
    return submenu?.some(item => location.pathname.startsWith(item.path));
  };

  // 🔧 FIX: Auto-expandir menús cuando estás en una de sus rutas
  useEffect(() => {
    // Auto-expandir Recepción
    const recepcionItem = menuItems.find(item => item.id === 'recepcion');
    if (recepcionItem && isSubmenuActive(recepcionItem.submenu)) {
      setExpandedMenus(prev => ({
        ...prev,
        recepcion: true
      }));
    }

    // Auto-expandir Configuración
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
      {/* Botón Hamburger */}
      <button 
        className={`hamburger-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Overlay para cerrar en móvil */}
      {isOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-header">
          <img 
            src={californIA} 
            alt="CalifornIA" 
            className="sidebar-logo"
          />
        </div>

        {/* Menú de navegación */}
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
                <span className="sidebar-icon">{item.icon}</span>
                <span className="sidebar-label">{item.label}</span>
                {item.hasSubmenu && (
                  <span className={`submenu-arrow ${expandedMenus[item.id] ? 'expanded' : ''}`}>
                    ▼
                  </span>
                )}
              </button>

              {/* Submenú */}
              {item.hasSubmenu && expandedMenus[item.id] && (
                <div className={`sidebar-submenu ${item.id === 'configuracion' ? 'grid-2-cols' : ''}`}>
                  {item.submenu.map((subItem) => (
                    <button
                      key={subItem.id}
                      className={`sidebar-subitem ${isActive(subItem.path) ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation(); // 🔧 FIX: Prevenir que se cierre el menú
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

        {/* Footer del sidebar */}
        <div className="sidebar-footer">
          <p className="sidebar-version">CalifornIA v1.0</p>
          <p className="sidebar-copyright">© 2024</p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;