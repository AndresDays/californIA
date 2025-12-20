import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase-client';
import { useAuth } from '../../../context/auth-context';
import Layout from '../../../components/layout';
import Header from '../../../components/header-laboratorio.jsx';
import './Historial.css';

const Historial = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [buscarCliente, setBuscarCliente] = useState('');
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
  const [historialPaciente, setHistorialPaciente] = useState([]);
  
  // Datos del paciente
  const [nombre, setNombre] = useState('');
  const [sexo, setSexo] = useState('');
  const [edad, setEdad] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [folio, setFolio] = useState('');

  // Estudios
  const [observaciones, setObservaciones] = useState('');
  const [estudios, setEstudios] = useState([]);

  const buscarPaciente = async () => {
    if (!buscarCliente.trim()) return;

    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .or(`nombre.ilike.%${buscarCliente}%,id_paciente.eq.${buscarCliente}`)
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        setPacienteSeleccionado(data);
        setNombre(data.nombre || '');
        setSexo(data.sexo || '');
        setTelefono(data.telefono || '');
        setEmail(data.email || '');
        setFechaNacimiento(data.fecha_nacimiento || '');
        
        // Calcular edad
        if (data.fecha_nacimiento) {
          const edad = calcularEdad(data.fecha_nacimiento);
          setEdad(edad.toString());
        }

        // Cargar historial
        await cargarHistorial(data.id_paciente);
      }
    } catch (error) {
      console.error('Error al buscar paciente:', error);
    }
  };

  const cargarHistorial = async (idPaciente) => {
    try {
      const { data, error } = await supabase
        .from('estudios')
        .select('id_estudio, fecha_estudio, tipo_estudio')
        .eq('id_paciente', idPaciente)
        .order('fecha_estudio', { ascending: false });

      if (error) throw error;

      const historialFormateado = data?.map(est => ({
        folio: est.id_estudio,
        fecha: new Date(est.fecha_estudio).toLocaleDateString('es-MX'),
        hora: new Date(est.fecha_estudio).toLocaleTimeString('es-MX', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      })) || [];

      setHistorialPaciente(historialFormateado);
    } catch (error) {
      console.error('Error al cargar historial:', error);
    }
  };

  const seleccionarEstudio = async (folio) => {
    try {
      setFolio(folio.toString());
      
      // Cargar estudios del folio seleccionado
      const { data, error } = await supabase
        .from('resultados')
        .select('*')
        .eq('id_estudio', folio);

      if (error) throw error;

      const estudiosFormateados = data?.map(res => ({
        clave: res.clave_estudio || 'N/A',
        estudio: res.nombre_estudio || 'N/A',
        resultado: res.resultado || '',
        unidades: res.unidades || '',
        referencia: res.referencia || ''
      })) || [];

      setEstudios(estudiosFormateados);
    } catch (error) {
      console.error('Error al cargar estudios:', error);
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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      buscarPaciente();
    }
  };

  return (
    <Layout>
      <div className="historial-wrapper">
        <Header />

        <div className="historial-header">
          <h1 className="historial-title">Historial</h1>
        </div>

        <div className="historial-content">
          {/* Panel Izquierdo */}
          <div className="panel-historial-paciente">
            <div className="buscar-cliente-grupo">
              <span className="icon-user">👤</span>
              <input
                type="text"
                placeholder="Buscar Cliente..."
                value={buscarCliente}
                onChange={(e) => setBuscarCliente(e.target.value)}
                onKeyPress={handleKeyPress}
                className="input-buscar-cliente"
              />
            </div>

            <div className="historial-paciente-section">
              <h2 className="section-title-hist turquesa">Historial del Paciente</h2>

              <div className="tabla-historial-container">
                <table className="tabla-historial">
                  <thead>
                    <tr>
                      <th>Folio</th>
                      <th>Fecha</th>
                      <th>Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historialPaciente.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="sin-historial">
                          No hay historial para mostrar
                        </td>
                      </tr>
                    ) : (
                      historialPaciente.map((item) => (
                        <tr 
                          key={item.folio}
                          onClick={() => seleccionarEstudio(item.folio)}
                          className={folio === item.folio.toString() ? 'selected' : ''}
                        >
                          <td>{item.folio}</td>
                          <td>{item.fecha}</td>
                          <td>{item.hora}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Panel Derecho */}
          <div className="panel-datos-estudios">
            <div className="datos-paciente-grid">
              <div className="campo-dato">
                <label>Nombre:</label>
                <span>{nombre || '-'}</span>
              </div>

              <div className="campo-dato">
                <label>Sexo:</label>
                <span>{sexo || '-'}</span>
              </div>

              <div className="campo-dato">
                <label>Edad:</label>
                <span>{edad || '-'}</span>
              </div>

              <div className="campo-dato">
                <label>Telefono:</label>
                <span>{telefono || '-'}</span>
              </div>

              <div className="campo-dato">
                <label>Email:</label>
                <span>{email || '-'}</span>
              </div>

              <div className="campo-dato">
                <label>Fecha Nacimiento:</label>
                <span>{fechaNacimiento ? new Date(fechaNacimiento).toLocaleDateString('es-MX') : '-'}</span>
              </div>

              <div className="campo-dato">
                <label>Folio:</label>
                <span>{folio || '-'}</span>
              </div>
            </div>

            <div className="estudios-paciente-section">
              <h2 className="section-title-hist amarillo">Estudios del Paciente</h2>

              <div className="observaciones-hist-grupo">
                <label>Observaciones</label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="textarea-observaciones-hist"
                  rows="3"
                />
              </div>

              <div className="tabla-estudios-hist-container">
                <table className="tabla-estudios-hist">
                  <thead>
                    <tr>
                      <th>Clave - Estudio</th>
                      <th>Resultado</th>
                      <th>Unidades</th>
                      <th>Referencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estudios.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="sin-estudios-hist">
                          No hay estudios para mostrar
                        </td>
                      </tr>
                    ) : (
                      estudios.map((estudio, index) => (
                        <tr key={index}>
                          <td>{estudio.clave} - {estudio.estudio}</td>
                          <td>{estudio.resultado}</td>
                          <td>{estudio.unidades}</td>
                          <td>{estudio.referencia}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Historial;