import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ModalAgregar from './modal-agregar';

// Mock del CSS
jest.mock('./modal-agregar.css', () => ({}));

// ModalAgregar — Renderizado
describe('ModalAgregar — Renderizado', () => {
  beforeEach(() => jest.clearAllMocks());

  test('no renderiza nada cuando isOpen es false', () => {
    render(<ModalAgregar isOpen={false} onClose={() => {}} onGuardar={() => {}} />);
    expect(screen.queryByText('Agregar')).not.toBeInTheDocument();
  });

  test('renderiza el modal cuando isOpen es true', () => {
    render(<ModalAgregar isOpen={true} onClose={() => {}} onGuardar={() => {}} />);
    expect(screen.getByText('Agregar')).toBeInTheDocument();
  });

  test('muestra el título personalizado', () => {
    render(<ModalAgregar isOpen={true} onClose={() => {}} onGuardar={() => {}} titulo="Nuevo Paciente" />);
    expect(screen.getByText('Nuevo Paciente')).toBeInTheDocument();
  });

  test('muestra el placeholder personalizado', () => {
    render(<ModalAgregar isOpen={true} onClose={() => {}} onGuardar={() => {}} placeholder="Nombre del paciente" />);
    expect(screen.getByPlaceholderText('Nombre del paciente')).toBeInTheDocument();
  });

  test('muestra el icono personalizado', () => {
    render(<ModalAgregar isOpen={true} onClose={() => {}} onGuardar={() => {}} icono="🏥" />);
    expect(screen.getByText('🏥')).toBeInTheDocument();
  });

  test('pre-llena el input con valorInicial en modo edición', () => {
    render(
      <ModalAgregar isOpen={true} onClose={() => {}} onGuardar={() => {}}
        valorInicial="Cardiología" modoEdicion={true} />
    );
    expect(screen.getByDisplayValue('Cardiología')).toBeInTheDocument();
  });
});

// ModalAgregar — Interacción
describe('ModalAgregar — Interacción', () => {
  beforeEach(() => jest.clearAllMocks());

  test('llama a onClose al hacer clic en el botón ×', () => {
    const onClose = jest.fn();
    render(<ModalAgregar isOpen={true} onClose={onClose} onGuardar={() => {}} />);
    fireEvent.click(screen.getByText('×'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('llama a onClose al hacer clic en el botón Salir', () => {
    const onClose = jest.fn();
    render(<ModalAgregar isOpen={true} onClose={onClose} onGuardar={() => {}} />);
    fireEvent.click(screen.getByText('Salir'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('llama a onClose al hacer clic en el overlay', () => {
    const onClose = jest.fn();
    const { container } = render(<ModalAgregar isOpen={true} onClose={onClose} onGuardar={() => {}} />);
    fireEvent.click(container.querySelector('.modal-overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('actualiza el valor del input al escribir', () => {
    render(<ModalAgregar isOpen={true} onClose={() => {}} onGuardar={() => {}} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Neurología' } });
    expect(input.value).toBe('Neurología');
  });
});

// ModalAgregar — Envío del formulario
describe('ModalAgregar — Envío del formulario', () => {
  beforeEach(() => jest.clearAllMocks());

  test('llama a onGuardar y onClose con el valor correcto al enviar', () => {
    const onGuardar = jest.fn();
    const onClose = jest.fn();
    render(<ModalAgregar isOpen={true} onClose={onClose} onGuardar={onGuardar} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Pediatría' } });
    fireEvent.click(screen.getByText('Guardar'));

    expect(onGuardar).toHaveBeenCalledWith('Pediatría');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('muestra alert y no llama a onGuardar si el valor está vacío', () => {
    const onGuardar = jest.fn();
    const notificacionMock = jest.fn();
    globalThis.mostrarNotificacion = notificacionMock;
    render(<ModalAgregar isOpen={true} onClose={() => {}} onGuardar={onGuardar} />);

    fireEvent.click(screen.getByText('Guardar'));

    expect(notificacionMock).toHaveBeenCalledWith('Por favor, ingrese un valor', 'advertencia');
    expect(onGuardar).not.toHaveBeenCalled();
    delete globalThis.mostrarNotificacion;
  });

  test('recorta espacios en blanco antes de guardar', () => {
    const onGuardar = jest.fn();
    render(<ModalAgregar isOpen={true} onClose={() => {}} onGuardar={onGuardar} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Urgencias  ' } });
    fireEvent.click(screen.getByText('Guardar'));

    expect(onGuardar).toHaveBeenCalledWith('Urgencias');
  });
});
