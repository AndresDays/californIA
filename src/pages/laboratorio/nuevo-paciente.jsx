import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase-client';
import { useAuth } from '../../context/auth-context';
import Layout from '../../components/layout';
import './nuevo-paciente.css';
import californIA from '../../assets/CalifornIA.png';
import usericon from '../../assets/usericon.png';
import notiIcon from '../../assets/notificaciones.png';
import HeaderLab from '../../components/header-laboratorio.jsx';

const NuevoPaciente = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Estados para el paciente
  const [buscarPaciente, setBuscarPaciente] = useState('');
  const [pacientesEncontrados, setPacientesEncontrados] = useState([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
  const [showBusquedaPacientes, setShowBusquedaPacientes] = useState(false);

  // Datos del paciente
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [edad, setEdad] = useState('');
  const [sexo, setSexo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');

  // Doctor
  const [doctorBusqueda, setDoctorBusqueda] = useState('');
  const [doctoresEncontrados, setDoctoresEncontrados] = useState([]);
  const [doctorSeleccionado, setDoctorSeleccionado] = useState(null);
  const [showBusquedaDoctores, setShowBusquedaDoctores] = useState(false);

  // Observaciones
  const [observaciones, setObservaciones] = useState('');

  // Empresa
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState('');
  const [empresas, setEmpresas] = useState([]);

  // Estudios
  const [buscarEstudio, setBuscarEstudio] = useState('');
  const [estudiosDisponibles, setEstudiosDisponibles] = useState([]);
  const [estudiosSeleccionados, setEstudiosSeleccionados] = useState([]);
  const [showBusquedaEstudios, setShowBusquedaEstudios] = useState(false);

  // Totales
  const [subtotal, setSubtotal] = useState(0);
  const [ivaPercent, setIvaPercent] = useState(16);
  const [iva, setIva] = useState(0);
  const [totalConIva, setTotalConIva] = useState(0);
  const [descuentoPercent, setDescuentoPercent] = useState(0);
  const [descuento, setDescuento] = useState(0);
  const [granTotal, setGranTotal] = useState(0);
  const [pagoRecibido, setPagoRecibido] = useState(0);
  const [cambio, setCambio] = useState(0);

  // Forma de pago
  const [formaPago, setFormaPago] = useState('efectivo');

  // Vendedor (usuario actual)
  const [vendedor, setVendedor] = useState('');

  // Cargar datos iniciales
  useEffect(() => {
    cargarEmpresas();
    cargarVendedor();
    cargarEstudiosDisponibles();
  }, []);

  // Calcular totales cuando cambian los estudios
  useEffect(() => {
    calcularTotales();
  }, [estudiosSeleccionados, ivaPercent, descuentoPercent, pagoRecibido]);

  const cargarVendedor = async () => {
    if (!user) return;

    try {
      const { data: perfil } = await supabase
        .from('perfiles_usuario')
        .select('nombre, empleados(nombre)')
        .eq('id', user.id)
        .single();

      if (perfil) {
        setVendedor(perfil.empleados?.nombre || perfil.nombre || user.email);
      }
    } catch (error) {
      console.error('Error al cargar vendedor:', error);
    }
  };

  const cargarEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id_empresa, nombre')
        .order('nombre');

      if (error) throw error;
      setEmpresas(data || []);
    } catch (error) {
      console.error('Error al cargar empresas:', error);
    }
  };

  const cargarEstudiosDisponibles = async () => {
    try {
      // Aquí cargarías los estudios disponibles desde tu base de datos
      // Por ahora usaré datos de ejemplo
      const estudiosEjemplo = [
        { id: 1, clave: 'BH001', descripcion: 'Biometría Hemática', tipo: 'Laboratorio', precio: 150, diasProceso: 1 },
        { id: 2, clave: 'QS001', descripcion: 'Química Sanguínea', tipo: 'Laboratorio', precio: 200, diasProceso: 1 },
        { id: 3, clave: 'RXT001', descripcion: 'Rayos X Tórax', tipo: 'Radiología', precio: 350, diasProceso: 1 },
        { id: 4, clave: 'EGO001', descripcion: 'Examen General de Orina', tipo: 'Laboratorio', precio: 100, diasProceso: 1 },
        { id: 5, clave: 'PL001', descripcion: 'Perfil de Lípidos', tipo: 'Laboratorio', precio: 250, diasProceso: 2 }
      ];
      setEstudiosDisponibles(estudiosEjemplo);
    } catch (error) {
      console.error('Error al cargar estudios:', error);
    }
  };

  const buscarPacientes = async (termino) => {
    if (termino.length < 2) {
      setPacientesEncontrados([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .ilike('nombre', `%${termino}%`)
        .limit(5);

      if (error) throw error;
      setPacientesEncontrados(data || []);
      setShowBusquedaPacientes(true);
    } catch (error) {
      console.error('Error al buscar pacientes:', error);
    }
  };

  const seleccionarPaciente = (paciente) => {
    setPacienteSeleccionado(paciente);
    setNombreCompleto(paciente.nombre);
    setTelefono(paciente.telefono || '');
    setCorreo(paciente.correo || '');
    
    // Calcular edad desde fecha_nacimiento
    if (paciente.fecha_nacimiento) {
      const hoy = new Date();
      const nacimiento = new Date(paciente.fecha_nacimiento);
      let edad = hoy.getFullYear() - nacimiento.getFullYear();
      const mes = hoy.getMonth() - nacimiento.getMonth();
      if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
      }
      setEdad(edad.toString());
    }

    setSexo(paciente.sexo || '');
    setBuscarPaciente(paciente.nombre);
    setShowBusquedaPacientes(false);
  };

  const buscarDoctores = async (termino) => {
    if (termino.length < 2) {
      setDoctoresEncontrados([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('empleados')
        .select('*')
        .eq('puesto', 'doctor')
        .ilike('nombre', `%${termino}%`)
        .limit(5);

      if (error) throw error;
      setDoctoresEncontrados(data || []);
      setShowBusquedaDoctores(true);
    } catch (error) {
      console.error('Error al buscar doctores:', error);
    }
  };

  const seleccionarDoctor = (doctor) => {
    setDoctorSeleccionado(doctor);
    setDoctorBusqueda(doctor.nombre);
    setShowBusquedaDoctores(false);
  };

  const filtrarEstudios = (termino) => {
    if (termino.length < 2) {
      setShowBusquedaEstudios(false);
      return;
    }

    setShowBusquedaEstudios(true);
  };

  const agregarEstudio = (estudio) => {
    // Verificar que no esté ya agregado
    if (estudiosSeleccionados.find(e => e.id === estudio.id)) {
      alert('Este estudio ya fue agregado');
      return;
    }

    setEstudiosSeleccionados([...estudiosSeleccionados, { ...estudio, cantidad: 1 }]);
    setBuscarEstudio('');
    setShowBusquedaEstudios(false);
  };

  const eliminarEstudio = (id) => {
    setEstudiosSeleccionados(estudiosSeleccionados.filter(e => e.id !== id));
  };

  const calcularTotales = () => {
    const sub = estudiosSeleccionados.reduce((sum, est) => sum + (est.precio * est.cantidad), 0);
    setSubtotal(sub);

    const ivaCalc = sub * (ivaPercent / 100);
    setIva(ivaCalc);

    const totalIva = sub + ivaCalc;
    setTotalConIva(totalIva);

    const desc = totalIva * (descuentoPercent / 100);
    setDescuento(desc);

    const gran = totalIva - desc;
    setGranTotal(gran);

    const camb = pagoRecibido - gran;
    setCambio(camb > 0 ? camb : 0);
  };

  const limpiarFormulario = () => {
    setPacienteSeleccionado(null);
    setNombreCompleto('');
    setEdad('');
    setSexo('');
    setTelefono('');
    setCorreo('');
    setDoctorSeleccionado(null);
    setDoctorBusqueda('');
    setObservaciones('');
    setEmpresaSeleccionada('');
    setEstudiosSeleccionados([]);
    setBuscarPaciente('');
    setBuscarEstudio('');
    setPagoRecibido(0);
    setDescuentoPercent(0);
  };

  const guardarYPagar = async () => {
    // Validaciones
    if (!nombreCompleto.trim()) {
      alert('Por favor ingrese el nombre del paciente');
      return;
    }

    if (estudiosSeleccionados.length === 0) {
      alert('Por favor agregue al menos un estudio');
      return;
    }

    if (pagoRecibido < granTotal) {
      alert('El pago recibido es menor al total');
      return;
    }

    try {
      // 1. Crear o actualizar paciente
      let idPaciente = pacienteSeleccionado?.id_paciente;

      if (!idPaciente) {
        const { data: nuevoPaciente, error: errorPaciente } = await supabase
          .from('pacientes')
          .insert([
            {
              nombre: nombreCompleto,
              telefono: telefono,
              correo: correo,
              sexo: sexo,
              tipo: empresaSeleccionada ? 'empresa' : 'particular'
            }
          ])
          .select()
          .single();

        if (errorPaciente) throw errorPaciente;
        idPaciente = nuevoPaciente.id_paciente;
      }

      // 2. Crear estudios
      const estudiosParaInsertar = estudiosSeleccionados.map(est => ({
        id_paciente: idPaciente,
        tipo_estudio: est.tipo.toLowerCase(),
        fecha_estudio: new Date().toISOString(),
        estado: 'pendiente'
      }));

      const { data: estudiosCreados, error: errorEstudios } = await supabase
        .from('estudios')
        .insert(estudiosParaInsertar)
        .select();

      if (errorEstudios) throw errorEstudios;

      // 3. Crear venta/recibo
      // Aquí crearías el registro de la venta/pago

      alert('¡Venta registrada exitosamente!');
      limpiarFormulario();
      
      // Opcional: Imprimir ticket o navegar a otra página
      // navigate('/recepcion');

    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Error al guardar la venta: ' + error.message);
    }
  };

  const estudiosFiltrados = estudiosDisponibles.filter(est =>
    est.descripcion.toLowerCase().includes(buscarEstudio.toLowerCase()) ||
    est.clave.toLowerCase().includes(buscarEstudio.toLowerCase())
  );

  return (
    <Layout>
      <div className="nuevo-paciente-wrapper">
        <HeaderLab/>

        {/* Main Content */}
        <main className="page-main">
          <div className="content-grid">
            {/* Columna Izquierda - Datos del Paciente */}
            <div className="left-column">
              {/* Agregar Cliente */}
              <section className="form-section">
                <h2 className="section-title">Agregar Cliente</h2>
                
                <div className="search-container">
                  <input
                    type="text"
                    placeholder="Buscar paciente existente..."
                    value={buscarPaciente}
                    onChange={(e) => {
                      setBuscarPaciente(e.target.value);
                      buscarPacientes(e.target.value);
                    }}
                    className="search-input"
                  />
                  <button className="btn-search">👤</button>
                </div>

                {showBusquedaPacientes && pacientesEncontrados.length > 0 && (
                  <div className="search-results">
                    {pacientesEncontrados.map(pac => (
                      <div
                        key={pac.id_paciente}
                        className="search-result-item"
                        onClick={() => seleccionarPaciente(pac)}
                      >
                        {pac.nombre}
                      </div>
                    ))}
                  </div>
                )}

                <div className="form-group">
                  <label>Nombre Completo</label>
                  <input
                    type="text"
                    value={nombreCompleto}
                    onChange={(e) => setNombreCompleto(e.target.value)}
                    className="form-input"
                    placeholder="Nombre completo del paciente"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Edad</label>
                    <input
                      type="number"
                      value={edad}
                      onChange={(e) => setEdad(e.target.value)}
                      className="form-input"
                      placeholder="Edad"
                    />
                  </div>

                  <div className="form-group">
                    <label>Sexo</label>
                    <select
                      value={sexo}
                      onChange={(e) => setSexo(e.target.value)}
                      className="form-select"
                    >
                      <option value="">Seleccionar</option>
                      <option value="masculino">Masculino</option>
                      <option value="femenino">Femenino</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="form-input"
                    placeholder="Número de teléfono"
                  />
                </div>

                <div className="form-group">
                  <label>Correo</label>
                  <input
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    className="form-input"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </section>

              {/* Agregar Doctor */}
              <section className="form-section">
                <h2 className="section-title">Agregar Doctor</h2>
                
                <div className="search-container">
                  <input
                    type="text"
                    placeholder="A QUIEN CORRESPONDA"
                    value={doctorBusqueda}
                    onChange={(e) => {
                      setDoctorBusqueda(e.target.value);
                      buscarDoctores(e.target.value);
                    }}
                    className="search-input"
                  />
                  <button className="btn-search">👨‍⚕️</button>
                </div>

                {showBusquedaDoctores && doctoresEncontrados.length > 0 && (
                  <div className="search-results">
                    {doctoresEncontrados.map(doc => (
                      <div
                        key={doc.id_empleado}
                        className="search-result-item"
                        onClick={() => seleccionarDoctor(doc)}
                      >
                        {doc.nombre}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Observaciones */}
              <section className="form-section">
                <h2 className="section-title">Observaciones</h2>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="form-textarea"
                  rows="3"
                  placeholder="Observaciones adicionales..."
                />
              </section>

              <div className="vendedor-display">
                Vendedor: <strong>{vendedor}</strong>
              </div>
            </div>

            {/* Columna Derecha - Estudios y Pago */}
            <div className="right-column">
              {/* Empresa */}
              <div className="top-controls">
                <div className="form-group-inline">
                  <label>Empresas</label>
                  <select
                    value={empresaSeleccionada}
                    onChange={(e) => setEmpresaSeleccionada(e.target.value)}
                    className="form-select"
                  >
                    <option value="">Selecciona una Empresa</option>
                    {empresas.map(emp => (
                      <option key={emp.id_empresa} value={emp.id_empresa}>
                        {emp.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="action-buttons">
                  <button className="btn-secondary">Muestras Pendientes</button>
                  <button className="btn-primary">📋 Cotizaciones</button>
                </div>
              </div>

              {/* Lista de Estudios */}
              <section className="estudios-section">
                <h2 className="section-title">Lista de precios</h2>
                
                <div className="search-container" style={{position: 'relative'}}>
                  <input
                    type="text"
                    placeholder="Buscar Estudios..."
                    value={buscarEstudio}
                    onChange={(e) => {
                      setBuscarEstudio(e.target.value);
                      filtrarEstudios(e.target.value);
                    }}
                    className="search-input-full"
                  />

                  {showBusquedaEstudios && buscarEstudio.length >= 2 && (
                    <div className="search-results-estudios">
                      {estudiosFiltrados.map(est => (
                        <div
                          key={est.id}
                          className="search-result-item"
                          onClick={() => agregarEstudio(est)}
                        >
                          <strong>{est.clave}</strong> - {est.descripcion} (${est.precio})
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="estudios-table-container">
                  <table className="estudios-table">
                    <thead>
                      <tr>
                        <th>Clave</th>
                        <th>Descripción</th>
                        <th>Tipo</th>
                        <th>Precio</th>
                        <th>Días Proceso</th>
                        <th>Borrar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estudiosSeleccionados.map((est) => (
                        <tr key={est.id}>
                          <td>{est.clave}</td>
                          <td>{est.descripcion}</td>
                          <td>{est.tipo}</td>
                          <td>${est.precio.toFixed(2)}</td>
                          <td>{est.diasProceso} días</td>
                          <td>
                            <button
                              className="btn-delete"
                              onClick={() => eliminarEstudio(est.id)}
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                      {estudiosSeleccionados.length === 0 && (
                        <tr>
                          <td colSpan="6" className="empty-message">
                            
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Totales y Pago */}
              <section className="totales-section">
                <div className="totales-grid">
                  <div className="total-item">
                    <label>Total</label>
                    <input
                      type="text"
                      value={`$${subtotal.toFixed(2)}`}
                      readOnly
                      className="total-input"
                    />
                  </div>

                  <div className="total-item">
                    <label>IVA %</label>
                    <input
                      type="number"
                      value={ivaPercent}
                      onChange={(e) => setIvaPercent(parseFloat(e.target.value) || 0)}
                      className="total-input-small"
                    />
                  </div>

                  <div className="total-item">
                    <label>Total+IVA</label>
                    <input
                      type="text"
                      value={`$${totalConIva.toFixed(2)}`}
                      readOnly
                      className="total-input-highlight"
                    />
                  </div>
                </div>

                <div className="pago-grid">
                  <div className="pago-item">
                    <label>Forma Pago</label>
                    <select
                      value={formaPago}
                      onChange={(e) => setFormaPago(e.target.value)}
                      className="form-select"
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="transferencia">Transferencia</option>
                    </select>
                  </div>

                  <div className="pago-item">
                    <label>Desc %</label>
                    <input
                      type="number"
                      value={descuentoPercent}
                      onChange={(e) => setDescuentoPercent(parseFloat(e.target.value) || 0)}
                      className="form-input-small"
                    />
                  </div>
                </div>

                <div className="final-totales">
                  <div className="final-item">
                    <label>Desc</label>
                    <input
                      type="text"
                      value={`$${descuento.toFixed(2)}`}
                      readOnly
                      className="total-input"
                    />
                  </div>

                  <div className="final-item">
                    <label>Gran Total</label>
                    <input
                      type="text"
                      value={`$${granTotal.toFixed(2)}`}
                      readOnly
                      className="total-input-grand"
                    />
                  </div>

                  <div className="final-item">
                    <label>Pago</label>
                    <input
                      type="number"
                      value={pagoRecibido}
                      onChange={(e) => setPagoRecibido(parseFloat(e.target.value) || 0)}
                      className="form-input-pago"
                      placeholder="Paga con"
                    />
                  </div>
                </div>

                {cambio > 0 && (
                  <div className="cambio-display">
                    <strong>Cambio:</strong> ${cambio.toFixed(2)}
                  </div>
                )}
              </section>

              {/* Botones de Acción */}
              <div className="action-buttons-final">
                <button className="btn-pagar" onClick={guardarYPagar}>
                  Pagar
                </button>
                <button className="btn-guardar" onClick={guardarYPagar}>
                  Guardar e Imprimir
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
};

export default NuevoPaciente;