import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import HeaderLab from './header-laboratorio';

const mockNavigate = jest.fn();
let mockEmpleadoData = { rol: 'admin', nombre: 'Admin' };

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock('../context/auth-context', () => ({
  useAuth: () => ({
    user: null,
    signOut: jest.fn(),
    empleadoData: mockEmpleadoData,
  }),
}));

describe('HeaderLab', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockEmpleadoData = { rol: 'admin', nombre: 'Admin' };
  });

  test('hides users option for receptionist role', () => {
    mockEmpleadoData = { rol: 'recepcionista', nombre: 'Recepcion' };

    render(<HeaderLab />);
    fireEvent.click(screen.getByAltText(/Usuario/i));

    expect(screen.queryByRole('button', { name: /Usuarios/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nuevo Paciente/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cierre Caja/i })).toBeInTheDocument();
  });

  test('keeps users option for admin role', () => {
    render(<HeaderLab />);
    fireEvent.click(screen.getByAltText(/Usuario/i));

    expect(screen.getByRole('button', { name: /Usuarios/i })).toBeInTheDocument();
  });
});
