import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase-client';
import { useAuth } from '../../../context/auth-context';
import Layout from '../../../components/layout';
import Header from '../../../components/header-laboratorio.jsx';
import Tabla from '../componentes/tabla';
import ModalAgregar from '../componentes/modal-agregar';
import './administrar-recipientes.css';

const AdministrarRecipientes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [buscarRecipiente, setBuscarRecipiente] = useState('');
  const [recipientes, setRecipientes] = useState([]);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(10);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalRecipientes, setTotalRecipientes] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    cargarRecipientes();
  }, [paginaActual, registrosPorPagina, buscarRecipiente]);

  const cargarRecipientes = async () => {
    try {
      let query = supabase
        .from('recipientes')
        .select('*', { count: 'exact' });

      if (buscarRecipiente.trim()) {
        query = query.ilike('nombre', `%${buscarRecipiente}%`);
      }

      const desde = (paginaActual - 1) * registrosPorPagina;
      const hasta = desde + registrosPorPagina - 1;

      const { data, error, count } = await query
        .range(desde, hasta)
        .order('id', { ascending: true });

      if (error) throw error;

      setTotalRecipientes(count || 0);
      setRecipientes(data || []);
    } catch (error) {
      console.error('Error al cargar recipientes:', error);
    }
  };

  const handleAgregarRecipiente = () => {
      setModalOpen(true);
    };
  
    const handleGuardarRecipiente = async (nombre) => {
      try {
        const { data, error } = await supabase
          .from('recipientes')
          .insert([{ nombre: nombre }]);
  
        if (error) throw error;
  
        cargarRecipientes();
      } catch (error) {
        console.error('Error al guardar recipiente:', error);
        alert('Error al guardar el recipiente');
      }
    };

  const handleEditarRecipiente = (id) => {
    navigate(`/configuracion/recipientes/editar/${id}`);
  };

  const paginaSiguiente = () => {
    if (paginaActual * registrosPorPagina < totalRecipientes) {
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

  const recipienteInicio = (paginaActual - 1) * registrosPorPagina + 1;
  const recipienteFin = Math.min(paginaActual * registrosPorPagina, totalRecipientes);
  const totalPaginas = Math.ceil(totalRecipientes / registrosPorPagina);

  return (
    <Layout>
      <div className="admin-recipientes-wrapper">
        <Header />

        <div className="admin-recipientes-header">
          <h1 className="admin-recipientes-title">Administrar Recipientes</h1>
        </div>

        <div className="admin-recipientes-content">
          <div className="controles-superiores-recipientes">
            <button className="btn-agregar-recipiente" onClick={handleAgregarRecipiente}>
              Agregar Recipiente
            </button>
          </div>

          <div className="controles-tabla-recipientes">
            <div className="mostrar-registros-recipientes">
              <span>Mostrar</span>
              <select
                value={registrosPorPagina}
                onChange={(e) => {
                  setRegistrosPorPagina(parseInt(e.target.value));
                  setPaginaActual(1);
                }}
                className="select-registros-recipientes"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span>registros</span>
            </div>

            <div className="buscar-recipientes-grupo">
              <span>Buscar:</span>
              <input
                type="text"
                value={buscarRecipiente}
                onChange={(e) => {
                  setBuscarRecipiente(e.target.value);
                  setPaginaActual(1);
                }}
                className="input-buscar-recipientes"
              />
            </div>
          </div>

          <Tabla
            headers={['Recipiente']}
            datos={recipientes.map(r => ({ id: r.id, recipiente: r.nombre }))}
            paginaInicio={recipienteInicio}
            onEditar={handleEditarRecipiente}
            textoVacio="No hay recipientes para mostrar"
          />

          <div className="paginacion-recipientes">
            <div className="contador-recipientes">
              Mostrando registros del {recipienteInicio} al {recipienteFin} de un total de {totalRecipientes}
            </div>

            <div className="botones-paginacion-recipientes">
              <button 
                className="btn-pag-recipientes"
                onClick={paginaAnterior}
                disabled={paginaActual === 1}
              >
                Anterior
              </button>
              
              {[...Array(totalPaginas)].map((_, i) => (
                <button
                  key={i + 1}
                  className={`btn-pag-numero-recipientes ${paginaActual === i + 1 ? 'activo' : ''}`}
                  onClick={() => irAPagina(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              
              <button 
                className="btn-pag-recipientes"
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
          onGuardar={handleGuardarRecipiente}
          titulo="Agregar Recipiente"
          placeholder="Ingresar Recipiente"
          icono="⚙️"
        />
      </div>
    </Layout>
  );
};

export default AdministrarRecipientes;