import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase-client';
import { useAuth } from '../../../context/auth-context';
import Layout from '../../../components/layout.jsx';
import Header from '../../../components/header-laboratorio.jsx';
import './plantas-trabajo.css';

const PlantasTrabajo = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [fechaInicial, setFechaInicial] = useState(new Date().toISOString().split('T')[0]);
  const [fechaFinal, setFechaFinal] = useState(new Date().toISOString().split('T')[0]);
  const [areaSeleccionada, setAreaSeleccionada] = useState('');
  const [buscarEstudio, setBuscarEstudio] = useState('');
  const [tipoReporte, setTipoReporte] = useState('');
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState('');
  const [resultados, setResultados] = useState([]);

  const handleBuscar = async () => {
    try {
      alert('Buscando plantas de trabajo...');
    } catch (error) {
      console.error('Error al buscar:', error);
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  const handleLimpiar = () => {
    setFechaInicial(new Date().toISOString().split('T')[0]);
    setFechaFinal(new Date().toISOString().split('T')[0]);
    setAreaSeleccionada('');
    setBuscarEstudio('');
    setTipoReporte('');
    setSucursalSeleccionada('');
    setResultados([]);
  };

  return (
    <Layout>
      <div className="plantas-trabajo-wrapper">
        <Header />

        <div className="plantas-trabajo-header">
          <h1 className="plantas-trabajo-title">Plantas de Trabajo</h1>
        </div>

        <div className="plantas-trabajo-content">
          <div className="controles-plantas">
            <div className="controles-row-1">
              <div className="fecha-grupo-plantas">
                <label>📅 Fecha Inicial:</label>
                <input
                  type="date"
                  value={fechaInicial}
                  onChange={(e) => setFechaInicial(e.target.value)}
                  className="input-fecha-plantas"
                />
              </div>

              <div className="fecha-grupo-plantas">
                <label>📅 Fecha Final:</label>
                <input
                  type="date"
                  value={fechaFinal}
                  onChange={(e) => setFechaFinal(e.target.value)}
                  className="input-fecha-plantas"
                />
              </div>

              <div className="area-busqueda-grupo">
                <select
                  value={areaSeleccionada}
                  onChange={(e) => setAreaSeleccionada(e.target.value)}
                  className="select-area-plantas"
                >
                  <option value="">Selecciona un Area</option>
                  <option value="laboratorio">Laboratorio</option>
                  <option value="radiologia">Radiología</option>
                  <option value="ultrasonido">Ultrasonido</option>
                  <option value="cardiologia">Cardiología</option>
                </select>
                <button className="btn-buscar-area" onClick={handleBuscar}>
                  🔍
                </button>
              </div>

              <div className="buscar-estudio-grupo-plantas">
                <input
                  type="text"
                  placeholder="Buscar por Estudio..."
                  value={buscarEstudio}
                  onChange={(e) => setBuscarEstudio(e.target.value)}
                  className="input-buscar-estudio-plantas"
                />
              </div>
            </div>

            <div className="controles-row-2">
              <button className="btn-buscar-plantas" onClick={handleBuscar}>
                Buscar
              </button>

              <button className="btn-imprimir-plantas" onClick={handleImprimir}>
                Imprimir
              </button>

              <button className="btn-limpiar-plantas" onClick={handleLimpiar}>
                Limpiar
              </button>

              <select
                value={tipoReporte}
                onChange={(e) => setTipoReporte(e.target.value)}
                className="select-tipo-reporte"
              >
                <option value="">Tipo Reporte</option>
                <option value="general">General</option>
                <option value="detallado">Detallado</option>
                <option value="resumen">Resumen</option>
              </select>

              <select
                value={sucursalSeleccionada}
                onChange={(e) => setSucursalSeleccionada(e.target.value)}
                className="select-sucursales"
              >
                <option value="">Selecciona Sucursales</option>
                <option value="matriz">Matriz</option>
                <option value="sucursal1">Sucursal 1</option>
                <option value="sucursal2">Sucursal 2</option>
              </select>
            </div>
          </div>

          <div className="resultados-plantas-area">
            {resultados.length === 0 ? (
              <div className="sin-resultados-plantas">
                <p>No hay resultados para mostrar</p>
                <p className="instrucciones-plantas">
                  Selecciona los filtros y presiona "Buscar" para ver las plantas de trabajo
                </p>
              </div>
            ) : (
              <div className="tabla-resultados-plantas-container">
                <table className="tabla-resultados-plantas">
                  <thead>
                    <tr>
                      <th>Folio</th>
                      <th>Paciente</th>
                      <th>Estudio</th>
                      <th>Área</th>
                      <th>Fecha</th>
                      <th>Estado</th>
                      <th>Sucursal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.map((resultado, index) => (
                      <tr key={index}>
                        <td>{resultado.folio}</td>
                        <td>{resultado.paciente}</td>
                        <td>{resultado.estudio}</td>
                        <td>{resultado.area}</td>
                        <td>{resultado.fecha}</td>
                        <td>
                          <span className={`estado-badge ${resultado.estado.toLowerCase()}`}>
                            {resultado.estado}
                          </span>
                        </td>
                        <td>{resultado.sucursal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PlantasTrabajo;