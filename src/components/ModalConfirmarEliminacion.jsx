import React from 'react';
import './ModalConfirmarEliminacion.css';
import warningV1 from '../assets/warningV1.png';

const ModalConfirmarEliminacion = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  titulo = "Confirmar Eliminación",
  mensaje,
  nombreElemento,
  tipo = "elemento"
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <>
      <div className="modal-eliminar-overlay" onClick={onClose} />
      <div className="modal-eliminar-container">
        <div className="modal-eliminar-header">
          <img src={warningV1} alt="Advertencia" className="modal-eliminar-icon" />
          <h2 className="modal-eliminar-titulo">{titulo}</h2>
        </div>

        <div className="modal-eliminar-body">
          <p className="modal-eliminar-mensaje">
            {mensaje || `¿Estás seguro de eliminar ${tipo === 'paciente' ? 'al' : tipo === 'usuario' ? 'al' : 'al'} ${tipo}:`}
          </p>
          {nombreElemento && (
            <p className="modal-eliminar-nombre">"{nombreElemento}"</p>
          )}
          <p className="modal-eliminar-advertencia">
            Esta acción no se puede deshacer.
          </p>
        </div>

        <div className="modal-eliminar-footer">
          <button 
            className="btn-modal-cancelar" 
            onClick={onClose}
          >
            Cancelar
          </button>
          <button 
            className="btn-modal-eliminar" 
            onClick={handleConfirm}
          >
            Eliminar
          </button>
        </div>
      </div>
    </>
  );
};

export default ModalConfirmarEliminacion;