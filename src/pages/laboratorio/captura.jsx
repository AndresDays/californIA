import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase-client';
import { useAuth } from '../../context/auth-context';
import Layout from '../../components/layout';
import './captura.css';
import californIA from '../../assets/CalifornIA.png';
import usericon from '../../assets/usericon.png';
import HeaderLab from '../../components/header-laboratorio.jsx';

const Captura = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fechas
  const [fechaInicial, setFechaInicial] = useState(new Date().toISOString().split('T')[0]);
  const [fechaFinal, setFechaFinal] = useState(new Date().toISOString().split('T')[0]);

  // Búsquedas
  const [buscarEstudio, setBuscarEstudio] = useState('');
  const [buscarPaciente, setBuscarPaciente] = useState('');

  // Filtros
  const [estudiosSeleccionados, setEstudiosSeleccionados] = useState([]);
  const [areasSeleccionadas, setAreasSeleccionadas] = useState([]);
  const [areaFiltro, setAreaFiltro] = useState('todas');
  const [soloPendientes, setSoloPendientes] = useState(false);

  // Pacientes
  const [pacientes, setPacientes] = useState([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);

  // Área de captura
  const [idioma, setIdioma] = useState('español');
  const [mediaPagina, setMediaPagina] = useState(false);
  const [imprimirEncabezado, setImprimirEncabezado] = useState(true);
  const [observaciones, setObservaciones] = useState('');
  const [resultados, setResultados] = useState([]);

  // Usuario
  const [usuarioActual, setUsuarioActual] = useState('');

  useEffect(() => {
    cargarUsuario();
    cargarPacientes();
  }, []);

  const cargarUsuario = async () => {
    if (!user) return;

    try {
      const { data: perfil } = await supabase
        .from('perfiles_usuario')
        .select('nombre, empleados(nombre)')
        .eq('id', user.id)
        .single();

      if (perfil) {
        setUsuarioActual(perfil.empleados?.nombre || perfil.nombre || user.email);
      }
    } catch (error) {
      console.error('Error al cargar usuario:', error);
    }
  };

  const cargarPacientes = async () => {
    try {
      const { data, error } = await supabase
        .from('estudios')
        .select(`
          id_estudio,
          fecha_estudio,
          estado,
          tipo_estudio,
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
        .order('fecha_estudio', { ascending: false });

      if (error) throw error;

      // Filtrar por pendientes si está activado
      let pacientesFiltrados = data || [];
      if (soloPendientes) {
        pacientesFiltrados = pacientesFiltrados.filter(e => e.estado === 'pendiente');
      }

      setPacientes(pacientesFiltrados);
    } catch (error) {
      console.error('Error al cargar pacientes:', error);
    }
  };

  useEffect(() => {
    cargarPacientes();
  }, [fechaInicial, fechaFinal, soloPendientes]);

  const seleccionarPaciente = (estudio) => {
    setPacienteSeleccionado(estudio);
    // Cargar resultados del estudio
    cargarResultados(estudio.id_estudio);
  };

  const cargarResultados = async (idEstudio) => {
    // Aquí cargarías los resultados específicos del estudio
    // Por ahora usaré datos de ejemplo
    const resultadosEjemplo = [
      { clave: 'HB', descripcion: 'Hemoglobina', resultado: '', unidades: 'g/dL', referencia: '12-16' },
      { clave: 'HCT', descripcion: 'Hematocrito', resultado: '', unidades: '%', referencia: '37-47' },
      { clave: 'RBC', descripcion: 'Eritrocitos', resultado: '', unidades: 'mill/mm³', referencia: '4.2-5.4' },
      { clave: 'WBC', descripcion: 'Leucocitos', resultado: '', unidades: 'mil/mm³', referencia: '4.5-11' },
      { clave: 'PLT', descripcion: 'Plaquetas', resultado: '', unidades: 'mil/mm³', referencia: '150-450' }
    ];
    setResultados(resultadosEjemplo);
  };

  const actualizarResultado = (index, valor) => {
    const nuevosResultados = [...resultados];
    nuevosResultados[index].resultado = valor;
    setResultados(nuevosResultados);
  };

  const guardarCaptura = async () => {
    if (!pacienteSeleccionado) {
      alert('Por favor seleccione un paciente');
      return;
    }

    try {
      // Guardar resultados en la base de datos
      // Aquí implementarías la lógica de guardado

      alert('Resultados guardados exitosamente');
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Error al guardar los resultados');
    }
  };

  const vistaPrevia = () => {
    if (!pacienteSeleccionado) {
      alert('Por favor seleccione un paciente');
      return;
    }
    // Lógica para vista previa
    console.log('Vista previa');
  };

  const imprimir = () => {
    if (!pacienteSeleccionado) {
      alert('Por favor seleccione un paciente');
      return;
    }
    // Lógica para imprimir
    window.print();
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

  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-MX');
  };

  const formatHora = (fecha) => {
    return new Date(fecha).toLocaleTimeString('es-MX', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const pacientesFiltrados = pacientes.filter(pac => {
    const matchPaciente = buscarPaciente === '' || 
      pac.pacientes?.nombre.toLowerCase().includes(buscarPaciente.toLowerCase());
    const matchEstudio = buscarEstudio === '' || 
      pac.tipo_estudio.toLowerCase().includes(buscarEstudio.toLowerCase());
    return matchPaciente && matchEstudio;
  });

  return (
    <Layout>
      <div className="captura-wrapper">
        <HeaderLab/>

        {/* Filtros */}
        <div className="filtros-section">
          <div className="filtros-row">
            <div className="filtro-fecha">
              <label>📅 Fecha Inicial:</label>
              <input
                type="date"
                value={fechaInicial}
                onChange={(e) => setFechaInicial(e.target.value)}
                className="input-fecha"
              />
            </div>

            <div className="filtro-fecha">
              <label>📅 Fecha Final:</label>
              <input
                type="date"
                value={fechaFinal}
                onChange={(e) => setFechaFinal(e.target.value)}
                className="input-fecha"
              />
            </div>

            <div className="filtro-busqueda">
              <label>🔍</label>
              <input
                type="text"
                placeholder="Buscar por Estudio..."
                value={buscarEstudio}
                onChange={(e) => setBuscarEstudio(e.target.value)}
                className="input-busqueda"
              />
            </div>

            <div className="filtro-busqueda">
              <label>🔍</label>
              <input
                type="text"
                placeholder="Buscar por Paciente..."
                value={buscarPaciente}
                onChange={(e) => setBuscarPaciente(e.target.value)}
                className="input-busqueda"
              />
            </div>

            <div className="filtro-select">
              <select className="select-filtro">
                <option>All selected (3)</option>
              </select>
            </div>

            <div className="filtro-select">
              <select className="select-filtro">
                <option>All selected (19)</option>
              </select>
            </div>

            <div className="filtro-select">
              <select 
                value={areaFiltro}
                onChange={(e) => setAreaFiltro(e.target.value)}
                className="select-filtro"
              >
                <option value="todas">Todas Áreas</option>
                <option value="laboratorio">Laboratorio</option>
                <option value="radiologia">Radiología</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contenido Principal */}
        <div className="captura-content">
          {/* Panel Izquierdo - Lista de Pacientes */}
          <div className="panel-pacientes">
            <div className="panel-header-pacientes">
              <h2>Lista de Pacientes</h2>
            </div>

            <div className="pacientes-controls">
              <div className="badge-pac">
                #Pac <span className="badge-numero">{pacientesFiltrados.length}</span>
              </div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={soloPendientes}
                  onChange={(e) => setSoloPendientes(e.target.checked)}
                />
                Solo Ordenes Pendientes
              </label>
            </div>

            <div className="tabla-pacientes-container">
              <table className="tabla-pacientes">
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Nombre</th>
                    <th>Edad</th>
                    <th>Sexo</th>
                    <th>Sucursal</th>
                    <th>Empresa</th>
                    <th>Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {pacientesFiltrados.map((estudio) => (
                    <tr
                      key={estudio.id_estudio}
                      className={pacienteSeleccionado?.id_estudio === estudio.id_estudio ? 'selected' : ''}
                      onClick={() => seleccionarPaciente(estudio)}
                    >
                      <td>{estudio.id_estudio}</td>
                      <td>{estudio.pacientes?.nombre || 'N/A'}</td>
                      <td>{calcularEdad(estudio.pacientes?.fecha_nacimiento)}</td>
                      <td>{estudio.pacientes?.sexo || 'N/A'}</td>
                      <td>Principal</td>
                      <td>{estudio.pacientes?.tipo === 'empresa' ? 'Empresa' : 'Particular'}</td>
                      <td>{formatHora(estudio.fecha_estudio)}</td>
                    </tr>
                  ))}
                  {pacientesFiltrados.length === 0 && (
                    <tr>
                      <td colSpan="7" className="no-data">
                        No hay pacientes para mostrar
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Panel Derecho - Área de Captura */}
          <div className="panel-captura">
            <div className="panel-header-captura">
              <h2>Área de Captura</h2>
            </div>

            <div className="captura-controls">
              <button className="btn-vista-previa" onClick={vistaPrevia}>
                Vista previa
              </button>

              <select 
                value={idioma}
                onChange={(e) => setIdioma(e.target.value)}
                className="select-idioma"
              >
                <option value="español">Español</option>
                <option value="english">English</option>
              </select>

              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={mediaPagina}
                  onChange={(e) => setMediaPagina(e.target.checked)}
                />
                Media Página
              </label>

              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={imprimirEncabezado}
                  onChange={(e) => setImprimirEncabezado(e.target.checked)}
                />
                Imprimir Encabezado y Pie de Página
              </label>

              <button className="btn-imprimir" onClick={imprimir}>
                Imprimir
              </button>
            </div>

            <div className="observaciones-section">
              <label>Observaciones</label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="textarea-observaciones"
                rows="3"
                placeholder="Observaciones del estudio..."
              />
            </div>

            <div className="tabla-resultados-container">
              <table className="tabla-resultados">
                <thead>
                  <tr>
                    <th>Clave</th>
                    <th>Descripción</th>
                    <th>Resultado</th>
                    <th>Unidades</th>
                    <th>Referencia</th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((resultado, index) => (
                    <tr key={index}>
                      <td>{resultado.clave}</td>
                      <td>{resultado.descripcion}</td>
                      <td>
                        <input
                          type="text"
                          value={resultado.resultado}
                          onChange={(e) => actualizarResultado(index, e.target.value)}
                          className="input-resultado"
                          placeholder="Ingrese resultado"
                        />
                      </td>
                      <td>{resultado.unidades}</td>
                      <td>{resultado.referencia}</td>
                    </tr>
                  ))}
                  {resultados.length === 0 && (
                    <tr>
                      <td colSpan="5" className="no-data">
                        Seleccione un paciente para capturar resultados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {pacienteSeleccionado && (
              <div className="captura-actions">
                <button className="btn-guardar-captura" onClick={guardarCaptura}>
                  Guardar Captura
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Captura;