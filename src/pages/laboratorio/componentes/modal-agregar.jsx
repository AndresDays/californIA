import React, { useState, useEffect } from 'react';
import './modal-agregar.css';

const ModalAgregar = ({ 
  isOpen, 
  onClose, 
  onGuardar, 
  titulo = "Agregar", 
  placeholder = "Ingrese un valor",
  icono = "➕",
  valorInicial = "", 
  modoEdicion = false 
}) => {
  const [valor, setValor] = useState('');

  useEffect(() => {
    if (isOpen) {
      setValor(valorInicial || '');
    }
  }, [isOpen, valorInicial]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!valor.trim()) {
      globalThis.mostrarNotificacion('Por favor, ingrese un valor', 'advertencia');
      return;
    }

    onGuardar(valor.trim());
    setValor('');
    onClose();
  };

  const handleClose = () => {
    setValor('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-contenedor" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-titulo">{titulo}</h2>
          <button className="modal-btn-cerrar" onClick={handleClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-contenido">
          <div className="modal-campo-icon">
            <span className="modal-icon-campo">{icono}</span>
            <input
              type="text"
              placeholder={placeholder}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="modal-input-icon"
              autoFocus
            />
          </div>

          <div className="modal-botones">
            <button
              type="button"
              className="modal-btn-salir"
              onClick={handleClose}
            >
              Salir
            </button>
            <button
              type="submit"
              className="modal-btn-guardar"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalAgregar;
