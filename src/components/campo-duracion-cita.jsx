import React from 'react';
import {
  DURACION_CORTA,
  DURACION_MAXIMA,
  PASO_DURACION,
  formatearDuracion,
} from '../utils/duracion-cita';

// La duración se ajusta de media en media hora. La que corresponde a los
// estudios elegidos -una hora por resonancia, media por cualquier otro- se
// propone sola; si alguien la cambió a mano, se avisa cuál sería y se puede
// regresar a ella con un clic.
const CampoDuracionCita = ({ valor, onChange, sugerida, disabled }) => {
  const cambiar = (delta) =>
    onChange(Math.min(DURACION_MAXIMA, Math.max(DURACION_CORTA, valor + delta)));
  const distinta = sugerida && sugerida !== valor;

  return (
    <div className="form-group-cita">
      <span className="form-label-cita" id="cita-duracion-label">Duración</span>
      <div className="cita-duracion-control" role="group" aria-labelledby="cita-duracion-label">
        <button
          type="button"
          className="cita-duracion-paso"
          aria-label="Media hora menos"
          onClick={() => cambiar(-PASO_DURACION)}
          disabled={disabled || valor <= DURACION_CORTA}
        >
          −
        </button>
        <output className="cita-duracion-valor" aria-live="polite" data-testid="cita-duracion-valor">
          {formatearDuracion(valor)}
        </output>
        <button
          type="button"
          className="cita-duracion-paso"
          aria-label="Media hora más"
          onClick={() => cambiar(PASO_DURACION)}
          disabled={disabled || valor >= DURACION_MAXIMA}
        >
          +
        </button>
      </div>
      {distinta && (
        <p className="cita-duracion-sugerida">
          Por los estudios corresponden {formatearDuracion(sugerida)}.{' '}
          <button type="button" onClick={() => onChange(sugerida)} disabled={disabled}>
            Usar {formatearDuracion(sugerida)}
          </button>
        </p>
      )}
    </div>
  );
};

export default CampoDuracionCita;
