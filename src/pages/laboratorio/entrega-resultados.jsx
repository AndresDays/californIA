import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase-client';
import { useAuth } from '../../context/auth-context';
import Layout from '../../components/layout.jsx';
import Header from '../../components/header-laboratorio.jsx';
import './entrega-resultados.css';

const EntregaResultados = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [fechaInicial, setFechaInicial] = useState(new Date().toISOString().split('T')[0]);
  const [fechaFinal, setFechaFinal] = useState(new Date().toISOString().split('T')[0]);
  const [mediaPagina, setMediaPagina] = useState(false);
  const [imprimirEncabezado, setImprimirEncabezado] = useState(true);
  const [idioma, setIdioma] = useState('español');
  const [buscarFolio, setBuscarFolio] = useState('');
  const [buscarNombre, setBuscarNombre] = useState('');
  const [pacientes, setPacientes] = useState([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
  const [estudios, setEstudios] = useState([]);
  const [observaciones, setObservaciones] = useState('');
  const [historialImpresiones, setHistorialImpresiones] = useState([]);

  useEffect(() => {
    cargarPacientes();
  }, [fechaInicial, fechaFinal]);

  const cargarPacientes = async () => {
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
            fecha_nacimiento,
            sexo,
            tipo
          )
        `)
        .gte('fecha_estudio', fechaInicial)
        .lte('fecha_estudio', fechaFinal)
        .in('estado', ['validado', 'entregado'])
        .order('fecha_estudio', { ascending: false });

      if (error) throw error;

      const pacientesMap = new Map();
      data?.forEach(estudio => {
        const idPaciente = estudio.pacientes?.id_paciente;
        if (!pacientesMap.has(idPaciente)) {
          pacientesMap.set(idPaciente, {
            ...estudio.pacientes,
            folio: estudio.id_estudio,
            empresa: estudio.pacientes?.tipo === 'empresa' ? 'ISSSTE' : 'Particular'
          });
        }
      });

      setPacientes(Array.from(pacientesMap.values()));
    } catch (error) {
      console.error('Error al cargar pacientes:', error);
    }
  };

  const seleccionarPaciente = async (paciente) => {
    setPacienteSeleccionado(paciente);
    await cargarEstudiosPaciente(paciente.id_paciente);
  };

  const cargarEstudiosPaciente = async (idPaciente) => {
    try {
      const { data, error } = await supabase
        .from('estudios')
        .select(`id_estudio, tipo_estudio, estado, fecha_estudio`)
        .eq('id_paciente', idPaciente)
        .in('estado', ['validado', 'entregado']);

      if (error) throw error;

      const estudiosFormateados = data?.map(est => ({
        clave: `EST-${est.id_estudio}`,
        estudio: est.tipo_estudio,
        icono: '📄',
        estatus: est.estado === 'entregado' ? 'Entregado' : 'Validado',
        saldo: '$0.00',
        entregar: est.estado !== 'entregado'
      })) || [];

      setEstudios(estudiosFormateados);
    } catch (error) {
      console.error('Error al cargar estudios:', error);
    }
  };

  const handleEnviarEmail = () => {
    if (!pacienteSeleccionado) {
      alert('Seleccione un paciente primero');
      return;
    }
    alert('Enviando resultados por email...');
  };

  const handleEnviarWhatsApp = () => {
    if (!pacienteSeleccionado) {
      alert('Seleccione un paciente primero');
      return;
    }
    alert('Enviando resultados por WhatsApp...');
  };

  const handleImprimir = () => {
    if (!pacienteSeleccionado) {
      alert('Seleccione un paciente primero');
      return;
    }
    window.print();
  };

  const handleGuardarObservaciones = async () => {
    try {
      alert('Observaciones guardadas');
    } catch (error) {
      console.error('Error al guardar observaciones:', error);
    }
  };

  const handleEntregarEstudio = async (clave) => {
    try {
      const idEstudio = parseInt(clave.replace('EST-', ''));
      
      const { error } = await supabase
        .from('estudios')
        .update({ estado: 'entregado' })
        .eq('id_estudio', idEstudio);

      if (error) throw error;

      if (pacienteSeleccionado) {
        await cargarEstudiosPaciente(pacienteSeleccionado.id_paciente);
      }
      
      alert('Estudio marcado como entregado');
    } catch (error) {
      console.error('Error al entregar estudio:', error);
      alert('Error al entregar el estudio');
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

  const pacientesFiltrados = pacientes.filter(pac => {
    const matchFolio = buscarFolio === '' || pac.folio.toString().includes(buscarFolio);
    const matchNombre = buscarNombre === '' || pac.nombre.toLowerCase().includes(buscarNombre.toLowerCase());
    return matchFolio && matchNombre;
  });

  return (
    <Layout>
      <div className="entrega-wrapper">
        <Header />
        <div className="entrega-title-section">
          <h1 className="entrega-title">Entrega de Resultados</h1>
        </div>
        <div className="entrega-controls-top">
          <div className="controls-row-1">
            <div className="fecha-grupo">
              <label>📅 Fecha Inicial:</label>
              <input type="date" value={fechaInicial} onChange={(e) => setFechaInicial(e.target.value)} className="input-fecha-entrega" />
            </div>
            <div className="fecha-grupo">
              <label>📅 Fecha Final:</label>
              <input type="date" value={fechaFinal} onChange={(e) => setFechaFinal(e.target.value)} className="input-fecha-entrega" />
            </div>
            <label className="checkbox-control">
              <input type="checkbox" checked={mediaPagina} onChange={(e) => setMediaPagina(e.target.checked)} />
              Media Página
            </label>
            <label className="checkbox-control">
              <input type="checkbox" checked={imprimirEncabezado} onChange={(e) => setImprimirEncabezado(e.target.checked)} />
              Imprimir Encabezado y Pie de Página
            </label>
            <select value={idioma} onChange={(e) => setIdioma(e.target.value)} className="select-idioma-entrega">
              <option value="español">Español</option>
              <option value="english">English</option>
            </select>
            <button className="btn-imprimir-entrega" onClick={handleImprimir}>🖨️ Imprimir</button>
          </div>
          <div className="controls-row-2">
            <button className="btn-email" onClick={handleEnviarEmail}>📧 Enviar por e-mail</button>
            <button className="btn-whatsapp" onClick={handleEnviarWhatsApp}>💬 Enviar por WhatsApp</button>
            <div className="buscar-folio-grupo">
              <span className="barcode-icon">|||||||||||</span>
              <input type="text" placeholder="Buscar por Folio..." value={buscarFolio} onChange={(e) => setBuscarFolio(e.target.value)} className="input-buscar-folio" />
            </div>
          </div>
        </div>
        <div className="entrega-content">
          <div className="panel-pacientes-entrega">
            <div className="buscar-nombre-section">
              <label>Busca Por Nombre</label>
              <input type="text" value={buscarNombre} onChange={(e) => setBuscarNombre(e.target.value)} className="input-buscar-nombre" />
            </div>
            <div className="tabla-pacientes-entrega-container">
              <table className="tabla-pacientes-entrega">
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Nombre</th>
                    <th>Edad</th>
                    <th>Sexo</th>
                    <th>Empresa</th>
                    <th>Lote</th>
                  </tr>
                </thead>
                <tbody>
                  {pacientesFiltrados.map((paciente) => (
                    <tr key={paciente.id_paciente} className={pacienteSeleccionado?.id_paciente === paciente.id_paciente ? 'selected' : ''} onClick={() => seleccionarPaciente(paciente)}>
                      <td>{paciente.folio}</td>
                      <td>{paciente.nombre}</td>
                      <td>{calcularEdad(paciente.fecha_nacimiento)} años</td>
                      <td>{paciente.sexo}</td>
                      <td>{paciente.empresa}</td>
                      <td><input type="checkbox" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="registros-info">Mostrando registros del 1 al {pacientesFiltrados.length} de un total de {pacientes.length}</div>
          </div>
          <div className="panel-detalles-entrega">
            <div className="observaciones-entrega-section">
              <div className="observaciones-header">
                <label>Observaciones de Entrega</label>
                <button className="btn-guardar-obs" onClick={handleGuardarObservaciones} title="Guardar observaciones">💾</button>
              </div>
              <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="textarea-observaciones-entrega" rows="4" />
            </div>
            <div className="historial-section">
              <label>Historial de Impresiones</label>
              <div className="historial-container">
                {historialImpresiones.length === 0 ? (
                  <div className="sin-historial">No hay impresiones registradas</div>
                ) : (
                  <table className="tabla-historial">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Usuario</th>
                        <th>Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historialImpresiones.map((item, index) => (
                        <tr key={index}>
                          <td>{item.fecha}</td>
                          <td>{item.usuario}</td>
                          <td>{item.tipo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            <div className="estudios-entrega-section">
              <table className="tabla-estudios-entrega">
                <thead>
                  <tr>
                    <th>Clave</th>
                    <th>Estudio</th>
                    <th>Ícono</th>
                    <th>Estatus</th>
                    <th>Saldo</th>
                    <th>Entregar</th>
                  </tr>
                </thead>
                <tbody>
                  {estudios.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="sin-estudios">Seleccione un paciente para ver sus estudios</td>
                    </tr>
                  ) : (
                    estudios.map((estudio, index) => (
                      <tr key={index}>
                        <td>{estudio.clave}</td>
                        <td>{estudio.estudio}</td>
                        <td>{estudio.icono}</td>
                        <td><span className={`estatus-badge ${estudio.estatus.toLowerCase()}`}>{estudio.estatus}</span></td>
                        <td>{estudio.saldo}</td>
                        <td>{estudio.entregar && (<button className="btn-entregar" onClick={() => handleEntregarEstudio(estudio.clave)}>✓</button>)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default EntregaResultados;