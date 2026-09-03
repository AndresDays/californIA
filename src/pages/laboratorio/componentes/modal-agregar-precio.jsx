import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase-client';
import { consultarClientesSeleccionables } from '../../../utils/clientes-seleccionables';
import './modal-agregar-precio.css';

const ModalAgregarPrecio = ({ isOpen, onClose, onSave, precioEditar = null }) => {
  const [buscarEstudio, setBuscarEstudio] = useState('');
  const [estudioSeleccionado, setEstudioSeleccionado] = useState(null);
  const [estudiosEncontrados, setEstudiosEncontrados] = useState([]);
  const [showBusqueda, setShowBusqueda] = useState(false);
  
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState('');
  const [empresas, setEmpresas] = useState([]);
  const [precio, setPrecio] = useState('');

  const isEditMode = !!precioEditar;

  useEffect(() => {
    if (isOpen) {
      cargarEmpresas();
      
      if (precioEditar) {
        setBuscarEstudio(precioEditar.descripcion || '');
        setEstudioSeleccionado({
          clave: precioEditar.clave,
          descripcion: precioEditar.descripcion
        });
        setEmpresaSeleccionada(precioEditar.cliente || '');
        setPrecio(precioEditar.precio?.toString() || '');
      } else {
        limpiarCampos();
      }
    }
  }, [isOpen, precioEditar]);

  const cargarEmpresas = async () => {
    try {
      // Un precio nuevo se pacta con un convenio vigente, no con uno de baja.
      const { data, error } = await consultarClientesSeleccionables();

      if (error) throw error;

      setEmpresas(data || []);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
    }
  };

  const buscarEstudios = async (termino) => {
    if (termino.length < 2) {
      setEstudiosEncontrados([]);
      setShowBusqueda(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('estudios_lab_catalogo')
        .select('id, clave, descripcion, area')
        .or(`clave.ilike.%${termino}%,descripcion.ilike.%${termino}%`)
        .order('clave')
        .limit(10);

      if (error) throw error;

      setEstudiosEncontrados(data || []);
      setShowBusqueda(data && data.length > 0);
    } catch (error) {
      console.error('Error al buscar estudios:', error);
      setEstudiosEncontrados([]);
      setShowBusqueda(false);
    }
  };

  const seleccionarEstudio = (estudio) => {
    setEstudioSeleccionado(estudio);
    setBuscarEstudio(`${estudio.clave} - ${estudio.descripcion}`);
    setShowBusqueda(false);
  };

  const limpiarCampos = () => {
    setBuscarEstudio('');
    setEstudioSeleccionado(null);
    setEstudiosEncontrados([]);
    setShowBusqueda(false);
    setEmpresaSeleccionada('');
    setPrecio('');
  };

  const handleGuardar = async () => {
    if (!estudioSeleccionado) {
      globalThis.mostrarNotificacion('Por favor selecciona un estudio', 'advertencia');
      return;
    }

    if (!empresaSeleccionada) {
      globalThis.mostrarNotificacion('Por favor selecciona una empresa', 'advertencia');
      return;
    }

    if (!precio || parseFloat(precio) <= 0) {
      globalThis.mostrarNotificacion('Por favor ingresa un precio válido', 'advertencia');
      return;
    }

    const precioData = {
      tipo: 'Estudio',
      clave: estudioSeleccionado.clave,
      descripcion: estudioSeleccionado.descripcion,
      cliente: empresaSeleccionada,
      precio: parseFloat(precio),
      fecha: new Date().toISOString()
    };

    if (isEditMode && precioEditar.id) {
      precioData.id = precioEditar.id;
    }

    try {
      await onSave(precioData, isEditMode);
      onClose();
    } catch (error) {
      console.error('Error al guardar precio:', error);
      globalThis.mostrarNotificacion('Error al guardar el precio', 'error');
    }
  };

  const handleCerrar = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay-precio" onClick={handleCerrar}>
      <div className="modal-container-precio" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-precio">
          <h2 className="modal-titulo-precio">
            {isEditMode ? 'Editar Precio' : 'Agregar Precio'}
          </h2>
          <button className="modal-btn-cerrar-precio" onClick={handleCerrar}>
            ✕
          </button>
        </div>

        <div className="modal-body-precio">
          <div className="form-group-precio">
            <label>Buscar Estudio</label>
            <div className="search-container-precio">
              <input
                type="text"
                value={buscarEstudio}
                onChange={(e) => {
                  setBuscarEstudio(e.target.value);
                  if (!isEditMode) {
                    buscarEstudios(e.target.value);
                  }
                }}
                placeholder="Buscar Estudio..."
                className="input-buscar-estudio"
                disabled={isEditMode}
              />
              <button className="btn-search-precio">🔍</button>

              {showBusqueda && estudiosEncontrados.length > 0 && (
                <div className="search-results-precio">
                  {estudiosEncontrados.map(estudio => (
                    <div
                      key={estudio.id}
                      className="search-result-item-precio"
                      onClick={() => seleccionarEstudio(estudio)}
                    >
                      <strong>{estudio.clave}</strong> - {estudio.descripcion}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-row-precio">
            <div className="form-group-precio">
              <label>🏢 Selecciona una Empresa</label>
              <select
                value={empresaSeleccionada}
                onChange={(e) => setEmpresaSeleccionada(e.target.value)}
                className="select-empresa-precio"
              >
                <option value="">Selecciona una Empresa</option>
                {empresas.map(empresa => (
                  <option key={empresa.id_empresa} value={empresa.nombre}>
                    {empresa.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group-precio">
              <label>$ Precio</label>
              <input
                type="number"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="Precio"
                className="input-precio"
                step="0.01"
                min="0"
              />
            </div>
          </div>
        </div>

        <div className="modal-footer-precio">
          <button className="btn-salir-precio" onClick={handleCerrar}>
            Salir
          </button>
          <button className="btn-guardar-precio" onClick={handleGuardar}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalAgregarPrecio;
