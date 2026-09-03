import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase-client';
import { buscarPorNombre, idPorNombre } from '../utils/catalogo-por-nombre';
import { interpretarRenglonCita, resumirRenglonCita } from '../utils/cita-renglon';
import { consultarClientesSeleccionables } from '../utils/clientes-seleccionables';
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

// La forma de capturar se recuerda entre citas: quien agenda por telefono lo
// hace todo el dia y no tiene por que elegir el modo cada vez. Si el navegador
// no deja leer -modo privado, permisos-, se arranca en el formulario completo,
// que es lo que habia antes.
const PREFERENCIA_RENGLON = 'california:cita:modo-renglon';

const leerPreferenciaRenglon = () => {
  try {
    return localStorage.getItem(PREFERENCIA_RENGLON) === '1';
  } catch {
    return false;
  }
};

const guardarPreferenciaRenglon = (activo) => {
  try {
    localStorage.setItem(PREFERENCIA_RENGLON, activo ? '1' : '0');
  } catch {
    // Que no se pueda recordar la preferencia no impide agendar.
  }
};

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
  // Empresa, cliente y tipo de estudio se capturan como texto: agendar por
  // telefono no puede depender de recorrer tres listas encadenadas. Al guardar
  // se busca la coincidencia en el catalogo para conservar el id; lo que no
  // coincide se queda como lo escribio recepcion.
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

  // Un solo renglon para toda la cita: nombre, telefono y estudio escritos de
  // corrido. El formulario completo sigue ahi para quien necesite empresa,
  // convenio o elegir estudios del catalogo con su precio.
  const [modoRenglon, setModoRenglon] = useState(leerPreferenciaRenglon);
  const [renglon, setRenglon] = useState('');

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

  // Los tipos dependen de la empresa y del convenio del cliente, así que se
  // vuelven a resolver cuando cambia cualquiera de los dos.
  useEffect(() => {
    // Los tipos se piden solo si lo escrito casa con una empresa del catalogo;
    // con un texto libre no hay a que catalogo ir y el campo funciona igual.
    const empresa = buscarPorNombre(empresas, empresaSeleccionada);
    if (empresa) cargarTiposEstudio(empresa.id_empresa);
    else setTiposEstudio([]);
  }, [empresaSeleccionada, empresas, reglasConvenio]);

  // El tarifario del cliente acota la búsqueda y su matriz de convenio define
  // qué modalidades tiene pactadas con cada empresa.
  useEffect(() => {
    let cancelado = false;
    // El campo es texto libre: el tarifario y las reglas solo se pueden pedir
    // cuando lo escrito casa con un cliente del catalogo. Un convenio tecleado
    // que no existe deja la cita sin precios, que es lo correcto.
    const cliente = buscarPorNombre(clientes, clienteSeleccionado);

    if (!cliente) {
      setPreciosCliente(null);
      setReglasConvenio([]);
      return undefined;
    }

    cargarPreciosCliente(supabase, clienteParaPrecios(cliente.nombre)).then((precios) => {
      if (!cancelado) setPreciosCliente(precios);
    });
    cargarReglasConvenio(supabase, cliente.id_cliente).then((reglas) => {
      if (!cancelado) setReglasConvenio(reglas);
    });

    return () => {
      cancelado = true;
    };
  }, [clienteSeleccionado, clientes]);

  const cargarClientes = async () => {
    // Una cita nueva sólo se agenda para un convenio vigente.
    const { data, error } = await consultarClientesSeleccionables();
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

    // El campo ya trae el nombre escrito; si coincide con el catalogo se usa
    // el nombre canonico para buscar el precio pactado.
    const nombreCliente = buscarPorNombre(clientes, clienteSeleccionado)?.nombre || clienteSeleccionado || '';

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
    // En el modo de un renglon el telefono no se teclea en su campo: lo saca el
    // interpretador, que solo devuelve diez digitos o nada. Revisar aqui lo que
    // quedo escrito en el formulario completo rechazaria la cita por un dato
    // que no se va a guardar.
    if (!modoRenglon && formData.telefono.trim() && !esTelefono10Digitos(formData.telefono)) {
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

  // Lo que se va a guardar, venga del renglon o del formulario. Tenerlo en un
  // solo lugar evita que los dos modos se separen y guarden cosas distintas.
  const datosDeLaCita = () => {
    if (!modoRenglon) {
      return {
        nombre: formData.nombreCompleto.trim(),
        telefono: formData.telefono.trim(),
        estudios: estudiosSeleccionados.map((e) => e.descripcion).join(', '),
        monto: calcularTotal(),
      };
    }
    const { nombre, telefono, estudios } = interpretarRenglonCita(renglon);
    // El renglon no lleva precio: el estudio se escribe a mano y puede no estar
    // en el catalogo. Se cotiza al pasar la cita a estudio, que es donde se
    // conoce el convenio.
    return { nombre, telefono, estudios, monto: 0 };
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
      const cita = datosDeLaCita();

      let idPaciente = null;
      if (cita.telefono) {
        const { data: pacienteExistente } = await supabase
          .from('pacientes')
          .select('id_paciente')
          .eq('telefono', cita.telefono)
          .maybeSingle();
        idPaciente = pacienteExistente?.id_paciente ?? null;
      }

      const fechaHora = fechaHoraDeLaCita();

      const estudiosTexto = cita.estudios;
      const monto = cita.monto;

      const payload = {
        id_paciente: idPaciente,
        id_sucursal: Number(empleadoData.id_sucursal),
        // Un select vacio tiene que viajar como null: Number('') da NaN y el
        // insert lo rechaza.
        // Lo tecleado se casa con el catalogo para conservar la relacion; si no
        // coincide, la cita se guarda sin el id en lugar de rechazarse.
        id_cliente: idPorNombre(clientes, clienteSeleccionado, 'id_cliente'),
        id_empresa: idPorNombre(empresas, empresaSeleccionada, 'id_empresa'),
        id_tipo_estudio: idPorNombre(tiposEstudio, tipoEstudioSeleccionado, 'id_tipo_estudio'),

        nombre_paciente: cita.nombre || null,
        telefono_paciente: cita.telefono || null,

        // La columna de texto es lo unico que queda de lo que pidio el paciente
        // cuando el estudio no esta en el catalogo, asi que se conserva lo
        // escrito si no se agrego ninguno de la lista.
        tipo_estudio: estudiosTexto || tipoEstudioSeleccionado.trim() || null,
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
      setRenglon('');
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

  // Los campos son texto: lo escrito se casa con el catalogo para acotar la
  // busqueda del estudio. Lo que no coincide simplemente no acota nada, y la
  // busqueda sigue funcionando sobre todo el catalogo.
  const empresaActual = buscarPorNombre(empresas, empresaSeleccionada);
  const tipoEstudioActual = buscarPorNombre(tiposEstudio, tipoEstudioSeleccionado);
  const filtrosCatalogo = {
    estudios,
    busqueda: buscarEstudio,
    empresaId: empresaActual?.id_empresa ?? '',
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
          {/* Agendar por telefono es teclear con el paciente en la linea: un
              renglon en vez de seis campos. El formulario completo sigue a un
              clic para cuando haga falta empresa, convenio o el precio del
              catalogo. La eleccion se recuerda. */}
          <div className="cita-modo" role="group" aria-label="Forma de capturar la cita">
            <button
              type="button"
              className={`cita-modo-opcion${modoRenglon ? ' activa' : ''}`}
              onClick={() => { setModoRenglon(true); guardarPreferenciaRenglon(true); }}
              disabled={loading}>
              Un renglón
            </button>
            <button
              type="button"
              className={`cita-modo-opcion${modoRenglon ? '' : ' activa'}`}
              onClick={() => { setModoRenglon(false); guardarPreferenciaRenglon(false); }}
              disabled={loading}>
              Formulario completo
            </button>
          </div>

          {error && (
            <div className="error-message">
              <span>⚠️</span>
              <p>{error}</p>
            </div>
          )}

          {modoRenglon ? (
            <div className="form-group-cita">
              <label className="form-label-cita" htmlFor="cita-renglon">
                Paciente y estudio
              </label>
              <input
                id="cita-renglon"
                type="text"
                value={renglon}
                onChange={(e) => setRenglon(e.target.value)}
                className="form-input-cita cita-renglon-input"
                placeholder="Laura Mendez Rios 4771234567, biometria hematica"
                disabled={loading}
                autoFocus
              />
              <p className="cita-renglon-ayuda">
                Diez dígitos seguidos son el teléfono. Lo que va antes de la
                primera coma, guion o diagonal es el nombre; lo de después, el
                estudio.
              </p>
              {/* Lo que entendio el renglon, a la vista antes de guardar: es la
                  unica forma de notar que el nombre se partio donde no debia. */}
              {resumirRenglonCita(renglon) && (
                <p className="cita-renglon-resumen">{resumirRenglonCita(renglon)}</p>
              )}
            </div>
          ) : (
          <>
          <div className="form-group-cita">
            <label className="form-label-cita" htmlFor="cita-nombre">Nombre Completo</label>
            <input id="cita-nombre" type="text" name="nombreCompleto" value={formData.nombreCompleto} onChange={handleChange}
              className="form-input-cita" disabled={loading} />
          </div>

          <div className="form-group-cita">
            <label className="form-label-cita" htmlFor="cita-telefono">Teléfono</label>
            <input id="cita-telefono" type="tel" name="telefono" value={formData.telefono} onChange={handleChange}
              className="form-input-cita" disabled={loading} maxLength="10" inputMode="numeric" />
          </div>

          {/* Tres campos de texto en lugar de tres listas encadenadas. La lista
              de sugerencias sigue ahi para quien quiera elegir, pero ya no hay
              que pasar por empresa para llegar al cliente ni por el cliente
              para llegar al tipo: agendar por telefono es escribir. */}
          <div className="form-group-cita">
            <label className="form-label-cita" htmlFor="cita-empresa">Empresa</label>
            <input id="cita-empresa" type="text" list="cita-empresas" value={empresaSeleccionada}
              onChange={(e) => setEmpresaSeleccionada(e.target.value)}
              className="form-input-cita" disabled={loading} placeholder="CDC, CDI..." />
            <datalist id="cita-empresas">
              {empresas.map(emp => <option key={emp.id_empresa} value={emp.nombre} />)}
            </datalist>
          </div>

          <div className="form-group-cita">
            <label className="form-label-cita" htmlFor="cita-cliente">Cliente</label>
            <input id="cita-cliente" type="text" list="cita-clientes" value={clienteSeleccionado}
              onChange={(e) => setClienteSeleccionado(e.target.value)}
              className="form-input-cita" disabled={loading} placeholder="Particular, convenio..." />
            <datalist id="cita-clientes">
              {clientes.map(cli => <option key={cli.id_cliente} value={cli.nombre} />)}
            </datalist>
          </div>

          <div className="form-group-cita">
            <label className="form-label-cita" htmlFor="cita-tipo">Tipo Estudio</label>
            <input id="cita-tipo" type="text" list="cita-tipos" value={tipoEstudioSeleccionado}
              onChange={(e) => setTipoEstudioSeleccionado(e.target.value)}
              className="form-input-cita" disabled={loading} placeholder="Laboratorio, tomografía..." />
            <datalist id="cita-tipos">
              {tiposEstudio.map(t => <option key={t.id_tipo_estudio} value={t.nombre} />)}
            </datalist>
          </div>

          <div className="form-group-cita">
            <label className="form-label-cita" htmlFor="cita-buscar-estudio">Estudios</label>

            <div className="search-group-cita">
              <input
                id="cita-buscar-estudio"
                type="text"
                value={buscarEstudio}
                onChange={(e) => {
                  setBuscarEstudio(e.target.value);
                  filtrarEstudios(e.target.value);
                }}
                className="form-input-cita"
                placeholder="Buscar estudio para agregar..."
                disabled={loading}
              />

              {showBusquedaEstudios && buscarEstudio.length >= 2 && (
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

          </>
          )}

          {/* La fecha y la hora quedan en los dos modos: son el hueco de la
              agenda, y `citas.fecha_estudio` no admite nulo. Abierto desde el
              calendario vienen ya puestas del hueco donde se hizo clic. */}
          <div className="form-row">
            <div className="form-group-cita">
              <label className="form-label-cita" htmlFor="cita-fecha">Fecha</label>
              <input id="cita-fecha" type="date" name="fecha" value={formData.fecha} onChange={handleChange}
                className="form-input-cita" disabled={loading} />
            </div>

            <div className="form-group-cita">
              <label className="form-label-cita" htmlFor="cita-hora">Hora</label>
              <input id="cita-hora" type="time" name="hora" value={formData.hora} onChange={handleChange}
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
