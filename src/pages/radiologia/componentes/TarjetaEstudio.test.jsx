import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TarjetaEstudio from './TarjetaEstudio';

describe('TarjetaEstudio', () => {
  const baseProps = {
    tipoEstudio: 'DX',
    nombrePaciente: 'Maria Gomez',
    horaFecha: '10:00 AM',
    sucursal: 'Sucursal Centro',
    estado: 'ASIGNADO',
    onVerDetalles: jest.fn(),
    onClick: jest.fn()
  };

  it('muestra la información principal', () => {
    render(<TarjetaEstudio {...baseProps} />);
    expect(screen.getByText('DX')).toBeInTheDocument();
    expect(screen.getByText('Maria Gomez')).toBeInTheDocument();
    expect(screen.getByText('10:00 AM')).toBeInTheDocument();
    expect(screen.getByText('Sucursal Centro')).toBeInTheDocument();
    expect(screen.getByText('ASIGNADO')).toBeInTheDocument();
  });

  it('dispara el callback onClick al hacer click en la tarjeta', () => {
    render(<TarjetaEstudio {...baseProps} />);
    fireEvent.click(screen.getByText('DX').closest('.tarjeta-estudio'));
    expect(baseProps.onClick).toHaveBeenCalled();
  });

  it('dispara onVerDetalles al hacer click en el botón ⋮', () => {
    render(<TarjetaEstudio {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: /⋮/ }));
    expect(baseProps.onVerDetalles).toHaveBeenCalled();
  });

  // Se lee en un renglón, pero sigue siendo una tarjeta por dentro: la fila del
  // estudio existe desde que se crea, antes de que sus imágenes se carguen.
  it('el estudio se pinta en un solo renglon con sus datos', () => {
    render(<TarjetaEstudio {...baseProps} descripcionEstudio="TAC DE CRANEO" />);
    const tarjeta = screen.getByText('DX').closest('.tarjeta-estudio');

    expect(tarjeta).toBeInTheDocument();
    expect(tarjeta).toHaveTextContent('Maria Gomez');
    expect(tarjeta).toHaveTextContent('TAC DE CRANEO');
    expect(tarjeta).toHaveTextContent('Sucursal Centro');
  });

  it('se pinta aunque el estudio no tenga aun descripcion ni imagenes', () => {
    render(
      <TarjetaEstudio
        tipoEstudio="CT"
        nombrePaciente="Luis Paz"
        onClick={jest.fn()}
        onVerDetalles={jest.fn()}
      />,
    );

    expect(screen.getByText('CT')).toBeInTheDocument();
    expect(screen.getByText('Luis Paz')).toBeInTheDocument();
    expect(screen.getByText('POR ASIGNAR')).toBeInTheDocument();
    expect(screen.getByText('--:--')).toBeInTheDocument();
  });

  it.each([false, true])('no muestra acciones manuales de imagen cuando tieneImagen es %s', (tieneImagen) => {
    render(<TarjetaEstudio {...baseProps} tieneImagen={tieneImagen} onSubirImagen={jest.fn()} />);
    expect(screen.queryByRole('button', { name: /subir imagen|reemplazar imagen/i })).not.toBeInTheDocument();
  });
});
