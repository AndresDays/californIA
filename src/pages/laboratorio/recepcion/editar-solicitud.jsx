import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase-client';
import { useAuth } from '../../../context/auth-context';
import Layout from '../../../components/layout';
import Header from '../../../components/header-laboratorio.jsx';
import './editar-solicitud.css';

const EditarSolicitud = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [buscarPaciente, setBuscarPaciente] = useState('');
  const [rangoFecha, setRangoFecha] = useState('hoy');
  const [ordenes, setOrdenes] = useState([]);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  
  // Campos de la orden
  const [motivoModificacion, setMotivoModificacion] = useState('');
  const [folio, setFolio] = useState('');
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState('');
  const [medicoSeleccionado, setMedicoSeleccionado] = useState('');
  const [tipoUrgencia, setTipoUrgencia] = useState('URGENCIAS LAB');
  const [buscarEstudio, setBuscarEstudio] = useState('');
  const [estudiosSeleccionados, setEstudiosSeleccionados] = useState([]);
  
  // Totales
  const [total, setTotal] = useState(0);
  const [tipoPago, setTipoPago] = useState('Efectivo');
  const [ivaImpuesto, setIvaImpuesto] = useState(0);
  const [totalConIVA, setTotalConIVA] = useState(0);
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);
  const [granTotal, setGranTotal] = useState(0);
  const [abono, setAbono] = useState(0);
  const [adeudo, setAdeudo] = useState(0);
  const [pago, setPago] = useState(0);

  useEffect(() => {
    cargarOrdenes();
  }, [rangoFecha]);

  useEffect(() => {
    calcularTotales();
  }, [estudiosSeleccionados, descuentoPorcentaje, ivaImpuesto, abono, pago]);

  const cargarOrdenes = async () => {
    try {
      const { data, error } = await supabase
        .from('estudios')
        .select(`
          id_estudio,
          fecha_estudio,
          estado,
          pacientes (
            id_paciente,
            nombre,
            fecha_nacimiento
          )
        `)
        .order('fecha_estudio', { ascending: false })
        .limit(20);

      if (error) throw error;

      const ordenesFormateadas = data?.map(est => ({
        folio: est.id_estudio,
        nombre: est.pacientes?.nombre,
        edad: calcularEdad(est.pacientes?.fecha_nacimiento),
        fechaAlta: new Date(est.fecha_estudio).toLocaleDateString('es-MX'),
        idPaciente: est.pacientes?.id_paciente
      })) || [];

      setOrdenes(ordenesFormateadas);
    } catch (error) {
      console.error('Error al cargar órdenes:', error);
    }
  };

  const calcularEdad = (fechaNacimiento) => {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  };

  const calcularTotales = () => {
    const subtotal = estudiosSeleccionados.reduce((sum, est) => sum + (parseFloat(est.precio) || 0), 0);
    setTotal(subtotal);

    const iva = subtotal * (ivaImpuesto / 100);
    const totalConIva = subtotal + iva;
    setTotalConIVA(totalConIva);

    const descuento = totalConIva * (descuentoPorcentaje / 100);
    const granTotalCalc = totalConIva - descuento;
    setGranTotal(granTotalCalc);

    const adeudoCalc = granTotalCalc - abono - pago;
    setAdeudo(adeudoCalc);
  };

  const seleccionarOrden = (orden) => {
    setOrdenSeleccionada(orden);
    setFolio(orden.folio);
    // Cargar datos de la orden
  };

  const agregarEstudio = (estudio) => {
    if (!estudiosSeleccionados.find(e => e.clave === estudio.clave)) {
      setEstudiosSeleccionados([...estudiosSeleccionados, estudio]);
    }
  };

  const eliminarEstudio = (clave) => {
    setEstudiosSeleccionados(estudiosSeleccionados.filter(e => e.clave !== clave));
  };

  const handlePagar = () => {
    alert('Procesando pago...');
  };

  const handleGuardarImprimir = () => {
    alert('Guardando e imprimiendo...');
  };

  const handleCancelarOrden = () => {
    if (window.confirm('¿Está seguro de cancelar esta orden?')) {
      navigate('/recepcion');
    }
  };

  const ordenesFiltradas = ordenes.filter(orden =>
    orden.nombre.toLowerCase().includes(buscarPaciente.toLowerCase()) ||
    orden.folio.toString().includes(buscarPaciente)
  );

  return (
    <Layout>
      <div className="editar-solicitud-wrapper">
        <Header />

        <div className="editar-solicitud-header">
          <h1 className="editar-solicitud-title">Editar Orden</h1>
          <button className="btn-cancelar-orden" onClick={handleCancelarOrden}>
            CANCELAR ORDEN ✖
          </button>
        </div>

        <div className="editar-solicitud-content">
          <div className="panel-ordenes">
            <div className="ordenes-controles">
              <div className="buscar-paciente-grupo">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Buscar por Paciente..."
                  value={buscarPaciente}
                  onChange={(e) => setBuscarPaciente(e.target.value)}
                  className="input-buscar-paciente-edit"
                />
              </div>

              <div className="rango-fecha-grupo">
                <span className="calendar-icon">📅</span>
                <select
                  value={rangoFecha}
                  onChange={(e) => setRangoFecha(e.target.value)}
                  className="select-rango-fecha"
                >
                  <option value="hoy">Hoy</option>
                  <option value="semana">Esta Semana</option>
                  <option value="mes">Este Mes</option>
                  <option value="todos">Todos</option>
                </select>
              </div>
            </div>

            <div className="tabla-ordenes-container">
              <table className="tabla-ordenes">
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Nombre</th>
                    <th>Edad</th>
                    <th>Fecha Alta</th>
                    <th>Etiquetas</th>
                    <th>Ticket</th>
                    <th>Plantas</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenesFiltradas.map((orden) => (
                    <tr
                      key={orden.folio}
                      className={ordenSeleccionada?.folio === orden.folio ? 'selected' : ''}
                      onClick={() => seleccionarOrden(orden)}
                    >
                      <td>{orden.folio}</td>
                      <td>{orden.nombre}</td>
                      <td>{orden.edad} años</td>
                      <td>{orden.fechaAlta}</td>
                      <td>
                        <button className="btn-accion-orden verde">📄</button>
                      </td>
                      <td>
                        <button className="btn-accion-orden azul">🎫</button>
                      </td>
                      <td>
                        <button className="btn-accion-orden naranja">🏢</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ordenes-footer">
              <span>Vendedor: PAULINA DIAZ CORTES</span>
            </div>
          </div>

          <div className="panel-detalles-orden">
            <div className="seccion-superior">
              <div className="motivo-modificacion">
                <textarea
                  placeholder="Motivo de Modificación de la Orden"
                  value={motivoModificacion}
                  onChange={(e) => setMotivoModificacion(e.target.value)}
                  className="textarea-motivo"
                  rows="2"
                />
              </div>

              <div className="folio-grupo">
                <label>Folio:</label>
                <input
                  type="text"
                  value={folio}
                  onChange={(e) => setFolio(e.target.value)}
                  className="input-folio-edit"
                  readOnly
                />
              </div>
            </div>

            <div className="campos-orden">
              <div className="campo-icon-grupo">
                <span className="icon">🏢</span>
                <select
                  value={empresaSeleccionada}
                  onChange={(e) => setEmpresaSeleccionada(e.target.value)}
                  className="select-empresa"
                >
                  <option value="">Selecciona una Empresa</option>
                  <option value="issste">ISSSTE</option>
                  <option value="imss">IMSS</option>
                  <option value="particular">Particular</option>
                </select>
              </div>

              <div className="campo-icon-grupo">
                <span className="icon">👨‍⚕️</span>
                <input
                  type="text"
                  placeholder="Buscar Medico..."
                  value={medicoSeleccionado}
                  onChange={(e) => setMedicoSeleccionado(e.target.value)}
                  className="input-medico"
                />
              </div>

              <div className="campo-icon-grupo">
                <span className="icon">⚡</span>
                <select
                  value={tipoUrgencia}
                  onChange={(e) => setTipoUrgencia(e.target.value)}
                  className="select-urgencia"
                >
                  <option value="URGENCIAS LAB">URGENCIAS LAB</option>
                  <option value="NORMAL">NORMAL</option>
                  <option value="URGENTE">URGENTE</option>
                </select>
              </div>
            </div>

            <div className="lista-precios-section">
              <label className="lista-precios-label">Lista de precios</label>
              
              <div className="buscar-estudios-row">
                <div className="buscar-estudios-grupo">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Buscar Estudios..."
                    value={buscarEstudio}
                    onChange={(e) => setBuscarEstudio(e.target.value)}
                    className="input-buscar-estudios"
                  />
                </div>
                <button className="btn-muestras-pendientes">
                  Muestras Pendientes
                </button>
              </div>

              <div className="tabla-estudios-container">
                <table className="tabla-estudios-edit">
                  <thead>
                    <tr>
                      <th>Clave</th>
                      <th>Descripcion</th>
                      <th>Tipo</th>
                      <th>precio</th>
                      <th>Borrar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estudiosSeleccionados.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="sin-estudios-edit">
                          No hay estudios agregados
                        </td>
                      </tr>
                    ) : (
                      estudiosSeleccionados.map((estudio, index) => (
                        <tr key={index}>
                          <td>{estudio.clave}</td>
                          <td>{estudio.descripcion}</td>
                          <td>{estudio.tipo}</td>
                          <td>${estudio.precio}</td>
                          <td>
                            <button
                              className="btn-borrar-estudio"
                              onClick={() => eliminarEstudio(estudio.clave)}
                            >
                              ✖
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="totales-section">
              <div className="totales-row-1">
                <div className="campo-total">
                  <label>Total $</label>
                  <input type="text" value={total.toFixed(2)} readOnly className="input-total" />
                </div>

                <span className="igual-symbol">=</span>

                <div className="campo-total">
                  <select value={tipoPago} onChange={(e) => setTipoPago(e.target.value)} className="select-tipo-pago">
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Transferencia">Transferencia</option>
                  </select>
                </div>

                <div className="campo-total">
                  <label>IVA % Impuesto</label>
                  <input
                    type="number"
                    value={ivaImpuesto}
                    onChange={(e) => setIvaImpuesto(parseFloat(e.target.value) || 0)}
                    className="input-iva"
                  />
                </div>

                <div className="campo-total">
                  <label>Total con IVA $</label>
                  <input type="text" value={totalConIVA.toFixed(2)} readOnly className="input-total-iva" />
                </div>

                <div className="campo-total">
                  <label>Total con IVA</label>
                  <input type="text" value={totalConIVA.toFixed(2)} readOnly className="input-total-iva-2" />
                </div>
              </div>

              <div className="totales-row-2">
                <div className="campo-total">
                  <label>Desc $</label>
                  <input
                    type="number"
                    value={descuentoPorcentaje}
                    onChange={(e) => setDescuentoPorcentaje(parseFloat(e.target.value) || 0)}
                    className="input-desc"
                  />
                </div>

                <div className="campo-total">
                  <label>Desc</label>
                  <input type="text" value={(totalConIVA * descuentoPorcentaje / 100).toFixed(2)} readOnly className="input-desc-monto" />
                </div>

                <div className="campo-total gran-total-field">
                  <label>Gran Total $</label>
                  <input type="text" value={granTotal.toFixed(2)} readOnly className="input-gran-total" />
                </div>

                <div className="campo-total">
                  <label>Abonó $</label>
                  <input
                    type="number"
                    value={abono}
                    onChange={(e) => setAbono(parseFloat(e.target.value) || 0)}
                    className="input-abono"
                  />
                </div>

                <div className="campo-total">
                  <label>Adeudo $</label>
                  <input type="text" value={adeudo.toFixed(2)} readOnly className="input-adeudo" />
                </div>

                <div className="campo-total">
                  <label>Pago $</label>
                  <input
                    type="number"
                    value={pago}
                    onChange={(e) => setPago(parseFloat(e.target.value) || 0)}
                    className="input-pago"
                  />
                </div>
              </div>
            </div>

            <div className="botones-finales">
              <button className="btn-pagar" onClick={handlePagar}>
                Pagar
              </button>
              <button className="btn-guardar-imprimir" onClick={handleGuardarImprimir}>
                Guardar e Imprimir
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default EditarSolicitud;