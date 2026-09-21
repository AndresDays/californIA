import React, { useEffect } from 'react';
import './ModalNotificacion.css';

const ModalNotificacion = ({ 
  isOpen, 
  onClose, 
  mensaje,
  tipo = 'exito' 
}) => {
  // El aviso de error no se va solo: desaparecia a los tres segundos y quien
  // estaba capturando no alcanzaba a leer por que no se habia guardado, asi
  // que parecia que si se habia guardado y el dato se perdia sin explicacion.
  // Se cierra con su boton.
  useEffect(() => {
    if (isOpen && tipo !== 'error') {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen, onClose, tipo]);

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

  // Sin velo de pantalla completa: esto es un aviso al margen -"guardado
  // correctamente", "falta el motivo"- y se va solo a los tres segundos.
  // El velo que llevaba cubria toda la pantalla y bloqueaba los clics, asi que
  // durante esos tres segundos no se podia seguir capturando.
  return (
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
  );
};

export default ModalNotificacion;