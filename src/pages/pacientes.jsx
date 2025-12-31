import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase-client';
import { useAuth } from '../context/auth-context';
import './Pacientes.css';
import usericon from '../assets/usericon.png';
import notiIcon from '../assets/notificaciones.png';

const Pacientes = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [empleadoData, setEmpleadoData] = useState(null);
  const [pacientes, setPacientes] = useState([]);
  const [filteredPacientes, setFilteredPacientes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('todos');
  const [loading, setLoading] = useState(true);
  const menuRef = useRef(null);

  const { user, signOut } = useAuth();
  const navigate = useNavigate();

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

  useEffect(() => {
    const fetchPacientes = async () => {
      try {
        const { data, error } = await supabase
          .from('paciente')
          .select('id_paciente, cedula, nombre, fecha_nacimiento, edad, tipo, correo, telefono, empresa, fecha_ultima_visita')
          .order('fecha_ultima_visita', { ascending: false, nullsFirst: false });

        if (error) {
          console.error('Error al cargar pacientes:', error);
          return;
        }

        setPacientes(data || []);
        setFilteredPacientes(data || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPacientes();
  }, []);

  useEffect(() => {
    let filtered = [...pacientes];

    if (searchTerm) {
      filtered = filtered.filter(paciente =>
        paciente.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        paciente.cedula?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        paciente.correo?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedFilter !== 'todos') {
      if (selectedFilter === 'recientes') {
        const treintaDiasAtras = new Date();
        treintaDiasAtras.setDate(treintaDiasAtras.getDate() - 30);
        
        filtered = filtered.filter(paciente => {
          if (!paciente.fecha_ultima_visita) return false;
          const fechaVisita = new Date(paciente.fecha_ultima_visita);
          return fechaVisita >= treintaDiasAtras;
        });
      } else {
        filtered = filtered.filter(paciente => paciente.tipo === selectedFilter);
      }
    }

    setFilteredPacientes(filtered);
  }, [searchTerm, selectedFilter, pacientes]);

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
    if (!puesto) return 'Usuario';

    const puestos = {
      'administrador': 'Administrador',
      'radiologo': 'Radiólogo - Director',
      'medico': 'Médico',
      'tecnico_radiologia': 'Técnico en Radiología',
      'quimico': 'Químico',
      'recepcionista': 'Recepcionista',
      'desarrollador': 'Desarrollador'
    };

    return puestos[puesto] || puesto;
  };

  const formatFecha = (fecha) => {
    if (!fecha) return 'N/A';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-MX', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return 'N/A';
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  };

  const handleView = (paciente) => {
    console.log('Ver paciente:', paciente);
  };

  const handleEdit = (paciente) => {
    console.log('Editar paciente:', paciente);
  };

  const handleDelete = async (paciente) => {
    if (!window.confirm(`¿Estás seguro de eliminar al paciente ${paciente.nombre}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('paciente')
        .delete()
        .eq('id_paciente', paciente.id_paciente);

      if (error) {
        console.error('Error al eliminar:', error);
        alert('Error al eliminar el paciente');
        return;
      }

      setPacientes(pacientes.filter(p => p.id_paciente !== paciente.id_paciente));
      alert('Paciente eliminado correctamente');
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar el paciente');
    }
  };

  const handleAddPaciente = () => {
    console.log('Agregar nuevo paciente');
  };

  const handleExport = () => {
    const headers = 'Nombre,Cédula,Edad,Tipo,Email,Teléfono,Última Visita\n';
    const csv = filteredPacientes.map(p => 
      `"${p.nombre}","${p.cedula || ''}",${calcularEdad(p.fecha_nacimiento)},"${p.tipo || ''}","${p.correo || ''}","${p.telefono || ''}","${formatFecha(p.fecha_ultima_visita)}"`
    ).join('\n');
    
    const blob = new Blob([headers + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pacientes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="pacientes-container">
      <header className="pacientes-header">
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
          <button onClick={() => navigate('/dashboard')} className="menu-link">INICIO</button>
          <button onClick={() => navigate('/usuarios')} className="menu-link">USUARIOS</button>
          <button onClick={() => navigate('/pacientes')} className="menu-link active">PACIENTES</button>
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

      <main className="pacientes-main">
        <div className="pacientes-content">
          <div className="content-header">
            <h2 className="section-title">Gestión de Pacientes</h2>
            <div className="pacientes-counter">
              <span className="counter-number">{filteredPacientes.length}</span>
              <span className="counter-label">
                {filteredPacientes.length === 1 ? 'Paciente' : 'Pacientes'}
              </span>
            </div>
          </div>

          <div className="search-filter-section">
            <div className="search-and-actions">
              <div className="search-container">
                <label className="search-label">Buscar Paciente</label>
                <div className="search-input-wrapper">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Buscar por nombre, cédula o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="filter-buttons">
              <button
                className={`filter-btn ${selectedFilter === 'todos' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('todos')}
              >
                Todos
              </button>
              <button
                className={`filter-btn ${selectedFilter === 'recientes' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('recientes')}
              >
                Recientes (30 días)
              </button>
              <button
                className={`filter-btn ${selectedFilter === 'particular' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('particular')}
              >
                Particulares
              </button>
              <button
                className={`filter-btn ${selectedFilter === 'empresa' ? 'active' : ''}`}
                onClick={() => setSelectedFilter('empresa')}
              >
                Empresas
              </button>
            </div>
          </div>

          <div className="pacientes-table-container">
            {loading ? (
              <div className="loading-message">Cargando pacientes...</div>
            ) : filteredPacientes.length === 0 ? (
              <div className="empty-message">
                <div className="empty-icon">👥</div>
                <p>No se encontraron pacientes</p>
                {searchTerm && (
                  <button 
                    className="clear-search-btn"
                    onClick={() => setSearchTerm('')}
                  >
                    Limpiar búsqueda
                  </button>
                )}
              </div>
            ) : (
              <table className="pacientes-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Cédula</th>
                    <th>Edad</th>
                    <th>Tipo</th>
                    <th>Última Visita</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPacientes.map((paciente) => (
                    <tr key={paciente.id_paciente}>
                      <td className="paciente-nombre">
                        <div className="nombre-wrapper">
                          <span className="nombre-principal">{paciente.nombre}</span>
                          {paciente.correo && (
                            <span className="email-secundario">{paciente.correo}</span>
                          )}
                        </div>
                      </td>
                      <td className="paciente-cedula">{paciente.cedula || 'N/A'}</td>
                      <td className="paciente-edad">
                        {paciente.edad || calcularEdad(paciente.fecha_nacimiento)} años
                      </td>
                      <td className="paciente-tipo">
                        <span className={`tipo-badge ${paciente.tipo || 'particular'}`}>
                          {paciente.tipo === 'empresa' ? paciente.empresa || 'Empresa' : 'Particular'}
                        </span>
                      </td>
                      <td className="paciente-fecha">
                        {formatFecha(paciente.fecha_ultima_visita)}
                      </td>
                      <td className="paciente-acciones">
                        <button
                          className="action-btn view-btn"
                          onClick={() => handleView(paciente)}
                          title="Ver detalles"
                        >
                          👁️
                        </button>
                        <button
                          className="action-btn edit-btn"
                          onClick={() => handleEdit(paciente)}
                          title="Editar"
                        >
                          Editar
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDelete(paciente)}
                          title="Eliminar"
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

          <div className="export-section">
            <button className="secondary-btn export-btn" onClick={handleExport}>
              📊 EXPORTAR CSV
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Pacientes;