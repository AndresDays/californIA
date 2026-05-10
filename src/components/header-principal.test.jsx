import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from './header-principal';

const mockNavigate = jest.fn();

// Mock de useNavigate de react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render the user name and rol in the main header', () => {
    render(<Header {...mockProps} />);
    expect(screen.queryByText(/ADMIN/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Juan/)).not.toBeInTheDocument();
  });

  it('renders the centered CalifornIA logo', () => {
    const { container } = render(<Header {...mockProps} />);
    expect(container.querySelector('.header-california-logo')).toBeInTheDocument();
  });

  it('calls setMenuOpen on avatar click', () => {
    render(<Header {...mockProps} />);
    const avatar = screen.getByLabelText(/Menú de usuario/i);
    fireEvent.click(avatar);
    expect(mockProps.setMenuOpen).toHaveBeenCalled();
  });

  it('shows Plantillas in the profile menu for radiologos and navigates to templates', () => {
    render(
      <Header
        {...mockProps}
        menuOpen
        empleadoData={{ ...mockProps.empleadoData, rol: 'radiologo' }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Plantillas/i }));

    expect(mockProps.setMenuOpen).toHaveBeenCalledWith(false);
    expect(mockNavigate).toHaveBeenCalledWith('/plantillas');
  });

  it('hides Plantillas in the profile menu for roles without access', () => {
    render(
      <Header
        {...mockProps}
        menuOpen
        empleadoData={{ ...mockProps.empleadoData, rol: 'recepcionista' }}
      />,
    );

    expect(screen.queryByRole('button', { name: /Plantillas/i })).not.toBeInTheDocument();
  });
});
