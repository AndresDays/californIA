import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase-client';
import './nueva-cita-modal.css';
import editarIcono from '../assets/editarIcono.png';

const DEFAULT_PRECIO = 150;

const EditarCitaModal = ({ isOpen, onClose, cita, onCitaActualizada }) => {
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    telefono: '',
    fecha: '',
    hora: '',
    estado: 'pendiente',
  });

  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');

  const [empresas, setEmpresas] = useState([]);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState('');

  const [tiposEstudio, setTiposEstudio] = useState([]);
  const [tipoEstudioSeleccionado, setTipoEstudioSeleccionado] = useState('');

  const [buscarEstudio, setBuscarEstudio] = useState('');
  const [estudiosCatalogo, setEstudiosCatalogo] = useState([]);
  const [estudiosSeleccionados, setEstudiosSeleccionados] = useState([]);
  const [showBusquedaEstudios, setShowBusquedaEstudios] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isInitializingRef = useRef(false);

  const clienteNombre = useMemo(() => {
    const obj = clientes.find((c) => String(c.id_cliente) === String(clienteSeleccionado));
    return (obj?.nombre || '').trim();
  }, [clientes, clienteSeleccionado]);

  useEffect(() => {
    if (!isOpen || !cita) return;

    const init = async () => {
      isInitializingRef.current = true;
      setLoading(true);
      setError('');

      try {
        const [clientesData, empresasData, catalogoData] = await Promise.all([
          cargarClientes(),
          cargarEmpresas(),
          cargarEstudiosCatalogo(),
        ]);

        const idCliente = cita.id_cliente != null ? String(cita.id_cliente) : '';
        const idEmpresa = cita.id_empresa != null ? String(cita.id_empresa) : '';
        const idTipo = cita.id_tipo_estudio != null ? String(cita.id_tipo_estudio) : '';

        setClienteSeleccionado(idCliente);
        setEmpresaSeleccionada(idEmpresa);

        const fechaHoraStr = cita.fecha_estudio || '';
        const [fechaPart, horaPart] = fechaHoraStr.split('T');
        const hora = horaPart ? horaPart.substring(0, 5) : '00:00';

        setFormData({
          nombreCompleto: cita.nombre_paciente || cita.pacientes?.nombre || '',
          telefono: cita.telefono_paciente || cita.pacientes?.telefono || '',
          fecha: fechaPart || '',
          hora,
          estado: cita.estado || 'pendiente',
        });

        if (idEmpresa) {
          await cargarTiposEstudioPorEmpresa(Number(idEmpresa));
        } else {
          setTiposEstudio([]);
        }
        setTipoEstudioSeleccionado(idTipo);

        const nombreClienteInit =
          (cita.clientes?.nombre || '').trim() ||
          (clientesData || []).find((c) => String(c.id_cliente) === idCliente)?.nombre?.trim() ||
          '';

        await cargarEstudiosDeLaCitaConPrecios(nombreClienteInit);

      } catch (e) {
        console.error(e);
        setError('Error al cargar datos de la cita');
      } finally {
        setLoading(false);
        isInitializingRef.current = false;
      }
    };

    init();
  }, [isOpen, cita]);

  useEffect(() => {
    const run = async () => {
      if (!empresaSeleccionada) {
        setTiposEstudio([]);
        if (!isInitializingRef.current) setTipoEstudioSeleccionado('');
        return;
      }

      await cargarTiposEstudioPorEmpresa(Number(empresaSeleccionada));

      if (!isInitializingRef.current) setTipoEstudioSeleccionado('');
    };

    run();
  }, [empresaSeleccionada]);

  useEffect(() => {
    if (!isOpen || !cita) return;
    if (!clienteSeleccionado) return;
    if (isInitializingRef.current) return;

    recalcularPreciosSeleccionados(clienteNombre);
  }, [clienteSeleccionado]);

  const cargarClientes = async () => {
    const { data, error } = await supabase
      .from('clientes')
      .select('id_cliente, nombre')
      .order('nombre');

    if (error) {
      console.error('Error cargar clientes:', error);
      setClientes([]);
      return [];
    }
    setClientes(data || []);
    return data || [];
  };

  const cargarEmpresas = async () => {
    const { data, error } = await supabase
      .from('empresas')
      .select('id_empresa, nombre')
      .order('nombre');

    if (error) {
      console.error('Error cargar empresas:', error);
      setEmpresas([]);
      return [];
    }
    setEmpresas(data || []);
    return data || [];
  };

  const cargarEstudiosCatalogo = async () => {
    const { data, error } = await supabase
      .from('estudios_lab_catalogo')
      .select('id, clave, descripcion, area')
      .order('clave');

    if (error) {
      console.error('Error cargar catálogo estudios:', error);
      setEstudiosCatalogo([]);
      return [];
    }
    setEstudiosCatalogo(data || []);
    return data || [];
  };

  const cargarTiposEstudioPorEmpresa = async (idEmpresa) => {
    const { data, error } = await supabase
      .from('empresa_tipos_estudio')
      .select(`id_tipo_estudio, tipos_estudio ( id_tipo_estudio, nombre )`)
      .eq('id_empresa', idEmpresa);

    if (error) {
      console.error('Error cargar tipos por empresa:', error);
      setTiposEstudio([]);
      return;
    }

    const tipos = (data || [])
      .map((x) => ({
        id_tipo_estudio: x.tipos_estudio?.id_tipo_estudio ?? x.id_tipo_estudio,
        nombre: x.tipos_estudio?.nombre ?? '',
      }))
      .filter((t) => t.id_tipo_estudio && t.nombre)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));

    setTiposEstudio(tipos);
  };

  const obtenerPrecioEstudio = async (claveEstudio, nombreCliente) => {
    try {
      const clave = (claveEstudio || '').trim();
      const cliente = (nombreCliente || '').trim();
      if (!clave || !cliente) return DEFAULT_PRECIO;

      const { data, error } = await supabase
        .from('precios_estudios')
        .select('precio')
        .eq('clave', clave)
        .eq('cliente', cliente)
        .maybeSingle();

      if (error || !data?.precio) return DEFAULT_PRECIO;
      return Number(data.precio);
    } catch (e) {
      console.error(e);
      return DEFAULT_PRECIO;
    }
  };

  const cargarEstudiosDeLaCitaConPrecios = async (nombreClienteSeguro) => {
    const texto = (cita?.tipo_estudio || '').trim();
    if (!texto) {
      setEstudiosSeleccionados([]);
      return;
    }

    const piezas = texto
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);

    const conPrecios = await Promise.all(
      piezas.map(async (descripcion) => {
        const { data: estudioData } = await supabase
          .from('estudios_lab_catalogo')
          .select('id, clave, descripcion')
          .ilike('descripcion', `%${descripcion}%`)
          .limit(1)
          .maybeSingle();

        if (!estudioData?.clave) {
          return {
            id: `tmp-${descripcion}`,
            clave: 'N/A',
            descripcion,
            precio: DEFAULT_PRECIO,
          };
        }

        const precio = await obtenerPrecioEstudio(estudioData.clave, nombreClienteSeguro);

        return {
          id: estudioData.id,
          clave: estudioData.clave,
          descripcion: estudioData.descripcion,
          precio,
        };
      })
    );

    setEstudiosSeleccionados(conPrecios);
  };

  const recalcularPreciosSeleccionados = async (nombreClienteSeguro) => {
    const actualizados = await Promise.all(
      estudiosSeleccionados.map(async (est) => {
        if (!est?.clave || est.clave === 'N/A') return est;
        const precio = await obtenerPrecioEstudio(est.clave, nombreClienteSeguro);
        return { ...est, precio };
      })
    );
    setEstudiosSeleccionados(actualizados);
  };

  const filtrarEstudios = (t) => setShowBusquedaEstudios(t.length >= 2);

  const agregarEstudio = async (est) => {
    if (estudiosSeleccionados.some((x) => x.clave === est.clave)) return;

    const precio = await obtenerPrecioEstudio(est.clave, clienteNombre);
    setEstudiosSeleccionados((prev) => [...prev, { ...est, precio }]);
    setBuscarEstudio('');
    setShowBusquedaEstudios(false);
  };

  const eliminarEstudio = (clave) => {
    setEstudiosSeleccionados((prev) => prev.filter((e) => e.clave !== clave));
  };

  const total = useMemo(
    () => estudiosSeleccionados.reduce((t, e) => t + (Number(e.precio) || 0), 0),
    [estudiosSeleccionados]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const validar = () => {
    if (!formData.nombreCompleto.trim()) return setError('El nombre completo es requerido'), false;
    if (!formData.telefono.trim()) return setError('El teléfono es requerido'), false;
    if (!clienteSeleccionado) return setError('Debe seleccionar un cliente'), false;
    if (!empresaSeleccionada) return setError('Debe seleccionar una empresa'), false;
    if (!tipoEstudioSeleccionado) return setError('Debe seleccionar un tipo de estudio'), false;
    if (!formData.fecha) return setError('La fecha es requerida'), false;
    if (!formData.hora) return setError('La hora es requerida'), false;
    if (estudiosSeleccionados.length === 0) return setError('Debe agregar al menos un estudio'), false;
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validar()) return;

    setLoading(true);
    setError('');

    try {
      const fechaHora = `${formData.fecha}T${formData.hora}:00-06:00`;

      const payload = {
        id_cliente: Number(clienteSeleccionado),
        id_empresa: Number(empresaSeleccionada),
        id_tipo_estudio: Number(tipoEstudioSeleccionado),

        nombre_paciente: formData.nombreCompleto,
        telefono_paciente: formData.telefono,

        fecha_estudio: fechaHora,
        estado: formData.estado,
        tipo_estudio: estudiosSeleccionados.map((x) => x.descripcion).join(', '),
        monto: total,
      };

      const { error } = await supabase
        .from('citas')
        .update(payload)
        .eq('id_cita', cita.id_cita);

      if (error) throw error;

      onCitaActualizada?.();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Error al actualizar la cita');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !cita) return null;

  const estudiosFiltrados = estudiosCatalogo.filter(
    (e) =>
      e.descripcion.toLowerCase().includes(buscarEstudio.toLowerCase()) ||
      e.clave.toLowerCase().includes(buscarEstudio.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content-cita" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-cita">
          <h2 className="modal-title-cita">
            <img src={editarIcono} alt="Editar" className="modal-title-icon" />
            Editar Cita
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
            <label className="form-label-cita">Nombre Completo *</label>
            <input
              className="form-input-cita"
              name="nombreCompleto"
              value={formData.nombreCompleto}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div className="form-group-cita">
            <label className="form-label-cita">Teléfono *</label>
            <input
              className="form-input-cita"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div className="form-group-cita">
            <label className="form-label-cita">Cliente *</label>
            <select
              className="form-select-cita"
              value={clienteSeleccionado}
              onChange={(e) => setClienteSeleccionado(e.target.value)}
              disabled={loading}
            >
              <option value="">Selecciona un Cliente</option>
              {clientes.map((c) => (
                <option key={c.id_cliente} value={c.id_cliente}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div className="form-group-cita">
            <label className="form-label-cita">Empresa *</label>
            <select
              className="form-select-cita"
              value={empresaSeleccionada}
              onChange={(e) => setEmpresaSeleccionada(e.target.value)}
              disabled={loading}
            >
              <option value="">Seleccione una empresa</option>
              {empresas.map((e) => (
                <option key={e.id_empresa} value={e.id_empresa}>{e.nombre}</option>
              ))}
            </select>
          </div>

          <div className="form-group-cita">
            <label className="form-label-cita">Tipo de Estudio *</label>
            <select
              className="form-select-cita"
              value={tipoEstudioSeleccionado}
              onChange={(e) => setTipoEstudioSeleccionado(e.target.value)}
              disabled={loading || !empresaSeleccionada}
            >
              <option value="">
                {empresaSeleccionada ? 'Selecciona Tipo de Estudio' : 'Primero selecciona una Empresa'}
              </option>
              {tiposEstudio.map((t) => (
                <option key={t.id_tipo_estudio} value={t.id_tipo_estudio}>{t.nombre}</option>
              ))}
            </select>
          </div>

          <div className="form-group-cita">
            <label className="form-label-cita">Estudios *</label>

            <div className="search-group-cita">
              <input
                className="form-input-cita"
                value={buscarEstudio}
                onChange={(e) => {
                  setBuscarEstudio(e.target.value);
                  filtrarEstudios(e.target.value);
                }}
                placeholder="Buscar estudio para agregar..."
                disabled={loading}
              />

              {showBusquedaEstudios && buscarEstudio.length >= 2 && (
                <div className="search-results-estudios-modal">
                  {estudiosFiltrados.slice(0, 10).map((est) => (
                    <div
                      key={est.id}
                      className="search-result-item-modal"
                      onClick={() => agregarEstudio(est)}
                    >
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
                {estudiosSeleccionados.map((est) => (
                  <div key={`${est.clave}-${est.descripcion}`} className="estudio-item">
                    <div className="estudio-info">
                      <span className="estudio-clave">{est.clave}</span>
                      <span className="estudio-descripcion">{est.descripcion}</span>
                    </div>
                    <div className="estudio-actions">
                      <span className="estudio-precio">${Number(est.precio || 0).toFixed(2)}</span>
                      <button
                        type="button"
                        className="btn-eliminar-estudio"
                        onClick={() => eliminarEstudio(est.clave)}
                        disabled={loading}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}

                <div className="estudios-total">
                  <span className="total-label">Total:</span>
                  <span className="total-precio">${Number(total).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group-cita">
              <label className="form-label-cita">Fecha *</label>
              <input
                type="date"
                className="form-input-cita"
                name="fecha"
                value={formData.fecha}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="form-group-cita">
              <label className="form-label-cita">Hora *</label>
              <input
                type="time"
                className="form-input-cita"
                name="hora"
                value={formData.hora}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group-cita">
            <label className="form-label-cita">Estado *</label>
            <select
              className="form-select-cita"
              name="estado"
              value={formData.estado}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="pendiente">Pendiente</option>
              <option value="confirmada">Confirmada</option>
              <option value="en_recepcion">En recepción</option>
              <option value="en_proceso">En Proceso</option>
              <option value="lista_entrega">Lista para entrega</option>
              <option value="entregada">Entregada</option>
              <option value="completada">Completada (anterior)</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>

          <div className="modal-footer-cita">
            <button type="button" className="btn-cancel-cita" onClick={onClose} disabled={loading}>
              Cancelar Cita
            </button>
            <button type="submit" className="btn-submit-cita" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditarCitaModal;
