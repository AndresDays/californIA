import React from 'react';
import { OPCIONES_DURACION_CITA } from '../utils/duracion-cita';

// Media hora o una hora: dos opciones a la vista en vez de un desplegable,
// porque es lo que más se cambia al agendar un estudio largo.
const CampoDuracionCita = ({ valor, onChange, disabled }) => (
  <div className="form-group-cita">
    <span className="form-label-cita" id="cita-duracion-label">Duración</span>
    <div className="cita-duracion-opciones" role="radiogroup" aria-labelledby="cita-duracion-label">
      {OPCIONES_DURACION_CITA.map((opcion) => (
        <button
          key={opcion.valor}
          type="button"
          role="radio"
          aria-checked={valor === opcion.valor}
          className={`cita-duracion-opcion${valor === opcion.valor ? ' activa' : ''}`}
          onClick={() => onChange(opcion.valor)}
          disabled={disabled}
        >
          {opcion.etiqueta}
        </button>
      ))}
    </div>
  </div>
);

export default CampoDuracionCita;
