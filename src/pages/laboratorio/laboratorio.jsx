import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase-client';
import { useAuth } from '../../context/auth-context';
import Layout from '../../components/layout';
import './laboratorio.css';
import HeaderLab from '../../components/header-laboratorio.jsx';

const Laboratorio = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [empleadoData, setEmpleadoData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('todos');
  const [estudios, setEstudios] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pendientes: 0,
    capturados: 0,
    validados: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedEstudio, setSelectedEstudio] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const menuRef = useRef(null);

  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Cerrar menú al hacer clic fuera
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

  // Obtener datos del usuario
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
            setEmpleadoData({
              nombre: empleado.nombre || perfil.nombre,
              puesto: empleado.puesto,
              cedula: empleado.cedula_profesional
            });
          }
        }
      } catch (error) {
        console.error('Error al obtener datos del empleado:', error);
      }
    };

    fetchEmpleadoData();
  }, [user]);

  // Obtener estudios de laboratorio y estadísticas
  useEffect(() => {
    const fetchEstudios = async () => {
      try {
        setLoading(true);

        const { data: estudiosData, error: estudiosError } = await supabase
          .from('estudios')
          .select(`
            id_estudio,
            fecha_estudio,
            estado,
            tipo_estudio,
            pacientes (
              id_paciente,
              nombre,
              fecha_nacimiento,
              tipo
            ),
            laboratorio (
              tipo_analisis,
              resultados
            )
          `)
          .eq('tipo_estudio', 'laboratorio')
          .order('fecha_estudio', { ascending: false });

        if (estudiosError) throw estudiosError;

        setEstudios(estudiosData || []);

        const total = estudiosData?.length || 0;
        const pendientes = estudiosData?.filter(e => e.estado === 'pendiente').length || 0;
        const capturados = estudiosData?.filter(e => e.estado === 'capturado').length || 0;
        const validados = estudiosData?.filter(e => e.estado === 'validado').length || 0;

        setStats({ total, pendientes, capturados, validados });
      } catch (error) {
        console.error('Error al cargar estudios:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEstudios();
  }, []);

  const filteredEstudios = estudios.filter(estudio => {
    const matchesSearch = 
      estudio.pacientes?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      estudio.id_estudio.toString().includes(searchTerm);

    const matchesFilter = 
      selectedFilter === 'todos' || 
      estudio.estado === selectedFilter;

    return matchesSearch && matchesFilter;
  });

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleVerDetalles = (estudio) => {
    setSelectedEstudio(estudio);
    setShowModal(true);
  };

  const handleCapturarResultados = (estudio) => {
    navigate(`/laboratorio/captura/${estudio.id_estudio}`);
  };

  const handleValidarEstudio = async (idEstudio) => {
    try {
      const { error } = await supabase
        .from('estudios')
        .update({ estado: 'validado' })
        .eq('id_estudio', idEstudio);

      if (error) throw error;

      window.location.reload();
    } catch (error) {
      console.error('Error al validar estudio:', error);
      alert('Error al validar el estudio');
    }
  };

  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calcularEdad = (fechaNacimiento) => {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'pendiente': return '#FFA726';
      case 'capturado': return '#42A5F5';
      case 'validado': return '#66BB6A';
      default: return '#999';
    }
  };

  const getEstadoTexto = (estado) => {
    switch (estado) {
      case 'pendiente': return 'Pendiente';
      case 'capturado': return 'Capturado';
      case 'validado': return 'Validado';
      default: return estado;
    }
  };

  return (
    <Layout>
      <div className="laboratorio-wrapper">
        {/* Header */}
        <HeaderLab/>

        {/* Main Content */}
        <main className="laboratorio-main">
          {/* Estadísticas */}
          <div className="stats-section">
            <div className="stat-card">
              <div className="stat-number">{stats.total}</div>
              <div className="stat-label">Total de Estudios</div>
            </div>
            <div className="stat-card">
              <div className="stat-number" style={{color: '#FFA726'}}>{stats.pendientes}</div>
              <div className="stat-label">Pendientes</div>
            </div>
            <div className="stat-card">
              <div className="stat-number" style={{color: '#42A5F5'}}>{stats.capturados}</div>
              <div className="stat-label">Capturados</div>
            </div>
            <div className="stat-card">
              <div className="stat-number" style={{color: '#66BB6A'}}>{stats.validados}</div>
              <div className="stat-label">Validados</div>
            </div>
          </div>

          {/* Controles */}
          <div className="controls-section">
            <div className="search-filter-container">
              <input
                type="text"
                placeholder="Buscar por nombre o ID de estudio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />

              <select 
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="filter-select"
              >
                <option value="todos">Todos los estudios</option>
                <option value="pendiente">Pendientes</option>
                <option value="capturado">Capturados</option>
                <option value="validado">Validados</option>
              </select>
            </div>

            <button 
              className="btn-nuevo-estudio"
              onClick={() => navigate('/laboratorio/nuevo')}
            >
              + Nuevo Estudio
            </button>
          </div>

          {/* Tabla de Estudios */}
          <div className="table-container">
            {loading ? (
              <div className="loading">Cargando estudios...</div>
            ) : filteredEstudios.length === 0 ? (
              <div className="no-data">No hay estudios de laboratorio registrados</div>
            ) : (
              <table className="estudios-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Paciente</th>
                    <th>Edad</th>
                    <th>Tipo de Análisis</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEstudios.map((estudio) => (
                    <tr key={estudio.id_estudio}>
                      <td>#{estudio.id_estudio}</td>
                      <td className="paciente-nombre">{estudio.pacientes?.nombre || 'N/A'}</td>
                      <td>{calcularEdad(estudio.pacientes?.fecha_nacimiento)} años</td>
                      <td>{estudio.laboratorio?.tipo_analisis || 'General'}</td>
                      <td>{formatFecha(estudio.fecha_estudio)}</td>
                      <td>
                        <span 
                          className="estado-badge"
                          style={{backgroundColor: getEstadoColor(estudio.estado)}}
                        >
                          {getEstadoTexto(estudio.estado)}
                        </span>
                      </td>
                      <td className="acciones-cell">
                        <button 
                          className="btn-accion btn-ver"
                          onClick={() => handleVerDetalles(estudio)}
                          title="Ver detalles"
                        >
                          👁️
                        </button>
                        
                        {estudio.estado === 'pendiente' && (
                          <button 
                            className="btn-accion btn-capturar"
                            onClick={() => handleCapturarResultados(estudio)}
                            title="Capturar resultados"
                          >
                            📝
                          </button>
                        )}
                        
                        {estudio.estado === 'capturado' && (
                          <button 
                            className="btn-accion btn-validar"
                            onClick={() => handleValidarEstudio(estudio.id_estudio)}
                            title="Validar estudio"
                          >
                            ✓
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="laboratorio-footer">
          <p className="footer-text">
            Bienvenido: {empleadoData?.nombre || 'Usuario'} | Puesto: {empleadoData?.puesto || 'N/A'}
            {empleadoData?.cedula && ` | Cédula: ${empleadoData.cedula}`}
          </p>
        </footer>

        {/* Modal de Detalles */}
        {showModal && selectedEstudio && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
              
              <h2 className="modal-title">Detalles del Estudio #{selectedEstudio.id_estudio}</h2>
              
              <div className="modal-body">
                <div className="detalle-grupo">
                  <h3>Información del Paciente</h3>
                  <p><strong>Nombre:</strong> {selectedEstudio.pacientes?.nombre}</p>
                  <p><strong>Edad:</strong> {calcularEdad(selectedEstudio.pacientes?.fecha_nacimiento)} años</p>
                  <p><strong>Tipo:</strong> {selectedEstudio.pacientes?.tipo === 'particular' ? 'Particular' : 'Empresa'}</p>
                </div>

                <div className="detalle-grupo">
                  <h3>Información del Estudio</h3>
                  <p><strong>Fecha:</strong> {formatFecha(selectedEstudio.fecha_estudio)}</p>
                  <p><strong>Tipo de Análisis:</strong> {selectedEstudio.laboratorio?.tipo_analisis || 'General'}</p>
                  <p><strong>Estado:</strong> {getEstadoTexto(selectedEstudio.estado)}</p>
                </div>

                {selectedEstudio.laboratorio?.resultados && (
                  <div className="detalle-grupo">
                    <h3>Resultados</h3>
                    <pre className="resultados-box">{selectedEstudio.laboratorio.resultados}</pre>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                {selectedEstudio.estado === 'pendiente' && (
                  <button 
                    className="btn-modal btn-capturar-modal"
                    onClick={() => {
                      setShowModal(false);
                      handleCapturarResultados(selectedEstudio);
                    }}
                  >
                    Capturar Resultados
                  </button>
                )}
                
                {selectedEstudio.estado === 'capturado' && (
                  <button 
                    className="btn-modal btn-validar-modal"
                    onClick={() => {
                      handleValidarEstudio(selectedEstudio.id_estudio);
                      setShowModal(false);
                    }}
                  >
                    Validar Estudio
                  </button>
                )}
                
                <button 
                  className="btn-modal btn-cerrar-modal"
                  onClick={() => setShowModal(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Laboratorio;