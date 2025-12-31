import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase-client';
import './nueva-cita-modal.css';

const NuevaCitaModal = ({ isOpen, onClose, onCitaCreada }) => {
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    telefono: '',
    fecha: '',
    hora: ''
  });
  
  const [empresas, setEmpresas] = useState([]);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState('');
  const [sucursales, setSucursales] = useState([]);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState('');
  const [buscarEstudio, setBuscarEstudio] = useState('');
  const [estudios, setEstudios] = useState([]);
  const [estudiosSeleccionados, setEstudiosSeleccionados] = useState([]);
  const [showBusquedaEstudios, setShowBusquedaEstudios] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      cargarEmpresas();
      cargarSucursales();
      cargarEstudios();
      const ahora = new Date();
      const fechaHoy = ahora.toISOString().split('T')[0];
      const horaActual = ahora.toTimeString().slice(0, 5);
      setFormData(prev => ({
        ...prev,
        fecha: fechaHoy,
        hora: horaActual
      }));
    }
  }, [isOpen]);

  const cargarEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id_empresa, nombre')
        .order('nombre');

      if (error) throw error;
      setEmpresas(data || []);
    } catch (error) {
      console.error('Error al cargar empresas:', error);
    }
  };

  const cargarSucursales = async () => {
    try {
      const { data, error } = await supabase
        .from('sucursales')
        .select('id_sucursal, nombre')
        .order('nombre');

      if (error) throw error;
      setSucursales(data || []);
    } catch (error) {
      console.error('Error al cargar sucursales:', error);
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
      setError('Error al cargar estudios disponibles');
    }
  };

  const obtenerPrecioEstudio = async (claveEstudio, nombreEmpresa) => {
    try {
      if (!nombreEmpresa) {
        return 150;
      }

      const { data, error } = await supabase
        .from('precios_estudios')
        .select('precio')
        .eq('clave', claveEstudio)
        .eq('empresa', nombreEmpresa)
        .single();

      if (error) {
        return 150;
      }

      return parseFloat(data.precio);
    } catch (error) {
      console.error('Error al obtener precio:', error);
      return 150;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
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

  const validarFormulario = () => {
    if (!formData.nombreCompleto.trim()) {
      setError('El nombre completo es requerido');
      return false;
    }
    if (!formData.telefono.trim()) {
      setError('El teléfono es requerido');
      return false;
    }
    if (!empresaSeleccionada) {
      setError('Debe seleccionar una empresa');
      return false;
    }
    if (!sucursalSeleccionada) {
      setError('Debe seleccionar una sucursal');
      return false;
    }
    if (estudiosSeleccionados.length === 0) {
      setError('Debe agregar al menos un estudio');
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
      let paciente;
      const { data: pacienteExistente, error: errorBuscar } = await supabase
        .from('pacientes')
        .select('id_paciente')
        .eq('telefono', formData.telefono)
        .single();

      if (pacienteExistente) {
        paciente = pacienteExistente;
        
        await supabase
          .from('pacientes')
          .update({ nombre: formData.nombreCompleto })
          .eq('id_paciente', paciente.id_paciente);
      } else {
        const { data: nuevoPaciente, error: errorCrear } = await supabase
          .from('pacientes')
          .insert([{
            nombre: formData.nombreCompleto,
            telefono: formData.telefono
          }])
          .select()
          .single();

        if (errorCrear) throw errorCrear;
        paciente = nuevoPaciente;
      }

      const fecha = new Date(`${formData.fecha}T${formData.hora}:00`);
      const offsetMinutes = fecha.getTimezoneOffset();
      const offsetHours = Math.abs(Math.floor(offsetMinutes / 60));
      const offsetMins = Math.abs(offsetMinutes % 60);
      const offsetSign = offsetMinutes <= 0 ? '+' : '-';
      const timezoneOffset = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
      const fechaHoraConZona = `${formData.fecha}T${formData.hora}:00${timezoneOffset}`;
      
      const estudiosTexto = estudiosSeleccionados.map(est => est.descripcion).join(', ');
      const precioTotal = calcularPrecioTotal();
      
      const { data: nuevaCita, error: errorCita } = await supabase
        .from('citas')
        .insert([{
          id_paciente: paciente.id_paciente,
          id_sucursal: parseInt(sucursalSeleccionada),
          id_empresa: parseInt(empresaSeleccionada),
          tipo_estudio: estudiosTexto,
          fecha_estudio: fechaHoraConZona,
          estado: 'pendiente',
          monto: precioTotal
        }])
        .select()
        .single();

      if (errorCita) throw errorCita;

      if (onCitaCreada) {
        onCitaCreada(nuevaCita);
      }
      
      setFormData({
        nombreCompleto: '',
        telefono: '',
        fecha: '',
        hora: ''
      });
      setEmpresaSeleccionada('');
      setSucursalSeleccionada('');
      setBuscarEstudio('');
      setEstudiosSeleccionados([]);
      onClose();
      
    } catch (error) {
      console.error('Error al crear cita:', error);
      setError('Error al crear la cita. Por favor intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const estudiosFiltrados = estudios.filter(est =>
    est.descripcion.toLowerCase().includes(buscarEstudio.toLowerCase()) ||
    est.clave.toLowerCase().includes(buscarEstudio.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content-cita" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-cita">
          <h2 className="modal-title-cita">📅 Nueva Cita</h2>
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
              placeholder="Ej: Juan Pérez García"
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
              placeholder="Ej: 3221234567"
              disabled={loading}
            />
          </div>

          <div className="form-group-cita">
            <label htmlFor="empresa" className="form-label-cita">
              Empresa <span className="required">*</span>
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
            <label htmlFor="sucursal" className="form-label-cita">
              Sucursal <span className="required">*</span>
            </label>
            <select
              id="sucursal"
              value={sucursalSeleccionada}
              onChange={(e) => setSucursalSeleccionada(e.target.value)}
              className="form-select-cita"
              disabled={loading}
            >
              <option value="">Seleccione una sucursal</option>
              {sucursales.map(sucursal => (
                <option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>
                  {sucursal.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group-cita">
            <label htmlFor="estudio" className="form-label-cita">
              Estudios <span className="required">*</span>
            </label>
            
            <div className="search-group-cita">
              <input
                type="text"
                id="estudio"
                value={buscarEstudio}
                onChange={(e) => {
                  if (empresaSeleccionada) {
                    setBuscarEstudio(e.target.value);
                    filtrarEstudios(e.target.value);
                  }
                }}
                className="form-input-cita"
                placeholder={empresaSeleccionada ? "Buscar estudio para agregar..." : "Seleccione una empresa primero"}
                disabled={loading || !empresaSeleccionada}
              />

              {showBusquedaEstudios && buscarEstudio.length >= 2 && empresaSeleccionada && (
                <div className="search-results-estudios-modal">
                  {estudiosFiltrados.slice(0, 10).map(est => (
                    <div
                      key={est.id}
                      className="search-result-item-modal"
                      onClick={() => agregarEstudio(est)}
                    >
                      <strong>{est.clave}</strong> - {est.descripcion}
                    </div>
                  ))}
                  {estudiosFiltrados.length === 0 && (
                    <div className="search-no-results-modal">
                      No se encontraron estudios
                    </div>
                  )}
                </div>
              )}
            </div>

            {estudiosSeleccionados.length > 0 && (
              <div className="estudios-seleccionados-lista">
                <div className="lista-header">
                  <span className="lista-titulo">Estudios agregados:</span>
                </div>
                {estudiosSeleccionados.map((estudio, index) => (
                  <div key={estudio.clave} className="estudio-item">
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

          <div className="modal-footer-cita">
            <button
              type="button"
              className="btn-cancel-cita"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-submit-cita"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Creando...
                </>
              ) : (
                <>
                  <span>✓</span>
                  Crear Cita
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NuevaCitaModal;