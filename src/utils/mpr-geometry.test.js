import {
  buscarIndicePorPuntoMpr,
  calcularPuntoCentralMpr,
  calcularPosicionCruzMpr,
  obtenerGeometriaMpr,
} from "./mpr-geometry";

const dataSet = {
  string: (tag) => ({
    x00200032: "10\\20\\30",
    x00200037: "1\\0\\0\\0\\1\\0",
    x00280030: "2\\3",
  }[tag]),
};

test("lee la geometría física del corte DICOM", () => {
  expect(obtenerGeometriaMpr({ columns: 100, rows: 80, data: { dataSet } })).toEqual({
    posicion: [10, 20, 30], fila: [1, 0, 0], columna: [0, 1, 0], espaciadoFila: 2, espaciadoColumna: 3, columns: 100, rows: 80,
  });
});

test("proyecta el punto anatómico en la posición correcta de otro panel", () => {
  const geometria = obtenerGeometriaMpr({ columns: 100, rows: 80, data: { dataSet } });
  expect(calcularPuntoCentralMpr(geometria)).toEqual([158.5, 99, 30]);
  expect(calcularPosicionCruzMpr(geometria, [158.5, 99, 30])).toEqual({ x: 50, y: 50 });
});

test("elige el corte cuyo plano DICOM coincide con el punto anatómico", () => {
  const sagittal = [0, 25, 50, 75, 100].map((x) => ({
    posicion: [x, 0, 0], fila: [0, 1, 0], columna: [0, 0, 1],
  }));
  const coronalEnOrdenInverso = [100, 75, 50, 25, 0].map((y) => ({
    posicion: [0, y, 0], fila: [1, 0, 0], columna: [0, 0, 1],
  }));

  expect(buscarIndicePorPuntoMpr(sagittal, [51, 50, 50])).toBe(2);
  expect(buscarIndicePorPuntoMpr(coronalEnOrdenInverso, [51, 50, 50])).toBe(2);
});
