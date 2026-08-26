import React, { useState, useEffect } from 'react';
import { esEmailValido, esTelefono10Digitos, normalizarTelefono10 } from '../../../utils/form-validations';
import ModalNotificacion from '../../../components/ModalNotificacion';
import {
  hayBorradorPersistente,
  limpiarBorradorPersistente,
  useCampoPersistente,
} from '../../../hooks/use-campo-persistente';
import './modal-agregar-doctor.css';
import '../../../components/admin-entity-modal.css';

// Lo capturado sobrevive a que el navegador descarte la página al cambiar de
// pestaña o de app; se descarta al guardar o al cerrar el modal.
const BORRADOR = 'modal-doctor:';

const ModalAgregarDoctor = ({ isOpen, onClose, onSave, doctorEditar = null }) => {
  // Al editar no se guarda borrador: esos datos ya viven en la base y
  // arrastrarlos a un alta nueva crearía un duplicado.
  const borrador = { persistir: !doctorEditar };
  const [apellidoPaterno, setApellidoPaterno] = useCampoPersistente(`${BORRADOR}apellidoPaterno`, '', borrador);
  const [apellidoMaterno, setApellidoMaterno] = useCampoPersistente(`${BORRADOR}apellidoMaterno`, '', borrador);
  const [nombre, setNombre] = useCampoPersistente(`${BORRADOR}nombre`, '', borrador);
  
  const [dia, setDia] = useCampoPersistente(`${BORRADOR}dia`, '', borrador);
  const [mes, setMes] = useCampoPersistente(`${BORRADOR}mes`, '', borrador);
  const [ano, setAno] = useCampoPersistente(`${BORRADOR}ano`, '', borrador);
  const [edad, setEdad] = useCampoPersistente(`${BORRADOR}edad`, '', borrador);
  
  const [sexo, setSexo] = useCampoPersistente(`${BORRADOR}sexo`, '', borrador);
  const [email, setEmail] = useCampoPersistente(`${BORRADOR}email`, '', borrador);
  const [telefono, setTelefono] = useCampoPersistente(`${BORRADOR}telefono`, '', borrador);
  
  const [usuario, setUsuario] = useCampoPersistente(`${BORRADOR}usuario`, '', borrador);
  // La contraseña nunca se respalda en el navegador.
  const [contrasena, setContrasena] = useState('');
  const [tipoDoctor, setTipoDoctor] = useCampoPersistente(`${BORRADOR}tipoDoctor`, 'particular', borrador);
  const [institucion, setInstitucion] = useCampoPersistente(`${BORRADOR}institucion`, '', borrador);
  const [esRadiologo, setEsRadiologo] = useCampoPersistente(`${BORRADOR}esRadiologo`, false, borrador);
  const [especialidad, setEspecialidad] = useCampoPersistente(`${BORRADOR}especialidad`, '', borrador);
  const [notificacion, setNotificacion] = useState({ isOpen: false, mensaje: '', tipo: 'exito' });

  const isEditMode = !!doctorEditar;
  const mostrarNotificacion = (mensaje, tipo = 'exito') =>
    setNotificacion({ isOpen: true, mensaje, tipo });

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
    } else if (isOpen && !doctorEditar && !hayBorradorPersistente(BORRADOR)) {
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
      mostrarNotificacion('Por favor completa al menos Apellido Paterno y Nombre', 'advertencia');
      return;
    }

    if (email.trim() && !esEmailValido(email)) {
      mostrarNotificacion('Por favor ingresa un email válido', 'advertencia');
      return;
    }

    if (telefono && !esTelefono10Digitos(telefono)) {
      mostrarNotificacion('El teléfono debe contener exactamente 10 dígitos numéricos', 'advertencia');
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

      limpiarBorradorPersistente(BORRADOR);
      onClose();
    } catch (error) {
      console.error('Error al guardar doctor:', error);
      mostrarNotificacion('Error al guardar el doctor', 'error');
    }
  };

  const handleCerrar = () => {
    limpiarBorradorPersistente(BORRADOR);
    onClose();
  };

  // Un toque en el fondo cerraba el modal y descartaba todo, y es fácil de dar
  // por accidente al volver a la app. Con algo capturado el fondo ya no cierra:
  // para salir están la ✕ y el botón Cancelar.
  const hayCaptura = () =>
    [apellidoPaterno, apellidoMaterno, nombre, dia, mes, ano, sexo, email, telefono, usuario, contrasena, institucion, especialidad]
      .some((valor) => String(valor ?? '').trim());

  const handleClickFondo = () => {
    if (!hayCaptura()) handleCerrar();
  };

  if (!isOpen) return null;

  return (
    <>
    <div className="modal-overlay admin-entity-modal-overlay" onClick={handleClickFondo}>
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
              <label>Email</label>
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
                <label htmlFor="especialidad-doctor-externo">Especialidad</label>
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
              <label>Contraseña</label>
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
    <ModalNotificacion
      isOpen={notificacion.isOpen}
      onClose={() => setNotificacion((actual) => ({ ...actual, isOpen: false }))}
      mensaje={notificacion.mensaje}
      tipo={notificacion.tipo}
    />
    </>
  );
};

export default ModalAgregarDoctor;
