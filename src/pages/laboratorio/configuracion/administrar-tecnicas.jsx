import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase-client';
import { useAuth } from '../../../context/auth-context';
import Layout from '../../../components/layout';
import Header from '../../../components/header-laboratorio.jsx';
import Tabla from '../componentes/tabla';
import ModalAgregar from '../componentes/modal-agregar.jsx';
import './administrar-tecnicas.css';

const AdministrarTecnicas = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [buscarTecnica, setBuscarTecnica] = useState('');
  const [tecnicas, setTecnicas] = useState([]);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(10);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalTecnicas, setTotalTecnicas] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [tecnicasEditando, setTecnicasEditando] = useState(null);

  useEffect(() => {
    cargarTecnicas();
  }, [paginaActual, registrosPorPagina, buscarTecnica]);

  const cargarTecnicas = async () => {
    try {
      let query = supabase
        .from('tecnicas')
        .select('*', { count: 'exact' });

      if (buscarTecnica.trim()) {
        query = query.ilike('nombre', `%${buscarTecnica}%`);
      }

      const desde = (paginaActual - 1) * registrosPorPagina;
      const hasta = desde + registrosPorPagina - 1;

      const { data, error, count } = await query
        .range(desde, hasta)
        .order('id', { ascending: true });

      if (error) throw error;

      setTotalTecnicas(count || 0);
      setTecnicas(data || []);
    } catch (error) {
      console.error('Error al cargar tecnicas:', error);
    }
  };

  const handleAgregarTecnica = () => {
        setModalOpen(true);
        setModoEdicion(false);
        setTecnicasEditando(null);
      };
    
  const handleGuardarTecnica = async (nombre) => {
      try {
        if (modoEdicion && tecnicasEditando) {
          const { error } = await supabase
            .from('tecnicas')
            .update({ nombre: nombre })
            .eq('id', tecnicasEditando.id);
  
          if (error) throw error;
  
          alert('Tecnica actualizada correctamente');
        } else {
          const { error } = await supabase
            .from('tecnicas')
            .insert([{ nombre: nombre }]);
  
          if (error) throw error;
  
          alert('Tecnica agregada correctamente');
        }
  
        cargarTecnicas();
        setModalOpen(false);
        setModoEdicion(false);
        setTecnicasEditando(null);
      } catch (error) {
        console.error('Error al guardar tecnica:', error);
        alert('Error al guardar tecnica');
      }
    };

  const handleEditarTecnica = async (id) => {
      try {
        const { data, error } = await supabase
          .from('tecnicas')
          .select('*')
          .eq('id', id)
          .single();
  
        if (error) throw error;
  
        setModoEdicion(true);
        setTecnicasEditando(data);
        setModalOpen(true);
      } catch (error) {
        console.error('Error al cargar tecnica para editar:', error);
        alert('Error al cargar tecnica');
      }
    };

  const paginaSiguiente = () => {
    if (paginaActual * registrosPorPagina < totalTecnicas) {
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

  const tecnicaInicio = (paginaActual - 1) * registrosPorPagina + 1;
  const tecnicaFin = Math.min(paginaActual * registrosPorPagina, totalTecnicas);
  const totalPaginas = Math.ceil(totalTecnicas / registrosPorPagina);

  return (
    <Layout>
      <div className="admin-tecnicas-wrapper">
        <Header />

        <div className="admin-tecnicas-header">
          <h1 className="admin-tecnicas-title">Administrar Tecnicas</h1>
        </div>

        <div className="admin-tecnicas-content">
          <div className="controles-superiores-tecnicas">
            <button className="btn-agregar-tecnica" onClick={handleAgregarTecnica}>
              Agregar Tecnica
            </button>
          </div>

          <div className="controles-tabla-tecnicas">
            <div className="mostrar-registros-tecnicas">
              <span>Mostrar</span>
              <select
                value={registrosPorPagina}
                onChange={(e) => {
                  setRegistrosPorPagina(parseInt(e.target.value));
                  setPaginaActual(1);
                }}
                className="select-registros-tecnicas"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span>registros</span>
            </div>

            <div className="buscar-tecnicas-grupo">
              <span>Buscar:</span>
              <input
                type="text"
                value={buscarTecnica}
                onChange={(e) => {
                  setBuscarTecnica(e.target.value);
                  setPaginaActual(1);
                }}
                className="input-buscar-tecnicas"
              />
            </div>
          </div>

          <Tabla
            headers={['Tecnica']}
            datos={tecnicas.map(t => ({ id: t.id, tecnica: t.nombre }))}
            paginaInicio={tecnicaInicio}
            onEditar={handleEditarTecnica}
            textoVacio="No hay tecnicas para mostrar"
          />

          <div className="paginacion-tecnicas">
            <div className="contador-tecnicas">
              Mostrando registros del {tecnicaInicio} al {tecnicaFin} de un total de {totalTecnicas}
            </div>

            <div className="botones-paginacion-tecnicas">
              <button 
                className="btn-pag-tecnicas"
                onClick={paginaAnterior}
                disabled={paginaActual === 1}
              >
                Anterior
              </button>
              
              {[...Array(totalPaginas)].map((_, i) => (
                <button
                  key={i + 1}
                  className={`btn-pag-numero-tecnicas ${paginaActual === i + 1 ? 'activo' : ''}`}
                  onClick={() => irAPagina(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              
              <button 
                className="btn-pag-tecnicas"
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
          onClose={() => {
            setModalOpen(false);
            setModoEdicion(false);
            setTecnicasEditando(null);
          }}
          onGuardar={handleGuardarTecnica}
          titulo={modoEdicion ? "Editar" : "Agregar Tecnica"}
          placeholder={modoEdicion ? "Editar Tecnica" : "Ingresar Tecnica"}
          icono="⚙️"
          valorInicial={modoEdicion ? tecnicasEditando?.nombre : ""}
          modoEdicion={modoEdicion}
        />
      </div>
    </Layout>
  );
};

export default AdministrarTecnicas;