import React, { useState } from 'react';
import './modal-agregar.css';

const ModalAgregar = ({ 
  isOpen, 
  onClose, 
  onGuardar, 
  titulo = "Agregar",
  placeholder = "Ingresar valor",
  icono = "▦"
}) => {
  const [valor, setValor] = useState('');

  const handleGuardar = () => {
    if (valor.trim()) {
      onGuardar(valor);
      setValor('');
      onClose();
    }
  };

  const handleClose = () => {
    setValor('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay-agregar">
      <div className="modal-container-agregar">
        <div className="modal-header-agregar">
          <h2 className="modal-title-agregar">{titulo}</h2>
          <button className="modal-close-btn-agregar" onClick={handleClose}>
            ✕
          </button>
        </div>

        <div className="modal-body-agregar">
          <div className="input-grupo-agregar">
            <span className="input-icon-agregar">{icono}</span>
            <input
              type="text"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder={placeholder}
              className="input-agregar"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleGuardar();
                }
              }}
            />
          </div>
        </div>

        <div className="modal-footer-agregar">
          <button className="btn-salir-agregar" onClick={handleClose}>
            Salir
          </button>
          <button className="btn-guardar-agregar" onClick={handleGuardar}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalAgregar;