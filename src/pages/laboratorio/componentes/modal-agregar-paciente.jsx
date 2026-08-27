import React, { useState, useEffect } from 'react';
import './modal-agregar-paciente.css';
import '../../../components/admin-entity-modal.css';
import pacientesIcono from '../../../assets/pacientesIcono.png';
import calendarioIcono from '../../../assets/calendarioIcono.png';
import sexoIcono from '../../../assets/sexoIcono.png';
import direccionIcono from '../../../assets/direccionIcono.png';
import cedulaIcono from '../../../assets/cedulaIcono.png';
import nivelIcono from '../../../assets/nivelIcono.png';
import correoIcono from '../../../assets/correoIcono.png';
import telefonoIcono from '../../../assets/telefonoIcono.png';
import { esEmailValido, esTelefono10Digitos, normalizarTelefono10 } from '../../../utils/form-validations';
import {
  hayBorradorPersistente,
  limpiarBorradorPersistente,
  useCampoPersistente,
} from '../../../hooks/use-campo-persistente';

// Lo capturado sobrevive a que el navegador descarte la página al cambiar de
// pestaña o de app; se descarta al guardar o al cerrar el modal.
const BORRADOR = 'modal-paciente:';

const ModalAgregarPaciente = ({ isOpen, onClose, onGuardar, pacienteEditar = null }) => {
  // Al editar no se guarda borrador: esos datos ya viven en la base y
  // arrastrarlos a un alta nueva crearía un duplicado.
  const borrador = { persistir: !pacienteEditar };
  const [apellidoPaterno, setApellidoPaterno] = useCampoPersistente(`${BORRADOR}apellidoPaterno`, '', borrador);
  const [apellidoMaterno, setApellidoMaterno] = useCampoPersistente(`${BORRADOR}apellidoMaterno`, '', borrador);
  const [nombre, setNombre] = useCampoPersistente(`${BORRADOR}nombre`, '', borrador);
  const [segundoNombre, setSegundoNombre] = useCampoPersistente(`${BORRADOR}segundoNombre`, '', borrador);

  // La fecha se captura en un solo campo: el control nativo deja teclear los
  // números y abre el calendario, en vez de obligar a bajar tres listas.
  const [fechaNacimiento, setFechaNacimiento] = useCampoPersistente(`${BORRADOR}fechaNacimiento`, '', borrador);
  const [edad, setEdad] = useCampoPersistente(`${BORRADOR}edad`, '', borrador);
  const [unidadEdad, setUnidadEdad] = useCampoPersistente(`${BORRADOR}unidadEdad`, 'Años', borrador); 
  
  const [sexo, setSexo] = useCampoPersistente(`${BORRADOR}sexo`, '', borrador);
  const [direccion, setDireccion] = useCampoPersistente(`${BORRADOR}direccion`, '', borrador);
  const [cedula, setCedula] = useCampoPersistente(`${BORRADOR}cedula`, '', borrador);
  const [condicionEspecial, setCondicionEspecial] = useCampoPersistente(`${BORRADOR}condicionEspecial`, '', borrador);
  const [email, setEmail] = useCampoPersistente(`${BORRADOR}email`, '', borrador);
  const [pais, setPais] = useCampoPersistente(`${BORRADOR}pais`, 'México', borrador);
  const [telefono, setTelefono] = useCampoPersistente(`${BORRADOR}telefono`, '', borrador);

  const [nivelesMAR, setNivelesMAR] = useState([]);

  const isEditMode = !!pacienteEditar;

  const codigosPais = {
    'México': '+52',
    'Estados Unidos': '+1',
    'Canadá': '+1',
    'Otro': ''
  };

  useEffect(() => {
    if (isOpen && pacienteEditar) {
      setApellidoPaterno(pacienteEditar.apellidoPaterno || '');
      setApellidoMaterno(pacienteEditar.apellidoMaterno || '');
      setNombre(pacienteEditar.nombre || '');
      setSegundoNombre(pacienteEditar.segundoNombre || '');
      setSexo(pacienteEditar.sexo || '');
      setDireccion(pacienteEditar.direccion || '');
      setCedula(pacienteEditar.cedula || '');
      setCondicionEspecial(pacienteEditar.condicionEspecial || '');
      setEmail(pacienteEditar.email || '');
      setPais(pacienteEditar.pais || 'México');
      
      // Manejar teléfono al editar
      let telefonoSinCodigo = pacienteEditar.telefono || '';
      if (telefonoSinCodigo.startsWith('+52 ')) {
        telefonoSinCodigo = telefonoSinCodigo.substring(4);
      } else if (telefonoSinCodigo.startsWith('+1 ')) {
        telefonoSinCodigo = telefonoSinCodigo.substring(3);
      }
      setTelefono(normalizarTelefono10(telefonoSinCodigo));
      
      // La fecha viene como YYYY-MM-DD, que es justo lo que espera el control.
      setFechaNacimiento(String(pacienteEditar.fechaNacimiento || '').slice(0, 10));


      setEdad(pacienteEditar.edad?.toString() || '');
    } else if (isOpen && !pacienteEditar && !hayBorradorPersistente(BORRADOR)) {
      limpiarCampos();
    }
  }, [isOpen, pacienteEditar]);

  useEffect(() => {
    if (isOpen) {
      cargarNivelesMAR();
    }
  }, [isOpen]);

  const cargarNivelesMAR = async () => {
    try {
      const { supabase } = await import('../../../lib/supabase-client');
      const { data, error } = await supabase
        .from('niveles_mar')
        .select('id, nombre')
        .order('nombre');

      if (error) throw error;
      setNivelesMAR(data || []);
    } catch (error) {
      console.error('Error al cargar niveles MAR:', error);
    }
  };

  useEffect(() => {
    const [ano, mes, dia] = String(fechaNacimiento || '').split('-');
    if (ano && mes && dia) {
      const fechaNac = new Date(Number(ano), Number(mes) - 1, Number(dia));
      const hoy = new Date();

      const diffMs = hoy - fechaNac;
      const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      let edadCalculada = 0;
      
      switch(unidadEdad) {
        case 'Años': {
          edadCalculada = hoy.getFullYear() - fechaNac.getFullYear();
          const m = hoy.getMonth() - fechaNac.getMonth();
          if (m < 0 || (m === 0 && hoy.getDate() < fechaNac.getDate())) {
            edadCalculada--;
          }
          break;
        }
        case 'Meses':
          edadCalculada = (hoy.getFullYear() - fechaNac.getFullYear()) * 12;
          edadCalculada += hoy.getMonth() - fechaNac.getMonth();
          if (hoy.getDate() < fechaNac.getDate()) {
            edadCalculada--;
          }
          break;
        case 'Semanas':
          edadCalculada = Math.floor(diffDias / 7);
          break;
        case 'Días':
          edadCalculada = diffDias;
          break;
        default:
          edadCalculada = 0;
      }
      
      setEdad(edadCalculada.toString());
    }
  }, [fechaNacimiento, unidadEdad]);

  const limpiarCampos = () => {
    setApellidoPaterno('');
    setApellidoMaterno('');
    setNombre('');
    setSegundoNombre('');
    setFechaNacimiento('');
    setEdad('');
    setUnidadEdad('Años');
    setSexo('');
    setDireccion('');
    setCedula('');
    setCondicionEspecial('');
    setEmail('');
    setPais('México');
    setTelefono('');
  };

  const handleTelefonoChange = (e) => {
    setTelefono(normalizarTelefono10(e.target.value));
  };

  const obtenerTelefonoCompleto = () => {
    if (!telefono) return '';
    const codigo = codigosPais[pais] || '';
    return codigo ? `${codigo} ${telefono}` : telefono;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!apellidoPaterno.trim() || !nombre.trim()) {
      globalThis.mostrarNotificacion('Por favor, ingresa al menos el apellido paterno y el nombre', 'advertencia');
      return;
    }

    if (email.trim() && !esEmailValido(email)) {
      globalThis.mostrarNotificacion('Por favor, ingresa un email válido', 'advertencia');
      return;
    }

    if (telefono && !esTelefono10Digitos(telefono)) {
      globalThis.mostrarNotificacion('El teléfono debe contener exactamente 10 dígitos numéricos', 'advertencia');
      return;
    }

    // El nombre completo conserva el orden con el que se busca e imprime en los
    // tickets: apellidos primero y luego los nombres de pila.
    const nombreCompleto = [apellidoPaterno, apellidoMaterno, nombre, segundoNombre]
      .map((parte) => parte.trim())
      .filter(Boolean)
      .join(' ');

    const pacienteData = {
      nombre: nombreCompleto,
      apellido_paterno: apellidoPaterno.trim(),
      apellido_materno: apellidoMaterno.trim(),
      primer_nombre: nombre.trim(),
      segundo_nombre: segundoNombre.trim(),
      fecha_nacimiento: fechaNacimiento || null,
      edad: parseInt(edad) || null,
      sexo: sexo,
      direccion: direccion.trim(),
      cedula: cedula.trim(),
      condicion_especial: condicionEspecial,
      email: email.trim(),
      pais: pais,
      telefono: obtenerTelefonoCompleto(),
      tipo: 'particular'
    };

    if (isEditMode && pacienteEditar.id) {
      pacienteData.id = pacienteEditar.id;
    }

    onGuardar(pacienteData, isEditMode);
    limpiarBorradorPersistente(BORRADOR);
    onClose();
  };

  const handleClose = () => {
    limpiarBorradorPersistente(BORRADOR);
    onClose();
  };

  // Un toque en el fondo cerraba el modal y descartaba todo, y es fácil de dar
  // por accidente al volver a la app. Con algo capturado el fondo ya no cierra:
  // para salir están la ✕ y el botón Salir.
  const hayCaptura = () =>
    [apellidoPaterno, apellidoMaterno, nombre, segundoNombre, fechaNacimiento, sexo, direccion, cedula, condicionEspecial, email, telefono]
      .some((valor) => String(valor ?? '').trim());

  const handleClickFondo = () => {
    if (!hayCaptura()) handleClose();
  };

  if (!isOpen) return null;

  // Nadie nace mañana: el control no deja elegir una fecha futura.
  const hoyISO = new Date().toISOString().slice(0, 10);

  return (
    <div className="modal-overlay-paciente admin-entity-modal-overlay" onClick={handleClickFondo}>
      <div className="modal-contenedor-paciente admin-entity-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-paciente">
          <h2 className="modal-titulo-paciente">
            {isEditMode ? 'Editar Cliente' : 'Agregar Cliente'}
          </h2>
          <button className="modal-btn-cerrar-paciente" onClick={handleClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-contenido-paciente">
          <div className="modal-campo-paciente">
            <img src={pacientesIcono} alt="Paciente" className="modal-icono-campo" />
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ingresar Primer Nombre"
              className="modal-input-paciente"
              autoFocus
            />
          </div>

          <div className="modal-campo-paciente">
            <img src={pacientesIcono} alt="Paciente" className="modal-icono-campo" />
            <input
              type="text"
              value={segundoNombre}
              onChange={(e) => setSegundoNombre(e.target.value)}
              placeholder="Ingresar Segundo Nombre"
              className="modal-input-paciente"
            />
          </div>

          <div className="modal-campo-paciente">
            <img src={pacientesIcono} alt="Paciente" className="modal-icono-campo" />
            <input
              type="text"
              value={apellidoPaterno}
              onChange={(e) => setApellidoPaterno(e.target.value)}
              placeholder="Ingresar Apellido Paterno"
              className="modal-input-paciente"
            />
          </div>

          <div className="modal-campo-paciente">
            <img src={pacientesIcono} alt="Paciente" className="modal-icono-campo" />
            <input
              type="text"
              value={apellidoMaterno}
              onChange={(e) => setApellidoMaterno(e.target.value)}
              placeholder="Ingresar Apellido Materno"
              className="modal-input-paciente"
            />
          </div>

          <div className="modal-campo-paciente">
            <img src={calendarioIcono} alt="Fecha de nacimiento" className="modal-icono-campo" />
            <input
              type="date"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              aria-label="Fecha de nacimiento"
              className="modal-input-paciente modal-input-fecha"
              max={hoyISO}
            />
          </div>

          <div className="modal-fila-edad">
            <div className="modal-campo-paciente">
              <img src={calendarioIcono} alt="Edad" className="modal-icono-campo" />
              <select
                value={unidadEdad}
                onChange={(e) => setUnidadEdad(e.target.value)}
                className="modal-select-paciente"
              >
                <option value="Años">Años</option>
                <option value="Meses">Meses</option>
                <option value="Semanas">Semanas</option>
                <option value="Días">Días</option>
              </select>
            </div>

            <div className="modal-campo-paciente">
              <input
                type="text"
                value={edad}
                readOnly
                placeholder="Edad"
                className="modal-input-paciente"
              />
            </div>
          </div>

          <div className="modal-campo-paciente">
            <img src={sexoIcono} alt="Sexo" className="modal-icono-campo" />
            <select
              value={sexo}
              onChange={(e) => setSexo(e.target.value)}
              className="modal-select-paciente"
            >
              <option value="">sexo</option>
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
              <option value="otro">Otro</option>
              <option value="prefiero_no_decirlo">Prefiero no decirlo</option>
            </select>
          </div>

          <div className="modal-campo-paciente">
            <img src={direccionIcono} alt="Dirección" className="modal-icono-campo" />
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Ingresar Direccion"
              className="modal-input-paciente"
            />
          </div>

          <div className="modal-campo-paciente">
            <img src={cedulaIcono} alt="Cédula" className="modal-icono-campo" />
            <input
              type="text"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              placeholder="Ingresar Cédula"
              className="modal-input-paciente"
            />
          </div>

          <div className="modal-campo-paciente">
            <img src={nivelIcono} alt="Nivel" className="modal-icono-campo" />
            <select
              value={condicionEspecial}
              onChange={(e) => setCondicionEspecial(e.target.value)}
              className="modal-select-paciente"
            >
              <option value="">Condición especial</option>
              {nivelesMAR.map(nivel => (
                <option key={nivel.id} value={nivel.nombre}>
                  {nivel.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-campo-paciente">
            <img src={correoIcono} alt="Email" className="modal-icono-campo" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ingresar email"
              className="modal-input-paciente"
            />
          </div>

          <div className="modal-campo-paciente">
            <img src={telefonoIcono} alt="País" className="modal-icono-campo" />
            <select
              value={pais}
              onChange={(e) => setPais(e.target.value)}
              className="modal-select-paciente"
            >
              <option value="México">México</option>
              <option value="Estados Unidos">Estados Unidos</option>
              <option value="Canadá">Canadá</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div className="modal-campo-paciente modal-campo-telefono">
            <img src={telefonoIcono} alt="Teléfono" className="modal-icono-campo" />
            {codigosPais[pais] && (
              <span className="codigo-pais">{codigosPais[pais]}</span>
            )}
            <input
              type="tel"
              value={telefono}
              onChange={handleTelefonoChange}
              placeholder="Ingresar Teléfono (10 dígitos)"
              className="modal-input-paciente"
              maxLength="10"
              inputMode="numeric"
            />
          </div>

          <div className="modal-botones-paciente">
            <button
              type="button"
              className="modal-btn-salir-paciente"
              onClick={handleClose}
            >
              Salir
            </button>
            <button
              type="submit"
              className="modal-btn-guardar-paciente"
            >
              {isEditMode ? 'Actualizar cliente' : 'Guardar cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalAgregarPaciente;
