import React from 'react';
import './TarjetaEstudio.css';

const TarjetaEstudio = ({ 
  tipoEstudio, 
  descripcionEstudio,
  nombrePaciente, 
  horaFecha, 
  sucursal, 
  estado, 
  onVerDetalles,
  onAsignar,
  onClick 
}) => {
  const getEstadoClass = () => {
    switch(estado?.toUpperCase()) {
      case 'ASIGNADO':
        return 'estado-asignado';
      case 'POR ASIGNAR':
        return 'estado-por-asignar';
      case 'EN PROCESO':
        return 'estado-en-proceso';
      case 'COMPLETADO':
        return 'estado-completado';
      default:
        return 'estado-por-asignar';
    }
  };

  const getEstudioColor = () => {
    switch(tipoEstudio?.toUpperCase()) {
      case 'DX':
        return '#00BCD4'; // Cyan
      case 'US':
        return '#49B2D4'; // Azul claro
      case 'CT':
        return '#106DA0'; // Azul medio
      case 'XR':
        return '#0D4369'; // Azul oscuro
      case 'MR':
        return '#53B9DB'; // Azul brillante
      default:
        return '#49B2D4';
    }
  };

  const handleCardClick = () => {
    if (onClick) onClick();
  };

  // El estudio se lee en un renglón, no en un cuadro: la agenda del día son
  // decenas y en tarjetas grandes había que recorrer la pantalla para
  // encontrarlos. Sigue siendo una tarjeta por dentro -misma clase, mismas
  // props, mismo clic- para que la fila del estudio pueda existir antes de que
  // sus imágenes se carguen.
  return (
    <div className="tarjeta-estudio" onClick={handleCardClick}>
      <div
        className="tarjeta-estudio-header"
        style={{ background: `linear-gradient(135deg, ${getEstudioColor()} 0%, ${getEstudioColor()}dd 100%)` }}
      >
        <h3 className="tipo-estudio">{tipoEstudio || 'XX'}</h3>
      </div>

      <div className="tarjeta-estudio-body">
        <div className="tarjeta-estudio-paciente">
          <h4 className="nombre-paciente">{nombrePaciente || 'Sin nombre'}</h4>
          {descripcionEstudio && (
            <p className="descripcion-estudio">{descripcionEstudio}</p>
          )}
        </div>

        <div className="info-estudio">
          <p className="hora-fecha">{horaFecha || '--:--'}</p>
          <p className="sucursal">{sucursal || 'Sin sucursal'}</p>
        </div>

        <div className={`estado-badge ${getEstadoClass()}`}>
          {estado || 'POR ASIGNAR'}
        </div>

        <div className="tarjeta-acciones">
          <button
            className="btn-menu-estudio"
            onClick={(e) => {
              e.stopPropagation();
              if (onVerDetalles) onVerDetalles();
            }}
          >
            ⋮
          </button>
        </div>
      </div>
    </div>
  );
};

export default TarjetaEstudio;
