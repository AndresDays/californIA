import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ModalNotificacion from './ModalNotificacion';

// Mock de CSS
jest.mock('./ModalNotificacion.css', () => {});

// Props base
const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  mensaje: 'Operación exitosa',
  tipo: 'exito',
};

// SUITE 1 — Renderizado inicial
describe('ModalNotificacion — Renderizado inicial', () => {
  beforeEach(() => jest.clearAllMocks());

  test('no renderiza nada cuando isOpen es false', () => {
    render(<ModalNotificacion {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Operación exitosa')).not.toBeInTheDocument();
  });

  test('renderiza el modal cuando isOpen es true', () => {
    render(<ModalNotificacion {...defaultProps} />);
    expect(screen.getByText('Operación exitosa')).toBeInTheDocument();
  });

  test('muestra el mensaje recibido por prop', () => {
    render(<ModalNotificacion {...defaultProps} mensaje="Usuario guardado correctamente" />);
    expect(screen.getByText('Usuario guardado correctamente')).toBeInTheDocument();
  });

  test('muestra el botón de cerrar ✕', () => {
    render(<ModalNotificacion {...defaultProps} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});

// SUITE 2 — Íconos por tipo
describe('ModalNotificacion — Íconos por tipo', () => {
  beforeEach(() => jest.clearAllMocks());

  test.each([
    ['exito',      '✓'],
    ['advertencia','⚠'],
    ['info',       'ℹ'],
  ])('tipo "%s" muestra el ícono "%s"', (tipo, icono) => {
    render(<ModalNotificacion {...defaultProps} tipo={tipo} />);
    expect(screen.getByText(icono)).toBeInTheDocument();
  });

  test('tipo "error" muestra el ícono ✕ en el contenedor de ícono', () => {
    render(<ModalNotificacion {...defaultProps} tipo="error" />);
    const icono = document.querySelector('.modal-notificacion-icono');
    expect(icono.textContent).toBe('✕');
  });
});

// SUITE 3 — Interacciones
describe('ModalNotificacion — Interacciones', () => {
  beforeEach(() => jest.clearAllMocks());

  test('clic en el botón ✕ llama a onClose', () => {
    const onClose = jest.fn();
    render(<ModalNotificacion {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClose).toHaveBeenCalled();
  });

  test('clic en el overlay llama a onClose', () => {
    const onClose = jest.fn();
    render(<ModalNotificacion {...defaultProps} onClose={onClose} />);
    fireEvent.click(document.querySelector('.modal-notificacion-overlay'));
    expect(onClose).toHaveBeenCalled();
  });
});

// SUITE 4 — Cierre automático
describe('ModalNotificacion — Cierre automático', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('llama a onClose automáticamente después de 3 segundos', () => {
    const onClose = jest.fn();
    render(<ModalNotificacion {...defaultProps} onClose={onClose} />);

    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('no llama a onClose antes de 3 segundos', () => {
    const onClose = jest.fn();
    render(<ModalNotificacion {...defaultProps} onClose={onClose} />);

    act(() => {
      jest.advanceTimersByTime(2999);
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  test('no inicia el timer cuando isOpen es false', () => {
    const onClose = jest.fn();
    render(<ModalNotificacion {...defaultProps} isOpen={false} onClose={onClose} />);

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(onClose).not.toHaveBeenCalled();
  });
});