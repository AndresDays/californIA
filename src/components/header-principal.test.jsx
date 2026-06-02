import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from './header-principal';

// Mock NotificationBell to avoid supabase dependency
jest.mock('./notification-bell', () => () => <button aria-label="Notificaciones">🔔</button>);

const mockNavigate = jest.fn();

// Mock de useNavigate de react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Props base reutilizables
const defaultProps = {
  menuOpen: false,
  setMenuOpen: jest.fn(),
  menuRef: React.createRef(),
  empleadoData: {
    rol: 'admin',
    nombre: 'Juan Perez',
  },
  formatRol: () => 'Administrador',
  getPrimerNombre: (nombre) => nombre.split(' ')[0],
  user: { email: 'juan@email.com' },
  handleLogout: jest.fn(),
  currentPage: 'inicio',
};

// SUITE 1 — Renderizado inicial
describe('Header — Renderizado inicial', () => {
  beforeEach(() => jest.clearAllMocks());

  test('renderiza sin errores', () => {
    render(<Header {...defaultProps} />);
  });

  test('muestra las iniciales del empleado en el avatar', () => {
    render(<Header {...defaultProps} />);
    // "Juan Perez" -> "JP"
    expect(screen.getByText('JP')).toBeInTheDocument();
  });

  test('muestra el botón de notificaciones', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByLabelText('Notificaciones')).toBeInTheDocument();
  });

  test('muestra el botón de menú de usuario', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByLabelText('Menú de usuario')).toBeInTheDocument();
  });

  test('el menú desplegable NO es visible cuando menuOpen es false', () => {
    render(<Header {...defaultProps} menuOpen={false} />);
    expect(screen.queryByText('Perfil')).not.toBeInTheDocument();
  });
});

// SUITE 2 — Menú desplegable
describe('Header — Menú desplegable', () => {
  beforeEach(() => jest.clearAllMocks());

  test('el menú es visible cuando menuOpen es true', () => {
    render(<Header {...defaultProps} menuOpen={true} />);
    expect(screen.getByText('Perfil')).toBeInTheDocument();
    expect(screen.getByText('Accesos')).toBeInTheDocument();
    expect(screen.getByText('Cerrar sesión')).toBeInTheDocument();
  });

  test('muestra Plantillas para rol radiologo', () => {
    render(<Header {...defaultProps} menuOpen={true} empleadoData={{ rol: 'radiologo', nombre: 'Juan Perez' }} />);
    expect(screen.getByText('Plantillas')).toBeInTheDocument();
  });

  test('no muestra Plantillas para rol recepcionista', () => {
    render(<Header {...defaultProps} menuOpen={true} empleadoData={{ rol: 'recepcionista', nombre: 'Juan Perez' }} />);
    expect(screen.queryByText('Plantillas')).not.toBeInTheDocument();
  });
});

// SUITE 3 — Interacciones
describe('Header — Interacciones', () => {
  beforeEach(() => jest.clearAllMocks());

  test('clic en el avatar llama a setMenuOpen', () => {
    const setMenuOpen = jest.fn();
    render(<Header {...defaultProps} setMenuOpen={setMenuOpen} />);
    fireEvent.click(screen.getByLabelText('Menú de usuario'));
    expect(setMenuOpen).toHaveBeenCalled();
  });

  test('clic en "Perfil" navega a /perfil', () => {
    render(<Header {...defaultProps} menuOpen={true} />);
    fireEvent.click(screen.getByText('Perfil'));
    expect(mockNavigate).toHaveBeenCalledWith('/perfil');
  });

  test('clic en "Cerrar sesión" llama a handleLogout', () => {
    const handleLogout = jest.fn();
    render(<Header {...defaultProps} menuOpen={true} handleLogout={handleLogout} />);
    fireEvent.click(screen.getByText('Cerrar sesión'));
    expect(handleLogout).toHaveBeenCalled();
  });
});
