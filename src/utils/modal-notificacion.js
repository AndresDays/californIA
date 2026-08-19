export const EVENTO_MODAL_NOTIFICACION = 'california:modal-notificacion';

export const mostrarNotificacion = (mensaje, tipo = 'exito') => {
  window.dispatchEvent(
    new CustomEvent(EVENTO_MODAL_NOTIFICACION, { detail: { mensaje, tipo } }),
  );
};

globalThis.mostrarNotificacion = mostrarNotificacion;
