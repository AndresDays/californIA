import React, { useState, useEffect } from 'react';
import { esEmailValido, esTelefono10Digitos, normalizarTelefono10 } from '../../../utils/form-validations';
import './modal-agregar-doctor.css';
import '../../../components/admin-entity-modal.css';

const ModalAgregarDoctor = ({ isOpen, onClose, onSave, doctorEditar = null }) => {
  const [apellidoPaterno, setApellidoPaterno] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');
  const [nombre, setNombre] = useState('');
  
  const [dia, setDia] = useState('');
  const [mes, setMes] = useState('');
  const [ano, setAno] = useState('');
  const [edad, setEdad] = useState('');
  
  const [sexo, setSexo] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [tipoDoctor, setTipoDoctor] = useState('particular');
  const [institucion, setInstitucion] = useState('');
  const [esRadiologo, setEsRadiologo] = useState(false);
  const [especialidad, setEspecialidad] = useState('');

  const isEditMode = !!doctorEditar;

  const dias = Array.from({ length: 31 }, (_, i) => i + 1);
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const currentYear = new Date().getFullYear();
  const anos = Array.from({ length: 100 }, (_, i) => currentYear - i);

  useEffect(() => {
    if (isOpen && doctorEditar) {
      setApellidoPaterno(doctorEditar.apellidoPaterno || '');
      setApellidoMaterno(doctorEditar.apellidoMaterno || '');
      setNombre(doctorEditar.nombre || '');
      setSexo(doctorEditar.sexo || '');
      setEmail(doctorEditar.email || '');
      setTelefono(normalizarTelefono10(doctorEditar.telefono || ''));
      setUsuario(doctorEditar.usuario || '');
      setContrasena('');
      setTipoDoctor(
        ['particular', 'institucion'].includes(doctorEditar.tipoDoctor || doctorEditar.tipo_doctor)
          ? (doctorEditar.tipoDoctor || doctorEditar.tipo_doctor)
          : 'particular'
      );
      setInstitucion(doctorEditar.institucion || '');
      setEsRadiologo(Boolean(doctorEditar.esRadiologo ?? doctorEditar.es_radiologo));
      setEspecialidad(doctorEditar.especialidad || '');
      
      if (doctorEditar.fechaNacimiento) {
        const fecha = new Date(doctorEditar.fechaNacimiento);
        setDia(fecha.getDate().toString());
        setMes(meses[fecha.getMonth()]);
        setAno(fecha.getFullYear().toString());
      }
      
      setEdad(doctorEditar.edad?.toString() || '');
    } else if (isOpen && !doctorEditar) {
      limpiarCampos();
    }
  }, [isOpen, doctorEditar]);

  useEffect(() => {
    if (dia && mes && ano) {
      calcularEdad();
    }
  }, [dia, mes, ano]);

  const calcularEdad = () => {
    const mesIndex = meses.indexOf(mes) + 1;
    const fechaNac = new Date(ano, mesIndex - 1, dia);
    const hoy = new Date();
    
    let edadCalculada = hoy.getFullYear() - fechaNac.getFullYear();
    const mesActual = hoy.getMonth();
    const diaActual = hoy.getDate();
    
    if (mesActual < (mesIndex - 1) || (mesActual === (mesIndex - 1) && diaActual < dia)) {
      edadCalculada--;
    }
    
    setEdad(edadCalculada.toString());
  };

  const handleTelefonoChange = (e) => {
    setTelefono(normalizarTelefono10(e.target.value));
  };

  const limpiarCampos = () => {
    setApellidoPaterno('');
    setApellidoMaterno('');
    setNombre('');
    setDia('');
    setMes('');
    setAno('');
    setEdad('');
    setSexo('');
    setEmail('');
    setTelefono('');
    setUsuario('');
    setContrasena('');
    setTipoDoctor('particular');
    setInstitucion('');
    setEsRadiologo(false);
    setEspecialidad('');
  };

  const handleGuardar = async () => {
    if (!apellidoPaterno || !nombre) {
      alert('Por favor completa al menos Apellido Paterno y Nombre');
      return;
    }

    if (email.trim() && !esEmailValido(email)) {
      alert('Por favor ingresa un email válido');
      return;
    }

    if (!isEditMode && (!email.trim() || !contrasena.trim())) {
      alert('El correo y la contraseña son requeridos para crear el acceso del doctor');
      return;
    }

    if (telefono && !esTelefono10Digitos(telefono)) {
      alert('El teléfono debe contener exactamente 10 dígitos numéricos');
      return;
    }

    if (!esRadiologo && !especialidad.trim()) {
      alert('Por favor ingresa la especialidad del doctor');
      return;
    }

    const nombreCompleto = `${apellidoPaterno.toUpperCase()} ${apellidoMaterno.toUpperCase()} ${nombre.toUpperCase()}`.trim();

    let fechaNacimiento = null;
    if (dia && mes && ano) {
      const mesIndex = meses.indexOf(mes) + 1;
      fechaNacimiento = `${ano}-${mesIndex.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
    }

    const doctorData = {
      nombre: nombreCompleto,
      apellido_paterno: apellidoPaterno.toUpperCase(),
      apellido_materno: apellidoMaterno.toUpperCase(),
      primer_nombre: nombre.toUpperCase(),
      fecha_nacimiento: fechaNacimiento,
      edad: edad ? parseInt(edad) : null,
      sexo: sexo || null,
      email: email || null,
      telefono: telefono || null,
      usuario: usuario || null,
      contrasena: contrasena || null,
      tipo_doctor: ['particular', 'institucion'].includes(tipoDoctor) ? tipoDoctor : 'particular',
      institucion: institucion || null,
      es_radiologo: esRadiologo,
      activo: true
    };

    if (!esRadiologo) {
      doctorData.especialidad = especialidad.trim();
    }

    if (isEditMode && doctorEditar.id) {
      doctorData.id = doctorEditar.id;
    }

    try {
      if (onSave) {
        await onSave(doctorData, isEditMode);
      }
      
      onClose();
    } catch (error) {
      console.error('Error al guardar doctor:', error);
      alert('Error al guardar el doctor');
    }
  };

  const handleCerrar = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay admin-entity-modal-overlay" onClick={handleCerrar}>
      <div className="modal-container admin-entity-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditMode ? 'Editar Doctor' : 'Agregar Doctor'}</h2>
          <button className="modal-close" onClick={handleCerrar}>✕</button>
        </div>

        <div className="modal-body">
          <div className="form-section-modal">
            <div className="form-group-modal">
              <label>Apellido Paterno *</label>
              <input
                type="text"
                value={apellidoPaterno}
                onChange={(e) => setApellidoPaterno(e.target.value)}
                placeholder="Ingresar Apellido Paterno"
                className="modal-input"
              />
            </div>

            <div className="form-group-modal">
              <label>Apellido Materno</label>
              <input
                type="text"
                value={apellidoMaterno}
                onChange={(e) => setApellidoMaterno(e.target.value)}
                placeholder="Ingresar Apellido Materno"
                className="modal-input"
              />
            </div>

            <div className="form-group-modal">
              <label>Nombre *</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ingresar Nombre"
                className="modal-input"
              />
            </div>
          </div>

          <div className="form-section-modal">
            <div className="form-row-modal">
              <div className="form-group-modal">
                <label>Día</label>
                <select
                  value={dia}
                  onChange={(e) => setDia(e.target.value)}
                  className="modal-select"
                >
                  <option value="">Día</option>
                  {dias.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="form-group-modal">
                <label>Mes</label>
                <select
                  value={mes}
                  onChange={(e) => setMes(e.target.value)}
                  className="modal-select"
                >
                  <option value="">Mes</option>
                  {meses.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="form-group-modal">
                <label>Año</label>
                <select
                  value={ano}
                  onChange={(e) => setAno(e.target.value)}
                  className="modal-select"
                >
                  <option value="">Año</option>
                  {anos.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group-modal">
              <label>Edad</label>
              <input
                type="number"
                value={edad}
                onChange={(e) => setEdad(e.target.value)}
                placeholder="Edad"
                className="modal-input"
                readOnly
              />
            </div>
          </div>

          <div className="form-section-modal">
            <div className="form-group-modal">
              <label>Sexo</label>
              <select
                value={sexo}
                onChange={(e) => setSexo(e.target.value)}
                className="modal-select"
              >
                <option value="">Seleccionar</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>

          <div className="form-section-modal">
            <div className="form-group-modal">
              <label>Email {!isEditMode && '*'}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ingresar email"
                className="modal-input"
              />
            </div>

            <div className="form-group-modal">
              <label>Teléfono</label>
              <input
                type="tel"
                value={telefono}
                onChange={handleTelefonoChange}
                placeholder="Ingresar Teléfono (10 dígitos)"
                className="modal-input"
                maxLength="10"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="form-section-modal">
            <div className="form-group-modal">
              <label htmlFor="tipo-doctor-externo">Tipo de doctor</label>
              <select
                id="tipo-doctor-externo"
                value={tipoDoctor}
                onChange={(e) => setTipoDoctor(e.target.value)}
                className="modal-select"
              >
                <option value="particular">Particular externo</option>
                <option value="institucion">Institución externa</option>
              </select>
            </div>

            <div className="form-group-modal">
              <label htmlFor="institucion-doctor-externo">Institución</label>
              <input
                id="institucion-doctor-externo"
                type="text"
                value={institucion}
                onChange={(e) => setInstitucion(e.target.value)}
                placeholder="IMSS, ISSSTE, Particular..."
                className="modal-input"
              />
            </div>
          </div>

          <div className="form-section-modal">
            <div className="form-group-modal">
              <label htmlFor="doctor-es-radiologo">¿Es radiólogo?</label>
              <select
                id="doctor-es-radiologo"
                value={esRadiologo ? 'si' : 'no'}
                onChange={(e) => setEsRadiologo(e.target.value === 'si')}
                className="modal-select"
              >
                <option value="no">No</option>
                <option value="si">Sí</option>
              </select>
            </div>

            {!esRadiologo && (
              <div className="form-group-modal">
                <label htmlFor="especialidad-doctor-externo">Especialidad *</label>
                <input
                  id="especialidad-doctor-externo"
                  type="text"
                  value={especialidad}
                  onChange={(e) => setEspecialidad(e.target.value)}
                  placeholder="Cardiología, Traumatología..."
                  className="modal-input"
                />
              </div>
            )}
          </div>

          <div className="form-section-modal">
            <div className="form-group-modal">
              <label>Usuario</label>
              <input
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Nombre de usuario"
                className="modal-input"
              />
            </div>

            <div className="form-group-modal">
              <label>Contraseña {!isEditMode && '*'}</label>
              <input
                type="password"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                placeholder="Contraseña"
                className="modal-input"
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-modal-cancel" onClick={handleCerrar}>
            Cancelar
          </button>
          <button className="btn-modal-save" onClick={handleGuardar}>
            {isEditMode ? 'Actualizar Doctor' : 'Guardar Doctor'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalAgregarDoctor;
