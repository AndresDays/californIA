import {
  buildImageRow,
  buildPatientRow,
  buildStoragePath,
  buildStudyRow,
  findBestPendingStudyMatch,
  getTag,
  hasSameNameTokens,
  normalizeModality,
  parseDicomPatientName,
  syncStudy,
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

test("matches patient names even when DICOM sends given names before surnames", () => {
  expect(hasSameNameTokens("Diaz Cortes Juan Andres", "JUAN ANDRES DIAZ CORTES")).toBe(true);
  expect(hasSameNameTokens("Juan Andres Diaz Cortes", "JUAN ANDRES DIAZ")).toBe(false);
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

test("selects the only pending radiology study matching patient, modality, and date", () => {
  expect(
    findBestPendingStudyMatch({
      candidates: [
        {
          id_estudio: 10,
          tipo_estudio: "MR",
          descripcion: "RM LUMBAR",
          fecha_estudio: "2026-07-14T09:30:00",
          storage_path: null,
        },
        {
          id_estudio: 11,
          tipo_estudio: "CT",
          descripcion: "TC ABDOMEN",
          fecha_estudio: "2026-07-14T09:30:00",
          storage_path: null,
        },
      ],
      studyRow: {
        tipo_estudio: "MR",
        descripcion: "RM LUMBAR",
        fecha_estudio: "2026-07-14T16:31:07",
      },
    }),
  ).toBe(10);
});

test("matches pending studies when app date is UTC and DICOM date is Mexico local time", () => {
  expect(
    findBestPendingStudyMatch({
      candidates: [
        {
          id_estudio: 185,
          tipo_estudio: "US",
          descripcion: "U.S. HEPATO VESICULAR",
          fecha_estudio: "2026-08-18T00:26:41",
          storage_path: null,
        },
      ],
      studyRow: {
        tipo_estudio: "US",
        descripcion: "US",
        fecha_estudio: "2026-08-17T19:02:20",
      },
    }),
  ).toBe(185);
});

test("links a single modality/date candidate even when incoming DICOM description is generic", () => {
  expect(
    findBestPendingStudyMatch({
      candidates: [
        {
          id_estudio: 16,
          tipo_estudio: "US",
          descripcion: "ULTRASONIDO ABDOMINAL",
          fecha_estudio: "2026-07-14T09:30:00",
          storage_path: null,
        },
      ],
      studyRow: {
        tipo_estudio: "US",
        descripcion: "DX",
        fecha_estudio: "2026-07-14T16:31:07",
      },
    }),
  ).toBe(16);
});

test("uses description to disambiguate multiple compatible pending studies", () => {
  expect(
    findBestPendingStudyMatch({
      candidates: [
        {
          id_estudio: 10,
          tipo_estudio: "MR",
          descripcion: "RM LUMBAR",
          fecha_estudio: "2026-07-14T09:30:00",
          storage_path: null,
        },
        {
          id_estudio: 12,
          tipo_estudio: "MR",
          descripcion: "RM HOMBRO",
          fecha_estudio: "2026-07-14T10:10:00",
          storage_path: null,
        },
      ],
      studyRow: {
        tipo_estudio: "MR",
        descripcion: "RM LUMBAR",
        fecha_estudio: "2026-07-14T16:31:07",
      },
    }),
  ).toBe(10);
});

test("does not auto-link when more than one pending radiology study is compatible", () => {
  expect(
    findBestPendingStudyMatch({
      candidates: [
        {
          id_estudio: 10,
          tipo_estudio: "MR",
          descripcion: "RM LUMBAR",
          fecha_estudio: "2026-07-14T09:30:00",
          storage_path: null,
        },
        {
          id_estudio: 12,
          tipo_estudio: "MR",
          descripcion: "RM COLUMNA LUMBAR",
          fecha_estudio: "2026-07-14T10:10:00",
          storage_path: null,
        },
      ],
      studyRow: {
        tipo_estudio: "MR",
        descripcion: "RM LUMBAR",
        fecha_estudio: "2026-07-14T16:31:07",
      },
    }),
  ).toBeNull();
});

test("links by patient day without requiring the same study hour or description", () => {
  expect(
    findBestPendingStudyMatch({
      candidates: [
        {
          id_estudio: 185,
          tipo_estudio: "US",
          descripcion: "U.S. HEPATO VESICULAR",
          fecha_estudio: "2026-08-18T00:26:41",
          storage_path: null,
        },
      ],
      studyRow: {
        tipo_estudio: "US",
        descripcion: "US",
        fecha_estudio: "2026-08-17T19:02:20",
      },
    }),
  ).toBe(185);
});

test("syncStudy links incoming DICOM to a pending radiology card instead of creating a new one", async () => {
  const orthanc = {
    studyTags: jest.fn().mockResolvedValue({
      PatientName: "MORO MIER^PALOMA",
      PatientID: "25",
      StudyInstanceUID: "1.2.3",
      StudyDescription: "US ABDOMEN",
      StudyDate: "20260714",
      StudyTime: "163107",
    }),
    instancesForStudy: jest.fn().mockResolvedValue([{ ID: "instance-1" }]),
    instanceTags: jest.fn().mockResolvedValue({
      Modality: "US",
      StudyInstanceUID: "1.2.3",
      SeriesInstanceUID: "1.2.3.1",
      SeriesDescription: "Abdomen",
      InstanceNumber: "1",
    }),
    instanceFile: jest.fn().mockResolvedValue(Buffer.from("dicom")),
    markSynced: jest.fn().mockResolvedValue(undefined),
  };
  const supabase = {
    upsertPatient: jest.fn().mockResolvedValue(25),
    findStudyIdByUid: jest.fn().mockResolvedValue(null),
    findPendingStudyForDicom: jest.fn().mockResolvedValue({
      id_estudio: 16,
      fecha_estudio: "2026-07-14T22:26:07",
    }),
    updateStudyFromDicom: jest.fn().mockResolvedValue(undefined),
    updateStudyPatient: jest.fn().mockResolvedValue(undefined),
    createStudy: jest.fn(),
    countImagesByUid: jest.fn().mockResolvedValue(0),
    uploadDicom: jest.fn().mockResolvedValue(undefined),
    upsertImageRows: jest.fn().mockResolvedValue(undefined),
    updatePrimaryImage: jest.fn().mockResolvedValue(undefined),
  };

  const result = await syncStudy({ orthanc, supabase, studyId: "orthanc-study" });

  expect(supabase.findPendingStudyForDicom).toHaveBeenCalledWith({
    idPaciente: 25,
    studyRow: {
      tipo_estudio: "US",
      estado: "EN PROCESO",
      descripcion: "US ABDOMEN",
      fecha_estudio: "2026-07-14T16:31:07",
    },
  });
  expect(supabase.updateStudyFromDicom).toHaveBeenCalledWith(
    16,
    expect.objectContaining({
      tipo_estudio: "US",
      estado: "EN PROCESO",
      fecha_estudio: "2026-07-14T16:31:07",
    }),
  );
  expect(supabase.createStudy).not.toHaveBeenCalled();
  expect(result.idEstudio).toBe(16);
});
