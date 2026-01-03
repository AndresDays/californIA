import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase-client';
import './nueva-cita-modal.css';
import editarIcono from '../assets/editarIcono.png';

const EditarCitaModal = ({ isOpen, onClose, cita, onCitaActualizada }) => {
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    telefono: '',
    fecha: '',
    hora: '',
    estado: 'pendiente'
  });
  
  const [empresas, setEmpresas] = useState([]);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState('');
  const [buscarEstudio, setBuscarEstudio] = useState('');
  const [estudios, setEstudios] = useState([]);
  const [estudiosSeleccionados, setEstudiosSeleccionados] = useState([]);
  const [showBusquedaEstudios, setShowBusquedaEstudios] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && cita) {
      const fechaHoraStr = cita.fecha_estudio;
      const [fecha, horaCompleta] = fechaHoraStr.split('T');
      const hora = horaCompleta ? horaCompleta.substring(0, 5) : '00:00';
      
      setFormData({
        nombreCompleto: cita.pacientes?.nombre || '',
        telefono: cita.pacientes?.telefono || '',
        fecha: fecha,
        hora: hora,
        estado: cita.estado || 'pendiente'
      });
      
      cargarEmpresas();
      cargarEstudios();
      cargarEstudiosConPrecios();
    }
  }, [isOpen, cita]);

  const cargarEstudiosConPrecios = async () => {
    if (!cita) return;

    try {
      const estudiosTexto = cita.tipo_estudio || '';
      const estudiosArray = estudiosTexto.split(',').map(e => e.trim()).filter(e => e);
      
      const nombreEmpresa = cita.empresas?.nombre || '';
      
      const estudiosConPrecios = await Promise.all(
        estudiosArray.map(async (descripcion) => {
          try {
            const { data: estudioData, error: errorEstudio } = await supabase
              .from('estudios_lab_catalogo')
              .select('id, clave, descripcion')
              .ilike('descripcion', descripcion)
              .limit(1)
              .single();

            if (errorEstudio || !estudioData) {
              return {
                clave: 'N/A',
                descripcion: descripcion,
                precio: 150
              };
            }

            const precio = await obtenerPrecioEstudio(estudioData.clave, nombreEmpresa);

            return {
              clave: estudioData.clave,
              descripcion: estudioData.descripcion,
              precio: precio
            };
          } catch (error) {
            console.error('Error al cargar estudio:', error);
            return {
              clave: 'N/A',
              descripcion: descripcion,
              precio: 150
            };
          }
        })
      );
      
      setEstudiosSeleccionados(estudiosConPrecios);
    } catch (error) {
      console.error('Error al cargar estudios con precios:', error);
    }
  };

  const cargarEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id_empresa, nombre')
        .order('nombre');

      if (error) throw error;
      setEmpresas(data || []);
      
      if (cita?.empresas?.id_empresa) {
        setEmpresaSeleccionada(cita.empresas.id_empresa.toString());
      }
    } catch (error) {
      console.error('Error al cargar empresas:', error);
    }
  };

  const cargarEstudios = async () => {
    try {
      const { data, error } = await supabase
        .from('estudios_lab_catalogo')
        .select('id, clave, descripcion, area')
        .order('clave');

      if (error) throw error;
      setEstudios(data || []);
    } catch (error) {
      console.error('Error al cargar estudios:', error);
    }
  };

  const obtenerPrecioEstudio = async (claveEstudio, nombreEmpresa) => {
    try {
      if (!nombreEmpresa) return 150;

      const { data, error } = await supabase
        .from('precios_estudios')
        .select('precio')
        .eq('clave', claveEstudio)
        .eq('empresa', nombreEmpresa)
        .single();

      if (error) return 150;
      return parseFloat(data.precio);
    } catch (error) {
      console.error('Error al obtener precio:', error);
      return 150;
    }
  };

  const filtrarEstudios = (termino) => {
    if (termino.length < 2) {
      setShowBusquedaEstudios(false);
      return;
    }
    setShowBusquedaEstudios(true);
  };

  const agregarEstudio = async (estudio) => {
    const yaAgregado = estudiosSeleccionados.some(est => est.clave === estudio.clave);
    if (yaAgregado) {
      setError('Este estudio ya fue agregado');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const empresaObj = empresas.find(emp => emp.id_empresa.toString() === empresaSeleccionada.toString());
    const nombreEmpresa = empresaObj ? empresaObj.nombre : '';
    const precio = await obtenerPrecioEstudio(estudio.clave, nombreEmpresa);

    const estudioConPrecio = {
      ...estudio,
      precio: precio,
      empresa: nombreEmpresa || 'Sin empresa'
    };

    setEstudiosSeleccionados(prev => [...prev, estudioConPrecio]);
    setBuscarEstudio('');
    setShowBusquedaEstudios(false);
  };

  const eliminarEstudio = (clave) => {
    setEstudiosSeleccionados(prev => prev.filter(est => est.clave !== clave));
  };

  const calcularPrecioTotal = () => {
    return estudiosSeleccionados.reduce((total, est) => total + est.precio, 0);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const validarFormulario = () => {
    if (!formData.nombreCompleto.trim()) {
      setError('El nombre completo es requerido');
      return false;
    }
    if (!formData.telefono.trim()) {
      setError('El teléfono es requerido');
      return false;
    }
    if (estudiosSeleccionados.length === 0) {
      setError('Debe tener al menos un estudio');
      return false;
    }
    if (!formData.fecha) {
      setError('La fecha es requerida');
      return false;
    }
    if (!formData.hora) {
      setError('La hora es requerida');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validarFormulario()) return;
    
    setLoading(true);
    setError('');

    try {
      await supabase
        .from('pacientes')
        .update({ 
          nombre: formData.nombreCompleto,
          telefono: formData.telefono
        })
        .eq('id_paciente', cita.pacientes.id_paciente);

      const fechaLocal = `${formData.fecha}T${formData.hora}:00`;
      
      const estudiosTexto = estudiosSeleccionados.map(est => est.descripcion).join(', ');
      const precioTotal = calcularPrecioTotal();
      
      const updateData = {
        fecha_estudio: fechaLocal,
        estado: formData.estado,
        tipo_estudio: estudiosTexto,
        monto: precioTotal
      };

      if (empresaSeleccionada) {
        updateData.id_empresa = parseInt(empresaSeleccionada);
      }
      
      const { error: errorCita } = await supabase
        .from('citas')
        .update(updateData)
        .eq('id_cita', cita.id_cita);

      if (errorCita) throw errorCita;

      if (onCitaActualizada) {
        onCitaActualizada();
      }
      
      onClose();
      
    } catch (error) {
      console.error('Error al actualizar cita:', error);
      setError('Error al actualizar la cita. Por favor intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = async () => {
    if (!window.confirm('¿Está seguro de cancelar esta cita?')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('citas')
        .update({ estado: 'cancelada' })
        .eq('id_cita', cita.id_cita);

      if (error) throw error;

      if (onCitaActualizada) {
        onCitaActualizada();
      }
      
      onClose();
    } catch (error) {
      console.error('Error al cancelar cita:', error);
      setError('Error al cancelar la cita');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !cita) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content-cita" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-cita">
          <h2 className="modal-title-cita">
            <img src={editarIcono} alt="Editar" className="modal-title-icon" />
            Editar Cita
          </h2>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="cita-form">
          {error && (
            <div className="error-message">
              <span>⚠️</span>
              <p>{error}</p>
            </div>
          )}

          <div className="form-group-cita">
            <label htmlFor="nombreCompleto" className="form-label-cita">
              Nombre Completo <span className="required">*</span>
            </label>
            <input
              type="text"
              id="nombreCompleto"
              name="nombreCompleto"
              value={formData.nombreCompleto}
              onChange={handleChange}
              className="form-input-cita"
              disabled={loading}
            />
          </div>

          <div className="form-group-cita">
            <label htmlFor="telefono" className="form-label-cita">
              Teléfono <span className="required">*</span>
            </label>
            <input
              type="tel"
              id="telefono"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              className="form-input-cita"
              disabled={loading}
            />
          </div>

          <div className="form-group-cita">
            <label htmlFor="empresa" className="form-label-cita">
              Empresa (para precios de nuevos estudios)
            </label>
            <select
              id="empresa"
              value={empresaSeleccionada}
              onChange={(e) => setEmpresaSeleccionada(e.target.value)}
              className="form-select-cita"
              disabled={loading}
            >
              <option value="">Seleccione una empresa</option>
              {empresas.map(empresa => (
                <option key={empresa.id_empresa} value={empresa.id_empresa}>
                  {empresa.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group-cita">
            <label className="form-label-cita">
              Estudios <span className="required">*</span>
            </label>
            
            <div className="search-group-cita">
              <input
                type="text"
                value={buscarEstudio}
                onChange={(e) => {
                  if (empresaSeleccionada) {
                    setBuscarEstudio(e.target.value);
                    filtrarEstudios(e.target.value);
                  }
                }}
                className="form-input-cita"
                placeholder={empresaSeleccionada ? "Buscar estudio para agregar..." : "Seleccione empresa primero"}
                disabled={loading || !empresaSeleccionada}
              />

              {showBusquedaEstudios && buscarEstudio.length >= 2 && empresaSeleccionada && (
                <div className="search-results-estudios-modal">
                  {estudios
                    .filter(est =>
                      est.descripcion.toLowerCase().includes(buscarEstudio.toLowerCase()) ||
                      est.clave.toLowerCase().includes(buscarEstudio.toLowerCase())
                    )
                    .slice(0, 10)
                    .map(est => (
                      <div
                        key={est.id}
                        className="search-result-item-modal"
                        onClick={() => agregarEstudio(est)}
                      >
                        <strong>{est.clave}</strong> - {est.descripcion}
                      </div>
                    ))}
                </div>
              )}
            </div>
            
            {estudiosSeleccionados.length > 0 && (
              <div className="estudios-seleccionados-lista">
                <div className="lista-header">
                  <span className="lista-titulo">Estudios de esta cita:</span>
                </div>
                {estudiosSeleccionados.map((estudio, index) => (
                  <div key={index} className="estudio-item">
                    <div className="estudio-info">
                      <span className="estudio-clave">{estudio.clave}</span>
                      <span className="estudio-descripcion">{estudio.descripcion}</span>
                    </div>
                    <div className="estudio-actions">
                      <span className="estudio-precio">${estudio.precio.toFixed(2)}</span>
                      <button
                        type="button"
                        className="btn-eliminar-estudio"
                        onClick={() => eliminarEstudio(estudio.clave)}
                        title="Eliminar estudio"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
                <div className="estudios-total">
                  <span className="total-label">Total:</span>
                  <span className="total-precio">${calcularPrecioTotal().toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group-cita">
              <label htmlFor="fecha" className="form-label-cita">
                Fecha <span className="required">*</span>
              </label>
              <input
                type="date"
                id="fecha"
                name="fecha"
                value={formData.fecha}
                onChange={handleChange}
                className="form-input-cita"
                disabled={loading}
              />
            </div>

            <div className="form-group-cita">
              <label htmlFor="hora" className="form-label-cita">
                Hora <span className="required">*</span>
              </label>
              <input
                type="time"
                id="hora"
                name="hora"
                value={formData.hora}
                onChange={handleChange}
                className="form-input-cita"
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group-cita">
            <label htmlFor="estado" className="form-label-cita">
              Estado <span className="required">*</span>
            </label>
            <select
              id="estado"
              name="estado"
              value={formData.estado}
              onChange={handleChange}
              className="form-select-cita"
              disabled={loading}
            >
              <option value="pendiente">Pendiente</option>
              <option value="confirmada">Confirmada</option>
              <option value="en_proceso">En Proceso</option>
              <option value="completada">Completada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>

          <div className="modal-footer-cita">
            <button
              type="button"
              className="btn-cancelar-cita-accion"
              onClick={handleCancelar}
              disabled={loading || formData.estado === 'cancelada'}
            >
              Cancelar Cita
            </button>
            <div className="buttons-right">
              <button
                type="submit"
                className="btn-submit-cita"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Guardando...
                  </>
                ) : (
                  <>
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditarCitaModal;