import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase-client';
import { useAuth } from '../context/auth-context';
import { esTelefono10Digitos, normalizarTelefono10 } from '../utils/form-validations';
import calendarioIcono from '../assets/calendarioIcono.png';
import './nueva-cita-modal.css';
import { clienteParaPrecios } from '../utils/descuento-cliente';
import { resolverPrecioEstudioCliente } from '../utils/precio-estudio-cliente';
import {
  construirEstudioCatalogoUnificado,
  construirPaqueteCatalogoUnificado,
  filtrarEstudiosCatalogo,
} from '../utils/cita-nuevo-paciente';
import { resolverTiposEstudioConvenio } from '../utils/tipos-estudio-convenio';
import { cargarReglasConvenio } from '../utils/convenios-facturacion';
import { cargarPreciosCliente, resolverClavesConPrecio } from '../utils/precios-cliente';

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

  // Igual que en nuevo paciente: el convenio del cliente decide qué modalidades
  // se ofrecen y su tarifario acota la búsqueda.
  const [reglasConvenio, setReglasConvenio] = useState([]);
  const [preciosCliente, setPreciosCliente] = useState(null);

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
    setTipoEstudioSeleccionado('');
    setClienteSeleccionado('');
    setBuscarEstudio('');
    setEstudiosSeleccionados([]);
    setShowBusquedaEstudios(false);
  }, [empresaSeleccionada]);

  // Los tipos dependen de la empresa y del convenio del cliente, así que se
  // vuelven a resolver cuando cambia cualquiera de los dos.
  useEffect(() => {
    if (empresaSeleccionada) cargarTiposEstudio(parseInt(empresaSeleccionada, 10));
    else setTiposEstudio([]);
  }, [empresaSeleccionada, empresas, reglasConvenio]);

  // El tarifario del cliente acota la búsqueda y su matriz de convenio define
  // qué modalidades tiene pactadas con cada empresa.
  useEffect(() => {
    let cancelado = false;
    const nombreCliente = clientes.find(
      (cli) => String(cli.id_cliente) === String(clienteSeleccionado),
    )?.nombre;

    if (!clienteSeleccionado || !nombreCliente) {
      setPreciosCliente(null);
      setReglasConvenio([]);
      return undefined;
    }

    cargarPreciosCliente(supabase, clienteParaPrecios(nombreCliente)).then((precios) => {
      if (!cancelado) setPreciosCliente(precios);
    });
    cargarReglasConvenio(supabase, clienteSeleccionado).then((reglas) => {
      if (!cancelado) setReglasConvenio(reglas);
    });

    return () => {
      cancelado = true;
    };
  }, [clienteSeleccionado, clientes]);

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
    // Se traen los tipos de todas las empresas porque el convenio puede
    // facturar por la elegida estudios que el catálogo tiene en la otra.
    const { data, error } = await supabase
      .from('empresa_tipos_estudio')
      .select(`
        id_empresa,
        id_tipo_estudio,
        tipos_estudio ( id_tipo_estudio, nombre )
      `)
      .order('tipos_estudio(nombre)');

    if (error) {
      setTiposEstudio([]);
      return;
    }

    setTiposEstudio(
      resolverTiposEstudioConvenio({
        filas: data || [],
        empresas,
        idEmpresaSeleccionada: idEmpresa,
        reglasConvenio,
      }),
    );
  };

  // La cita se agenda para cualquiera de los dos módulos, así que la búsqueda
  // ofrece el catálogo unificado: sólo con el de laboratorio, un paciente de
  // tomografía no encontraba su estudio.
  const cargarEstudios = async () => {
    const { data: estudiosLab, error } = await supabase
      .from('estudios_lab_catalogo')
      .select('id, clave, descripcion, area, dias_proceso')
      .order('clave');

    if (error) {
      setError('Error al cargar estudios disponibles');
      return;
    }

    const estudiosLaboratorio = (estudiosLab || []).map((estudio) =>
      construirEstudioCatalogoUnificado(estudio, 'laboratorio'),
    );

    // Los paquetes son de laboratorio y se ofrecen a todos los clientes.
    const { data: paquetes, error: errorPaquetes } = await supabase
      .from('paquetes')
      .select('id, clave, descripcion, dias_proceso')
      .order('clave');

    if (errorPaquetes) console.warn('No se pudieron cargar los paquetes:', errorPaquetes);

    const paquetesCatalogo = (paquetes || []).map(construirPaqueteCatalogoUnificado);

    const { data: estudiosImagen, error: errorImagen } = await supabase
      .from('estudios_imagen_catalogo')
      .select('id, id_empresa, clave, descripcion, empresa_operativa, modalidad, area, dias_proceso')
      .eq('activo', true)
      .order('clave');

    // Sin catálogo de imagen se agenda igual con lo de laboratorio: dejar la
    // búsqueda vacía impediría capturar la cita.
    if (errorImagen) {
      console.warn('No se pudo cargar el catálogo de imagen:', errorImagen);
      setEstudios([...estudiosLaboratorio, ...paquetesCatalogo]);
      return;
    }

    setEstudios([
      ...estudiosLaboratorio,
      ...paquetesCatalogo,
      ...(estudiosImagen || []).map((estudio) =>
        construirEstudioCatalogoUnificado(estudio, 'imagen'),
      ),
    ]);
  };

  const obtenerPrecioEstudio = async (estudio, nombreCliente) => {
    // Un cliente de porcentaje cobra la lista de particular.
    const cliente = clienteParaPrecios(nombreCliente);
    return resolverPrecioEstudioCliente(supabase, {
      clave: estudio?.clave ?? estudio,
      descripcion: estudio?.descripcion,
      cliente,
    });
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

    const precio = await obtenerPrecioEstudio(estudio, nombreCliente);

    setEstudiosSeleccionados(prev => [...prev, { ...estudio, precio }]);
    setBuscarEstudio('');
    setShowBusquedaEstudios(false);
  };

  const eliminarEstudio = (clave) => {
    setEstudiosSeleccionados(prev => prev.filter(e => e.clave !== clave));
  };

  const calcularTotal = () => estudiosSeleccionados.reduce((t, e) => t + (Number(e.precio) || 0), 0);

  // Agendar por telefono es rapido y con datos a medias: quien llama muchas
  // veces solo deja el nombre, y el resto se completa cuando llega. Por eso
  // ningun campo del formulario es obligatorio.
  //
  // La unica excepcion es la fecha, y no por criterio nuestro: citas.fecha_estudio
  // es NOT NULL, y una cita sin fecha ademas no aparecerian en ningun lado del
  // calendario. Cuando se deja vacia se toma la del hueco donde se abrio el
  // modal, y si tampoco la hay, hoy a la hora en curso.
  const validarFormulario = () => {
    if (!empleadoData?.id_sucursal) return setError('El usuario no tiene una sucursal asignada. Solicite la asignación a un administrador.'), false;
    // El telefono se revisa solo si se capturo: vacio esta bien, a medias no,
    // porque despues no se puede llamar ni mandar el recordatorio.
    if (formData.telefono.trim() && !esTelefono10Digitos(formData.telefono)) {
      return setError('El teléfono debe tener 10 dígitos numéricos'), false;
    }
    return true;
  };

  // Redondea al cuarto de hora siguiente: una cita puesta a las 9:07 no dice
  // nada, y la agenda se maneja en bloques.
  const horaPorDefecto = () => {
    const ahora = new Date();
    ahora.setMinutes(Math.ceil(ahora.getMinutes() / 15) * 15, 0, 0);
    return `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
  };

  const fechaHoraDeLaCita = () => {
    const fecha =
      formData.fecha ||
      fechaInicial ||
      new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
    const hora = formData.hora || horaInicial || horaPorDefecto();
    return `${fecha}T${hora}:00-06:00`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarFormulario()) return;

    setLoading(true);
    setError('');

    try {
      // El paciente se busca por telefono, asi que sin telefono no hay a quien
      // enlazar: consultar con la cadena vacia engancharia la cita al primer
      // registro que tenga el telefono en blanco.
      let idPaciente = null;
      if (formData.telefono.trim()) {
        const { data: pacienteExistente } = await supabase
          .from('pacientes')
          .select('id_paciente')
          .eq('telefono', formData.telefono.trim())
          .maybeSingle();
        idPaciente = pacienteExistente?.id_paciente ?? null;
      }

      const fechaHora = fechaHoraDeLaCita();

      const estudiosTexto = estudiosSeleccionados.map(e => e.descripcion).join(', ');
      const monto = calcularTotal();

      const payload = {
        id_paciente: idPaciente,
        id_sucursal: Number(empleadoData.id_sucursal),
        // Un select vacio tiene que viajar como null: Number('') da NaN y el
        // insert lo rechaza.
        id_cliente: clienteSeleccionado ? Number(clienteSeleccionado) : null,
        id_empresa: empresaSeleccionada ? Number(empresaSeleccionada) : null,
        id_tipo_estudio: tipoEstudioSeleccionado ? Number(tipoEstudioSeleccionado) : null,

        nombre_paciente: formData.nombreCompleto.trim() || null,
        telefono_paciente: formData.telefono.trim() || null,

        tipo_estudio: estudiosTexto || null,
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

  const empresaActual = empresas.find(
    (emp) => String(emp.id_empresa) === String(empresaSeleccionada),
  );
  const tipoEstudioActual = tiposEstudio.find(
    (tipo) => String(tipo.id_tipo_estudio) === String(tipoEstudioSeleccionado),
  );
  const filtrosCatalogo = {
    estudios,
    busqueda: buscarEstudio,
    empresaId: empresaSeleccionada,
    empresaNombre: empresaActual?.nombre || '',
    tipoNombre: tipoEstudioActual?.nombre || '',
    reglasConvenio,
  };
  const estudiosConPrecio = filtrarEstudiosCatalogo({
    ...filtrosCatalogo,
    clavesConPrecio: resolverClavesConPrecio(preciosCliente, estudios),
  });
  // Si el convenio no tiene precio para lo que se busca se ofrece el catálogo
  // de todos modos: dejar la búsqueda vacía impedía agendar la cita.
  const estudiosSinFiltroPrecio = filtrarEstudiosCatalogo(filtrosCatalogo);
  const estudiosFiltrados =
    estudiosConPrecio.length > 0 ? estudiosConPrecio : estudiosSinFiltroPrecio;

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
            <label className="form-label-cita">Nombre Completo</label>
            <input type="text" name="nombreCompleto" value={formData.nombreCompleto} onChange={handleChange}
              className="form-input-cita" disabled={loading} />
          </div>

          <div className="form-group-cita">
            <label className="form-label-cita">Teléfono</label>
            <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange}
              className="form-input-cita" disabled={loading} maxLength="10" inputMode="numeric" />
          </div>

          <div className="form-group-cita">
            <label className="form-label-cita">Empresa</label>
            <select value={empresaSeleccionada} onChange={(e) => setEmpresaSeleccionada(e.target.value)}
              className="form-select-cita" disabled={loading}>
              <option value="">Seleccione una empresa</option>
              {empresas.map(emp => <option key={emp.id_empresa} value={emp.id_empresa}>{emp.nombre}</option>)}
            </select>
          </div>

          <div className="form-group-cita">
            <label className="form-label-cita">Cliente</label>
            <select value={clienteSeleccionado} onChange={(e) => {
              setClienteSeleccionado(e.target.value);
              // El convenio del cliente cambia los tipos ofrecidos, así que el
              // que estaba elegido puede dejar de existir.
              setTipoEstudioSeleccionado('');
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
            <label className="form-label-cita">Tipo Estudio</label>
            <select value={tipoEstudioSeleccionado} onChange={(e) => setTipoEstudioSeleccionado(e.target.value)}
              className="form-select-cita" disabled={loading || !clienteSeleccionado}>
              <option value="">
                {clienteSeleccionado ? 'Selecciona Tipo de Estudio' : 'Primero selecciona un Cliente'}
              </option>
              {tiposEstudio.map(t => <option key={t.id_tipo_estudio} value={t.id_tipo_estudio}>{t.nombre}</option>)}
            </select>
          </div>

          <div className="form-group-cita">
            <label className="form-label-cita">Estudios</label>

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
              <label className="form-label-cita">Fecha</label>
              <input type="date" name="fecha" value={formData.fecha} onChange={handleChange}
                className="form-input-cita" disabled={loading} />
            </div>

            <div className="form-group-cita">
              <label className="form-label-cita">Hora</label>
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
