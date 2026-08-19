import { useEffect, useState } from 'react';
import ModalNotificacion from './ModalNotificacion';
import { EVENTO_MODAL_NOTIFICACION } from '../utils/modal-notificacion';

const ModalNotificacionGlobal = () => {
  const [notificacion, setNotificacion] = useState({ isOpen: false, mensaje: '', tipo: 'exito' });

  useEffect(() => {
    const manejarNotificacion = ({ detail }) =>
      setNotificacion({ isOpen: true, mensaje: detail.mensaje, tipo: detail.tipo });

    window.addEventListener(EVENTO_MODAL_NOTIFICACION, manejarNotificacion);
    return () => window.removeEventListener(EVENTO_MODAL_NOTIFICACION, manejarNotificacion);
  }, []);

  return (
    <ModalNotificacion
      isOpen={notificacion.isOpen}
      onClose={() => setNotificacion((actual) => ({ ...actual, isOpen: false }))}
      mensaje={notificacion.mensaje}
      tipo={notificacion.tipo}
    />
  );
};

export default ModalNotificacionGlobal;
