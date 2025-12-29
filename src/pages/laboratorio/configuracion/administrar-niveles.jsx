import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase-client';
import { useAuth } from '../../../context/auth-context';
import Layout from '../../../components/layout';
import Header from '../../../components/header-laboratorio.jsx';
import Tabla from '../componentes/tabla';
import ModalAgregar from '../componentes/modal-agregar';
import './administrar-niveles.css';

const AdministrarNiveles = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [buscarNivel, setBuscarNivel] = useState('');
  const [niveles, setNiveles] = useState([]);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(10);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalNiveles, setTotalNiveles] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [nivelEditando, setNivelEditando] = useState(null);

  useEffect(() => {
    cargarNiveles();
  }, [paginaActual, registrosPorPagina, buscarNivel]);

  const cargarNiveles = async () => {
    try {
      let query = supabase
        .from('niveles_mar')
        .select('*', { count: 'exact' });

      if (buscarNivel.trim()) {
        query = query.ilike('nombre', `%${buscarNivel}%`);
      }

      const desde = (paginaActual - 1) * registrosPorPagina;
      const hasta = desde + registrosPorPagina - 1;

      const { data, error, count } = await query
        .range(desde, hasta)
        .order('id', { ascending: true });

      if (error) throw error;

      setTotalNiveles(count || 0);
      setNiveles(data || []);
    } catch (error) {
      console.error('Error al cargar niveles:', error);
    }
  };

  const handleAgregarNivel = () => {
    setModoEdicion(false);
    setNivelEditando(null);
    setModalOpen(true);
  };

  const handleGuardarNivel = async (nombre) => {
      try {
        if (modoEdicion && nivelEditando) {
          const { error } = await supabase
            .from('niveles_mar')
            .update({ nombre: nombre })
            .eq('id', nivelEditando.id);
  
          if (error) throw error;
  
          alert('Nivel actualizado correctamente');
        } else {
          // Crear nuevo recipiente
          const { error } = await supabase
            .from('niveles_mar')
            .insert([{ nombre: nombre }]);
  
          if (error) throw error;
  
          alert('Nivel agregado correctamente');
        }
  
        cargarNiveles();
        setModalOpen(false);
        setModoEdicion(false);
        setNivelEditando(null);
      } catch (error) {
        console.error('Error al guardar nivel:', error);
        alert('Error al guardar el nivel');
      }
    };

  const handleEditarNivel = async (id) => {
    try {
          const { data, error } = await supabase
            .from('niveles_mar')
            .select('*')
            .eq('id', id)
            .single();
    
          if (error) throw error;
    
          setModoEdicion(true);
          setNivelEditando(data);
          setModalOpen(true);
        } catch (error) {
          console.error('Error al cargar nivel para editar:', error);
          alert('Error al cargar el nivel');
        }
  };

  const paginaSiguiente = () => {
    if (paginaActual * registrosPorPagina < totalNiveles) {
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

  const nivelInicio = (paginaActual - 1) * registrosPorPagina + 1;
  const nivelFin = Math.min(paginaActual * registrosPorPagina, totalNiveles);
  const totalPaginas = Math.ceil(totalNiveles / registrosPorPagina);

  return (
    <Layout>
      <div className="admin-niveles-wrapper">
        <Header />

        <div className="admin-niveles-header">
          <h1 className="admin-niveles-title">Administrar Niveles</h1>
        </div>

        <div className="admin-niveles-content">
          <div className="controles-superiores-niveles">
            <button className="btn-agregar-nivel" onClick={handleAgregarNivel}>
              Agregar Nivel
            </button>
          </div>

          <div className="controles-tabla-niveles">
            <div className="mostrar-registros-niveles">
              <span>Mostrar</span>
              <select
                value={registrosPorPagina}
                onChange={(e) => {
                  setRegistrosPorPagina(parseInt(e.target.value));
                  setPaginaActual(1);
                }}
                className="select-registros-niveles"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span>registros</span>
            </div>

            <div className="buscar-niveles-grupo">
              <span>Buscar:</span>
              <input
                type="text"
                value={buscarNivel}
                onChange={(e) => {
                  setBuscarNivel(e.target.value);
                  setPaginaActual(1);
                }}
                className="input-buscar-niveles"
              />
            </div>
          </div>

          <Tabla
            headers={['Nivel']}
            datos={niveles.map(n => ({ id: n.id, nivel: n.nombre }))}
            paginaInicio={nivelInicio}
            onEditar={handleEditarNivel}
            textoVacio="No hay niveles para mostrar"
          />

          <div className="paginacion-niveles">
            <div className="contador-niveles">
              Mostrando registros del {nivelInicio} al {nivelFin} de un total de {totalNiveles}
            </div>

            <div className="botones-paginacion-niveles">
              <button 
                className="btn-pag-niveles"
                onClick={paginaAnterior}
                disabled={paginaActual === 1}
              >
                Anterior
              </button>
              
              {[...Array(totalPaginas)].map((_, i) => (
                <button
                  key={i + 1}
                  className={`btn-pag-numero-niveles ${paginaActual === i + 1 ? 'activo' : ''}`}
                  onClick={() => irAPagina(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              
              <button 
                className="btn-pag-niveles"
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
            setNivelEditando(null);
          }}
          onGuardar={handleGuardarNivel}
          titulo={modoEdicion ? "Editar" : "Agregar Nivel"}
          placeholder={modoEdicion ? "Editar Nivel" : "Ingresar Nivel"}
          icono="⚙️"
          valorInicial={modoEdicion ? nivelEditando?.nombre : ""}
          modoEdicion={modoEdicion}
        />
      </div>
    </Layout>
  );
};

export default AdministrarNiveles;