import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase-client';
import { useAuth } from '../../../context/auth-context';
import Layout from '../../../components/layout.jsx';
import Header from '../../../components/header-laboratorio.jsx';
import ModalAnalito from '../componentes/modal-analito';
import './Analitos.css';

const Analitos = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [buscarEstudio, setBuscarEstudio] = useState('');
  const [buscarAnalito, setBuscarAnalito] = useState('');
  const [analitos, setAnalitos] = useState([]);
  const [totalAnalitos, setTotalAnalitos] = useState(0);
  const [estudioSeleccionado, setEstudioSeleccionado] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [analitoEditando, setAnalitoEditando] = useState(null);

  useEffect(() => {
    cargarAnalitos();
  }, [buscarAnalito]);

  const cargarAnalitos = async () => {
    try {
      let query = supabase
        .from('analitos')
        .select('*', { count: 'exact' });

      if (buscarAnalito.trim()) {
        query = query.or(
          `clave.ilike.%${buscarAnalito}%,` +
          `descripcion.ilike.%${buscarAnalito}%`
        );
      }

      const { data, error, count } = await query.order('id', { ascending: true });

      if (error) throw error;

      setTotalAnalitos(count || 0);
      setAnalitos(data || []);
    } catch (error) {
      console.error('Error al cargar analitos:', error);
    }
  };

  const handleVistaPrevia = () => {
    alert('Vista previa del estudio');
  };

  const handleGuardar = async () => {
    if (!estudioSeleccionado) {
      alert('Por favor, busca y selecciona un estudio primero');
      return;
    }

    alert('Analitos guardados para el estudio');
  };

  const handleNuevo = () => {
    setBuscarEstudio('');
    setEstudioSeleccionado(null);
  };

  const handleCrearAnalitos = () => {
    setModoEdicion(false);
    setAnalitoEditando(null);
    setModalOpen(true);
  };

  const handleEditarAnalito = async (id) => {
    try {
      const { data, error } = await supabase
        .from('analitos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setModoEdicion(true);
      setAnalitoEditando(data);
      setModalOpen(true);
    } catch (error) {
      console.error('Error al cargar analito para editar:', error);
      alert('Error al cargar el analito');
    }
  };

  const handleGuardarAnalito = async (analitoData) => {
    try {
      if (modoEdicion && analitoEditando) {
        const { error } = await supabase
          .from('analitos')
          .update(analitoData)
          .eq('id', analitoEditando.id);

        if (error) throw error;

        alert('Analito actualizado correctamente');
      } else {
        const { error } = await supabase
          .from('analitos')
          .insert([analitoData]);

        if (error) throw error;

        alert('Analito creado correctamente');
      }

      cargarAnalitos();
      setModalOpen(false);
      setModoEdicion(false);
      setAnalitoEditando(null);
    } catch (error) {
      console.error('Error al guardar analito:', error);
      alert('Error al guardar el analito');
    }
  };

  const handleEliminarAnalito = async (id) => {
    if (window.confirm('¿Está seguro de eliminar este analito?')) {
      try {
        const { error } = await supabase
          .from('analitos')
          .delete()
          .eq('id', id);

        if (error) throw error;

        alert('Analito eliminado correctamente');
        cargarAnalitos();
      } catch (error) {
        console.error('Error al eliminar analito:', error);
        alert('Error al eliminar analito');
      }
    }
  };

  return (
    <Layout>
      <div className="agregar-analitos-wrapper">
        <Header />

        <div className="agregar-analitos-header">
          <h1 className="agregar-analitos-title">Agregar Analitos a un Estudio</h1>
        </div>

        <div className="agregar-analitos-content">
          <div className="panel-buscar-estudio">
            <div className="buscar-estudio-grupo">
              <span className="icon-buscar">🔍</span>
              <input
                type="text"
                placeholder="Buscar Estudio..."
                value={buscarEstudio}
                onChange={(e) => setBuscarEstudio(e.target.value)}
                className="input-buscar-estudio-analito"
              />
            </div>

            <button className="btn-vista-previa" onClick={handleVistaPrevia}>
              Vista Previa
            </button>

            <div className="botones-accion-analitos">
              <button className="btn-guardar-analitos" onClick={handleGuardar}>
                Guardar
              </button>
              <button className="btn-nuevo-analitos" onClick={handleNuevo}>
                Nuevo
              </button>
            </div>
          </div>

          <div className="panel-tabla-analitos">
            <div className="buscar-analitos-grupo">
              <input
                type="text"
                placeholder="Busca Analitos Aqui..."
                value={buscarAnalito}
                onChange={(e) => setBuscarAnalito(e.target.value)}
                className="input-buscar-analitos"
              />
            </div>

            <div className="tabla-analitos-container">
              <table className="tabla-analitos">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Clave ⬍</th>
                    <th>Descripcion ⬍</th>
                    <th>Acciones ⬍</th>
                  </tr>
                </thead>
                <tbody>
                  {analitos.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="sin-analitos">
                        No hay analitos para mostrar
                      </td>
                    </tr>
                  ) : (
                    analitos.map((analito, index) => (
                      <tr key={analito.id}>
                        <td>{index + 1}</td>
                        <td>{analito.clave}</td>
                        <td>{analito.descripcion}</td>
                        <td>
                          <div className="acciones-analitos">
                            <button
                              className="btn-editar-analito"
                              onClick={() => handleEditarAnalito(analito.id)}
                              title="Editar analito"
                            >
                              ✏️
                            </button>
                            <button
                              className="btn-eliminar-analito"
                              onClick={() => handleEliminarAnalito(analito.id)}
                              title="Eliminar analito"
                            >
                              ✖
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="contador-analitos">
              Mostrando registros del 1 al {analitos.length} de un total de {totalAnalitos}
            </div>

            <button className="btn-crear-analitos" onClick={handleCrearAnalitos}>
              Crear Analitos
            </button>
          </div>
        </div>

        <ModalAnalito
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setModoEdicion(false);
            setAnalitoEditando(null);
          }}
          onGuardar={handleGuardarAnalito}
          analitoInicial={modoEdicion ? analitoEditando : null}
          modoEdicion={modoEdicion}
        />
      </div>
    </Layout>
  );
};

export default Analitos;