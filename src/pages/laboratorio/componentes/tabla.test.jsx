import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Tabla from './tabla';

// Mock de CSS
jest.mock('./tabla.css', () => {});

// Datos base reutilizables
const headers = ['Nombre', 'Rol', 'Email'];
const datos = [
  { id: 1, nombre: 'Juan Pérez',  rol: 'Admin',       email: 'juan@test.com' },
  { id: 2, nombre: 'Ana García',  rol: 'Recepcionista',email: 'ana@test.com'  },
  { id: 3, nombre: 'Luis Torres', rol: 'Médico',       email: 'luis@test.com' },
];

// SUITE 1 — Renderizado inicial
describe('Tabla — Renderizado inicial', () => {
  beforeEach(() => jest.clearAllMocks());

  test('renderiza sin errores con props mínimos', () => {
    render(<Tabla />);
  });

  test('muestra los encabezados correctamente', () => {
    render(<Tabla headers={headers} datos={datos} />);
    headers.forEach(header => {
      expect(screen.getByText(header)).toBeInTheDocument();
    });
  });

  test('muestra la columna # cuando mostrarNumero es true', () => {
    render(<Tabla headers={headers} datos={datos} mostrarNumero={true} />);
    expect(screen.getByText('#')).toBeInTheDocument();
  });

  test('no muestra la columna # cuando mostrarNumero es false', () => {
    render(<Tabla headers={headers} datos={datos} mostrarNumero={false} />);
    expect(screen.queryByText('#')).not.toBeInTheDocument();
  });

  test('muestra el mensaje de tabla vacía cuando datos es un arreglo vacío', () => {
    render(<Tabla headers={headers} datos={[]} />);
    expect(screen.getByText('No hay registros para mostrar')).toBeInTheDocument();
  });

  test('muestra el texto vacío personalizado', () => {
    render(<Tabla headers={headers} datos={[]} textoVacio="Sin resultados disponibles" />);
    expect(screen.getByText('Sin resultados disponibles')).toBeInTheDocument();
  });
});

// SUITE 2 — Renderizado de datos
describe('Tabla — Renderizado de datos', () => {
  beforeEach(() => jest.clearAllMocks());

  test('renderiza el número correcto de filas', () => {
    render(<Tabla headers={headers} datos={datos} />);
    const filas = screen.getAllByRole('row');
    expect(filas).toHaveLength(datos.length + 1);
  });

  test('muestra los datos de cada fila correctamente', () => {
    render(<Tabla headers={headers} datos={datos} />);
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('Ana García')).toBeInTheDocument();
    expect(screen.getByText('Luis Torres')).toBeInTheDocument();
  });

  test('muestra la numeración comenzando en paginaInicio', () => {
    render(<Tabla headers={headers} datos={datos} paginaInicio={5} mostrarNumero={true} />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  test('la numeración por defecto comienza en 1', () => {
    render(<Tabla headers={headers} datos={datos} mostrarNumero={true} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});

// SUITE 3 — Columna de acciones
describe('Tabla — Columna de acciones', () => {
  beforeEach(() => jest.clearAllMocks());

  test('no muestra columna Acciones si no se pasan onEditar ni onEliminar', () => {
    render(<Tabla headers={headers} datos={datos} />);
    expect(screen.queryByText('Acciones')).not.toBeInTheDocument();
  });

  test('muestra columna Acciones cuando se pasa onEditar', () => {
    render(<Tabla headers={headers} datos={datos} onEditar={jest.fn()} />);
    expect(screen.getByText('Acciones')).toBeInTheDocument();
  });

  test('muestra columna Acciones cuando se pasa onEliminar', () => {
    render(<Tabla headers={headers} datos={datos} onEliminar={jest.fn()} />);
    expect(screen.getByText('Acciones')).toBeInTheDocument();
  });

  test('muestra botones de editar para cada fila', () => {
    render(<Tabla headers={headers} datos={datos} onEditar={jest.fn()} />);
    const botonesEditar = screen.getAllByTitle('Editar');
    expect(botonesEditar).toHaveLength(datos.length);
  });

  test('muestra botones de eliminar para cada fila', () => {
    render(<Tabla headers={headers} datos={datos} onEliminar={jest.fn()} />);
    const botonesEliminar = screen.getAllByTitle('Eliminar');
    expect(botonesEliminar).toHaveLength(datos.length);
  });

  test('clic en editar llama a onEditar con el id correcto', () => {
    const onEditar = jest.fn();
    render(<Tabla headers={headers} datos={datos} onEditar={onEditar} />);
    fireEvent.click(screen.getAllByTitle('Editar')[0]);
    expect(onEditar).toHaveBeenCalledWith(1);
  });

  test('clic en eliminar llama a onEliminar con el id correcto', () => {
    const onEliminar = jest.fn();
    render(<Tabla headers={headers} datos={datos} onEliminar={onEliminar} />);
    fireEvent.click(screen.getAllByTitle('Eliminar')[0]);
    expect(onEliminar).toHaveBeenCalledWith(1);
  });

  test('solo muestra botón editar cuando no se pasa onEliminar', () => {
    render(<Tabla headers={headers} datos={datos} onEditar={jest.fn()} />);
    expect(screen.queryByTitle('Eliminar')).not.toBeInTheDocument();
    expect(screen.getAllByTitle('Editar')).toHaveLength(datos.length);
  });

  test('solo muestra botón eliminar cuando no se pasa onEditar', () => {
    render(<Tabla headers={headers} datos={datos} onEliminar={jest.fn()} />);
    expect(screen.queryByTitle('Editar')).not.toBeInTheDocument();
    expect(screen.getAllByTitle('Eliminar')).toHaveLength(datos.length);
  });
});