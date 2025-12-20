import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase-client';
import { useAuth } from '../../../context/auth-context';
import Layout from '../../../components/layout';
import Header from '../../../components/header-laboratorio.jsx';
import './Paquetes.css';

const Paquetes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [buscarPaquete, setBuscarPaquete] = useState('');
  const [paquetes, setPaquetes] = useState([]);
  const [totalPaquetes, setTotalPaquetes] = useState(0);

  // Campos del formulario
  const [clavePerfil, setClavePerfil] = useState('');
  const [descripcionPerfil, setDescripcionPerfil] = useState('');
  const [condicionesPaciente, setCondicionesPaciente] = useState('');
  const [diasProceso, setDiasProceso] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const [modoEdicion, setModoEdicion] = useState(false);
  const [paqueteSeleccionado, setPaqueteSeleccionado] = useState(null);

  useEffect(() => {
    cargarPaquetes();
  }, [buscarPaquete]);

  const cargarPaquetes = async () => {
    try {
      let query = supabase
        .from('paquetes')
        .select('*', { count: 'exact' });

      if (buscarPaquete.trim()) {
        query = query.or(
          `clave.ilike.%${buscarPaquete}%,` +
          `descripcion.ilike.%${buscarPaquete}%,` +
          `condiciones.ilike.%${buscarPaquete}%`
        );
      }

      const { data, error, count } = await query.order('id', { ascending: true });

      if (error) throw error;

      setTotalPaquetes(count || 0);
      setPaquetes(data || []);
    } catch (error) {
      console.error('Error al cargar paquetes:', error);
    }
  };

  const limpiarFormulario = () => {
    setClavePerfil('');
    setDescripcionPerfil('');
    setCondicionesPaciente('');
    setDiasProceso('');
    setBusqueda('');
    setModoEdicion(false);
    setPaqueteSeleccionado(null);
  };

  const handleGuardar = async () => {
    try {
      const paqueteData = {
        clave: clavePerfil,
        descripcion: descripcionPerfil,
        condiciones: condicionesPaciente,
        dias_proceso: parseInt(diasProceso) || 0
      };

      const { error } = await supabase
        .from('paquetes')
        .insert([paqueteData]);

      if (error) throw error;

      alert('Paquete guardado correctamente');
      limpiarFormulario();
      cargarPaquetes();
    } catch (error) {
      console.error('Error al guardar paquete:', error);
      alert('Error al guardar paquete');
    }
  };

  const handleNuevo = () => {
    limpiarFormulario();
  };

  const handleCargarCambios = async () => {
    if (!paqueteSeleccionado) {
      alert('Por favor, selecciona un paquete para actualizar');
      return;
    }

    try {
      const paqueteData = {
        clave: clavePerfil,
        descripcion: descripcionPerfil,
        condiciones: condicionesPaciente,
        dias_proceso: parseInt(diasProceso) || 0
      };

      const { error } = await supabase
        .from('paquetes')
        .update(paqueteData)
        .eq('id', paqueteSeleccionado);

      if (error) throw error;

      alert('Paquete actualizado correctamente');
      limpiarFormulario();
      cargarPaquetes();
    } catch (error) {
      console.error('Error al actualizar paquete:', error);
      alert('Error al actualizar paquete');
    }
  };

  const cargarPaqueteParaEditar = (paquete) => {
    setClavePerfil(paquete.clave || '');
    setDescripcionPerfil(paquete.descripcion || '');
    setCondicionesPaciente(paquete.condiciones || '');
    setDiasProceso(paquete.dias_proceso?.toString() || '');
    setModoEdicion(true);
    setPaqueteSeleccionado(paquete.id);
  };

  return (
    <Layout>
      <div className="agregar-paquetes-wrapper">
        <Header />

        <div className="agregar-paquetes-header">
          <h1 className="agregar-paquetes-title">Agregar Paquetes</h1>
        </div>

        <div className="agregar-paquetes-content">
          {/* Panel Izquierdo - Formulario */}
          <div className="panel-formulario-paquetes">
            <div className="campo-paquete-icon">
              <span className="icon-campo">🔍</span>
              <input
                type="text"
                placeholder="Clave del Perfil"
                value={clavePerfil}
                onChange={(e) => setClavePerfil(e.target.value)}
                className="input-paquete-icon"
              />
            </div>

            <div className="campo-paquete-icon">
              <span className="icon-campo">▦</span>
              <input
                type="text"
                placeholder="Descripcion del Perfil"
                value={descripcionPerfil}
                onChange={(e) => setDescripcionPerfil(e.target.value)}
                className="input-paquete-icon"
              />
            </div>

            <div className="campo-paquete-icon">
              <span className="icon-campo">👤</span>
              <input
                type="text"
                placeholder="Condiciones del Paciente"
                value={condicionesPaciente}
                onChange={(e) => setCondicionesPaciente(e.target.value)}
                className="input-paquete-icon"
              />
            </div>

            <div className="campo-paquete-icon">
              <span className="icon-campo">📅</span>
              <input
                type="number"
                placeholder="Dias de Proceso"
                value={diasProceso}
                onChange={(e) => setDiasProceso(e.target.value)}
                className="input-paquete-icon"
              />
            </div>

            <div className="campo-busqueda-paquete">
              <input
                type="text"
                placeholder="Search..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="input-busqueda-paquete"
              />
              <button className="btn-buscar-paquete">
                🔍
              </button>
            </div>

            <div className="botones-formulario-paquetes">
              <button className="btn-guardar-paquete" onClick={handleGuardar}>
                Guardar
              </button>
              <button className="btn-nuevo-paquete" onClick={handleNuevo}>
                Nuevo
              </button>
              <button className="btn-cargar-cambios" onClick={handleCargarCambios}>
                Cargar Cambios
              </button>
            </div>
          </div>

          {/* Panel Derecho - Tabla */}
          <div className="panel-tabla-paquetes">
            <div className="buscar-paquetes-header">
              <span className="label-buscar-paquete">Buscar:</span>
              <input
                type="text"
                value={buscarPaquete}
                onChange={(e) => setBuscarPaquete(e.target.value)}
                className="input-buscar-paquetes"
              />
            </div>

            <div className="tabla-paquetes-container">
              <table className="tabla-paquetes">
                <thead>
                  <tr>
                    <th>Clave ⬍</th>
                    <th>Descripcion ⬍</th>
                    <th>Condiciones ⬍</th>
                    <th>Acciones ⬍</th>
                  </tr>
                </thead>
                <tbody>
                  {paquetes.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="sin-paquetes">
                        No hay paquetes para mostrar
                      </td>
                    </tr>
                  ) : (
                    paquetes.map((paquete) => (
                      <tr key={paquete.id}>
                        <td>{paquete.clave}</td>
                        <td>{paquete.descripcion}</td>
                        <td>{paquete.condiciones}</td>
                        <td>
                          <button
                            className="btn-editar-paquete"
                            onClick={() => cargarPaqueteParaEditar(paquete)}
                            title="Editar paquete"
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

            <div className="contador-paquetes">
              Mostrando registros del 1 al {paquetes.length} de un total de {totalPaquetes}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Paquetes;