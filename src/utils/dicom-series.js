const TEXTO_VACIO = "";

export const normalizarStoragePathDicom = (path = "", bucket = "radiologia") => {
  const texto = String(path || "").trim();
  if (!texto) return TEXTO_VACIO;
  if (!texto.includes("supabase.co")) return texto.split("?")[0];

  const marcador = `/${bucket}/`;
  const partes = texto.split(marcador);
  return (partes[1] || texto).split("?")[0];
};

const textoBusqueda = (...valores) =>
  valores
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const normalizarModalidadVisor = ({
  dicomModality,
  tipoEstudio,
  descripcion,
} = {}) => {
  const texto = textoBusqueda(dicomModality, tipoEstudio, descripcion);
  if (/\bmr\b|resonancia|magnetica|magnetic/.test(texto)) return "Resonancia Magnetica";
  if (/\bus\b|ultrasonido|ultrasound|ecografia/.test(texto)) return "Ultrasonido";
  if (/\bct\b|tomografia|tac/.test(texto)) return "Tomografia";
  if (/\bdx\b|\brx\b|rayos|xray|radiografia/.test(texto)) return "Rayos X";
  if (/\bmg\b|mamografia|mastografia/.test(texto)) return "Mastografia";
  if (/densito|dexa|densitometria/.test(texto)) return "Densitometria";
  return "DICOM";
};

const numeroOrden = (valor) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
};

export const ordenarImagenesDicom = (imagenes = []) =>
  [...imagenes].sort((a, b) => {
    const porInstancia = numeroOrden(a.instance_number) - numeroOrden(b.instance_number);
    if (porInstancia !== 0) return porInstancia;
    const fechaA = new Date(a.created_at || 0).getTime();
    const fechaB = new Date(b.created_at || 0).getTime();
    if (fechaA !== fechaB) return fechaA - fechaB;
    return String(a.storage_path || "").localeCompare(String(b.storage_path || ""));
  });

export const agruparImagenesDicomPorSerie = (imagenes = [], estudio = {}) => {
  const grupos = new Map();

  ordenarImagenesDicom(imagenes).forEach((imagen, index) => {
    const serieId = imagen.series_instance_uid || imagen.series_description || "serie-unica";
    const existente = grupos.get(serieId);
    const modalidad = normalizarModalidadVisor({
      dicomModality: imagen.modality,
      tipoEstudio: estudio.tipo_estudio || estudio.tipoEstudio,
      descripcion: imagen.series_description || estudio.descripcion || estudio.descripcionEstudio,
    });

    if (!existente) {
      grupos.set(serieId, {
        id: serieId,
        label: imagen.series_description || `Serie ${grupos.size + 1}`,
        modalidad,
        descripcion: imagen.series_description || estudio.descripcion || estudio.descripcionEstudio || "",
        imagenes: [],
      });
    }

    grupos.get(serieId).imagenes.push({
      ...imagen,
      numero: Number.isFinite(Number(imagen.instance_number))
        ? Number(imagen.instance_number)
        : index + 1,
    });
  });

  return Array.from(grupos.values()).map((serie) => ({
    ...serie,
    imageIds: serie.imagenes.map((imagen) => imagen.imageId).filter(Boolean),
  }));
};

export const crearImagenDicomFallback = (storagePath, estudio = {}) => ({
  id_imagen: "fallback",
  storage_path: storagePath,
  bucket: "radiologia",
  file_name: String(storagePath || "").split("/").pop() || "imagen.dcm",
  modality: estudio.tipo_estudio || null,
  series_description: estudio.descripcion || estudio.descripcionEstudio || "Serie 1",
  instance_number: 1,
  created_at: estudio.fecha_estudio || new Date(0).toISOString(),
});
