import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Perfil from './perfil';

const mockHeader = jest.fn(() => <div>MockHeader</div>);
const mockSidebar = jest.fn(({ isOpen }) => <div>{isOpen ? 'MockMobileSidebarOpen' : 'MockMobileSidebarClosed'}</div>);
const mockSidebarHome = jest.fn(() => <div>MockSidebarHome</div>);
const mockSetSidebarOpen = jest.fn();
let mockSidebarState = {
  sidebarOpen: false,
  setSidebarOpen: mockSetSidebarOpen,
  isMobile: false
};

// Mock de HTMLCanvasElement para evitar errores de jsdom
beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    value: () => ({
      clearRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      getImageData: jest.fn(),
      putImageData: jest.fn(),
      toDataURL: () => "data:image/png;base64,MOCKED"
    }),
  });
});

// Mock useAuth
jest.mock('../context/auth-context', () => ({
  useAuth: () => ({
    user: {
      id: 'fake-user-id',
      email: 'test@user.com'
    },
    signOut: jest.fn()
  }),
}));

// Mock useNavigate
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

// Mock supabase client
jest.mock('../lib/supabase-client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null })
        }),
        update: () => ({
          eq: () => Promise.resolve({ error: null })
        })
      }),
      update: () => ({
        eq: () => Promise.resolve({ error: null })
      })
    }),
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'public-foto.jpg' } })
      })
    },
    auth: {
      updateUser: () => Promise.resolve({ error: null })
    }
  }
}));

// Mock child components
jest.mock('../components/header-principal', () => (props) => mockHeader(props));
jest.mock('../components/sidebar', () => (props) => mockSidebar(props));
jest.mock('../components/sidebar-home', () => (props) => mockSidebarHome(props));
jest.mock('../components/ModalNotificacion', () => () => <div>MockNotificacion</div>);
jest.mock('../utils/use-sidebar', () => () => mockSidebarState);

beforeEach(() => {
  jest.clearAllMocks();
  mockSidebarState = {
    sidebarOpen: false,
    setSidebarOpen: mockSetSidebarOpen,
    isMobile: false
  };
});

test('renders Perfil page with cleaner profile sections', () => {
  render(<Perfil />);
  expect(screen.getByRole('button', { name: /guardar cambios/i })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /datos personales/i })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /seguridad/i })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /firma digital/i })).toBeInTheDocument();

  expect(screen.getAllByRole('textbox')[0]).toHaveAttribute('name', 'nombre');
  expect(screen.getAllByRole('textbox')[1]).toHaveAttribute('name', 'apellido');
  expect(screen.getAllByRole('textbox')[2]).toHaveAttribute('name', 'email');
  expect(screen.getAllByRole('textbox')[3]).toHaveAttribute('name', 'telefono');
  expect(screen.getAllByRole('textbox')[4]).toBeDisabled(); // Tipo of user
});

test('moves password inputs into the security tab', () => {
  render(<Perfil />);

  expect(screen.queryByPlaceholderText(/Dejar vacío para no cambiar/)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('tab', { name: /seguridad/i }));

  expect(screen.getByPlaceholderText(/Dejar vacío para no cambiar/)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/Confirmar nueva contraseña/)).toBeInTheDocument();
});

test('allows uploading a PNG signature from the signature tab', () => {
  render(<Perfil />);

  fireEvent.click(screen.getByRole('tab', { name: /firma digital/i }));

  const firmaInput = screen.getByLabelText(/subir firma png/i);
  expect(firmaInput).toHaveAttribute('type', 'file');
  expect(firmaInput).toHaveAttribute('accept', 'image/png,.png');
  expect(screen.getByText(/Dibujar firma/)).toBeInTheDocument();
});

test('connects the header hamburger to the responsive sidebar', () => {
  mockSidebarState = {
    sidebarOpen: true,
    setSidebarOpen: mockSetSidebarOpen,
    isMobile: true
  };

  render(<Perfil />);

  const headerProps = mockHeader.mock.calls.at(-1)[0];
  expect(headerProps.sidebarOpen).toBe(true);
  expect(headerProps.setSidebarOpen).toBe(mockSetSidebarOpen);
  expect(mockSidebar.mock.calls.at(-1)[0]).toEqual(
    expect.objectContaining({
      isOpen: true,
      setIsOpen: mockSetSidebarOpen,
    })
  );
  expect(mockSidebarHome).not.toHaveBeenCalled();
});
