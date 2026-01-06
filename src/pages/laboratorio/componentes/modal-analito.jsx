import React, { useState, useEffect } from 'react';
import './modal-analito.css';

const ModalAnalito = ({ 
  isOpen, 
  onClose, 
  onGuardar, 
  analitoInicial = null,
  modoEdicion = false
}) => {
  const [clave, setClave] = useState('');
  const [bitacora, setBitacora] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [resultadoDefecto, setResultadoDefecto] = useState('');
  const [unidad, setUnidad] = useState('');
  const [digitos, setDigitos] = useState('');
  const [tipoResultado, setTipoResultado] = useState('');
  const [vrBajo, setVrBajo] = useState('');
  const [vrAlto, setVrAlto] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (analitoInicial) {
        setClave(analitoInicial.clave || '');
        setBitacora(analitoInicial.bitacora || '');
        setDescripcion(analitoInicial.descripcion || '');
        setResultadoDefecto(analitoInicial.resultado_defecto || '');
        setUnidad(analitoInicial.unidad || '');
        setDigitos(analitoInicial.digitos || '');
        setTipoResultado(analitoInicial.tipo_resultado || '');
        setVrBajo(analitoInicial.vr_bajo || '');
        setVrAlto(analitoInicial.vr_alto || '');
      } else {
        limpiarCampos();
      }
    }
  }, [isOpen, analitoInicial]);

  const limpiarCampos = () => {
    setClave('');
    setBitacora('');
    setDescripcion('');
    setResultadoDefecto('');
    setUnidad('');
    setDigitos('');
    setTipoResultado('');
    setVrBajo('');
    setVrAlto('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!clave.trim() || !descripcion.trim()) {
      alert('Por favor, complete al menos la Clave y la Descripción');
      return;
    }

    const analitoData = {
      clave: clave.trim(),
      bitacora: bitacora.trim(),
      descripcion: descripcion.trim(),
      resultado_defecto: resultadoDefecto.trim(),
      unidad: unidad.trim(),
      digitos: digitos.trim(),
      tipo_resultado: tipoResultado,
      vr_bajo: vrBajo.trim(),
      vr_alto: vrAlto.trim()
    };

    onGuardar(analitoData);
    limpiarCampos();
    onClose();
  };

  const handleClose = () => {
    limpiarCampos();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay-analito" onClick={handleClose}>
      <div className="modal-contenedor-analito" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-analito">
          <h2 className="modal-titulo-analito">
            {modoEdicion ? 'Editar Analito' : 'Crear Analito'}
          </h2>
          <button className="modal-btn-cerrar-analito" onClick={handleClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-contenido-analito">
          <div className="modal-fila-analito">
            <div className="modal-campo-analito">
              <label>Clave</label>
              <input
                type="text"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                placeholder="Clave"
                className="modal-input-analito"
                autoFocus
              />
            </div>

            <div className="modal-campo-analito">
              <label>Bitacora</label>
              <input
                type="text"
                value={bitacora}
                onChange={(e) => setBitacora(e.target.value)}
                placeholder="Bitacora"
                className="modal-input-analito"
              />
            </div>
          </div>

          <div className="modal-campo-analito">
            <label>Descripción</label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripcion"
              className="modal-input-analito"
            />
          </div>

          <div className="modal-campo-analito">
            <label>Resultado por Defecto</label>
            <input
              type="text"
              value={resultadoDefecto}
              onChange={(e) => setResultadoDefecto(e.target.value)}
              placeholder="Resultado por Defecto"
              className="modal-input-analito"
            />
          </div>

          <div className="modal-fila-analito modal-fila-tres">
            <div className="modal-campo-analito">
              <label>Unidad</label>
              <input
                type="text"
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
                placeholder="Unidad"
                className="modal-input-analito"
              />
            </div>

            <div className="modal-campo-analito">
              <label>Dígitos</label>
              <input
                type="text"
                value={digitos}
                onChange={(e) => setDigitos(e.target.value)}
                placeholder="# dígitos"
                className="modal-input-analito"
              />
            </div>

            <div className="modal-campo-analito">
              <label>Tipo de Resultado</label>
              <select
                value={tipoResultado}
                onChange={(e) => setTipoResultado(e.target.value)}
                className="modal-select-analito"
              >
                <option value="">Selecciona una Opcion</option>
                <option value="Numerico">Numérico</option>
                <option value="Texto">Texto</option>
                <option value="Subtitulo">Subtitulo</option>
                <option value="Valor Referenciado">Valor Referenciado</option>
                <option value="Documento">Documento</option>
                <option value="Imagen">Imagen</option>
              </select>
            </div>
          </div>

          <div className="modal-fila-analito">
            <div className="modal-campo-analito">
              <label className="modal-label-vr">VR-Bajo</label>
              <input
                type="text"
                value={vrBajo}
                onChange={(e) => setVrBajo(e.target.value)}
                placeholder="Valor mínimo"
                className="modal-input-analito"
              />
            </div>

            <div className="modal-campo-analito">
              <label className="modal-label-vr">VR-Alto</label>
              <input
                type="text"
                value={vrAlto}
                onChange={(e) => setVrAlto(e.target.value)}
                placeholder="Valor máximo"
                className="modal-input-analito"
              />
            </div>
          </div>

          <div className="modal-botones-analito">
            <button
              type="button"
              className="modal-btn-salir-analito"
              onClick={handleClose}
            >
              Salir
            </button>
            <button
              type="submit"
              className="modal-btn-guardar-analito"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalAnalito;