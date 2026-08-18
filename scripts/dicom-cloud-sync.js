const DEFAULT_BUCKET = "radiologia";
const DEFAULT_ORTHANC_URL = "http://127.0.0.1:8042";
const SYNC_METADATA_KEY = "california-synced-at";

const requiredEnv = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const trimSlash = (value = "") => String(value).replace(/\/+$/, "");

const cleanSegment = (value = "dicom") =>
  String(value || "dicom")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120) || "dicom";

const numberOrNull = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const normalizeText = (value = "") =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();

const normalizeNameTokens = (value = "") =>
  normalizeText(value)
    .split(" ")
    .filter((part) => part.length >= 2)
    .sort();

export const hasSameNameTokens = (left = "", right = "") => {
  const leftTokens = normalizeNameTokens(left);
  const rightTokens = normalizeNameTokens(right);
  if (leftTokens.length === 0 || leftTokens.length !== rightTokens.length) return false;
  return leftTokens.every((token, index) => token === rightTokens[index]);
};

const mexicoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Mexico_City",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dateOnly = (value) => {
  if (!value) return null;
  const text = String(value);
  const isoDate = text.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(text)) {
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? isoDate : mexicoDateFormatter.format(parsed);
  }
  return isoDate;
};

const localDateCandidates = (value) => {
  const baseDate = dateOnly(value);
  if (!baseDate) return [];
  const dates = new Set([baseDate]);
  const text = String(value);
  if (text.includes("T") && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(text)) {
    const asUtc = new Date(`${text}Z`);
    if (!Number.isNaN(asUtc.getTime())) dates.add(mexicoDateFormatter.format(asUtc));
  }
  return [...dates];
};

const sameLocalDate = (a, b) => {
  const left = localDateCandidates(a);
  const right = localDateCandidates(b);
  return left.some((date) => right.includes(date));
};

export const getTag = (tags = {}, key) => {
  const value = tags[key];
  if (Array.isArray(value)) return value[0] ?? null;
  if (value && typeof value === "object" && Array.isArray(value.Value)) {
    return value.Value[0] ?? null;
  }
  return value ?? null;
};

export const normalizeModality = (value = "") => {
  const text = String(value || "").toUpperCase();
  if (
    text === "CT" ||
    text.includes("TOMOGRAPH") ||
    text.includes("TOMOGRAF") ||
    text.includes("TAC") ||
    /\bTC\b/.test(text)
  ) {
    return "CT";
  }
  if (text === "MR" || /\bRM\b/.test(text) || text.includes("MAGNETIC") || text.includes("RESONANC")) return "MR";
  if (text === "US" || text.includes("ULTRAS")) return "US";
  if (["DX", "CR", "XR", "RF"].includes(text)) return "DX";
  if (text === "MG" || text.includes("MAMMO") || text.includes("MAST")) return "MG";
  return text.slice(0, 20) || "DX";
};

const parseDicomDateTime = (dateValue, timeValue) => {
  const date = String(dateValue || "");
  if (!/^\d{8}$/.test(date)) return new Date().toISOString().slice(0, 19);
  const time = String(timeValue || "000000").padEnd(6, "0");
  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}`;
};

const parseDicomDate = (dateValue) => {
  const date = String(dateValue || "");
  if (!/^\d{8}$/.test(date)) return null;
  if (date.startsWith("0000") || date.slice(4, 6) === "00" || date.slice(6, 8) === "00") return null;
  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
};

export const parseDicomPatientName = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (!raw.includes("^")) {
    const parts = raw.split(/\s+/).filter(Boolean);
    return {
      nombre: raw,
      primer_nombre: parts[0] || raw,
      apellido_paterno: parts[1] || null,
      apellido_materno: parts.slice(2).join(" ") || null,
    };
  }
  const [family = "", given = ""] = raw.split("^");
  const familyParts = family.split(/\s+/).filter(Boolean);
  const givenParts = given.split(/\s+/).filter(Boolean);
  const primerNombre = givenParts.join(" ") || raw.replace(/\^/g, " ").trim();
  const apellidoPaterno = familyParts[0] || null;
  const apellidoMaterno = familyParts.slice(1).join(" ") || null;
  return {
    nombre: [primerNombre, apellidoPaterno, apellidoMaterno].filter(Boolean).join(" "),
    primer_nombre: primerNombre,
    apellido_paterno: apellidoPaterno,
    apellido_materno: apellidoMaterno,
  };
};

export const buildPatientRow = (tags = {}) => {
  const parsedName = parseDicomPatientName(getTag(tags, "PatientName"));
  if (!parsedName) return null;
  return {
    ...parsedName,
    cedula: String(getTag(tags, "PatientID") || "").trim() || null,
    fecha_nacimiento: parseDicomDate(getTag(tags, "PatientBirthDate")),
    sexo: String(getTag(tags, "PatientSex") || "").trim() || null,
    tipo: "particular",
  };
};

export const buildStudyRow = (tags = {}, fallbackTags = {}) => ({
  tipo_estudio: normalizeModality(
    getTag(tags, "Modality") ||
      getTag(fallbackTags, "Modality") ||
      getTag(tags, "StudyDescription") ||
      getTag(tags, "SeriesDescription") ||
      getTag(fallbackTags, "StudyDescription") ||
      getTag(fallbackTags, "SeriesDescription"),
  ),
  estado: "EN PROCESO",
  descripcion:
    getTag(tags, "StudyDescription") ||
    getTag(tags, "SeriesDescription") ||
    getTag(fallbackTags, "StudyDescription") ||
    getTag(fallbackTags, "SeriesDescription") ||
    normalizeModality(getTag(tags, "Modality") || getTag(fallbackTags, "Modality")),
  fecha_estudio: parseDicomDateTime(getTag(tags, "StudyDate"), getTag(tags, "StudyTime")),
});

export const buildStoragePath = ({
  idEstudio,
  studyInstanceUid,
  instanceId,
  instanceNumber,
}) => {
  const study = cleanSegment(studyInstanceUid || "study");
  const instance = cleanSegment(instanceId || "instance");
  const number = numberOrNull(instanceNumber) ?? "0";
  return `${idEstudio}/${study}-${number}-${instance}.dcm`;
};

export const buildImageRow = ({ idEstudio, storagePath, fileSize, tags }) => ({
  id_estudio: idEstudio,
  bucket: DEFAULT_BUCKET,
  storage_path: storagePath,
  file_name: storagePath.split("/").pop(),
  file_size: fileSize,
  mime_type: "application/dicom",
  modality: normalizeModality(getTag(tags, "Modality")),
  study_instance_uid: getTag(tags, "StudyInstanceUID"),
  series_instance_uid: getTag(tags, "SeriesInstanceUID"),
  series_description: getTag(tags, "SeriesDescription") || "Serie 1",
  instance_number: numberOrNull(getTag(tags, "InstanceNumber")),
  frame_count: numberOrNull(getTag(tags, "NumberOfFrames")),
});

export const findBestPendingStudyMatch = ({ candidates = [], studyRow = {} } = {}) => {
  const modality = normalizeModality(studyRow.tipo_estudio);
  const description = normalizeText(studyRow.descripcion);
  const genericDescription = !description || description === normalizeText(modality);
  const compatibleByCore = candidates.filter((candidate) => {
    if (!candidate?.id_estudio) return false;
    if (candidate.storage_path) return false;
    if (normalizeModality(candidate.tipo_estudio) !== modality) return false;
    if (!sameLocalDate(candidate.fecha_estudio, studyRow.fecha_estudio)) return false;
    return true;
  });

  if (compatibleByCore.length === 1) return compatibleByCore[0].id_estudio;

  const compatibleByDescription = compatibleByCore.filter((candidate) => {
    const candidateDescription = normalizeText(candidate.descripcion);
    if (genericDescription || !candidateDescription) return true;
    return (
      description.includes(candidateDescription) ||
      candidateDescription.includes(description) ||
      description.split(" ").some((part) => part.length >= 3 && candidateDescription.includes(part))
    );
  });

  return compatibleByDescription.length === 1 ? compatibleByDescription[0].id_estudio : null;
};

export const findBestPendingStudyMatchForPatient = ({ candidates = [], patientName = "", studyRow = {} } = {}) => {
  const patientCandidates = candidates.filter((candidate) =>
    hasSameNameTokens(candidate?.paciente?.nombre || candidate?.pacientes?.nombre, patientName),
  );
  const idEstudio = findBestPendingStudyMatch({ candidates: patientCandidates, studyRow });
  return patientCandidates.find((candidate) => candidate.id_estudio === idEstudio) ?? null;
};

class OrthancClient {
  constructor({ baseUrl, user, password }) {
    this.baseUrl = trimSlash(baseUrl || DEFAULT_ORTHANC_URL);
    this.auth =
      user && password
        ? `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`
        : null;
  }

  async request(path, options = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        ...(this.auth ? { Authorization: this.auth } : {}),
        ...(options.headers || {}),
      },
    });
    if (!response.ok) {
      throw new Error(`Orthanc ${options.method || "GET"} ${path} failed: ${response.status}`);
    }
    return response;
  }

  async json(path) {
    return this.request(path).then((response) => response.json());
  }

  async studies() {
    return this.json("/studies");
  }

  async study(id) {
    return this.json(`/studies/${id}`);
  }

  async studyTags(id) {
    const study = await this.study(id);
    return {
      ...(study.PatientMainDicomTags || {}),
      ...(study.MainDicomTags || {}),
    };
  }

  async instancesForStudy(id) {
    return this.json(`/studies/${id}/instances`);
  }

  async instanceTags(id) {
    return this.json(`/instances/${id}/simplified-tags`);
  }

  async instanceFile(id) {
    const response = await this.request(`/instances/${id}/file`);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async markSynced(id) {
    await this.request(`/studies/${id}/metadata/${SYNC_METADATA_KEY}`, {
      method: "PUT",
      body: new Date().toISOString(),
    });
  }
}

class SupabaseClient {
  constructor({ url, serviceRoleKey }) {
    this.url = trimSlash(url);
    this.key = serviceRoleKey;
    this.restUrl = `${this.url}/rest/v1`;
    this.storageUrl = `${this.url}/storage/v1/object`;
  }

  headers(extra = {}) {
    return {
      apikey: this.key,
      Authorization: `Bearer ${this.key}`,
      ...extra,
    };
  }

  async request(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: this.headers(options.headers),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Supabase request failed ${response.status}: ${body}`);
    }
    return response;
  }

  async findStudyIdByUid(studyInstanceUid) {
    if (!studyInstanceUid) return null;
    const url = `${this.restUrl}/estudio_dicom_imagenes?study_instance_uid=eq.${encodeURIComponent(
      studyInstanceUid,
    )}&select=id_estudio&limit=1`;
    const rows = await this.request(url).then((response) => response.json());
    return rows[0]?.id_estudio ?? null;
  }

  async findPendingStudyForDicom({ idPaciente, patientRow, studyRow }) {
    if (!studyRow?.tipo_estudio) return null;
    const modality = normalizeModality(studyRow.tipo_estudio);
    if (idPaciente) {
      const url =
        `${this.restUrl}/estudios_radiologia?` +
        `id_paciente=eq.${encodeURIComponent(idPaciente)}` +
        `&tipo_estudio=eq.${encodeURIComponent(modality)}` +
        `&storage_path=is.null` +
        `&select=id_estudio,tipo_estudio,descripcion,fecha_estudio,storage_path,estado` +
        `&order=fecha_estudio.desc` +
        `&limit=10`;
      const candidates = await this.request(url).then((response) => response.json());
      const idEstudio = findBestPendingStudyMatch({ candidates, studyRow });
      const match = candidates.find((candidate) => candidate.id_estudio === idEstudio);
      if (match) return match;
    }

    if (!patientRow?.nombre) return null;
    const fallbackUrl =
      `${this.restUrl}/estudios_radiologia?` +
      `tipo_estudio=eq.${encodeURIComponent(modality)}` +
      `&storage_path=is.null` +
      `&select=id_estudio,tipo_estudio,descripcion,fecha_estudio,storage_path,estado,paciente:pacientes(nombre)` +
      `&order=fecha_estudio.desc` +
      `&limit=50`;
    const fallbackCandidates = await this.request(fallbackUrl).then((response) => response.json());
    return findBestPendingStudyMatchForPatient({
      candidates: fallbackCandidates,
      patientName: patientRow.nombre,
      studyRow,
    });
  }

  async countImagesByUid(studyInstanceUid) {
    if (!studyInstanceUid) return 0;
    const url = `${this.restUrl}/estudio_dicom_imagenes?study_instance_uid=eq.${encodeURIComponent(
      studyInstanceUid,
    )}&select=id_imagen`;
    const response = await this.request(url, {
      headers: {
        Prefer: "count=exact",
        Range: "0-0",
      },
    });
    const range = response.headers.get("content-range") || "";
    const count = Number(range.split("/")[1]);
    return Number.isFinite(count) ? count : 0;
  }

  async createStudy(row) {
    const rows = await this.request(`${this.restUrl}/estudios_radiologia?select=id_estudio`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(row),
    }).then((response) => response.json());
    return rows[0]?.id_estudio;
  }

  async findPatientId({ cedula, nombre }) {
    if (cedula) {
      const rows = await this.request(
        `${this.restUrl}/pacientes?cedula=eq.${encodeURIComponent(cedula)}&select=id_paciente&limit=1`,
      ).then((response) => response.json());
      if (rows[0]?.id_paciente) return rows[0].id_paciente;
    }
    if (nombre) {
      const rows = await this.request(
        `${this.restUrl}/pacientes?nombre=eq.${encodeURIComponent(nombre)}&select=id_paciente&limit=1`,
      ).then((response) => response.json());
      if (rows[0]?.id_paciente) return rows[0].id_paciente;

      const tokens = normalizeNameTokens(nombre);
      if (tokens.length >= 3) {
        const partialRows = await this.request(
          `${this.restUrl}/pacientes?nombre=ilike.*${encodeURIComponent(tokens[0])}*&select=id_paciente,nombre&limit=50`,
        ).then((response) => response.json());
        const matchingRows = partialRows.filter((row) => hasSameNameTokens(row.nombre, nombre));
        if (matchingRows.length === 1) return matchingRows[0].id_paciente;
      }
    }
    return null;
  }

  async upsertPatient(row) {
    if (!row?.nombre) return null;
    const id = await this.findPatientId({ cedula: row.cedula, nombre: row.nombre });
    if (id) return id;
    const rows = await this.request(`${this.restUrl}/pacientes?select=id_paciente`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(row),
    }).then((response) => response.json());
    return rows[0]?.id_paciente ?? null;
  }

  async updateStudyPatient(idEstudio, idPaciente) {
    if (!idEstudio || !idPaciente) return;
    await this.request(`${this.restUrl}/estudios_radiologia?id_estudio=eq.${idEstudio}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id_paciente: idPaciente,
        updated_at: new Date().toISOString(),
      }),
    });
  }

  async updateStudyFromDicom(idEstudio, row) {
    if (!idEstudio) return;
    await this.request(`${this.restUrl}/estudios_radiologia?id_estudio=eq.${idEstudio}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tipo_estudio: row.tipo_estudio,
        fecha_estudio: row.fecha_estudio,
        estado: row.estado,
        updated_at: new Date().toISOString(),
      }),
    });
  }

  async uploadDicom(storagePath, buffer) {
    await this.request(`${this.storageUrl}/${DEFAULT_BUCKET}/${storagePath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/dicom",
        "x-upsert": "true",
      },
      body: buffer,
    });
  }

  async upsertImageRows(rows) {
    if (rows.length === 0) return;
    await this.request(`${this.restUrl}/estudio_dicom_imagenes?on_conflict=id_estudio,bucket,storage_path`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(rows),
    });
  }

  async updatePrimaryImage(idEstudio, storagePath) {
    await this.request(`${this.restUrl}/estudios_radiologia?id_estudio=eq.${idEstudio}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        storage_path: storagePath,
        estado: "EN PROCESO",
        updated_at: new Date().toISOString(),
      }),
    });
  }
}

export const syncStudy = async ({ orthanc, supabase, studyId, dryRun = false }) => {
  const studyTags = await orthanc.studyTags(studyId);
  const studyInstanceUid = getTag(studyTags, "StudyInstanceUID");
  const patientRow = buildPatientRow(studyTags);
  const idPaciente = await supabase.upsertPatient(patientRow);
  let idEstudio = await supabase.findStudyIdByUid(studyInstanceUid);
  const instances = await orthanc.instancesForStudy(studyId);
  const firstInstanceId = instances[0]?.ID || instances[0];
  const firstInstanceTags = firstInstanceId ? await orthanc.instanceTags(firstInstanceId) : {};
  const studyRow = buildStudyRow(studyTags, firstInstanceTags);

  if (!idEstudio) {
    const pendingStudy = await supabase.findPendingStudyForDicom({ idPaciente, patientRow, studyRow });
    idEstudio = typeof pendingStudy === "object" ? pendingStudy?.id_estudio : pendingStudy;
    if (idEstudio && !dryRun) {
      console.log(`Linking Orthanc study ${studyId} to pending radiology study ${idEstudio}`);
      await supabase.updateStudyFromDicom(idEstudio, studyRow);
    }
  }

  if (!idEstudio) {
    if (dryRun) {
      console.log(`[dry-run] would create estudio_radiologia for ${studyInstanceUid}`);
      return { studyId, created: true, instances: 0 };
    }
    idEstudio = await supabase.createStudy({
      ...studyRow,
      ...(idPaciente ? { id_paciente: idPaciente } : {}),
    });
  } else if (idPaciente) {
    await supabase.updateStudyPatient(idEstudio, idPaciente);
  }

  if (idEstudio) {
    const existingImages = await supabase.countImagesByUid(studyInstanceUid);
    if (existingImages >= instances.length) {
      console.log(
        `Skipping Orthanc study ${studyId}: ${existingImages}/${instances.length} images already synced`,
      );
      return { studyId, idEstudio, created: false, instances: 0, skipped: true };
    }
  }
  const rows = [];
  let firstStoragePath = null;

  for (const instance of instances) {
    if (rows.length === 0) {
      console.log(`Uploading ${instances.length} DICOM instances for Orthanc study ${studyId}`);
    } else if (rows.length % 25 === 0) {
      console.log(`Uploaded ${rows.length}/${instances.length} DICOM instances for Orthanc study ${studyId}`);
    }
    const instanceId = instance.ID || instance;
    const tags = await orthanc.instanceTags(instanceId);
    const buffer = await orthanc.instanceFile(instanceId);
    const storagePath = buildStoragePath({
      idEstudio,
      studyInstanceUid,
      instanceId,
      instanceNumber: getTag(tags, "InstanceNumber"),
    });
    firstStoragePath ||= storagePath;
    if (!dryRun) await supabase.uploadDicom(storagePath, buffer);
    rows.push(buildImageRow({ idEstudio, storagePath, fileSize: buffer.length, tags }));
  }

  if (!dryRun) {
    console.log(`Writing ${rows.length} image metadata rows for Orthanc study ${studyId}`);
    await supabase.upsertImageRows(rows);
    if (firstStoragePath) await supabase.updatePrimaryImage(idEstudio, firstStoragePath);
    try {
      await orthanc.markSynced(studyId);
    } catch (error) {
      console.warn(`Could not mark Orthanc study as synced: ${error.message}`);
    }
  }

  return { studyId, idEstudio, created: false, instances: rows.length };
};

const runOnce = async () => {
  const orthanc = new OrthancClient({
    baseUrl: process.env.ORTHANC_URL || DEFAULT_ORTHANC_URL,
    user: process.env.ORTHANC_USER,
    password: process.env.ORTHANC_PASSWORD,
  });
  const supabase = new SupabaseClient({
    url: requiredEnv("SUPABASE_URL"),
    serviceRoleKey: requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  });
  const dryRun = process.env.DRY_RUN === "true";

  const studies = await orthanc.studies();
  for (const studyId of studies) {
    const result = await syncStudy({ orthanc, supabase, studyId, dryRun });
    console.log(`Synced Orthanc study ${result.studyId}: ${result.instances} instances`);
  }
};

if (process.env.NODE_ENV !== "test" && process.argv[1]?.endsWith("dicom-cloud-sync.js")) {
  runOnce().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
