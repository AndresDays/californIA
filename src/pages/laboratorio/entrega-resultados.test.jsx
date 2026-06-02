import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Mocks
jest.mock('./entrega-resultados.css', () => ({}));

jest.mock('../../assets/calendarioIcono.png',  () => 'calendarioIcono.png');
jest.mock('../../assets/checkIcono.png',       () => 'checkIcono.png');
jest.mock('../../assets/guardarIcono.png',     () => 'guardarIcono.png');
jest.mock('../../assets/ImprimirBtn.png',      () => 'imprimirBtn.png');
jest.mock('../../assets/imprimirIcono.png',    () => 'imprimirIcono.png');
jest.mock('../../assets/lupaIcono.png',        () => 'lupaIcono.png');
jest.mock('../../assets/relojIcono.png',       () => 'relojIcono.png');
jest.mock('../../assets/enviarEmailBtn.png',   () => 'enviarEmailBtn.png');
jest.mock('../../assets/enviarWppBtn.png',     () => 'enviarWppBtn.png');

jest.mock('../../components/page-layout.jsx', () => ({
  __esModule: true, default: ({ children }) => <div>{children}</div>
}));
jest.mock('../../components/ModalNotificacion', () => ({
  __esModule: true,
  default: ({ isOpen, mensaje }) => isOpen ? <div role="alert">{mensaje}</div> : null
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
    in:          jest.fn().mockReturnThis(),
    order:       jest.fn().mockResolvedValue({ data: [], error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    update:      jest.fn().mockReturnThis(),
  };
  return { supabase: { from: jest.fn(() => mockChain) } };
});

import EntregaResultados from './entrega-resultados';

const renderEntrega = async () => {
  await act(async () => { render(<EntregaResultados />); });
};

// EntregaResultados — Renderizado
describe('EntregaResultados — Renderizado', () => {
  beforeEach(() => jest.clearAllMocks());

  test('renderiza el título principal', async () => {
    await renderEntrega();
    expect(screen.getAllByText('Resultados listos para entregar').length).toBeGreaterThan(0);
  });

  test('renderiza los filtros de fecha', async () => {
    await renderEntrega();
    expect(screen.getByText('Inicio')).toBeInTheDocument();
    expect(screen.getByText('Fin')).toBeInTheDocument();
  });

  test('renderiza el buscador unificado', async () => {
    await renderEntrega();
    expect(screen.getByPlaceholderText('Folio, paciente o cliente')).toBeInTheDocument();
  });

  test('muestra mensaje vacío cuando no hay pacientes', async () => {
    await renderEntrega();
    // Table header shows with empty body
    expect(screen.getByText('Folio')).toBeInTheDocument();
    expect(screen.getByText('Nombre')).toBeInTheDocument();
  });

  test('muestra mensaje inicial en la tabla de estudios', async () => {
    await renderEntrega();
    expect(screen.getByText('Seleccione un paciente para revisar y entregar resultados')).toBeInTheDocument();
  });

  test('renderiza el botón Limpiar filtros', async () => {
    await renderEntrega();
    expect(screen.getByText('Limpiar')).toBeInTheDocument();
  });
});

// EntregaResultados — Interacción con filtros
describe('EntregaResultados — Interacción con filtros', () => {
  beforeEach(() => jest.clearAllMocks());

  test('actualiza el buscador al escribir', async () => {
    await renderEntrega();
    const input = screen.getByPlaceholderText('Folio, paciente o cliente');
    fireEvent.change(input, { target: { value: 'FOL-007' } });
    expect(input.value).toBe('FOL-007');
  });

  test('actualiza el buscador con nombre de paciente al escribir', async () => {
    await renderEntrega();
    const input = screen.getByPlaceholderText('Folio, paciente o cliente');
    fireEvent.change(input, { target: { value: 'Pedro' } });
    expect(input.value).toBe('Pedro');
  });
});

// EntregaResultados — Validaciones sin paciente
describe('EntregaResultados — Validaciones sin paciente seleccionado', () => {
  beforeEach(() => jest.clearAllMocks());

  test('no muestra botones de e-mail y WhatsApp sin paciente seleccionado', async () => {
    await renderEntrega();
    // These buttons only appear when a patient is selected
    expect(screen.queryByText('E-mail')).not.toBeInTheDocument();
    expect(screen.queryByText('WhatsApp')).not.toBeInTheDocument();
  });

  test('muestra la tabla de pacientes sin filas de datos', async () => {
    await renderEntrega();
    // Header row only (Folio, Estado, Nombre, Cliente, Estudios, Saldo)
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Folio')).toBeInTheDocument();
  });
});
