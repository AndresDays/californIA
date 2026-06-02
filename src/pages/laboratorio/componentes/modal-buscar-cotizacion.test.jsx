import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Mocks
jest.mock('./modal-buscar-cotizacion.css', () => ({}));

jest.mock('../../../lib/supabase-client', () => {
  const mockChain = {
    select: jest.fn().mockReturnThis(),
    eq:     jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  };
  return { supabase: { from: jest.fn(() => mockChain) } };
});

import ModalBuscarCotizacion from './modal-buscar-cotizacion';
import { supabase } from '../../../lib/supabase-client';

const getChain = () => supabase.from();

const renderModal = (props = {}) => {
  const defaults = { isOpen: true, onClose: jest.fn(), onSeleccionar: jest.fn(), onNotificar: jest.fn() };
  return render(<ModalBuscarCotizacion {...defaults} {...props} />);
};

// ModalBuscarCotizacion — Renderizado
describe('ModalBuscarCotizacion — Renderizado', () => {
  beforeEach(() => jest.clearAllMocks());

  test('no renderiza nada cuando isOpen es false', () => {
    render(<ModalBuscarCotizacion isOpen={false} onClose={() => {}} onSeleccionar={() => {}} />);
    expect(screen.queryByText('Buscar Cotización')).not.toBeInTheDocument();
  });

  test('renderiza el modal cuando isOpen es true', () => {
    renderModal();
    expect(screen.getByText('Buscar Cotización')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ingresa el número de cotización/i)).toBeInTheDocument();
    expect(screen.getByText('Cargar Cotización')).toBeInTheDocument();
  });
});

// ModalBuscarCotizacion — Interacción
describe('ModalBuscarCotizacion — Interacción', () => {
  beforeEach(() => jest.clearAllMocks());

  test('llama a onClose al hacer clic en ✕', () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText('✕'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('llama a onClose al hacer clic en Salir', () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText('Salir'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('llama a onNotificar si se intenta cargar sin número', async () => {
    const onNotificar = jest.fn();
    renderModal({ onNotificar });

    await act(async () => {
      fireEvent.click(screen.getByText('Cargar Cotización'));
    });

    expect(onNotificar).toHaveBeenCalledWith('Por favor ingrese el número de cotización', 'advertencia');
  });

  test('actualiza el input al escribir un número', () => {
    renderModal();
    const input = screen.getByPlaceholderText(/ingresa el número de cotización/i);
    fireEvent.change(input, { target: { value: '42' } });
    expect(input.value).toBe('42');
  });
});

// ModalBuscarCotizacion — Búsqueda exitosa
describe('ModalBuscarCotizacion — Búsqueda exitosa', () => {
  beforeEach(() => jest.clearAllMocks());

  test('llama a onSeleccionar y onClose al encontrar la cotización', async () => {
    const cotizacionMock = { id_cotizacion: 5, numero_cotizacion: 5, nombre_paciente: 'Juan' };
    getChain().single.mockResolvedValue({ data: cotizacionMock, error: null });

    const onSeleccionar = jest.fn();
    const onClose = jest.fn();
    renderModal({ onSeleccionar, onClose });

    fireEvent.change(screen.getByPlaceholderText(/ingresa el número de cotización/i), { target: { value: '5' } });

    await act(async () => {
      fireEvent.click(screen.getByText('Cargar Cotización'));
    });

    expect(supabase.from).toHaveBeenCalledWith('cotizaciones');
    expect(onSeleccionar).toHaveBeenCalledWith(cotizacionMock);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ModalBuscarCotizacion — Búsqueda fallida
describe('ModalBuscarCotizacion — Búsqueda fallida', () => {
  beforeEach(() => jest.clearAllMocks());

  test('llama a onNotificar cuando Supabase devuelve un error', async () => {
    const onNotificar = jest.fn();
    getChain().single.mockResolvedValue({ data: null, error: { message: 'not found' } });

    renderModal({ onNotificar });
    fireEvent.change(screen.getByPlaceholderText(/ingresa el número de cotización/i), { target: { value: '999' } });

    await act(async () => {
      fireEvent.click(screen.getByText('Cargar Cotización'));
    });

    expect(onNotificar).toHaveBeenCalledWith('No se encontró la cotización con ese número', 'advertencia');
  });
});
