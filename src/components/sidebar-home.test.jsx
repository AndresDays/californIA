import fs from 'fs';
import path from 'path';
import { fireEvent, render, screen } from '@testing-library/react';
import SidebarHome from './sidebar-home';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/dashboard' }),
}));

describe('sidebar-home responsive desktop layout', () => {
  const css = fs.readFileSync(
    path.join(process.cwd(), 'src/components/sidebar-home.css'),
    'utf8'
  );

  test('keeps the large-screen sidebar inside shorter viewports', () => {
    expect(css).toMatch(/max-height:\s*calc\(100(?:dvh|vh)\s*-\s*2rem\)/);
    expect(css).toMatch(/overflow-y:\s*auto/);
  });

  test('opens reception submenu by click without navigating away', () => {
    render(<SidebarHome />);

    fireEvent.click(screen.getByRole('button', { name: /Recepción/i }));

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Cotización/i })).toBeInTheDocument();
  });

  test('closes the submenu when clicking outside it', () => {
    render(
      <>
        <button type="button">Fuera del sidebar</button>
        <SidebarHome />
      </>
    );

    fireEvent.click(screen.getByRole('button', { name: /Recepción/i }));
    fireEvent.mouseDown(screen.getByRole('button', { name: /Fuera del sidebar/i }));

    expect(screen.queryByRole('button', { name: /Cotización/i })).not.toBeInTheDocument();
  });
  test('closes the submenu after selecting an option', () => {
    render(<SidebarHome />);

    fireEvent.click(screen.getByRole('button', { name: /Administraci/i }));
    fireEvent.click(screen.getByRole('button', { name: /Pacientes/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/pacientes');
    expect(screen.queryByRole('button', { name: /Doctores/i })).not.toBeInTheDocument();
  });
});
