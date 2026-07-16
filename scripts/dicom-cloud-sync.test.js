import {
  buildImageRow,
  buildPatientRow,
  buildStoragePath,
  buildStudyRow,
  getTag,
  normalizeModality,
  parseDicomPatientName,
} from "./dicom-cloud-sync.js";

test("builds a stable storage path for an Orthanc instance", () => {
  expect(
    buildStoragePath({
      idEstudio: 42,
      studyInstanceUid: "1.2.840/ABC",
      instanceId: "orthanc-instance-id",
      instanceNumber: 7,
    }),
  ).toBe("42/1.2.840-ABC-7-orthanc-instance-id.dcm");
});

test("builds a radiology study row from DICOM tags", () => {
  expect(
    buildStudyRow({
      StudyDescription: "TC Abdomen",
      Modality: "CT",
      StudyDate: "20260713",
      StudyTime: "184233",
    }),
  ).toEqual({
    tipo_estudio: "CT",
    estado: "EN PROCESO",
    descripcion: "TC Abdomen",
    fecha_estudio: "2026-07-13T18:42:33",
  });
});

test("uses instance modality when study-level modality is missing", () => {
  expect(
    buildStudyRow(
      {
        StudyDescription: "DX",
        StudyDate: "20260714",
        StudyTime: "163107",
      },
      {
        Modality: "US",
      },
    ),
  ).toEqual({
    tipo_estudio: "US",
    estado: "EN PROCESO",
    descripcion: "DX",
    fecha_estudio: "2026-07-14T16:31:07",
  });
});

test("parses DICOM patient names and builds patient rows", () => {
  expect(parseDicomPatientName("ARELLANO DIAZ^RUBEN")).toEqual({
    nombre: "RUBEN ARELLANO DIAZ",
    primer_nombre: "RUBEN",
    apellido_paterno: "ARELLANO",
    apellido_materno: "DIAZ",
  });
  expect(parseDicomPatientName("RUBEN ARELLANO DIAZ")).toEqual({
    nombre: "RUBEN ARELLANO DIAZ",
    primer_nombre: "RUBEN",
    apellido_paterno: "ARELLANO",
    apellido_materno: "DIAZ",
  });

  expect(
    buildPatientRow({
      PatientName: "ARELLANO DIAZ^RUBEN",
      PatientID: "2173",
      PatientBirthDate: "19540723",
      PatientSex: "M",
    }),
  ).toEqual({
    nombre: "RUBEN ARELLANO DIAZ",
    primer_nombre: "RUBEN",
    apellido_paterno: "ARELLANO",
    apellido_materno: "DIAZ",
    cedula: "2173",
    fecha_nacimiento: "1954-07-23",
    sexo: "M",
    tipo: "particular",
  });

  expect(
    buildPatientRow({
      PatientName: "CARDIACO^TEST",
      PatientBirthDate: "00000000",
    }),
  ).toMatchObject({
    nombre: "TEST CARDIACO",
    fecha_nacimiento: null,
  });
});

test("builds an image row compatible with the viewer schema", () => {
  expect(
    buildImageRow({
      idEstudio: 42,
      storagePath: "42/path.dcm",
      fileSize: 1234,
      tags: {
        Modality: "MR",
        StudyInstanceUID: "1.2.study",
        SeriesInstanceUID: "1.2.series",
        SeriesDescription: "Axial",
        InstanceNumber: "3",
        NumberOfFrames: "12",
      },
    }),
  ).toEqual({
    id_estudio: 42,
    bucket: "radiologia",
    storage_path: "42/path.dcm",
    file_name: "path.dcm",
    file_size: 1234,
    mime_type: "application/dicom",
    modality: "MR",
    study_instance_uid: "1.2.study",
    series_instance_uid: "1.2.series",
    series_description: "Axial",
    instance_number: 3,
    frame_count: 12,
  });
});

test("reads tags from simplified and Value-shaped DICOM payloads", () => {
  expect(getTag({ PatientName: "Jane" }, "PatientName")).toBe("Jane");
  expect(getTag({ PatientName: { Value: ["Jane"] } }, "PatientName")).toBe("Jane");
});

test("normalizes verbose modalities into short radiology codes", () => {
  expect(normalizeModality("Computed Tomography")).toBe("CT");
  expect(normalizeModality("TC Abdomen")).toBe("CT");
  expect(normalizeModality("TAC TORAX")).toBe("CT");
  expect(normalizeModality("RM Lumbar")).toBe("MR");
  expect(normalizeModality("Magnetic Resonance")).toBe("MR");
  expect(normalizeModality("")).toBe("DX");
});
