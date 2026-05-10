import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { sidebarItems } from './sidebar-menu';
import './sidebar-home.css';

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
