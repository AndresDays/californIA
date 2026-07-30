const leerNumeros = (valor) =>
  String(valor || "")
    .split("\\")
    .map(Number)
    .filter(Number.isFinite);

const productoPunto = (a, b) => a.reduce((total, valor, indice) => total + valor * b[indice], 0);

export const obtenerNormalMpr = (geometria) => {
  const [a, b, c] = geometria.fila;
  const [d, e, f] = geometria.columna;
  const normal = [b * f - c * e, c * d - a * f, a * e - b * d];
  const longitud = Math.hypot(...normal) || 1;
  return normal.map((valor) => valor / longitud);
};

export const obtenerGeometriaMpr = (imagen = {}) => {
  const dataSet = imagen?.data?.dataSet || imagen?.data;
  const posicion = leerNumeros(dataSet?.string?.("x00200032"));
  const orientacion = leerNumeros(dataSet?.string?.("x00200037"));
  const espaciado = leerNumeros(dataSet?.string?.("x00280030"));
  if (posicion.length !== 3 || orientacion.length !== 6) return null;
  return {
    posicion,
    fila: orientacion.slice(0, 3),
    columna: orientacion.slice(3, 6),
    espaciadoFila: espaciado[0] || 1,
    espaciadoColumna: espaciado[1] || 1,
    columns: Number(imagen.columns || 1),
    rows: Number(imagen.rows || 1),
  };
};

export const calcularPuntoCentralMpr = (geometria) =>
  geometria.posicion.map(
    (valor, indice) =>
      valor + geometria.fila[indice] * ((geometria.columns - 1) * geometria.espaciadoColumna) / 2
      + geometria.columna[indice] * ((geometria.rows - 1) * geometria.espaciadoFila) / 2,
  );

export const calcularPosicionCruzMpr = (geometria, punto) => {
  if (!geometria || !punto) return null;
  const diferencia = punto.map((valor, indice) => valor - geometria.posicion[indice]);
  const x = productoPunto(diferencia, geometria.fila) / (geometria.espaciadoColumna * Math.max(1, geometria.columns - 1));
  const y = productoPunto(diferencia, geometria.columna) / (geometria.espaciadoFila * Math.max(1, geometria.rows - 1));
  return {
    x: Math.max(0, Math.min(100, x * 100)),
    y: Math.max(0, Math.min(100, y * 100)),
  };
};

export const actualizarPuntoPorCorteMpr = (punto, geometria) => {
  const normal = obtenerNormalMpr(geometria);
  const diferencia = productoPunto(geometria.posicion, normal) - productoPunto(punto, normal);
  return punto.map((valor, indice) => valor + normal[indice] * diferencia);
};

export const calcularCoordenadaCorteMpr = (geometria, punto) =>
  productoPunto(punto, obtenerNormalMpr(geometria));

// Encuentra el plano DICOM más cercano al punto anatómico.  No depende del
// orden de los archivos: las series pueden venir de superior a inferior o al
// revés y aun así el corte elegido representa la misma posición del paciente.
export const buscarIndicePorPuntoMpr = (geometrias = [], punto) => {
  const primera = geometrias.find((geometria) => geometria?.posicion);
  if (!primera || !Array.isArray(punto) || punto.length !== 3) return null;
  const normal = obtenerNormalMpr(primera);
  const objetivo = productoPunto(punto, normal);
  let indiceMasCercano = null;
  let distanciaMenor = Infinity;

  geometrias.forEach((geometria, indice) => {
    if (!geometria?.posicion) return;
    const distancia = Math.abs(productoPunto(geometria.posicion, normal) - objetivo);
    if (distancia < distanciaMenor) {
      distanciaMenor = distancia;
      indiceMasCercano = indice;
    }
  });

  return indiceMasCercano;
};

// El espaciado que define un slab es la distancia real entre planos, no
// SliceThickness: ambos valores pueden ser distintos en reconstrucciones CT.
export const calcularSeparacionCortesMpr = (geometrias = []) => {
  const [primera, segunda] = geometrias;
  if (!primera?.posicion || !segunda?.posicion) return null;
  const normal = primera.normal || obtenerNormalMpr(primera);
  const distancia = Math.abs(productoPunto(
    segunda.posicion.map((valor, indice) => valor - primera.posicion[indice]),
    normal,
  ));
  return Number.isFinite(distancia) && distancia > 0 ? distancia : null;
};
