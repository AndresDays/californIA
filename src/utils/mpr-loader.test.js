import { calcularAreaImagenMpr, calcularVoiMpr, combinarPixelesMpr, crearColaInicialMpr, crearPlanPrecargaMpr, moverIndiceMpr, obtenerIndicesInicialesMpr, obtenerIndicesSlabMpr, obtenerImagenesVecinasMpr } from "./mpr-loader";
import { calcularSeparacionCortesMpr } from "./mpr-geometry";

test("precarga el corte anterior y siguiente sin repetir el actual", () => {
  expect(obtenerImagenesVecinasMpr(["i1", "i2", "i3", "i4"], 2)).toEqual([
    "i2",
    "i4",
  ]);
});

test("respeta los extremos de la serie", () => {
  expect(obtenerImagenesVecinasMpr(["i1", "i2"], 0)).toEqual(["i2"]);
});

test("prioriza los cortes cercanos y continúa con el resto de la serie", () => {
  expect(crearPlanPrecargaMpr(["i1", "i2", "i3", "i4", "i5"], 2)).toEqual([
    "i4",
    "i2",
    "i5",
    "i1",
  ]);
});

test("prepara todas las imágenes de las tres series que abrirá MPR", () => {
  expect(crearColaInicialMpr([
    { imageIds: ["ax-1", "ax-2"] },
    { imageIds: ["sag-1"] },
    { imageIds: ["cor-1", "cor-2"] },
    { imageIds: ["extra-1"] },
  ])).toEqual(["ax-1", "ax-2", "sag-1", "cor-1", "cor-2"]);
});

test("calcula el ajuste WW/WC compartido para los tres paneles MPR", () => {
  expect(calcularVoiMpr({ windowWidth: 400, windowCenter: 40 }, 10, -5)).toEqual({
    windowWidth: 440,
    windowCenter: 30,
  });
});

test("convierte grosor en milímetros a cortes vecinos centrados", () => {
  expect(obtenerIndicesSlabMpr(10, 5, 5, 1)).toEqual([3, 4, 5, 6, 7]);
});

test("combina el slab como MIP, MinIP o promedio", () => {
  const cortes = [new Int16Array([1, 8]), new Int16Array([5, 2])];
  expect([...combinarPixelesMpr(cortes, "MIP")]).toEqual([5, 8]);
  expect([...combinarPixelesMpr(cortes, "MinIP")]).toEqual([1, 2]);
  expect([...combinarPixelesMpr(cortes, "Promedio")]).toEqual([3, 5]);
});

test("conserva valores altos de DICOM sin reinterpretarlos como negativos", () => {
  const cortes = [new Uint16Array([62000, 120]), new Uint16Array([65535, 240])];
  const resultado = combinarPixelesMpr(cortes, "MIP");

  expect(resultado).toBeInstanceOf(Uint16Array);
  expect([...resultado]).toEqual([65535, 240]);
});

test("limita las líneas de referencia al rectángulo visible de la imagen", () => {
  expect(calcularAreaImagenMpr({ width: 400, height: 800 }, { columns: 512, rows: 512 })).toEqual({
    left: 0, top: 200, width: 400, height: 400,
  });
});

test("navega únicamente el corte del panel activo", () => {
  expect(moverIndiceMpr([47, 105, 89], [95, 211, 179], 0, 1)).toEqual([48, 105, 89]);
  expect(moverIndiceMpr([47, 105, 89], [95, 211, 179], 1, -1)).toEqual([47, 104, 89]);
});

test("restaurar MPR regresa los tres paneles al corte central", () => {
	expect(obtenerIndicesInicialesMpr([95, 211, 179])).toEqual([47, 105, 89]);
});

test("usa la distancia física entre cortes para el grosor, no SliceThickness", () => {
	expect(calcularSeparacionCortesMpr([
		{ posicion: [0, 0, 0], normal: [0, 0, 1] },
		{ posicion: [0, 0, 2], normal: [0, 0, 1] },
	])).toBe(2);
});
