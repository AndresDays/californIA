import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase-client';
import { useAuth } from '../../context/auth-context';
import Layout from '../../components/layout.jsx';
import './nuevo-paciente.css';
import HeaderLab from '../../components/header-laboratorio.jsx';
import ModalAgregarPaciente from './componentes/modal-agregar-paciente';
import ModalAgregarDoctor from './componentes/modal-agregar-doctor';

const NuevoPaciente = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [modalAgregarPacienteOpen, setModalAgregarPacienteOpen] = useState(false);
  const [modalAgregarDoctorOpen, setModalAgregarDoctorOpen] = useState(false);

  const [buscarPaciente, setBuscarPaciente] = useState('');
  const [pacientesEncontrados, setPacientesEncontrados] = useState([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
  const [showBusquedaPacientes, setShowBusquedaPacientes] = useState(false);

  const [nombreCompleto, setNombreCompleto] = useState('');
  const [edad, setEdad] = useState('');
  const [sexo, setSexo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');

  const [doctorBusqueda, setDoctorBusqueda] = useState('');
  const [doctoresEncontrados, setDoctoresEncontrados] = useState([]);
  const [doctorSeleccionado, setDoctorSeleccionado] = useState(null);
  const [showBusquedaDoctores, setShowBusquedaDoctores] = useState(false);

  const [observaciones, setObservaciones] = useState('');

  const [empresaSeleccionada, setEmpresaSeleccionada] = useState('');
  const [empresas, setEmpresas] = useState([]);

  const [buscarEstudio, setBuscarEstudio] = useState('');
  const [estudiosDisponibles, setEstudiosDisponibles] = useState([]);
  const [estudiosSeleccionados, setEstudiosSeleccionados] = useState([]);
  const [showBusquedaEstudios, setShowBusquedaEstudios] = useState(false);

  const [subtotal, setSubtotal] = useState(0);
  const [ivaPercent, setIvaPercent] = useState(16);
  const [iva, setIva] = useState(0);
  const [totalConIva, setTotalConIva] = useState(0);
  const [descuentoPercent, setDescuentoPercent] = useState(0);
  const [descuento, setDescuento] = useState(0);
  const [granTotal, setGranTotal] = useState(0);
  const [pagoRecibido, setPagoRecibido] = useState(0);
  const [cambio, setCambio] = useState(0);

  const [formaPago, setFormaPago] = useState('efectivo');

  const [vendedor, setVendedor] = useState('');

  useEffect(() => {
    cargarEmpresas();
    cargarVendedor();
    cargarEstudiosDisponibles();
  }, []);

  useEffect(() => {
    calcularTotales();
  }, [estudiosSeleccionados, ivaPercent, descuentoPercent, pagoRecibido]);

  const cargarVendedor = async () => {
    if (!user) return;

    try {
      const { data: perfil } = await supabase
        .from('empleados')
        .select('nombre')
        .eq('auth_uuid', user.id)
        .single();

      if (perfil) {
        setVendedor(perfil.nombre || user.email);
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
      const { data, error } = await supabase
        .from('estudios_lab_catalogo')
        .select('id, clave, descripcion, area')
        .order('clave');

      if (error) throw error;
      
      setEstudiosDisponibles(data || []);
    } catch (error) {
      console.error('Error al cargar estudios:', error);
    }
  };

  const obtenerPrecioEstudio = async (claveEstudio, nombreEmpresa) => {
    try {
      if (!nombreEmpresa) {
        console.log('No hay empresa seleccionada, usando precio por defecto');
        return 150;
      }

      const { data, error } = await supabase
        .from('precios_estudios')
        .select('precio')
        .eq('clave', claveEstudio)
        .eq('empresa', nombreEmpresa)
        .single();

      if (error) {
        console.log(`No se encontró precio para ${claveEstudio} - ${nombreEmpresa}, usando precio por defecto`);
        return 150; 
      }

      console.log(`Precio encontrado para ${claveEstudio} - ${nombreEmpresa}: $${data.precio}`);
      return parseFloat(data.precio);
    } catch (error) {
      console.error('Error al obtener precio:', error);
      return 150; 
    }
  };

  const buscarPacientes = async (termino) => {
    if (termino.length < 2) {
      setPacientesEncontrados([]);
      setShowBusquedaPacientes(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .or(`nombre.ilike.%${termino}%,apellido_paterno.ilike.%${termino}%,apellido_materno.ilike.%${termino}%,telefono.ilike.%${termino}%`)
        .order('nombre')
        .limit(10);

      if (error) throw error;
      
      setPacientesEncontrados(data || []);
      setShowBusquedaPacientes(data && data.length > 0);
    } catch (error) {
      console.error('Error al buscar pacientes:', error);
      setPacientesEncontrados([]);
      setShowBusquedaPacientes(false);
    }
  };

  const seleccionarPaciente = (paciente) => {
    setPacienteSeleccionado(paciente);
    setNombreCompleto(paciente.nombre);
    setTelefono(paciente.telefono || '');
    setCorreo(paciente.email || '');
    setEdad(paciente.edad?.toString() || '');
    setSexo(paciente.sexo || '');
    setBuscarPaciente(paciente.nombre);
    setShowBusquedaPacientes(false);
  };

  const handleGuardarPacienteModal = async (pacienteData, isEditMode) => {
    try {
      if (isEditMode) {
        const { error } = await supabase
          .from('pacientes')
          .update({
            nombre: pacienteData.nombre,
            apellido_paterno: pacienteData.apellido_paterno,
            apellido_materno: pacienteData.apellido_materno,
            primer_nombre: pacienteData.primer_nombre,
            fecha_nacimiento: pacienteData.fecha_nacimiento,
            edad: pacienteData.edad,
            sexo: pacienteData.sexo,
            direccion: pacienteData.direccion,
            cedula: pacienteData.cedula,
            condicion_especial: pacienteData.condicion_especial,
            email: pacienteData.email,
            pais: pacienteData.pais,
            telefono: pacienteData.telefono,
            updated_at: new Date().toISOString()
          })
          .eq('id_paciente', pacienteData.id);

        if (error) throw error;
        alert('Paciente actualizado correctamente');
      } else {
        const { data, error } = await supabase
          .from('pacientes')
          .insert([pacienteData])
          .select()
          .single();

        if (error) throw error;
        alert('Paciente guardado correctamente');
        
        seleccionarPaciente(data);
      }
    } catch (error) {
      console.error('Error al guardar paciente:', error);
      alert('Error al guardar paciente: ' + error.message);
    }
  };

  const handleGuardarDoctorModal = async (doctorData, isEditMode) => {
    try {
      if (isEditMode) {
        const { error } = await supabase
          .from('doctores')
          .update({
            nombre: doctorData.nombre,
            apellido_paterno: doctorData.apellido_paterno,
            apellido_materno: doctorData.apellido_materno,
            primer_nombre: doctorData.primer_nombre,
            fecha_nacimiento: doctorData.fecha_nacimiento,
            edad: doctorData.edad,
            sexo: doctorData.sexo,
            email: doctorData.email,
            telefono: doctorData.telefono,
            usuario: doctorData.usuario,
            contrasena: doctorData.contrasena,
            rol: doctorData.rol,
            activo: doctorData.activo,
            updated_at: new Date().toISOString()
          })
          .eq('id_empleado', doctorData.id);

        if (error) throw error;
        alert('Doctor actualizado correctamente');
      } else {
        const { data, error } = await supabase
          .from('doctores')
          .insert([doctorData])
          .select()
          .single();

        if (error) throw error;
        alert('Doctor guardado correctamente');
        
        seleccionarDoctor(data);
      }
    } catch (error) {
      console.error('Error al guardar doctor:', error);
      alert('Error al guardar doctor: ' + error.message);
    }
  };

  const buscarDoctores = async (termino) => {
    if (termino.length < 2) {
      setDoctoresEncontrados([]);
      setShowBusquedaDoctores(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('doctores')
        .select('*')
        .or(`nombre.ilike.%${termino}%,apellido_paterno.ilike.%${termino}%`)
        .order('nombre')
        .limit(10);

      if (error) throw error;
      setDoctoresEncontrados(data || []);
      setShowBusquedaDoctores(data && data.length > 0);
    } catch (error) {
      console.error('Error al buscar doctores:', error);
      setDoctoresEncontrados([]);
      setShowBusquedaDoctores(false);
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

  const agregarEstudio = async (estudio) => {
    if (estudiosSeleccionados.find(e => e.id === estudio.id)) {
      alert('Este estudio ya fue agregado');
      return;
    }

    const empresaObj = empresas.find(emp => emp.id_empresa.toString() === empresaSeleccionada.toString());
    const nombreEmpresa = empresaObj ? empresaObj.nombre : '';

    const precioEstudio = await obtenerPrecioEstudio(estudio.clave, nombreEmpresa);

    const estudioConPrecio = {
      ...estudio,
      precio: precioEstudio,
      cantidad: 1,
      diasProceso: 1,
      empresa: nombreEmpresa || 'Sin empresa'
    };

    setEstudiosSeleccionados([...estudiosSeleccionados, estudioConPrecio]);
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
      let idPaciente = pacienteSeleccionado?.id_paciente;

      if (!idPaciente) {
        const { data: nuevoPaciente, error: errorPaciente } = await supabase
          .from('pacientes')
          .insert([
            {
              nombre: nombreCompleto,
              telefono: telefono,
              email: correo,
              sexo: sexo,
              edad: parseInt(edad) || null,
              tipo: empresaSeleccionada ? 'empresa' : 'particular'
            }
          ])
          .select()
          .single();

        if (errorPaciente) throw errorPaciente;
        idPaciente = nuevoPaciente.id_paciente;
      }

      const estudiosParaInsertar = estudiosSeleccionados.map(est => ({
        id_paciente: idPaciente,
        tipo_estudio: est.area || 'laboratorio',
        fecha_estudio: new Date().toISOString(),
        estado: 'pendiente'
      }));

      const { data: estudiosCreados, error: errorEstudios } = await supabase
        .from('estudios')
        .insert(estudiosParaInsertar)
        .select();

      if (errorEstudios) throw errorEstudios;

      alert('¡Venta registrada exitosamente!');
      limpiarFormulario();
      
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

        <main className="page-main">
          <div className="content-grid">
            <div className="left-column">
              <section className="form-section form-section-cliente">
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
                  <button 
                    className="btn-search"
                    onClick={() => setModalAgregarPacienteOpen(true)}
                    title="Agregar nuevo paciente"
                  >
                    👤
                  </button>

                  {showBusquedaPacientes && pacientesEncontrados.length > 0 && (
                    <div className="search-results">
                      {pacientesEncontrados.map(pac => (
                        <div
                          key={pac.id_paciente}
                          className="search-result-item"
                          onClick={() => seleccionarPaciente(pac)}
                        >
                          <div className="result-nombre">{pac.nombre}</div>
                          <div className="result-info">
                            {pac.telefono && <span>📞 {pac.telefono}</span>}
                            {pac.edad && <span>👤 {pac.edad} años</span>}
                            {pac.sexo && <span>⚧ {pac.sexo}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {showBusquedaPacientes && pacientesEncontrados.length === 0 && buscarPaciente.length >= 2 && (
                    <div className="search-results">
                      <div className="search-no-results">
                        No se encontraron pacientes con "{buscarPaciente}"
                      </div>
                    </div>
                  )}
                </div>

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
                  <button 
                    className="btn-search"
                    onClick={() => setModalAgregarDoctorOpen(true)}
                    title="Agregar nuevo doctor"
                  >
                    👨‍⚕️
                  </button>

                  {showBusquedaDoctores && doctoresEncontrados.length > 0 && (
                    <div className="search-results">
                      {doctoresEncontrados.map(doc => (
                        <div
                          key={doc.id_empleado}
                          className="search-result-item"
                          onClick={() => seleccionarDoctor(doc)}
                        >
                          <div className="result-nombre">{doc.nombre}</div>
                          <div className="result-info">
                            {doc.telefono && <span>📞 {doc.telefono}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

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

            <div className="right-column">
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

              <section className="estudios-section">
                <h2 className="section-title">Lista de precios</h2>
                
                {!empresaSeleccionada && (
                  <div className="alert-empresa-requerida">
                    ⚠️ Primero selecciona una empresa para buscar estudios
                  </div>
                )}
                
                <div className="search-container" style={{position: 'relative'}}>
                  <input
                    type="text"
                    placeholder={empresaSeleccionada ? "Buscar Estudios..." : "Selecciona una empresa primero"}
                    value={buscarEstudio}
                    onChange={(e) => {
                      if (empresaSeleccionada) {
                        setBuscarEstudio(e.target.value);
                        filtrarEstudios(e.target.value);
                      }
                    }}
                    className="search-input-full"
                    disabled={!empresaSeleccionada}
                  />

                  {showBusquedaEstudios && buscarEstudio.length >= 2 && empresaSeleccionada && (
                    <div className="search-results-estudios">
                      {estudiosFiltrados.map(est => (
                        <div
                          key={est.id}
                          className="search-result-item"
                          onClick={() => agregarEstudio(est)}
                        >
                          <strong>{est.clave}</strong> - {est.descripcion}
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
                        <th>Empresa</th>
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
                          <td>{est.empresa}</td>
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

        <ModalAgregarPaciente
          isOpen={modalAgregarPacienteOpen}
          onClose={() => setModalAgregarPacienteOpen(false)}
          onGuardar={handleGuardarPacienteModal}
        />

        <ModalAgregarDoctor
          isOpen={modalAgregarDoctorOpen}
          onClose={() => setModalAgregarDoctorOpen(false)}
          onSave={handleGuardarDoctorModal}
        />
      </div>
    </Layout>
  );
};

export default NuevoPaciente;