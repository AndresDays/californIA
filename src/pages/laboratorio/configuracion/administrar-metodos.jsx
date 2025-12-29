import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase-client';
import { useAuth } from '../../../context/auth-context';
import Layout from '../../../components/layout';
import Header from '../../../components/header-laboratorio.jsx';
import Tabla from '../componentes/tabla';
import ModalAgregar from '../componentes/modal-agregar';
import './administrar-metodos.css';

const AdministrarMetodos = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [buscarMetodo, setBuscarMetodo] = useState('');
  const [metodos, setMetodos] = useState([]);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(10);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalMetodos, setTotalMetodos] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [metodosEditando, setMetodosEditando] = useState(null);

  useEffect(() => {
    cargarMetodos();
  }, [paginaActual, registrosPorPagina, buscarMetodo]);

  const cargarMetodos = async () => {
    try {
      let query = supabase
        .from('metodos')
        .select('*', { count: 'exact' });

      if (buscarMetodo.trim()) {
        query = query.ilike('nombre', `%${buscarMetodo}%`);
      }

      const desde = (paginaActual - 1) * registrosPorPagina;
      const hasta = desde + registrosPorPagina - 1;

      const { data, error, count } = await query
        .range(desde, hasta)
        .order('id', { ascending: true });

      if (error) throw error;

      setTotalMetodos(count || 0);
      setMetodos(data || []);
    } catch (error) {
      console.error('Error al cargar metodos:', error);
    }
  };

  const handleAgregarMetodo = () => {
    setModalOpen(true);
    setModoEdicion(false);
    setMetodosEditando(null);
  };

  const handleGuardarMetodo = async (nombre) => {
      try {
        if (modoEdicion && metodosEditando) {
          const { error } = await supabase
            .from('metodos')
            .update({ nombre: nombre })
            .eq('id', metodosEditando.id);
  
          if (error) throw error;
  
          alert('Metodo actualizado correctamente');
        } else {
          const { error } = await supabase
            .from('metodos')
            .insert([{ nombre: nombre }]);
  
          if (error) throw error;
  
          alert('Metodo agregado correctamente');
        }
  
        cargarMetodos();
        setModalOpen(false);
        setModoEdicion(false);
        setMetodosEditando(null);
      } catch (error) {
        console.error('Error al guardar metodo:', error);
        alert('Error al guardar metodo');
      }
    };

  const handleEditarMetodo = async (id) => {
    try {
      const { data, error } = await supabase
        .from('metodos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setModoEdicion(true);
      setMetodosEditando(data);
      setModalOpen(true);
    } catch (error) {
      console.error('Error al cargar metodo para editar:', error);
      alert('Error al cargar metodo');
    }
  };

  const paginaSiguiente = () => {
    if (paginaActual * registrosPorPagina < totalMetodos) {
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

  const metodoInicio = (paginaActual - 1) * registrosPorPagina + 1;
  const metodoFin = Math.min(paginaActual * registrosPorPagina, totalMetodos);
  const totalPaginas = Math.ceil(totalMetodos / registrosPorPagina);

  return (
    <Layout>
      <div className="admin-metodos-wrapper">
        <Header />

        <div className="admin-metodos-header">
          <h1 className="admin-metodos-title">Administrar Metodos</h1>
        </div>

        <div className="admin-metodos-content">
          <div className="controles-superiores-metodos">
            <button className="btn-agregar-metodo" onClick={handleAgregarMetodo}>
              Agregar Metodo
            </button>
          </div>

          <div className="controles-tabla-metodos">
            <div className="mostrar-registros-metodos">
              <span>Mostrar</span>
              <select
                value={registrosPorPagina}
                onChange={(e) => {
                  setRegistrosPorPagina(parseInt(e.target.value));
                  setPaginaActual(1);
                }}
                className="select-registros-metodos"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span>registros</span>
            </div>

            <div className="buscar-metodos-grupo">
              <span>Buscar:</span>
              <input
                type="text"
                value={buscarMetodo}
                onChange={(e) => {
                  setBuscarMetodo(e.target.value);
                  setPaginaActual(1);
                }}
                className="input-buscar-metodos"
              />
            </div>
          </div>

          <Tabla
            headers={['Metodo']}
            datos={metodos.map(m => ({ id: m.id, metodo: m.nombre }))}
            paginaInicio={metodoInicio}
            onEditar={handleEditarMetodo}
            textoVacio="No hay metodos para mostrar"
          />

          <div className="paginacion-metodos">
            <div className="contador-metodos">
              Mostrando registros del {metodoInicio} al {metodoFin} de un total de {totalMetodos}
            </div>

            <div className="botones-paginacion-metodos">
              <button 
                className="btn-pag-metodos"
                onClick={paginaAnterior}
                disabled={paginaActual === 1}
              >
                Anterior
              </button>
              
              {[...Array(totalPaginas)].map((_, i) => (
                <button
                  key={i + 1}
                  className={`btn-pag-numero-metodos ${paginaActual === i + 1 ? 'activo' : ''}`}
                  onClick={() => irAPagina(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              
              <button 
                className="btn-pag-metodos"
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
            setMetodosEditando(null);
          }}
          onGuardar={handleGuardarMetodo}
          titulo={modoEdicion ? "Editar" : "Agregar Metodo"}
          placeholder={modoEdicion ? "Editar Metodo" : "Ingresar Metodo"}
          icono="⚙️"
          valorInicial={modoEdicion ? metodosEditando?.nombre : ""}
          modoEdicion={modoEdicion}
        />
      </div>
    </Layout>
  );
};

export default AdministrarMetodos;