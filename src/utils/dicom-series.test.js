import {
  agruparImagenesDicomPorSerie,
  normalizarModalidadVisor,
  normalizarStoragePathDicom,
  ordenarImagenesDicom,
} from "./dicom-series";

test("normaliza rutas publicas de Supabase a storage_path", () => {
  expect(
    normalizarStoragePathDicom("https://abc.supabase.co/storage/v1/object/public/radiologia/99/imagen.dcm?token=1"),
  ).toBe("99/imagen.dcm");
});

test("detecta modalidades de resonancia y ultrasonido desde descripcion o DICOM", () => {
  expect(normalizarModalidadVisor({ dicomModality: "MR" })).toBe("Resonancia Magnetica");
  expect(normalizarModalidadVisor({ descripcion: "Ultrasonido obstetrico" })).toBe("Ultrasonido");
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
