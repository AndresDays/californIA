import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase-client';
import { useAuth } from '../context/auth-context';
import { esTelefono10Digitos, normalizarTelefono10 } from '../utils/form-validations';
import calendarioIcono from '../assets/calendarioIcono.png';
import './nueva-cita-modal.css';
import { clienteParaPrecios } from '../utils/descuento-cliente';

const DEFAULT_PRECIO = 150;

const NuevaCitaModal = ({ isOpen, onClose, onCitaCreada, fechaInicial, horaInicial }) => {
  const { empleadoData } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    telefono: '',
    fecha: '',
    hora: ''
  });

  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');

  const [empresas, setEmpresas] = useState([]);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState('');


  const [tiposEstudio, setTiposEstudio] = useState([]);
  const [tipoEstudioSeleccionado, setTipoEstudioSeleccionado] = useState('');

  const [buscarEstudio, setBuscarEstudio] = useState('');
  const [estudios, setEstudios] = useState([]);
  const [estudiosSeleccionados, setEstudiosSeleccionados] = useState([]);
  const [showBusquedaEstudios, setShowBusquedaEstudios] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    cargarClientes();
    cargarEmpresas();
    cargarEstudios();

    const ahora = new Date();
    setFormData(prev => ({
      ...prev,
      fecha: fechaInicial || ahora.toISOString().split('T')[0],
      hora: horaInicial || ahora.toTimeString().slice(0, 5)
    }));
  }, [isOpen, fechaInicial, horaInicial]);

  useEffect(() => {
    if (empresaSeleccionada) cargarTiposEstudio(parseInt(empresaSeleccionada, 10));
    else setTiposEstudio([]);
    setTipoEstudioSeleccionado('');
    setClienteSeleccionado('');
    setBuscarEstudio('');
    setEstudiosSeleccionados([]);
    setShowBusquedaEstudios(false);
  }, [empresaSeleccionada]);

  const cargarClientes = async () => {
    const { data, error } = await supabase
      .from('clientes')
      .select('id_cliente, nombre')
      .order('nombre');
    if (!error) setClientes(data || []);
  };

  const cargarEmpresas = async () => {
    const { data, error } = await supabase
      .from('empresas')
      .select('id_empresa, nombre')
      .order('nombre');
    if (!error) setEmpresas(data || []);
  };

  const cargarTiposEstudio = async (idEmpresa) => {
    const { data, error } = await supabase
      .from('empresa_tipos_estudio')
      .select(`
        id_tipo_estudio,
        tipos_estudio ( id_tipo_estudio, nombre )
      `)
      .eq('id_empresa', idEmpresa)
      .order('tipos_estudio(nombre)');

    if (error) {
      setTiposEstudio([]);
      return;
    }

    const tipos = (data || []).map(x => ({
      id_tipo_estudio: x.tipos_estudio.id_tipo_estudio,
      nombre: x.tipos_estudio.nombre
    }));

    setTiposEstudio(tipos);
  };

  const cargarEstudios = async () => {
    const { data, error } = await supabase
      .from('estudios_lab_catalogo')
      .select('id, clave, descripcion, area')
      .order('clave');

    if (error) {
      setError('Error al cargar estudios disponibles');
      return;
    }
    setEstudios(data || []);
  };

  const obtenerPrecioEstudio = async (claveEstudio, nombreCliente) => {
    try {
      const clave = (claveEstudio || '').trim();
      // Un cliente de porcentaje cobra la lista de particular.
      const cliente = clienteParaPrecios(nombreCliente);
      if (!clave || !cliente) return DEFAULT_PRECIO;

      const { data, error } = await supabase
        .from('precios_estudios')
        .select('precio')
        .eq('clave', clave)
        .eq('cliente', cliente)
        .maybeSingle();

      if (error || !data?.precio) return DEFAULT_PRECIO;
      return Number(data.precio);
    } catch {
      return DEFAULT_PRECIO;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'telefono' ? normalizarTelefono10(value) : value
    }));
    setError('');
  };

  const filtrarEstudios = (termino) => {
    setShowBusquedaEstudios(termino.length >= 2);
  };

  const agregarEstudio = async (estudio) => {
    if (estudiosSeleccionados.some(e => e.clave === estudio.clave)) {
      setError('Este estudio ya fue agregado');
      setTimeout(() => setError(''), 2500);
      return;
    }

    const clienteObj = clientes.find(c => String(c.id_cliente) === String(clienteSeleccionado));
    const nombreCliente = clienteObj?.nombre || '';

    const precio = await obtenerPrecioEstudio(estudio.clave, nombreCliente);

    setEstudiosSeleccionados(prev => [...prev, { ...estudio, precio }]);
    setBuscarEstudio('');
    setShowBusquedaEstudios(false);
  };

  const eliminarEstudio = (clave) => {
    setEstudiosSeleccionados(prev => prev.filter(e => e.clave !== clave));
  };

  const calcularTotal = () => estudiosSeleccionados.reduce((t, e) => t + (Number(e.precio) || 0), 0);

  const validarFormulario = () => {
    if (!empleadoData?.id_sucursal) return setError('El usuario no tiene una sucursal asignada. Solicite la asignación a un administrador.'), false;
    if (!formData.nombreCompleto.trim()) return setError('El nombre completo es requerido'), false;
    if (!formData.telefono.trim()) return setError('El teléfono es requerido'), false;
    if (!esTelefono10Digitos(formData.telefono)) return setError('El telÃ©fono debe tener 10 dÃ­gitos numÃ©ricos'), false;
    if (!empresaSeleccionada) return setError('Debe seleccionar una empresa'), false;
    if (!clienteSeleccionado) return setError('Debe seleccionar un cliente'), false;
    if (!tipoEstudioSeleccionado) return setError('Debe seleccionar un tipo de estudio'), false;
    if (estudiosSeleccionados.length === 0) return setError('Debe agregar al menos un estudio'), false;
    if (!formData.fecha) return setError('La fecha es requerida'), false;
    if (!formData.hora) return setError('La hora es requerida'), false;
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarFormulario()) return;

    setLoading(true);
    setError('');

    try {
      const { data: pacienteExistente } = await supabase
        .from('pacientes')
        .select('id_paciente')
        .eq('telefono', formData.telefono)
        .maybeSingle();

      const idPaciente = pacienteExistente?.id_paciente ?? null;

      const fechaHora = `${formData.fecha}T${formData.hora}:00-06:00`; // si quieres tu lógica de offset, úsala aquí

      const estudiosTexto = estudiosSeleccionados.map(e => e.descripcion).join(', ');
      const monto = calcularTotal();

      const payload = {
        id_paciente: idPaciente,
        id_sucursal: Number(empleadoData.id_sucursal),
        id_cliente: Number(clienteSeleccionado),
        id_empresa: Number(empresaSeleccionada),
        id_tipo_estudio: Number(tipoEstudioSeleccionado),

        nombre_paciente: formData.nombreCompleto,
        telefono_paciente: formData.telefono,

        tipo_estudio: estudiosTexto,
        fecha_estudio: fechaHora,
        estado: 'pendiente',
        monto
      };

      const { data: nuevaCita, error: errorCita } = await supabase
        .from('citas')
        .insert([payload])
        .select()
        .single();

      if (errorCita) throw errorCita;

      queryClient.invalidateQueries({ queryKey: ['citas'] });
      onCitaCreada?.(nuevaCita);

      setFormData({ nombreCompleto: '', telefono: '', fecha: '', hora: '' });
      setClienteSeleccionado('');
      setEmpresaSeleccionada('');
      setTipoEstudioSeleccionado('');
      setBuscarEstudio('');
      setEstudiosSeleccionados([]);
      onClose();
    } catch (err) {
      console.error(err);
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
          <h2 className="modal-title-cita">
            <img src={calendarioIcono} alt="Calendario" className="modal-title-icon" />
            Nueva Cita
          </h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="cita-form">
          {error && (
            <div className="error-message">
              <span>⚠️</span>
              <p>{error}</p>
            </div>
          )}

          <div className="form-group-cita">
            <label className="form-label-cita">Nombre Completo <span className="required">*</span></label>
            <input type="text" name="nombreCompleto" value={formData.nombreCompleto} onChange={handleChange}
              className="form-input-cita" disabled={loading} />
          </div>

          <div className="form-group-cita">
            <label className="form-label-cita">Teléfono <span className="required">*</span></label>
            <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange}
              className="form-input-cita" disabled={loading} maxLength="10" inputMode="numeric" />
          </div>

          <div className="form-group-cita">
            <label className="form-label-cita">Empresa <span className="required">*</span></label>
            <select value={empresaSeleccionada} onChange={(e) => setEmpresaSeleccionada(e.target.value)}
              className="form-select-cita" disabled={loading}>
              <option value="">Seleccione una empresa</option>
              {empresas.map(emp => <option key={emp.id_empresa} value={emp.id_empresa}>{emp.nombre}</option>)}
            </select>
          </div>

          <div className="form-group-cita">
            <label className="form-label-cita">Cliente <span className="required">*</span></label>
            <select value={clienteSeleccionado} onChange={(e) => {
              setClienteSeleccionado(e.target.value);
              setBuscarEstudio('');
              setEstudiosSeleccionados([]);
              setShowBusquedaEstudios(false);
            }} className="form-select-cita" disabled={loading || !empresaSeleccionada}>
              <option value="">
                {empresaSeleccionada ? 'Selecciona un Cliente' : 'Primero selecciona una Empresa'}
              </option>
              {clientes.map(cli => <option key={cli.id_cliente} value={cli.id_cliente}>{cli.nombre}</option>)}
            </select>
          </div>

          <div className="form-group-cita">
            <label className="form-label-cita">Tipo Estudio <span className="required">*</span></label>
            <select value={tipoEstudioSeleccionado} onChange={(e) => setTipoEstudioSeleccionado(e.target.value)}
              className="form-select-cita" disabled={loading || !empresaSeleccionada}>
              <option value="">
                {empresaSeleccionada ? 'Selecciona Tipo de Estudio' : 'Primero selecciona una Empresa'}
              </option>
              {tiposEstudio.map(t => <option key={t.id_tipo_estudio} value={t.id_tipo_estudio}>{t.nombre}</option>)}
            </select>
          </div>

          <div className="form-group-cita">
            <label className="form-label-cita">Estudios <span className="required">*</span></label>

            <div className="search-group-cita">
              <input
                type="text"
                value={buscarEstudio}
                onChange={(e) => {
                  if (clienteSeleccionado) {
                    setBuscarEstudio(e.target.value);
                    filtrarEstudios(e.target.value);
                  }
                }}
                className="form-input-cita"
                placeholder={clienteSeleccionado ? 'Buscar estudio para agregar...' : 'Selecciona un cliente primero'}
                disabled={loading || !clienteSeleccionado}
              />

              {showBusquedaEstudios && buscarEstudio.length >= 2 && clienteSeleccionado && (
                <div className="search-results-estudios-modal">
                  {estudiosFiltrados.slice(0, 10).map(est => (
                    <div key={est.id} className="search-result-item-modal" onClick={() => agregarEstudio(est)}>
                      <strong>{est.clave}</strong> - {est.descripcion}
                    </div>
                  ))}
                  {estudiosFiltrados.length === 0 && (
                    <div className="search-no-results-modal">No se encontraron estudios</div>
                  )}
                </div>
              )}
            </div>

            {estudiosSeleccionados.length > 0 && (
              <div className="estudios-seleccionados-lista">
                {estudiosSeleccionados.map(est => (
                  <div key={est.clave} className="estudio-item">
                    <div className="estudio-info">
                      <span className="estudio-clave">{est.clave}</span>
                      <span className="estudio-descripcion">{est.descripcion}</span>
                    </div>
                    <div className="estudio-actions">
                      <span className="estudio-precio">${Number(est.precio || 0).toFixed(2)}</span>
                      <button type="button" className="btn-eliminar-estudio" onClick={() => eliminarEstudio(est.clave)}>
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
                <div className="estudios-total">
                  <span className="total-label">Total:</span>
                  <span className="total-precio">${calcularTotal().toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group-cita">
              <label className="form-label-cita">Fecha <span className="required">*</span></label>
              <input type="date" name="fecha" value={formData.fecha} onChange={handleChange}
                className="form-input-cita" disabled={loading} />
            </div>

            <div className="form-group-cita">
              <label className="form-label-cita">Hora <span className="required">*</span></label>
              <input type="time" name="hora" value={formData.hora} onChange={handleChange}
                className="form-input-cita" disabled={loading} />
            </div>
          </div>

          <div className="modal-footer-cita">
            <button type="button" className="btn-cancel-cita" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn-submit-cita" disabled={loading}>
              {loading ? <> <span className="spinner"></span> Creando...</> : <>Crear Cita</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NuevaCitaModal;
