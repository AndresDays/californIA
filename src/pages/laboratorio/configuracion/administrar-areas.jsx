import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase-client';
import { useAuth } from '../../../context/auth-context';
import Layout from '../../../components/layout';
import Header from '../../../components/header-laboratorio.jsx';
import ModalAgregar from '../componentes/modal-agregar.jsx';
import './administrar-areas.css';

const AdministrarAreas = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [buscarArea, setBuscarArea] = useState('');
  const [areas, setAreas] = useState([]);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(10);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalAreas, setTotalAreas] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    cargarAreas();
  }, [paginaActual, registrosPorPagina, buscarArea]);

  const cargarAreas = async () => {
    try {
      let query = supabase
        .from('areas')
        .select('*', { count: 'exact' });

      if (buscarArea.trim()) {
        query = query.ilike('nombre', `%${buscarArea}%`);
      }

      const desde = (paginaActual - 1) * registrosPorPagina;
      const hasta = desde + registrosPorPagina - 1;

      const { data, error, count } = await query
        .range(desde, hasta)
        .order('id', { ascending: true });

      if (error) throw error;

      setTotalAreas(count || 0);
      setAreas(data || []);
    } catch (error) {
      console.error('Error al cargar areas:', error);
    }
  };

  const handleAgregarArea = () => {
        setModalOpen(true);
      };
    
      const handleGuardarArea = async (nombre) => {
        try {
          const { data, error } = await supabase
            .from('areas')
            .insert([{ nombre: nombre }]);
    
          if (error) throw error;
    
          cargarAreas();
        } catch (error) {
          console.error('Error al guardar areas:', error);
          alert('Error al guardar el areas');
        }
      };

  const handleEditarArea = (id) => {
    navigate(`/configuracion/areas/editar/${id}`);
  };

  const paginaSiguiente = () => {
    if (paginaActual * registrosPorPagina < totalAreas) {
      setPaginaActual(paginaActual + 1);
    }
  };

  const paginaAnterior = () => {
    if (paginaActual > 1) {
      setPaginaActual(paginaActual - 1);
    }
  };

  const irAPagina = (pagina) => {
    setPaginaActual(pagina);
  };

  const areaInicio = (paginaActual - 1) * registrosPorPagina + 1;
  const areaFin = Math.min(paginaActual * registrosPorPagina, totalAreas);
  const totalPaginas = Math.ceil(totalAreas / registrosPorPagina);

  return (
    <Layout>
      <div className="admin-areas-wrapper">
        <Header />

        <div className="admin-areas-header">
          <h1 className="admin-areas-title">Administrar Areas</h1>
          <div className="breadcrumb-areas">
            <span className="breadcrumb-icon">🏠</span>
            <span>Inicio</span>
            <span className="breadcrumb-separator">{'>'}</span>
            <span>Administrar Areas</span>
          </div>
        </div>

        <div className="admin-areas-content">
          <div className="controles-superiores-areas">
            <button className="btn-agregar-area" onClick={handleAgregarArea}>
              Agregar Area
            </button>
          </div>

          <div className="controles-tabla-areas">
            <div className="mostrar-registros-areas">
              <span>Mostrar</span>
              <select
                value={registrosPorPagina}
                onChange={(e) => {
                  setRegistrosPorPagina(parseInt(e.target.value));
                  setPaginaActual(1);
                }}
                className="select-registros-areas"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span>registros</span>
            </div>

            <div className="buscar-areas-grupo">
              <span>Buscar:</span>
              <input
                type="text"
                value={buscarArea}
                onChange={(e) => {
                  setBuscarArea(e.target.value);
                  setPaginaActual(1);
                }}
                className="input-buscar-areas"
              />
            </div>
          </div>

          <div className="tabla-areas-container">
            <table className="tabla-areas">
              <thead>
                <tr>
                  <th># ⬍</th>
                  <th>Area ⬍</th>
                  <th>Acciones ⬍</th>
                </tr>
              </thead>
              <tbody>
                {areas.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="sin-areas">
                      No hay areas para mostrar
                    </td>
                  </tr>
                ) : (
                  areas.map((area, index) => (
                    <tr key={area.id}>
                      <td>{areaInicio + index}</td>
                      <td>{area.nombre}</td>
                      <td>
                        <button
                          className="btn-editar-area"
                          onClick={() => handleEditarArea(area.id)}
                          title="Editar area"
                        >
                          ✏️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="paginacion-areas">
            <div className="contador-areas">
              Mostrando registros del {areaInicio} al {areaFin} de un total de {totalAreas}
            </div>

            <div className="botones-paginacion-areas">
              <button 
                className="btn-pag-areas"
                onClick={paginaAnterior}
                disabled={paginaActual === 1}
              >
                Anterior
              </button>
              
              {[...Array(totalPaginas)].map((_, i) => (
                <button
                  key={i + 1}
                  className={`btn-pag-numero-areas ${paginaActual === i + 1 ? 'activo' : ''}`}
                  onClick={() => irAPagina(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              
              <button 
                className="btn-pag-areas"
                onClick={paginaSiguiente}
                disabled={paginaActual >= totalPaginas}
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
        <ModalAgregar
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onGuardar={handleGuardarArea}
        />
      </div>
    </Layout>
  );
};

export default AdministrarAreas;