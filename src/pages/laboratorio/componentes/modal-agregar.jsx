import React, { useState, useEffect } from 'react';
import './modal-agregar.css';

const ModalAgregar = ({ 
  isOpen, 
  onClose, 
  onGuardar, 
  titulo = "Agregar", 
  placeholder = "Ingrese un valor",
  icono = "➕",
  valorInicial = "", // Para edición
  modoEdicion = false // true cuando es editar, false cuando es agregar
}) => {
  const [valor, setValor] = useState('');

  // Actualizar valor cuando cambia valorInicial (modo edición)
  useEffect(() => {
    if (isOpen) {
      setValor(valorInicial || '');
    }
  }, [isOpen, valorInicial]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!valor.trim()) {
      alert('Por favor, ingrese un valor');
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
        {/* Header del Modal */}
        <div className="modal-header">
          <h2 className="modal-titulo">{titulo}</h2>
          <button className="modal-btn-cerrar" onClick={handleClose}>
            ×
          </button>
        </div>

        {/* Contenido del Modal */}
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

          {/* Botones */}
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