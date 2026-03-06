import React from 'react';
import { render, screen } from '@testing-library/react';
import Perfil from './perfil';

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
    }
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
jest.mock('../components/header-principal', () => () => <div>MockHeader</div>);
jest.mock('../components/sidebar-home', () => () => <div>MockSidebar</div>);
jest.mock('../components/ModalNotificacion', () => () => <div>MockNotificacion</div>);

test('renders Perfil page with form', () => {
  render(<Perfil />);
  expect(screen.getByText(/GUARDAR/)).toBeInTheDocument();

  // Validar inputs por su orden/lugar/placeholder
  expect(screen.getAllByRole('textbox')[0]).toHaveAttribute('name', 'nombre');
  expect(screen.getAllByRole('textbox')[1]).toHaveAttribute('name', 'apellido');
  expect(screen.getAllByRole('textbox')[2]).toHaveAttribute('name', 'email');
  expect(screen.getAllByRole('textbox')[3]).toHaveAttribute('name', 'telefono');
  expect(screen.getAllByRole('textbox')[4]).toBeDisabled(); // Tipo of user

  // Inputs de contraseña por placeholder
  expect(screen.getByPlaceholderText(/Dejar vacío para no cambiar/)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/Confirmar nueva contraseña/)).toBeInTheDocument();
});
