// exportar-tabla.test.js

// Mock heavy dependencies before importing the module
jest.mock('jspdf', () => {
  const mockDoc = {
    setFontSize: jest.fn(),
    setTextColor: jest.fn(),
    text: jest.fn(),
    save: jest.fn(),
  };
  return jest.fn(() => mockDoc);
});

jest.mock('jspdf-autotable', () => jest.fn());

jest.mock('xlsx', () => ({
  utils: {
    aoa_to_sheet: jest.fn(() => ({})),
    book_new:     jest.fn(() => ({})),
    book_append_sheet: jest.fn(),
  },
  writeFile: jest.fn(),
}));

import { exportarExcel, exportarPDF } from './exportar-tabla';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

describe('exportar-tabla — exportarExcel', () => {
  beforeEach(() => jest.clearAllMocks());

  test('llama a XLSX.utils.aoa_to_sheet con columnas y filas', () => {
    const columnas = ['Nombre', 'Rol'];
    const filas = [['Juan', 'Admin'], ['Ana', 'Médico']];
    exportarExcel(columnas, filas, 'reporte');
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledWith([columnas, ...filas]);
  });

  test('llama a XLSX.writeFile con el nombre correcto', () => {
    exportarExcel(['A'], [['valor']], 'mi-reporte');
    expect(XLSX.writeFile).toHaveBeenCalledWith(expect.anything(), 'mi-reporte.xlsx');
  });

  test('llama a XLSX.utils.book_new y book_append_sheet', () => {
    exportarExcel(['Col'], [['dato']], 'test');
    expect(XLSX.utils.book_new).toHaveBeenCalled();
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalled();
  });

  test('funciona con filas vacías', () => {
    expect(() => exportarExcel(['Col'], [], 'vacio')).not.toThrow();
    expect(XLSX.writeFile).toHaveBeenCalled();
  });
});

describe('exportar-tabla — exportarPDF', () => {
  beforeEach(() => jest.clearAllMocks());

  test('crea una instancia de jsPDF', () => {
    exportarPDF('Título', ['Col'], [['dato']], 'archivo');
    expect(jsPDF).toHaveBeenCalled();
  });

  test('llama a autoTable con los datos correctos', () => {
    const columnas = ['A', 'B'];
    const filas = [['1', '2']];
    exportarPDF('Mi reporte', columnas, filas, 'test');
    expect(autoTable).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        head: [columnas],
        body: filas,
      })
    );
  });

  test('llama a doc.save con el nombre de archivo correcto', () => {
    exportarPDF('Título', ['X'], [], 'nombre-archivo');
    const mockDocInstance = jsPDF.mock.results[0].value;
    expect(mockDocInstance.save).toHaveBeenCalledWith('nombre-archivo.pdf');
  });

  test('usa orientación landscape cuando hay más de 5 columnas y filas', () => {
    const columnas = ['A', 'B', 'C', 'D', 'E', 'F'];
    const filas = [['1', '2', '3', '4', '5', '6']];
    exportarPDF('Test', columnas, filas, 'wide');
    expect(jsPDF).toHaveBeenCalledWith(expect.objectContaining({ orientation: 'landscape' }));
  });

  test('usa orientación portrait cuando hay pocas columnas', () => {
    exportarPDF('Test', ['A', 'B'], [['1', '2']], 'narrow');
    expect(jsPDF).toHaveBeenCalledWith(expect.objectContaining({ orientation: 'portrait' }));
  });

  test('escribe el título en el documento', () => {
    exportarPDF('Mi Título', ['Col'], [], 'test');
    const mockDocInstance = jsPDF.mock.results[0].value;
    expect(mockDocInstance.text).toHaveBeenCalledWith('Mi Título', 14, 16);
  });
});
