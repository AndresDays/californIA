import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase-client';
import { useAuth } from '../../../context/auth-context';
import Layout from '../../../components/layout';
import Header from '../../../components/header-laboratorio.jsx';
import Tabla from '../componentes/tabla';
import ModalAgregar from '../componentes/modal-agregar.jsx';
import './tipo_muestra.css';

const TipoMuestra = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [buscarMuestra, setBuscarMuestra] = useState('');
  const [muestras, setMuestras] = useState([]);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(10);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalMuestras, setTotalMuestras] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    cargarMuestras();
  }, [paginaActual, registrosPorPagina, buscarMuestra]);

  const cargarMuestras = async () => {
    try {
      let query = supabase
        .from('tipo_muestra')
        .select('*', { count: 'exact' });

      if (buscarMuestra.trim()) {
        query = query.ilike('categoria', `%${buscarMuestra}%`);
      }

      const desde = (paginaActual - 1) * registrosPorPagina;
      const hasta = desde + registrosPorPagina - 1;

      const { data, error, count } = await query
        .range(desde, hasta)
        .order('id', { ascending: true });

      if (error) throw error;

      setTotalMuestras(count || 0);
      setMuestras(data || []);
    } catch (error) {
      console.error('Error al cargar muestras:', error);
    }
  };

  const handleAgregarMuestra = () => {
      setModalOpen(true);
    };
  
    const handleGuardarMuestra = async (nombre) => {
      try {
        const { data, error } = await supabase
          .from('tipo_muestra')
          .insert([{ nombre: nombre }]);
  
        if (error) throw error;
  
        cargarMuestras();
      } catch (error) {
        console.error('Error al guardar muestra:', error);
        alert('Error al guardar el muestra');
      }
    };

  const handleEditarMuestra = (id) => {
    navigate(`/configuracion/tipo-muestra/editar/${id}`);
  };

  const paginaSiguiente = () => {
    if (paginaActual * registrosPorPagina < totalMuestras) {
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

  const muestraInicio = (paginaActual - 1) * registrosPorPagina + 1;
  const muestraFin = Math.min(paginaActual * registrosPorPagina, totalMuestras);
  const totalPaginas = Math.ceil(totalMuestras / registrosPorPagina);

  return (
    <Layout>
      <div className="tipo-muestra-wrapper">
        <Header />

        <div className="tipo-muestra-header">
          <h1 className="tipo-muestra-title">Tipo de Muestra</h1>
        </div>

        <div className="tipo-muestra-content">
          <div className="controles-superiores-muestra">
            <button className="btn-agregar-muestra" onClick={handleAgregarMuestra}>
              Agregar Tipo de Muestra
            </button>
          </div>

          <div className="controles-tabla-muestra">
            <div className="mostrar-registros-muestra">
              <span>Mostrar</span>
              <select
                value={registrosPorPagina}
                onChange={(e) => {
                  setRegistrosPorPagina(parseInt(e.target.value));
                  setPaginaActual(1);
                }}
                className="select-registros-muestra"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span>registros</span>
            </div>

            <div className="buscar-muestra-grupo">
              <span>Buscar:</span>
              <input
                type="text"
                value={buscarMuestra}
                onChange={(e) => {
                  setBuscarMuestra(e.target.value);
                  setPaginaActual(1);
                }}
                className="input-buscar-muestra"
              />
            </div>
          </div>

          <Tabla
            headers={['Categoria']}
            datos={muestras.map(m => ({ id: m.id, categoria: m.categoria }))}
            paginaInicio={muestraInicio}
            onEditar={handleEditarMuestra}
            textoVacio="No hay tipos de muestra para mostrar"
          />

          <div className="paginacion-muestra">
            <div className="contador-muestra">
              Mostrando registros del {muestraInicio} al {muestraFin} de un total de {totalMuestras}
            </div>

            <div className="botones-paginacion-muestra">
              <button 
                className="btn-pag-muestra"
                onClick={paginaAnterior}
                disabled={paginaActual === 1}
              >
                Anterior
              </button>
              
              {[...Array(totalPaginas)].map((_, i) => (
                <button
                  key={i + 1}
                  className={`btn-pag-numero-muestra ${paginaActual === i + 1 ? 'activo' : ''}`}
                  onClick={() => irAPagina(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              
              <button 
                className="btn-pag-muestra"
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
          onGuardar={handleGuardarMuestra}
        />
      </div>
    </Layout>
  );
};

export default TipoMuestra;