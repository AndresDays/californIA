import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Mocks
jest.mock('./reporte-ventas.css', () => ({}));

jest.mock('../../utils/exportar-tabla', () => ({
  exportarTablaAPDF: jest.fn(),
  exportarTablaAExcel: jest.fn(),
  crearCsvVentas: jest.fn(),
}));

jest.mock('../../components/page-layout.jsx', () => ({
  __esModule: true, default: ({ children }) => <div>{children}</div>
}));

jest.mock('../../context/auth-context', () => ({
  useAuth: () => ({ user: { id: 'user-123', email: 'test@test.com' } })
}));

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn()
}));

jest.mock('../../lib/supabase-client', () => {
  const mockChain = {
    select:      jest.fn().mockReturnThis(),
    eq:          jest.fn().mockReturnThis(),
    gte:         jest.fn().mockReturnThis(),
    lte:         jest.fn().mockReturnThis(),
    order:       jest.fn().mockResolvedValue({ data: [], error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    single:      jest.fn().mockResolvedValue({ data: null, error: null }),
  };
  return { supabase: { from: jest.fn(() => mockChain) } };
});

jest.mock('../../assets/calendarioIcono.png', () => 'calendarioIcono.png');

import ReporteVentas from './reporte-ventas';

const renderReporte = async () => {
  await act(async () => { render(<ReporteVentas />); });
};

// ReporteVentas — Renderizado
describe('ReporteVentas — Renderizado', () => {
  beforeEach(() => jest.clearAllMocks());

  test('renderiza el título principal', async () => {
    await renderReporte();
    expect(screen.getByText('Reporte de Ventas')).toBeInTheDocument();
  });

  test('renderiza los filtros de fecha', async () => {
    await renderReporte();
    expect(screen.getByText(/Fecha inicial/i)).toBeInTheDocument();
    expect(screen.getByText(/Fecha final/i)).toBeInTheDocument();
  });

  test('renderiza el buscador de estudio', async () => {
    await renderReporte();
    expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument();
  });

  test('renderiza los botones de tipo de reporte', async () => {
    await renderReporte();
    expect(screen.getByText('Reporte General')).toBeInTheDocument();
    expect(screen.getByText('Por Estudio')).toBeInTheDocument();
    expect(screen.getByText('Sumatoria')).toBeInTheDocument();
  });

  test('renderiza el botón Generar', async () => {
    await renderReporte();
    expect(screen.getByText('Generar')).toBeInTheDocument();
  });

  test('renderiza los botones Excel y PDF', async () => {
    await renderReporte();
    expect(screen.getByText('Excel')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });
});

// ReporteVentas — Interacción con filtros
describe('ReporteVentas — Interacción con filtros', () => {
  beforeEach(() => jest.clearAllMocks());

  test('actualiza el buscador de estudio al escribir', async () => {
    await renderReporte();
    const input = screen.getByPlaceholderText('Buscar...');
    fireEvent.change(input, { target: { value: 'Glucosa' } });
    expect(input.value).toBe('Glucosa');
  });

  test('actualiza el select de forma de pago', async () => {
    await renderReporte();
    // Find the select with "Todas" as default value for forma de pago (3rd select)
    const selects = screen.getAllByDisplayValue('Todas');
    expect(selects.length).toBeGreaterThan(0);
    // forma de pago select has "efectivo" option
    const formaPagoSelect = selects.find(sel => {
      const options = Array.from(sel.options).map(o => o.value);
      return options.includes('efectivo');
    });
    expect(formaPagoSelect).toBeTruthy();
    fireEvent.change(formaPagoSelect, { target: { value: 'efectivo' } });
    expect(formaPagoSelect.value).toBe('efectivo');
  });
});

// ReporteVentas — Botones de acción
describe('ReporteVentas — Botones de acción', () => {
  beforeEach(() => jest.clearAllMocks());

  test('clic en Reporte General lo marca como activo', async () => {
    await renderReporte();
    fireEvent.click(screen.getByText('Reporte General'));
    // Button should have 'active' class
    expect(screen.getByText('Reporte General').closest('button').className).toContain('active');
  });

  test('clic en Por Estudio cambia el tipo de reporte', async () => {
    await renderReporte();
    fireEvent.click(screen.getByText('Por Estudio'));
    expect(screen.getByText('Por Estudio').closest('button').className).toContain('active');
  });
});
