import React, { useEffect } from 'react';
import './ModalNotificacion.css';

const ModalNotificacion = ({ 
  isOpen, 
  onClose, 
  mensaje,
  tipo = 'exito' 
}) => {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const obtenerIcono = () => {
    switch (tipo) {
      case 'exito':
        return '✓';
      case 'error':
        return '✕';
      case 'advertencia':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return '✓';
    }
  };

  return (
    <>
      <div className="modal-notificacion-overlay" onClick={onClose} />
      <div className={`modal-notificacion-container ${tipo}`}>
        <div className="modal-notificacion-icono">
          {obtenerIcono()}
        </div>
        <div className="modal-notificacion-contenido">
          <p className="modal-notificacion-mensaje">{mensaje}</p>
        </div>
        <button className="modal-notificacion-cerrar" onClick={onClose}>
          ✕
        </button>
      </div>
    </>
  );
};

export default ModalNotificacion;