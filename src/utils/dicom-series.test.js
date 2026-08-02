import {
  esArchivoDicom,
  agruparImagenesDicomPorSerie,
  normalizarModalidadVisor,
  normalizarStoragePathDicom,
  obtenerPresetVentanaInicialSerie,
  obtenerSerieFuenteMpr,
  ordenarSeriesParaMpr,
  ordenarImagenesDicom,
} from "./dicom-series";

test("acepta DICOM por extensión aunque el navegador lo marque como octet-stream", () => {
  expect(esArchivoDicom({ file_name: "torax.dcm", mime_type: "application/octet-stream" })).toBe(true);
  expect(esArchivoDicom({ storage_path: "12/estudio.dicom", mime_type: "" })).toBe(true);
});

test("no trata adjuntos de imagen o PDF como imágenes DICOM", () => {
  expect(esArchivoDicom({ file_name: "placa.jpg", mime_type: "image/jpeg" })).toBe(false);
  expect(esArchivoDicom({ file_name: "reporte.pdf", mime_type: "application/pdf" })).toBe(false);
});

test("normaliza rutas publicas de Supabase a storage_path", () => {
  expect(
    normalizarStoragePathDicom("https://abc.supabase.co/storage/v1/object/public/radiologia/99/imagen.dcm?token=1"),
  ).toBe("99/imagen.dcm");
});

test("detecta modalidades de resonancia y ultrasonido desde descripcion o DICOM", () => {
  expect(normalizarModalidadVisor({ dicomModality: "MR" })).toBe("Resonancia Magnetica");
  expect(normalizarModalidadVisor({ descripcion: "Ultrasonido obstetrico" })).toBe("Ultrasonido");
});

test("obtiene presets CT a partir de la etiqueta de una serie", () => {
  expect(obtenerPresetVentanaInicialSerie({ modalidad: "Tomografia", label: "LUNG" })).toBe("ct-pulmon");
  expect(obtenerPresetVentanaInicialSerie({ modalidad: "CT", label: "BONE" })).toBe("ct-hueso");
  expect(obtenerPresetVentanaInicialSerie({ modalidad: "CT", label: "CEREBRO" })).toBe("ct-cerebro");
  expect(obtenerPresetVentanaInicialSerie({ modalidad: "CT", label: "SCOUT" })).toBe("nativo");
});

test("no fuerza preset para series no CT o sin etiqueta clinica conocida", () => {
  expect(obtenerPresetVentanaInicialSerie({ modalidad: "MR", label: "LUNG" })).toBeNull();
  expect(obtenerPresetVentanaInicialSerie({ modalidad: "CT", label: "AXIAL 5 MM" })).toBeNull();
});

test("ordena imagenes por instancia y agrupa por serie", () => {
  const series = agruparImagenesDicomPorSerie(
    [
      { storage_path: "b.dcm", imageId: "wadouri:b", series_instance_uid: "s1", instance_number: 2 },
      { storage_path: "a.dcm", imageId: "wadouri:a", series_instance_uid: "s1", instance_number: 1 },
      { storage_path: "c.dcm", imageId: "wadouri:c", series_instance_uid: "s2", series_description: "Coronal" },
    ],
    { descripcion: "Resonancia Magnetica de rodilla" },
  );

  expect(series).toHaveLength(2);
  expect(series[0].id).toBe("s1");
  expect(series[0].imageIds).toEqual(["wadouri:a", "wadouri:b"]);
  expect(series[1]).toEqual(expect.objectContaining({ label: "Coronal" }));
});

test("ordena con fecha y path cuando no hay instance_number", () => {
  expect(
    ordenarImagenesDicom([
      { storage_path: "2.dcm", created_at: "2026-01-02T00:00:00Z" },
      { storage_path: "1.dcm", created_at: "2026-01-01T00:00:00Z" },
    ]).map((imagen) => imagen.storage_path),
  ).toEqual(["1.dcm", "2.dcm"]);
});

test("prioriza las reconstrucciones sagital y coronal para MPR", () => {
  const series = [
    { id: "localizador", label: "SCOUT" },
    { id: "abd", label: "ABD/PELVIS W/" },
    { id: "sag", label: "SAG 2X2 ABD" },
    { id: "cor", label: "COR 2X2 ABD" },
  ];

  expect(ordenarSeriesParaMpr(series, "abd").slice(0, 3).map((serie) => serie.id)).toEqual([
    "abd",
    "sag",
    "cor",
  ]);
});

test("elige la serie axial fuente para MPR y descarta reconstrucciones", () => {
  const fuente = obtenerSerieFuenteMpr([
    { id: "abd", label: "ABD/PELVIS W/", imageIds: Array(95).fill("ax") },
    { id: "sag", label: "SAG 2X2 ABD", imageIds: Array(211).fill("sag") },
    { id: "cor", label: "COR 2X2 ABD", imageIds: Array(211).fill("cor") },
  ]);

  expect(fuente?.id).toBe("abd");
});
