import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ModalConfirmarEliminacion from './ModalConfirmarEliminacion';

// Mock de assets y CSS 
jest.mock('../assets/warningV1.png', () => 'mock-warning-icon');
jest.mock('./ModalConfirmarEliminacion.css', () => {});

// Props base
const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  onConfirm: jest.fn(),
  titulo: 'Confirmar Eliminación',
  mensaje: null,
  nombreElemento: 'Juan Pérez',
  tipo: 'elemento',
};

// SUITE 1 — Renderizado inicial
describe('ModalConfirmarEliminacion — Renderizado inicial', () => {
  beforeEach(() => jest.clearAllMocks());

  test('no renderiza nada cuando isOpen es false', () => {
    render(<ModalConfirmarEliminacion {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Confirmar Eliminación')).not.toBeInTheDocument();
  });

  test('renderiza el modal cuando isOpen es true', () => {
    render(<ModalConfirmarEliminacion {...defaultProps} />);
    expect(screen.getByText('Confirmar Eliminación')).toBeInTheDocument();
  });

  test('muestra el título personalizado cuando se pasa la prop titulo', () => {
    render(<ModalConfirmarEliminacion {...defaultProps} titulo="Eliminar Paciente" />);
    expect(screen.getByText('Eliminar Paciente')).toBeInTheDocument();
  });

  test('muestra el ícono de advertencia', () => {
    render(<ModalConfirmarEliminacion {...defaultProps} />);
    expect(screen.getByAltText('Advertencia')).toBeInTheDocument();
  });

  test('muestra el nombre del elemento entre comillas', () => {
    render(<ModalConfirmarEliminacion {...defaultProps} />);
    expect(screen.getByText('"Juan Pérez"')).toBeInTheDocument();
  });

  test('no muestra el nombre si nombreElemento no se pasa', () => {
    render(<ModalConfirmarEliminacion {...defaultProps} nombreElemento={null} />);
    expect(screen.queryByText(/".*"/)).not.toBeInTheDocument();
  });

  test('muestra la advertencia de acción irreversible', () => {
    render(<ModalConfirmarEliminacion {...defaultProps} />);
    expect(screen.getByText('Esta acción no se puede deshacer.')).toBeInTheDocument();
  });

  test('muestra el mensaje personalizado cuando se pasa la prop mensaje', () => {
    render(<ModalConfirmarEliminacion {...defaultProps} mensaje="¿Deseas eliminar este registro?" />);
    expect(screen.getByText('¿Deseas eliminar este registro?')).toBeInTheDocument();
  });

  test('muestra los botones Cancelar y Eliminar', () => {
    render(<ModalConfirmarEliminacion {...defaultProps} />);
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
    expect(screen.getByText('Eliminar')).toBeInTheDocument();
  });

  test('permite personalizar botones y ocultar advertencia', () => {
    render(
      <ModalConfirmarEliminacion
        {...defaultProps}
        textoCancelar="No agregar"
        textoConfirmar="Agregar de todos modos"
        mostrarAdvertencia={false}
      />
    );
    expect(screen.getByText('No agregar')).toBeInTheDocument();
    expect(screen.getByText('Agregar de todos modos')).toBeInTheDocument();
    expect(screen.queryByText('Esta acción no se puede deshacer.')).not.toBeInTheDocument();
  });
});

// SUITE 2 — Interacciones
describe('ModalConfirmarEliminacion — Interacciones', () => {
  beforeEach(() => jest.clearAllMocks());

  test('clic en Cancelar llama a onClose', () => {
    const onClose = jest.fn();
    render(<ModalConfirmarEliminacion {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalled();
  });

  test('clic en el overlay llama a onClose', () => {
    const onClose = jest.fn();
    render(<ModalConfirmarEliminacion {...defaultProps} onClose={onClose} />);
    fireEvent.click(document.querySelector('.modal-eliminar-overlay'));
    expect(onClose).toHaveBeenCalled();
  });

  test('clic en Eliminar llama a onConfirm', () => {
    const onConfirm = jest.fn();
    render(<ModalConfirmarEliminacion {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('Eliminar'));
    expect(onConfirm).toHaveBeenCalled();
  });

  test('clic en Eliminar también llama a onClose', () => {
    const onClose = jest.fn();
    render(<ModalConfirmarEliminacion {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Eliminar'));
    expect(onClose).toHaveBeenCalled();
  });

  test('clic en Eliminar llama a onConfirm y onClose en ese orden', () => {
    const callOrder = [];
    const onConfirm = jest.fn(() => callOrder.push('onConfirm'));
    const onClose = jest.fn(() => callOrder.push('onClose'));
    render(<ModalConfirmarEliminacion {...defaultProps} onConfirm={onConfirm} onClose={onClose} />);
    fireEvent.click(screen.getByText('Eliminar'));
    expect(callOrder).toEqual(['onConfirm', 'onClose']);
  });
});
