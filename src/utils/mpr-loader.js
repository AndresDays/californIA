export const obtenerImagenesVecinasMpr = (imageIds = [], indice = 0) => {
  const vecinos = [imageIds[indice - 1], imageIds[indice + 1]].filter(Boolean);
  return [...new Set(vecinos)];
};

export const crearPlanPrecargaMpr = (imageIds = [], indice = 0) => {
  const plan = [];
  for (let distancia = 1; distancia < imageIds.length; distancia += 1) {
    const siguiente = imageIds[indice + distancia];
    const anterior = imageIds[indice - distancia];
    if (siguiente) plan.push(siguiente);
    if (anterior) plan.push(anterior);
  }
  return [...new Set(plan)];
};

export const crearColaInicialMpr = (series = []) =>
  series
    .slice(0, 3)
    .flatMap((serie) => serie.imageIds || [])
    .filter(Boolean);

export const calcularVoiMpr = (voi = {}, deltaX = 0, deltaY = 0) => ({
  windowWidth: Math.max(1, Number(voi.windowWidth || 400) + deltaX * 4),
  windowCenter: Number(voi.windowCenter || 40) + deltaY * 2,
});

export const calcularAreaImagenMpr = ({ width = 0, height = 0 } = {}, { columns = 1, rows = 1 } = {}) => {
  const anchoPanel = Math.max(0, Number(width));
  const altoPanel = Math.max(0, Number(height));
  const proporcionImagen = Math.max(0.01, Number(columns) / Math.max(1, Number(rows)));
  const proporcionPanel = anchoPanel / Math.max(1, altoPanel);
  const ancho = proporcionPanel > proporcionImagen ? altoPanel * proporcionImagen : anchoPanel;
  const alto = proporcionPanel > proporcionImagen ? altoPanel : anchoPanel / proporcionImagen;
  return {
    left: (anchoPanel - ancho) / 2,
    top: (altoPanel - alto) / 2,
    width: ancho,
    height: alto,
  };
};

export const obtenerIndicesSlabMpr = (total, indiceCentral, grosorMm, separacionMm = 1) => {
  const cantidad = Math.max(1, Math.ceil(Number(grosorMm || 0.1) / Math.max(0.01, Number(separacionMm || 1))));
  const radio = Math.floor((cantidad - 1) / 2);
  const inicio = Math.max(0, indiceCentral - radio);
  const fin = Math.min(total - 1, indiceCentral + radio);
  return Array.from({ length: fin - inicio + 1 }, (_, offset) => inicio + offset);
};

export const moverIndiceMpr = (indices = [], totales = [], panelActivo = 0, direccion = 0) => {
  const totalActivo = Math.max(1, Number(totales[panelActivo] || 1));
  const indiceActivo = Math.max(
    0,
    Math.min(totalActivo - 1, Number(indices[panelActivo] || 0) + Math.sign(direccion)),
  );
  return indices.map((indice, panel) => (panel === panelActivo ? indiceActivo : indice));
};

export const obtenerIndicesInicialesMpr = (totales = []) =>
  totales.map((total) => Math.floor(Math.max(0, Number(total || 1) - 1) / 2));

export const combinarPixelesMpr = (cortes = [], modo = "MIP") => {
  const base = cortes[0];
  if (!base) return new Int16Array();
  const TipoPixel = ArrayBuffer.isView(base) ? base.constructor : Int16Array;
  const resultado = new TipoPixel(base.length);
  for (let pixel = 0; pixel < base.length; pixel += 1) {
    let valor = base[pixel];
    if (modo === "Promedio") {
      for (let corte = 1; corte < cortes.length; corte += 1) valor += cortes[corte][pixel];
      resultado[pixel] = Math.round(valor / cortes.length);
      continue;
    }
    for (let corte = 1; corte < cortes.length; corte += 1) {
      const siguiente = cortes[corte][pixel];
      valor = modo === "MinIP" ? Math.min(valor, siguiente) : Math.max(valor, siguiente);
    }
    resultado[pixel] = valor;
  }
  return resultado;
};
