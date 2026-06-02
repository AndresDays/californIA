import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Mocks
jest.mock('./cierre-caja.css', () => ({}));

jest.mock('../../assets/calendarioIcono.png', () => 'calendarioIcono.png');
jest.mock('../../assets/empresaIcono.png',    () => 'empresaIcono.png');
jest.mock('../../assets/pacientesIcono.png',  () => 'pacientesIcono.png');

jest.mock('../../components/page-layout.jsx', () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>,
}));

jest.mock('../../context/auth-context', () => ({
  useAuth: () => ({ user: { id: 'user-cierre', email: 'cierre@test.com' } }),
}));

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}));

jest.mock('../../lib/supabase-client', () => {
  // Create a chain that is always thenable so direct awaiting works
  const makeChain = () => {
    const resolved = Promise.resolve({ data: [], error: null });
    const chain = {
      select:      jest.fn().mockReturnThis(),
      eq:          jest.fn().mockReturnThis(),
      gte:         jest.fn().mockReturnThis(),
      lte:         jest.fn(() => Promise.resolve({ data: [], error: null })),
      order:       jest.fn(() => Promise.resolve({ data: [], error: null })),
      single:      jest.fn(() => Promise.resolve({ data: null, error: null })),
      maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
      insert:      jest.fn().mockReturnThis(),
    };
    // Make chain itself awaitable for when no terminal is called
    chain.then  = resolved.then.bind(resolved);
    chain.catch = resolved.catch.bind(resolved);
    return chain;
  };
  return { supabase: { from: jest.fn(() => makeChain()) } };
});

import CierreCaja from './cierre-caja';

const renderCierre = () => {
  render(<CierreCaja />);
};

// CierreCaja — Renderizado
describe('CierreCaja — Renderizado', () => {
  beforeEach(() => {});

  test('renderiza el título principal', () => {
    renderCierre();
    expect(screen.getByText('Cierre de Caja')).toBeInTheDocument();
  });

  test('renderiza el botón Apertura Caja', () => {
    renderCierre();
    expect(screen.getByText('Apertura Caja')).toBeInTheDocument();
  });

  test('renderiza el botón de nuevo movimiento', () => {
    renderCierre();
    expect(screen.getByText('+ Movimiento')).toBeInTheDocument();
  });

  test('renderiza el botón Imprimir', () => {
    renderCierre();
    expect(screen.getByText('Imprimir')).toBeInTheDocument();
  });

  test('renderiza el selector de sucursal', () => {
    renderCierre();
    expect(screen.getByDisplayValue('Todas las sucursales')).toBeInTheDocument();
  });

  test('renderiza el selector de empleado', () => {
    renderCierre();
    expect(screen.getByDisplayValue('Todos los empleados')).toBeInTheDocument();
  });

  test('renderiza el campo de fecha', () => {
    renderCierre();
    const dateInputs = screen.getAllByDisplayValue(new Date().toISOString().split('T')[0]);
    expect(dateInputs.length).toBeGreaterThan(0);
  });
});

// CierreCaja — Modal de apertura
describe('CierreCaja — Modal de apertura', () => {
  beforeEach(() => {});

  test('abre el modal de apertura al hacer clic en Apertura Caja', () => {
    renderCierre();
    fireEvent.click(screen.getByText('Apertura Caja'));
    expect(screen.getByText('Apertura de Caja')).toBeInTheDocument();
  });

  test('cierra el modal al hacer clic en Cancelar', () => {
    renderCierre();
    fireEvent.click(screen.getByText('Apertura Caja'));
    expect(screen.getByText('Apertura de Caja')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByText('Apertura de Caja')).not.toBeInTheDocument();
  });

  test('el modal de apertura tiene campo de monto y nota', () => {
    renderCierre();
    fireEvent.click(screen.getByText('Apertura Caja'));
    expect(screen.getByText('Monto de apertura')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Fondo inicial/i)).toBeInTheDocument();
  });
});

// CierreCaja — Modal de nuevo movimiento
describe('CierreCaja — Modal de nuevo movimiento', () => {
  beforeEach(() => {});

  test('abre el modal de nuevo movimiento al hacer clic en + Movimiento', () => {
    renderCierre();
    fireEvent.click(screen.getByText('+ Movimiento'));
    expect(screen.getByText('Nuevo Movimiento')).toBeInTheDocument();
  });

  test('el modal tiene botones de Ingreso y Egreso', () => {
    renderCierre();
    fireEvent.click(screen.getByText('+ Movimiento'));
    expect(screen.getByText('+ Ingreso')).toBeInTheDocument();
    expect(screen.getByText('− Egreso')).toBeInTheDocument();
  });

  test('muestra error si se confirma sin concepto', () => {
    renderCierre();
    fireEvent.click(screen.getByText('+ Movimiento'));
    fireEvent.click(screen.getByText('Registrar ingreso'));
    expect(screen.getByText('El concepto es obligatorio.')).toBeInTheDocument();
  });
});
