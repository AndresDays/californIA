import { render, screen } from '@testing-library/react';
import Sidebar from './sidebar';

const ICONO_INCRUSTADO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/dashboard' }),
}));

jest.mock('../context/auth-context', () => ({
  useAuth: () => ({ empleadoData: { rol: 'admin' }, user: null }),
}));

// Así llegan los iconos pequeños en el build de producción: Vite los incrusta
// como data URI y la ruta ya no contiene ".png".
jest.mock('./sidebar-menu', () => {
  const actual = jest.requireActual('./sidebar-menu');
  return {
    sidebarItems: actual.sidebarItems.map((item) => ({
      ...item,
      icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB',
    })),
  };
});

describe('Sidebar (menú de celular)', () => {
  test('pinta los iconos incrustados como imagen y no como texto base64', () => {
    const { container } = render(<Sidebar isOpen setIsOpen={jest.fn()} />);

    expect(container.textContent).not.toContain('base64');
    expect(container.querySelectorAll('.sidebar-icon-img').length).toBeGreaterThan(0);
    container.querySelectorAll('.sidebar-icon-img').forEach((img) => {
      expect(img).toHaveAttribute('src', ICONO_INCRUSTADO);
    });
  });

  test('en /dashboard sólo Inicio aparece activo, no Recepción', () => {
    render(<Sidebar isOpen setIsOpen={jest.fn()} />);

    expect(screen.getByRole('button', { name: /Inicio/ })).toHaveClass('active');
    expect(screen.getByRole('button', { name: /Recepción/ })).not.toHaveClass('active');
  });
});

describe('Sidebar (pie del menú)', () => {
  test('muestra la versión de la app y el año actual', () => {
    const { container } = render(<Sidebar isOpen setIsOpen={jest.fn()} />);
    const pie = container.querySelector('.sidebar-footer').textContent;

    expect(pie).not.toContain('v1.0');
    expect(pie).toContain(`© ${new Date().getFullYear()}`);
  });
});
