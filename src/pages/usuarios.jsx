import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase-client';
import { useAuth } from '../context/auth-context';
import './Usuarios.css';
import usericon from '../assets/usericon.png';
import notiIcon from '../assets/notificaciones.png';

const Usuarios = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [empleadoData, setEmpleadoData] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [filteredUsuarios, setFilteredUsuarios] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('todos');
  const [loading, setLoading] = useState(true);
  const menuRef = useRef(null);

  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Obtener datos del usuario actual
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
            setEmpleadoData(empleado);
          } else if (perfil.nombre) {
            setEmpleadoData({ nombre: perfil.nombre, puesto: null });
          }
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchEmpleadoData();
  }, [user]);

  // Cargar todos los usuarios/empleados
  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const { data, error } = await supabase
          .from('empleados')
          .select('id_empleado, nombre, puesto, cedula_profesional, email, telefono')
          .order('nombre', { ascending: true });

        if (error) {
          console.error('Error al cargar usuarios:', error);
          return;
        }

        setUsuarios(data || []);
        setFilteredUsuarios(data || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsuarios();
  }, []);

  // Filtrar usuarios por búsqueda y puesto
  useEffect(() => {
    let filtered = [...usuarios];

    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(usuario =>
        usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        usuario.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por puesto
    if (selectedFilter !== 'todos') {
      filtered = filtered.filter(usuario => usuario.puesto === selectedFilter);
    }

    setFilteredUsuarios(filtered);
  }, [searchTerm, selectedFilter, usuarios]);

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

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const getPrimerNombre = (nombreCompleto) => {
    if (!nombreCompleto) return user?.email?.split('@')[0] || 'Usuario';
    return nombreCompleto;
  };

  const formatPuesto = (puesto) => {
    if (!puesto) return 'Sin puesto';

    const puestos = {
      'administrador': 'Administrador',
      'radiologo': 'Radiólogo',
      'medico': 'Médico',
      'tecnico_radiologia': 'Técnico',
      'quimico': 'Químico Analista',
      'recepcionista': 'Recepcionista',
      'desarrollador': 'Desarrollador'
    };

    return puestos[puesto] || puesto;
  };

  const handleEdit = (usuario) => {
    console.log('Editar usuario:', usuario);
    // TODO: Implementar modal o navegación a página de edición
  };

  const handleDelete = async (usuario) => {
    if (!window.confirm(`¿Estás seguro de eliminar a ${usuario.nombre}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('empleados')
        .delete()
        .eq('id_empleado', usuario.id_empleado);

      if (error) {
        console.error('Error al eliminar:', error);
        alert('Error al eliminar el usuario');
        return;
      }

      // Actualizar lista
      setUsuarios(usuarios.filter(u => u.id_empleado !== usuario.id_empleado));
      alert('Usuario eliminado correctamente');
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar el usuario');
    }
  };

  const handleAddUser = () => {
    console.log('Agregar nuevo usuario');
    // TODO: Implementar modal o navegación a página de creación
  };

  return (
    <div className="usuarios-container">
      <header className="usuarios-header">
        <div className="header-left">
          <img
            src={notiIcon}
            alt="Notificaciones"
            className="notification-icon"
          />
          <h1 className="header-title">
            {empleadoData ? formatPuesto(empleadoData.puesto) : 'Cargando...'}
          </h1>
        </div>

        <nav className="header-menu">
          <a href="/dashboard" className="menu-link">INICIO</a>
          {/* <a href="/usuarios" className="menu-link active">USUARIOS</a> */}
          <a href="/pacientes" className="menu-link">PACIENTES</a>
        </nav>

        <div className="header-right" ref={menuRef}>
          <span className="user-name">
            {empleadoData ? getPrimerNombre(empleadoData.nombre) : 'Cargando...'}
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
              <button className="menu-item">Perfil</button>
              <button className="menu-item">Accesos</button>
              <button className="menu-item">Plantillas</button>
              <button className="menu-item menu-item-logout" onClick={handleLogout}>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="usuarios-main">
        <div className="usuarios-content">
          {/* Barra de búsqueda y filtros */}
          <div className="search-filter-section">
            <div className="search-and-actions">
              <div className="search-container">
                <label className="search-label">Usuario</label>
                <div className="search-input-wrapper">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Buscar por nombre o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <button className="primary-btn add-btn-top" onClick={handleAddUser}>
                ➕ AGREGAR USUARIO
              </button>
            </div>

            <div className="filter-buttons">
              <button
                className={`filter-btn ${selectedFilter === 'todos' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('todos')}
              >
                Todos
              </button>
              <button
                className={`filter-btn ${selectedFilter === 'radiologo' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('radiologo')}
              >
                Radiólogo
              </button>
              <button
                className={`filter-btn ${selectedFilter === 'tecnico_radiologia' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('tecnico_radiologia')}
              >
                Técnico
              </button>
              <button
                className={`filter-btn ${selectedFilter === 'quimico' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('quimico')}
              >
                Químico Analista
              </button>
              <button
                className={`filter-btn ${selectedFilter === 'recepcionista' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('recepcionista')}
              >
                Recepcionista
              </button>
            </div>
          </div>

          {/* Tabla de usuarios */}
          <div className="usuarios-table-container">
            {loading ? (
              <div className="loading-message">Cargando usuarios...</div>
            ) : filteredUsuarios.length === 0 ? (
              <div className="empty-message">No se encontraron usuarios</div>
            ) : (
              <table className="usuarios-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Puesto</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsuarios.map((usuario) => (
                    <tr key={usuario.id_empleado}>
                      <td className="usuario-nombre">{usuario.nombre}</td>
                      <td className="usuario-puesto">{formatPuesto(usuario.puesto)}</td>
                      <td className="usuario-acciones">
                        <button
                          className="action-btn edit-btn"
                          onClick={() => handleEdit(usuario)}
                        >
                          Editar
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDelete(usuario)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Usuarios;