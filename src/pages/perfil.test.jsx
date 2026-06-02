import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Perfil from './perfil';

// Mock Canvas
beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    value: () => ({
      clearRect:    jest.fn(),
      beginPath:    jest.fn(),
      moveTo:       jest.fn(),
      lineTo:       jest.fn(),
      stroke:       jest.fn(),
      getImageData: jest.fn(),
      putImageData: jest.fn(),
      toDataURL:    () => 'data:image/png;base64,MOCKED'
    }),
  });
});

// Mocks
jest.mock('../context/auth-context', () => ({
  useAuth: () => ({ user: { id: 'fake-user-id', email: 'test@user.com' }, signOut: jest.fn() })
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

jest.mock('../lib/supabase-client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null })
        }),
      }),
      update: () => ({
        eq: () => Promise.resolve({ error: null })
      })
    }),
    storage: {
      from: () => ({
        upload:       () => Promise.resolve({ error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'public-foto.jpg' } })
      })
    },
    auth: {
      updateUser: () => Promise.resolve({ error: null })
    }
  }
}));

jest.mock('../utils/use-sidebar', () => () => ({
  sidebarOpen: false,
  setSidebarOpen: jest.fn(),
  isMobile: false,
}));

jest.mock('../components/header-principal', () => () => <div>MockHeader</div>);
jest.mock('../components/sidebar-home',     () => () => <div>MockSidebar</div>);
jest.mock('../components/sidebar',          () => () => <div>MockSidebarMobile</div>);
jest.mock('../components/ModalNotificacion', () => ({ isOpen, mensaje }) =>
  isOpen ? <div role="alert">{mensaje}</div> : null
);

// Perfil — Renderizado
describe('Perfil — Renderizado', () => {
  test('renderiza el formulario con el botón guardar', () => {
    render(<Perfil />);
    expect(screen.getByText(/Guardar cambios/i)).toBeInTheDocument();
  });

  test('muestra las pestañas de perfil', () => {
    render(<Perfil />);
    expect(screen.getByRole('tab', { name: /Datos personales/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Seguridad/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Firma digital/i })).toBeInTheDocument();
  });

  test('renderiza los campos del tab datos personales por defecto', () => {
    render(<Perfil />);
    expect(screen.getAllByRole('textbox')[0]).toHaveAttribute('name', 'nombre');
    expect(screen.getAllByRole('textbox')[1]).toHaveAttribute('name', 'apellido');
    expect(screen.getAllByRole('textbox')[2]).toHaveAttribute('name', 'email');
    expect(screen.getAllByRole('textbox')[4]).toBeDisabled(); // tipoUsuario
  });

  test('los campos de contraseña están en el tab Seguridad', () => {
    render(<Perfil />);
    // Not visible on datos tab
    expect(screen.queryByPlaceholderText(/Dejar vacío para no cambiar/)).not.toBeInTheDocument();
    // Click security tab
    fireEvent.click(screen.getByRole('tab', { name: /Seguridad/i }));
    expect(screen.getByPlaceholderText(/Dejar vacío para no cambiar/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Confirmar nueva contraseña/)).toBeInTheDocument();
  });

  test('renderiza el canvas de firma en el tab firma digital', () => {
    render(<Perfil />);
    fireEvent.click(screen.getByRole('tab', { name: /Firma digital/i }));
    expect(screen.getByText('Dibujar firma')).toBeInTheDocument();
    expect(screen.getByText('Limpiar firma')).toBeInTheDocument();
  });
});

// Perfil — Validaciones al guardar
describe('Perfil — Validaciones al guardar', () => {
  test('muestra error si las contraseñas no coinciden', async () => {
    render(<Perfil />);

    fireEvent.click(screen.getByRole('tab', { name: /Seguridad/i }));
    fireEvent.change(screen.getByPlaceholderText(/Dejar vacío para no cambiar/), {
      target: { value: 'pass123', name: 'nuevaContrasena' }
    });
    fireEvent.change(screen.getByPlaceholderText(/Confirmar nueva contraseña/), {
      target: { value: 'pass999', name: 'confirmarContrasena' }
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/Guardar cambios/i));
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Las contraseñas no coinciden');
  });

  test('muestra error si la contraseña tiene menos de 6 caracteres', async () => {
    render(<Perfil />);

    fireEvent.click(screen.getByRole('tab', { name: /Seguridad/i }));
    fireEvent.change(screen.getByPlaceholderText(/Dejar vacío para no cambiar/), {
      target: { value: '123', name: 'nuevaContrasena' }
    });
    fireEvent.change(screen.getByPlaceholderText(/Confirmar nueva contraseña/), {
      target: { value: '123', name: 'confirmarContrasena' }
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/Guardar cambios/i));
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'La contraseña debe tener al menos 6 caracteres'
    );
  });

  test('guarda correctamente y muestra notificación de éxito', async () => {
    render(<Perfil />);

    await act(async () => {
      fireEvent.click(screen.getByText(/Guardar cambios/i));
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Perfil actualizado correctamente'
    );
  });
});
