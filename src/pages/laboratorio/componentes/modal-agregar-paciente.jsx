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
  
  const [dia, setDia] = useCampoPersistente(`${BORRADOR}dia`, '', borrador);
  const [mes, setMes] = useCampoPersistente(`${BORRADOR}mes`, '', borrador);
  const [ano, setAno] = useCampoPersistente(`${BORRADOR}ano`, '', borrador);
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
      
      if (pacienteEditar.fechaNacimiento) {
        const fecha = new Date(pacienteEditar.fechaNacimiento);
        setDia(fecha.getDate().toString());
        setMes((fecha.getMonth() + 1).toString());
        setAno(fecha.getFullYear().toString());
      }
      
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
    if (dia && mes && ano) {
      const fechaNac = new Date(ano, mes - 1, dia);
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
  }, [dia, mes, ano, unidadEdad]);

  const limpiarCampos = () => {
    setApellidoPaterno('');
    setApellidoMaterno('');
    setNombre('');
    setDia('');
    setMes('');
    setAno('');
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

    const fechaNacimiento = (dia && mes && ano) 
      ? `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
      : null;

    const nombreCompleto = `${apellidoPaterno.trim()} ${apellidoMaterno.trim()} ${nombre.trim()}`.trim();

    const pacienteData = {
      nombre: nombreCompleto,
      apellido_paterno: apellidoPaterno.trim(),
      apellido_materno: apellidoMaterno.trim(),
      primer_nombre: nombre.trim(),
      fecha_nacimiento: fechaNacimiento,
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
    [apellidoPaterno, apellidoMaterno, nombre, dia, mes, ano, sexo, direccion, cedula, condicionEspecial, email, telefono]
      .some((valor) => String(valor ?? '').trim());

  const handleClickFondo = () => {
    if (!hayCaptura()) handleClose();
  };

  if (!isOpen) return null;

  const dias = Array.from({ length: 31 }, (_, i) => i + 1);
  const meses = [
    { valor: '1', nombre: 'Enero' },
    { valor: '2', nombre: 'Febrero' },
    { valor: '3', nombre: 'Marzo' },
    { valor: '4', nombre: 'Abril' },
    { valor: '5', nombre: 'Mayo' },
    { valor: '6', nombre: 'Junio' },
    { valor: '7', nombre: 'Julio' },
    { valor: '8', nombre: 'Agosto' },
    { valor: '9', nombre: 'Septiembre' },
    { valor: '10', nombre: 'Octubre' },
    { valor: '11', nombre: 'Noviembre' },
    { valor: '12', nombre: 'Diciembre' }
  ];
  const anoActual = new Date().getFullYear();
  const anos = Array.from({ length: 120 }, (_, i) => anoActual - i);

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
              value={apellidoPaterno}
              onChange={(e) => setApellidoPaterno(e.target.value)}
              placeholder="Ingresar Apellido Paterno"
              className="modal-input-paciente"
              autoFocus
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
            <img src={pacientesIcono} alt="Paciente" className="modal-icono-campo" />
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ingresar Nombre"
              className="modal-input-paciente"
            />
          </div>

          <div className="modal-fila-fecha">
            <div className="modal-campo-fecha">
              <select
                value={dia}
                onChange={(e) => setDia(e.target.value)}
                className="modal-select-fecha"
              >
                <option value="">Día</option>
                {dias.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="modal-campo-fecha">
              <select
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="modal-select-fecha"
              >
                <option value="">Mes</option>
                {meses.map(m => (
                  <option key={m.valor} value={m.valor}>{m.nombre}</option>
                ))}
              </select>
            </div>

            <div className="modal-campo-fecha">
              <select
                value={ano}
                onChange={(e) => setAno(e.target.value)}
                className="modal-select-fecha"
              >
                <option value="">Año</option>
                {anos.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
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
