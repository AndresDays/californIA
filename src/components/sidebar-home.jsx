import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
    label: 'Captura de Resultados',
    path: '/captura'
  },
  {
    id: 'entrega',
    icon: entregaIcono,
    label: 'Entrega de Resultados',
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

const SidebarHome = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarRef = useRef(null);
  const [activeSubmenu, setActiveSubmenu] = useState(null);

  const isCurrentPath = (path) => location.pathname === path;
  const isSubmenuActive = (item) =>
    item.submenu?.some((subItem) => location.pathname.startsWith(subItem.path));
  const isItemActive = (item) =>
    (!item.hasSubmenu && isCurrentPath(item.path)) || isSubmenuActive(item) || activeSubmenu === item.id;

  const handleItemClick = (item) => {
    if (item.hasSubmenu) {
      setActiveSubmenu((current) => (current === item.id ? null : item.id));
      return;
    }

    navigate(item.path);
    setActiveSubmenu(null);
  };

  const handleSubItemClick = (path) => {
    navigate(path);
    setActiveSubmenu(null);
  };

  useEffect(() => {
    const activeParent = sidebarItems.find((item) => item.hasSubmenu && isSubmenuActive(item));

    if (activeParent) {
      setActiveSubmenu(activeParent.id);
      return;
    }

    setActiveSubmenu((current) => {
      const currentItem = sidebarItems.find((item) => item.id === current);
      return currentItem && isSubmenuActive(currentItem) ? current : null;
    });
  }, [location.pathname]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!sidebarRef.current?.contains(event.target)) {
        setActiveSubmenu(null);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <aside className="sidebar-home" ref={sidebarRef}>
      {sidebarItems.map((item) => (
        <div
          key={item.id}
          className="sidebar-home-item-container"
        >
          <button
            className={`sidebar-home-item ${item.hasSubmenu ? 'has-submenu' : ''} ${isItemActive(item) ? 'active' : ''}`}
            onClick={() => handleItemClick(item)}
            title={item.hasSubmenu ? undefined : item.label}
            aria-label={item.label}
            aria-expanded={item.hasSubmenu ? activeSubmenu === item.id : undefined}
          >
            <img src={item.icon} alt={item.label} className="sidebar-home-icon" />
          </button>

          {item.hasSubmenu && activeSubmenu === item.id && (
            <div
              className={`sidebar-home-submenu ${item.id === 'configuracion' ? 'grid-layout open-up' : ''}`}
            >
              <div className="submenu-header">{item.label}</div>
              <div className="submenu-items">
                {item.submenu.map((subItem) => (
                  <button
                    key={subItem.id}
                    className={`submenu-item ${isCurrentPath(subItem.path) ? 'active' : ''}`}
                    onClick={() => handleSubItemClick(subItem.path)}
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
