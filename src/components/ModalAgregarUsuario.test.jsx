import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ModalAgregarUsuario from './ModalAgregarUsuario';
import userEvent from '@testing-library/user-event';

// Mock de CSS
jest.mock('./ModalAgregarUsuario.css', () => {});

// Props base 
const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  onGuardar: jest.fn(() => Promise.resolve()),
  usuarioEditar: null,
};

// SUITE 1 — Renderizado inicial
describe('ModalAgregarUsuario — Renderizado inicial', () => {
  beforeEach(() => jest.clearAllMocks());

  test('no renderiza nada cuando isOpen es false', () => {
    render(<ModalAgregarUsuario {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Agregar Nuevo Usuario')).not.toBeInTheDocument();
  });

  test('renderiza el modal cuando isOpen es true', () => {
    render(<ModalAgregarUsuario {...defaultProps} />);
    expect(screen.getByText('Agregar Nuevo Usuario')).toBeInTheDocument();
  });

  test('muestra título "Editar Usuario" cuando hay usuarioEditar', () => {
    render(<ModalAgregarUsuario {...defaultProps} usuarioEditar={{ id: 1, nombre: 'Ana', usuario: 'ana', rol: 'admin', estado: 'Activado' }} />);
    expect(screen.getByText('Editar Usuario')).toBeInTheDocument();
  });

  test('muestra todos los campos del formulario', () => {
    render(<ModalAgregarUsuario {...defaultProps} />);
    expect(screen.getByPlaceholderText('Nombre completo')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nombre de usuario')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Contraseña')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Seleccionar sucursal')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('correo@ejemplo.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Número de teléfono (10 dígitos)')).toBeInTheDocument();
  });

  test('muestra el botón Guardar en modo creación', () => {
    render(<ModalAgregarUsuario {...defaultProps} />);
    expect(screen.getByText('Guardar')).toBeInTheDocument();
  });

  test('muestra el botón Actualizar en modo edición', () => {
    render(<ModalAgregarUsuario {...defaultProps} usuarioEditar={{ id: 1, nombre: 'Ana', usuario: 'ana', rol: 'admin' }} />);
    expect(screen.getByText('Actualizar')).toBeInTheDocument();
  });

  test('el checkbox "Usuario activo" está marcado por defecto', () => {
    render(<ModalAgregarUsuario {...defaultProps} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });
});

// SUITE 2 — Carga de datos en modo edición
describe('ModalAgregarUsuario — Modo edición', () => {
  beforeEach(() => jest.clearAllMocks());

  const usuarioEditar = {
    id: 5,
    nombre: 'Carlos López',
    usuario: 'carlos',
    rol: 'medico',
    sucursal: 'Norte',
    email: 'carlos@test.com',
    telefono: '1234567890',
    estado: 'Activado',
  };

  test('precarga el nombre del usuario a editar', () => {
    render(<ModalAgregarUsuario {...defaultProps} usuarioEditar={usuarioEditar} />);
    expect(screen.getByPlaceholderText('Nombre completo').value).toBe('Carlos López');
  });

  test('precarga el usuario a editar', () => {
    render(<ModalAgregarUsuario {...defaultProps} usuarioEditar={usuarioEditar} />);
    expect(screen.getByPlaceholderText('Nombre de usuario').value).toBe('carlos');
  });

  test('precarga el email del usuario a editar', () => {
    render(<ModalAgregarUsuario {...defaultProps} usuarioEditar={usuarioEditar} />);
    expect(screen.getByPlaceholderText('correo@ejemplo.com').value).toBe('carlos@test.com');
  });

  test('muestra placeholder de contraseña opcional en modo edición', () => {
    render(<ModalAgregarUsuario {...defaultProps} usuarioEditar={usuarioEditar} />);
    expect(screen.getByPlaceholderText('Dejar vacío para no cambiar')).toBeInTheDocument();
  });
});

// SUITE 3 — Interacciones con el formulario
describe('ModalAgregarUsuario — Interacciones', () => {
  beforeEach(() => jest.clearAllMocks());

  test('permite escribir en el campo nombre', () => {
    render(<ModalAgregarUsuario {...defaultProps} />);
    const input = screen.getByPlaceholderText('Nombre completo');
    fireEvent.change(input, { target: { name: 'nombre', value: 'María García' } });
    expect(input.value).toBe('María García');
  });

  test('permite escribir en el campo usuario', () => {
    render(<ModalAgregarUsuario {...defaultProps} />);
    const input = screen.getByPlaceholderText('Nombre de usuario');
    fireEvent.change(input, { target: { name: 'usuario', value: 'mgarcia' } });
    expect(input.value).toBe('mgarcia');
  });

  test('el campo teléfono solo acepta números', () => {
    render(<ModalAgregarUsuario {...defaultProps} />);
    const input = screen.getByPlaceholderText('Número de teléfono (10 dígitos)');
    fireEvent.change(input, { target: { name: 'telefono', value: 'abc123def' } });
    expect(input.value).toBe('123');
  });

  test('el campo teléfono no acepta más de 10 dígitos', () => {
    render(<ModalAgregarUsuario {...defaultProps} />);
    const input = screen.getByPlaceholderText('Número de teléfono (10 dígitos)');
    fireEvent.change(input, { target: { name: 'telefono', value: '12345678901' } });
    expect(input.value.length).toBeLessThanOrEqual(10);
  });

  test('permite cambiar el rol desde el select', () => {
    render(<ModalAgregarUsuario {...defaultProps} />);
    const select = screen.getByDisplayValue('Seleccionar rol');
    fireEvent.change(select, { target: { name: 'rol', value: 'admin' } });
    expect(select.value).toBe('admin');
  });

  test('permite desmarcar el checkbox de usuario activo', () => {
    render(<ModalAgregarUsuario {...defaultProps} />);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  test('clic en Cancelar llama a onClose', () => {
    const onClose = jest.fn();
    render(<ModalAgregarUsuario {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalled();
  });

  test('clic en ✕ llama a onClose', () => {
    const onClose = jest.fn();
    render(<ModalAgregarUsuario {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('✕'));
    expect(onClose).toHaveBeenCalled();
  });

  test('clic en el overlay llama a onClose', () => {
    const onClose = jest.fn();
    render(<ModalAgregarUsuario {...defaultProps} onClose={onClose} />);
    fireEvent.click(document.querySelector('.modal-usuario-overlay'));
    expect(onClose).toHaveBeenCalled();
  });
});

// SUITE 4 — Validaciones del formulario
describe('ModalAgregarUsuario — Validaciones', () => {
  beforeEach(() => jest.clearAllMocks());

  test('muestra error si nombre está vacío al guardar', async () => {
    render(<ModalAgregarUsuario {...defaultProps} />);
    fireEvent.click(screen.getByText('Guardar'));
    await waitFor(() => {
      expect(screen.getByText('El nombre es requerido')).toBeInTheDocument();
    });
  });

  test('muestra error si usuario está vacío al guardar', async () => {
    render(<ModalAgregarUsuario {...defaultProps} />);
    fireEvent.click(screen.getByText('Guardar'));
    await waitFor(() => {
      expect(screen.getByText('El usuario es requerido')).toBeInTheDocument();
    });
  });

  test('muestra error si contraseña está vacía en modo creación', async () => {
    render(<ModalAgregarUsuario {...defaultProps} />);
    fireEvent.click(screen.getByText('Guardar'));
    await waitFor(() => {
      expect(screen.getByText('La contraseña es requerida')).toBeInTheDocument();
    });
  });

  test('muestra error si rol no está seleccionado', async () => {
    render(<ModalAgregarUsuario {...defaultProps} />);
    fireEvent.click(screen.getByText('Guardar'));
    await waitFor(() => {
      expect(screen.getByText('El rol es requerido')).toBeInTheDocument();
    });
  });

  test('no muestra errores si el formulario es válido y llama a onGuardar', async () => {
    const onGuardar = jest.fn(() => Promise.resolve());
    render(<ModalAgregarUsuario {...defaultProps} onGuardar={onGuardar} />);

    fireEvent.change(screen.getByPlaceholderText('Nombre completo'), {
      target: { name: 'nombre', value: 'Luis Martínez' },
    });
    fireEvent.change(screen.getByPlaceholderText('Nombre de usuario'), {
      target: { name: 'usuario', value: 'luis' },
    });
    fireEvent.change(screen.getByPlaceholderText('Contraseña'), {
      target: { name: 'contrasena', value: 'clave123' },
    });
    fireEvent.change(screen.getByPlaceholderText('correo@ejemplo.com'), {
      target: { name: 'email', value: 'luis@test.com' },
    });
    fireEvent.change(screen.getByDisplayValue('Seleccionar rol'), {
      target: { name: 'rol', value: 'medico' },
    });

    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(onGuardar).toHaveBeenCalled();
    });
  });
});