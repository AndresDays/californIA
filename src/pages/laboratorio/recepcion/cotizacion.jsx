import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase-client';
import { useAuth } from '../../../context/auth-context';
import Layout from '../../../components/layout';
import Header from '../../../components/header-laboratorio.jsx';
import './Cotizacion.css';

const Cotizacion = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Datos para cotización
  const [nombrePaciente, setNombrePaciente] = useState('');
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState('');
  const [condicionesPaciente, setCondicionesPaciente] = useState('');

  // Historial
  const [buscarCotizacion, setBuscarCotizacion] = useState('');
  const [cotizaciones, setCotizaciones] = useState([
    { num: 1, nombre: 'Gutierrez Julian' },
    { num: 2, nombre: 'BLANCA AVILA' },
    { num: 3, nombre: 'jazmin' },
    { num: 4, nombre: 'tania' }
  ]);

  // Estudios
  const [buscarEstudio, setBuscarEstudio] = useState('');
  const [estudiosSeleccionados, setEstudiosSeleccionados] = useState([]);

  // Totales
  const [total, setTotal] = useState(0);
  const [descuento, setDescuento] = useState(0);
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);

  useEffect(() => {
    calcularTotales();
  }, [estudiosSeleccionados, descuento, descuentoPorcentaje]);

  const calcularTotales = () => {
    const subtotal = estudiosSeleccionados.reduce((sum, est) => sum + (parseFloat(est.precio) || 0), 0);
    setTotal(subtotal);

    // Si hay descuento porcentaje, calcularlo
    if (descuentoPorcentaje > 0) {
      const descuentoCalc = subtotal * (descuentoPorcentaje / 100);
      setDescuento(descuentoCalc);
    }
  };

  const handleVerCotizacion = (cotizacion) => {
    alert(`Ver cotización: ${cotizacion.nombre}`);
  };

  const handleEnviarWhatsAppCotizacion = (cotizacion) => {
    alert(`Enviar cotización por WhatsApp: ${cotizacion.nombre}`);
  };

  const handleEnviarCorreoCotizacion = (cotizacion) => {
    alert(`Enviar cotización por correo: ${cotizacion.nombre}`);
  };

  const handleImprimirCotizacion = (cotizacion) => {
    alert(`Imprimir cotización: ${cotizacion.nombre}`);
  };

  const eliminarEstudio = (clave) => {
    setEstudiosSeleccionados(estudiosSeleccionados.filter(e => e.clave !== clave));
  };

  const handleEnviarWhatsApp = () => {
    if (!nombrePaciente) {
      alert('Ingrese el nombre del paciente');
      return;
    }
    alert('Enviando cotización por WhatsApp...');
  };

  const handleGuardarGenerar = () => {
    if (!nombrePaciente) {
      alert('Ingrese el nombre del paciente');
      return;
    }
    alert('Guardando y generando ticket...');
  };

  const handleEnviarCorreo = () => {
    if (!nombrePaciente) {
      alert('Ingrese el nombre del paciente');
      return;
    }
    alert('Enviando cotización por correo...');
  };

  const cotizacionesFiltradas = cotizaciones.filter(cot =>
    cot.nombre.toLowerCase().includes(buscarCotizacion.toLowerCase())
  );

  return (
    <Layout>
      <div className="cotizacion-wrapper">
        <Header />

        <div className="cotizacion-header">
          <h1 className="cotizacion-title">Cotización</h1>
        </div>

        <div className="cotizacion-content">
          {/* Panel Izquierdo */}
          <div className="panel-datos-cotizacion">
            {/* Datos para Cotización */}
            <div className="datos-cotizacion-section">
              <h2 className="section-title turquesa">Datos para Cotización</h2>

              <div className="campo-icon-grupo">
                <span className="icon">👤</span>
                <input
                  type="text"
                  placeholder="Nombre del Paciente"
                  value={nombrePaciente}
                  onChange={(e) => setNombrePaciente(e.target.value)}
                  className="input-nombre-paciente"
                />
              </div>

              <div className="campo-icon-grupo">
                <span className="icon">🏢</span>
                <select
                  value={empresaSeleccionada}
                  onChange={(e) => setEmpresaSeleccionada(e.target.value)}
                  className="select-empresa-cot"
                >
                  <option value="">Selecciona una Empresa</option>
                  <option value="issste">ISSSTE</option>
                  <option value="imss">IMSS</option>
                  <option value="particular">Particular</option>
                </select>
              </div>

              <div className="condiciones-grupo">
                <label>Condiciones del paciente</label>
                <textarea
                  value={condicionesPaciente}
                  onChange={(e) => setCondicionesPaciente(e.target.value)}
                  className="textarea-condiciones"
                  rows="3"
                />
              </div>
            </div>

            {/* Historial Cotizaciones */}
            <div className="historial-cotizaciones-section">
              <h2 className="section-title amarillo">Historial Cotizaciones</h2>

              <div className="buscar-cotizacion-grupo">
                <input
                  type="text"
                  placeholder="Busca Cotizaciones aqui..."
                  value={buscarCotizacion}
                  onChange={(e) => setBuscarCotizacion(e.target.value)}
                  className="input-buscar-cotizacion"
                />
              </div>

              <div className="tabla-cotizaciones-container">
                <table className="tabla-cotizaciones">
                  <thead>
                    <tr>
                      <th>Num</th>
                      <th>Nombre</th>
                      <th>Imprimir</th>
                      <th>Enviar</th>
                      <th>Enviar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cotizacionesFiltradas.map((cotizacion, index) => (
                      <tr key={cotizacion.num} className={index < 2 ? 'highlighted' : ''}>
                        <td>{cotizacion.num}</td>
                        <td>{cotizacion.nombre}</td>
                        <td>
                          <button
                            className="btn-accion-tabla azul"
                            onClick={() => handleImprimirCotizacion(cotizacion)}
                          >
                            Ver
                          </button>
                        </td>
                        <td>
                          <button
                            className="btn-accion-tabla verde-whatsapp"
                            onClick={() => handleEnviarWhatsAppCotizacion(cotizacion)}
                          >
                            Enviar
                          </button>
                        </td>
                        <td>
                          <button
                            className="btn-accion-tabla azul-correo"
                            onClick={() => handleEnviarCorreoCotizacion(cotizacion)}
                          >
                            Enviar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="cotizaciones-footer">
                Mostrando registros del 1 al {cotizacionesFiltradas.length} de un total de {cotizaciones.length}
              </div>
            </div>
          </div>

          {/* Panel Derecho */}
          <div className="panel-estudios-cotizacion">
            <div className="agrega-estudios-section">
              <h2 className="section-title amarillo">Agrega Estudios</h2>

              <div className="buscar-estudios-grupo-cot">
                <input
                  type="text"
                  placeholder="Busca Estudios Aqui..."
                  value={buscarEstudio}
                  onChange={(e) => setBuscarEstudio(e.target.value)}
                  className="input-buscar-estudios-cot"
                />
              </div>

              <div className="tabla-estudios-cot-container">
                <table className="tabla-estudios-cot">
                  <thead>
                    <tr>
                      <th>Clave</th>
                      <th>Descripcion</th>
                      <th>Tipo</th>
                      <th>precio</th>
                      <th>Dias Proceso</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estudiosSeleccionados.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="sin-estudios-cot">
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
                          <td>{estudio.diasProceso} días</td>
                          <td>
                            <button
                              className="btn-borrar-estudio-cot"
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

              <div className="totales-cotizacion">
                <div className="campo-total-cot">
                  <label>Total</label>
                  <input
                    type="text"
                    value={total.toFixed(2)}
                    readOnly
                    className="input-total-cot"
                  />
                </div>

                <div className="campo-total-cot">
                  <label>Descuento</label>
                  <input
                    type="number"
                    value={descuento}
                    onChange={(e) => setDescuento(parseFloat(e.target.value) || 0)}
                    className="input-descuento-cot"
                  />
                </div>

                <div className="campo-total-cot">
                  <label>Descuento %</label>
                  <input
                    type="number"
                    value={descuentoPorcentaje}
                    onChange={(e) => setDescuentoPorcentaje(parseFloat(e.target.value) || 0)}
                    className="input-descuento-pct-cot"
                  />
                </div>
              </div>

              <div className="botones-cotizacion">
                <button className="btn-whatsapp-cot" onClick={handleEnviarWhatsApp}>
                  💬 ENVIAR POR WHATSAPP
                </button>
                <button className="btn-guardar-cot" onClick={handleGuardarGenerar}>
                  GUARDAR / GENERAR TICKET
                </button>
                <button className="btn-correo-cot" onClick={handleEnviarCorreo}>
                  ✉️ ENVIAR POR CORREO
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Cotizacion;