import React from 'react';
import './TarjetaEstudio.css';

const TarjetaEstudio = ({ 
  tipoEstudio, 
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

  return (
    <div className="tarjeta-estudio" onClick={handleCardClick}>
      <div 
        className="tarjeta-estudio-header" 
        style={{ background: `linear-gradient(135deg, ${getEstudioColor()} 0%, ${getEstudioColor()}dd 100%)` }}
      >
        <h3 className="tipo-estudio">{tipoEstudio || 'XX'}</h3>
      </div>

      <div className="tarjeta-estudio-body">
        <h4 className="nombre-paciente">{nombrePaciente || 'Sin nombre'}</h4>
        
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