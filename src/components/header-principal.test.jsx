import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from './header-principal';

// Mock de useNavigate de react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

describe('Header', () => {
  const mockProps = {
    menuOpen: false,
    setMenuOpen: jest.fn(),
    menuRef: React.createRef(),
    empleadoData: {
      rol: 'admin',
      nombre: 'Juan Perez'
    },
    formatRol: rol => 'ADMIN',
    getPrimerNombre: nombre => nombre.split(' ')[0],
    user: { email: 'juan@email.com' },
    handleLogout: jest.fn(),
    currentPage: 'inicio'
  };

  it('renders the user name and rol', () => {
    render(<Header {...mockProps} />);
    expect(screen.getByText(/ADMIN/)).toBeInTheDocument();
    expect(screen.getByText(/Juan/)).toBeInTheDocument();
  });

  it('calls setMenuOpen on avatar click', () => {
    render(<Header {...mockProps} />);
    const avatar = screen.getByAltText(/Usuario/i);
    fireEvent.click(avatar);
    expect(mockProps.setMenuOpen).toHaveBeenCalled();
  });
});
