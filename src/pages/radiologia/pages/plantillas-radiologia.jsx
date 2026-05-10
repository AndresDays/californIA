import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase-client';
import { useAuth } from '../../../context/auth-context';
import Header from '../../../components/header-principal';
import SidebarHome from '../../../components/sidebar-home';
import ModalNotificacion from '../../../components/ModalNotificacion';
import './plantillas-radiologia.css';

const BUCKET_MEMBRETES = 'plantillas-radiologia';
const ROLES_PLANTILLAS = ['desarrollador', 'radiologo'];
const MIME_TYPES_PERMITIDOS = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const EXTENSIONES_PERMITIDAS = ['png', 'jpg', 'jpeg', 'webp', 'pdf', 'doc', 'docx'];

const normalizarRol = (rol) =>
  String(rol || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const tieneAccesoPlantillas = (rol) => ROLES_PLANTILLAS.includes(normalizarRol(rol));

const esArchivoMembreteValido = (archivo) => {
  const extension = archivo?.name?.split('.').pop()?.toLowerCase();

  return Boolean(
    archivo &&
      EXTENSIONES_PERMITIDAS.includes(extension) &&
      (archivo.type.startsWith('image/') || MIME_TYPES_PERMITIDOS.includes(archivo.type) || !archivo.type),
  );
};

const formInicial = {
  nombre: '',
  descripcion: '',
  categoria: 'Radiologia',
  visibilidad: 'organizacion',
};

const archivoABase64 = (archivo) =>
  new Promise((resolve, reject) => {
    if (!archivo || !archivo.type?.startsWith('image/')) {
      resolve(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(archivo);
  });

const formatearFecha = (fecha) => {
  if (!fecha) return 'Sin fecha';

  return new Date(fecha).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatRol = (rol) => {
  if (!rol) return 'Usuario';

  const roles = {
    admin: 'Administrador',
    administrador: 'Administrador',
    radiologo: 'Radiólogo',
    doctor: 'Médico',
    medico: 'Médico',
    tecnico_radiologia: 'Técnico en Radiología',
    tecnico: 'Técnico',
    quimico: 'Químico',
    recepcionista: 'Recepcionista',
    desarrollador: 'Desarrollador',
  };

  return roles[normalizarRol(rol)] || rol;
};

const PlantillasRadiologia = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [empleadoData, setEmpleadoData] = useState(null);
  const [plantillas, setPlantillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todas');
  const [formData, setFormData] = useState(formInicial);
  const [archivo, setArchivo] = useState(null);
  const [preview, setPreview] = useState('');
  const [notificacion, setNotificacion] = useState({
    isOpen: false,
    mensaje: '',
    tipo: 'exito',
  });

  const puedeEntrar = tieneAccesoPlantillas(empleadoData?.rol);

  const mostrarNotificacion = (mensaje, tipo = 'exito') => {
    setNotificacion({
      isOpen: true,
      mensaje,
      tipo,
    });
  };

  const cargarPlantillas = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('plantillas_radiologia')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPlantillas(data || []);
    } catch (error) {
      console.error('Error al cargar plantillas:', error);
      mostrarNotificacion('Error al cargar las plantillas', 'error');
    }
  }, []);

  useEffect(() => {
    const cargarEmpleado = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('empleados')
          .select('id_empleado, nombre, rol')
          .eq('auth_uuid', user.id)
          .maybeSingle();

        if (error) throw error;

        setEmpleadoData(data || null);

        if (tieneAccesoPlantillas(data?.rol)) {
          await cargarPlantillas();
        }
      } catch (error) {
        console.error('Error al cargar empleado:', error);
        mostrarNotificacion('Error al validar permisos de plantillas', 'error');
      } finally {
        setLoading(false);
      }
    };

    cargarEmpleado();
  }, [cargarPlantillas, user]);

  const plantillasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return plantillas.filter((plantilla) => {
      const coincideFiltro = filtro === 'todas' || plantilla.visibilidad === filtro;
      const coincideBusqueda =
        !texto ||
        [plantilla.nombre, plantilla.descripcion, plantilla.categoria]
          .filter(Boolean)
          .some((valor) => valor.toLowerCase().includes(texto));

      return coincideFiltro && coincideBusqueda;
    });
  }, [busqueda, filtro, plantillas]);

  const conteos = useMemo(() => ({
    todas: plantillas.length,
    organizacion: plantillas.filter((plantilla) => plantilla.visibilidad === 'organizacion').length,
    privado: plantillas.filter((plantilla) => plantilla.visibilidad === 'privado').length,
  }), [plantillas]);

  const cerrarModal = () => {
    setModalAbierto(false);
    setFormData(formInicial);
    setArchivo(null);
    setPreview('');
  };

  const handleArchivoChange = (event) => {
    const seleccionado = event.target.files?.[0];

    if (!seleccionado) {
      setArchivo(null);
      setPreview('');
      return;
    }

    if (!esArchivoMembreteValido(seleccionado)) {
      mostrarNotificacion('Sube una imagen, PDF o Word para el membrete', 'error');
      event.target.value = '';
      return;
    }

    if (seleccionado.size > 8 * 1024 * 1024) {
      mostrarNotificacion('El archivo debe pesar menos de 8MB', 'error');
      event.target.value = '';
      return;
    }

    setArchivo(seleccionado);
    setPreview(
      seleccionado.type.startsWith('image/') && typeof URL.createObjectURL === 'function'
        ? URL.createObjectURL(seleccionado)
        : '',
    );
  };

  const handleGuardarPlantilla = async (event) => {
    event.preventDefault();

    if (!formData.nombre.trim()) {
      mostrarNotificacion('Agrega el nombre de la plantilla', 'error');
      return;
    }

    if (!archivo) {
      mostrarNotificacion('Sube el archivo del membrete', 'error');
      return;
    }

    setGuardando(true);

    try {
      const extension = archivo.name.split('.').pop() || 'png';
      const nombreSeguro = formData.nombre
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const archivoPath = `${user.id}/${Date.now()}-${nombreSeguro}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_MEMBRETES)
        .upload(archivoPath, archivo, {
          cacheControl: '3600',
          upsert: false,
          contentType: archivo.type,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from(BUCKET_MEMBRETES)
        .getPublicUrl(archivoPath);
      const membreteBase64 = await archivoABase64(archivo);

      const payload = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || null,
        categoria: formData.categoria.trim() || 'Radiologia',
        tipo: 'membrete',
        visibilidad: formData.visibilidad,
        archivo_url: publicData?.publicUrl || null,
        archivo_path: archivoPath,
        mime_type: archivo.type,
        membrete_base64: membreteBase64,
        creado_por: user.id,
        creado_por_empleado: empleadoData?.id_empleado || null,
      };

      const { error: insertError } = await supabase
        .from('plantillas_radiologia')
        .insert([payload])
        .select()
        .single();

      if (insertError) throw insertError;

      mostrarNotificacion('Plantilla guardada correctamente', 'exito');
      cerrarModal();
      await cargarPlantillas();
    } catch (error) {
      console.error('Error al guardar plantilla:', error);
      mostrarNotificacion('Error al guardar la plantilla', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="plantillas-radiologia-wrapper">
      <Header
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        empleadoData={empleadoData}
        formatRol={formatRol}
        getPrimerNombre={(nombre) => nombre}
        user={user}
        handleLogout={handleLogout}
        currentPage="plantillas"
      />

      <SidebarHome />

      <main className="plantillas-radiologia-content">
        {loading ? (
          <section className="plantillas-loading">Cargando plantillas...</section>
        ) : !puedeEntrar ? (
          <section className="plantillas-sin-acceso">
            <div className="plantillas-sin-acceso-icono">!</div>
            <h1>No tienes acceso a Plantillas</h1>
            <p>Esta sección solo está disponible para desarrolladores y radiólogos.</p>
          </section>
        ) : (
          <>
            <section className="plantillas-hero">
              <div>
                <span className="plantillas-eyebrow">Documentos de interpretación</span>
                <h1>Plantillas</h1>
                <p>Administra membretes listos para usarse en reportes radiológicos.</p>
              </div>

              <button
                type="button"
                className="plantillas-btn-principal"
                onClick={() => setModalAbierto(true)}
              >
                <span aria-hidden="true">+</span>
                Nueva plantilla
              </button>
            </section>

            <section className="plantillas-panel">
              <div className="plantillas-toolbar">
                <div className="plantillas-tabs" aria-label="Filtrar plantillas">
                  {[
                    ['todas', 'Recientes'],
                    ['organizacion', 'Organización'],
                    ['privado', 'Privado'],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={filtro === id ? 'activo' : ''}
                      onClick={() => setFiltro(id)}
                    >
                      <span>{label}</span>
                      <strong>{conteos[id]}</strong>
                    </button>
                  ))}
                </div>

                <label className="plantillas-busqueda">
                  <span>Buscar</span>
                  <input
                    type="search"
                    value={busqueda}
                    onChange={(event) => setBusqueda(event.target.value)}
                    placeholder="Nombre, descripcion o categoría"
                  />
                </label>
              </div>

              <div className="plantillas-lista">
                {plantillasFiltradas.length === 0 ? (
                  <div className="plantillas-vacio">
                    <h2>Sin plantillas</h2>
                    <p>Sube el primer membrete para tenerlo disponible en reportes.</p>
                  </div>
                ) : (
                  plantillasFiltradas.map((plantilla) => (
                    <article key={plantilla.id} className="plantillas-fila">
                      <div className="plantillas-doc-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none">
                          <path d="M7 3h7l4 4v14H7V3Z" stroke="currentColor" strokeWidth="1.7" />
                          <path d="M14 3v5h5M10 12h6M10 16h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                        </svg>
                      </div>

                      <div className="plantillas-fila-info">
                        <h2>{plantilla.nombre}</h2>
                        <p>{plantilla.descripcion || 'Sin descripcion'}</p>
                      </div>

                      <div className="plantillas-meta">
                        <span>{plantilla.categoria || 'Radiologia'}</span>
                        <strong>{plantilla.visibilidad === 'privado' ? 'Privado' : 'Organización'}</strong>
                      </div>

                      <span className="plantillas-fecha">{formatearFecha(plantilla.created_at)}</span>

                      {plantilla.archivo_url && (
                        <a
                          className="plantillas-ver"
                          href={plantilla.archivo_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Ver
                        </a>
                      )}
                    </article>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </main>

      {modalAbierto && (
        <div className="plantillas-modal-overlay" onMouseDown={cerrarModal}>
          <form
            className="plantillas-modal"
            onSubmit={handleGuardarPlantilla}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="plantillas-modal-header">
              <div>
                <span className="plantillas-eyebrow">Nuevo membrete</span>
                <h2>Guardar plantilla</h2>
              </div>
              <button type="button" onClick={cerrarModal} aria-label="Cerrar">
                x
              </button>
            </div>

            <div className="plantillas-form-grid">
              <label>
                <span>Nombre de plantilla</span>
                <input
                  value={formData.nombre}
                  onChange={(event) => setFormData((prev) => ({ ...prev, nombre: event.target.value }))}
                  placeholder="Membrete resonancia"
                />
              </label>

              <label>
                <span>Descripcion</span>
                <textarea
                  value={formData.descripcion}
                  onChange={(event) => setFormData((prev) => ({ ...prev, descripcion: event.target.value }))}
                  placeholder="Uso interno, especialidad o notas"
                />
              </label>

              <label>
                <span>Categoría</span>
                <input
                  value={formData.categoria}
                  onChange={(event) => setFormData((prev) => ({ ...prev, categoria: event.target.value }))}
                />
              </label>

              <label>
                <span>Visibilidad</span>
                <select
                  value={formData.visibilidad}
                  onChange={(event) => setFormData((prev) => ({ ...prev, visibilidad: event.target.value }))}
                >
                  <option value="organizacion">Organización</option>
                  <option value="privado">Privado</option>
                </select>
              </label>

              <label className="plantillas-upload">
                <span>Archivo de membrete</span>
                <input
                  type="file"
                  accept="image/*,application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleArchivoChange}
                />
                <small>{archivo ? archivo.name : 'PNG, JPG, PDF o DOCX hasta 8MB'}</small>
              </label>

              <div className="plantillas-preview">
                {preview ? (
                  <img src={preview} alt="Vista previa del membrete" />
                ) : (
                  <div>
                    <span>Vista previa</span>
                    <p>El membrete se guardará para usarlo en reportes.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="plantillas-modal-actions">
              <button type="button" className="plantillas-btn-secundario" onClick={cerrarModal}>
                Cancelar
              </button>
              <button type="submit" className="plantillas-btn-principal" disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar plantilla'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ModalNotificacion
        isOpen={notificacion.isOpen}
        onClose={() => setNotificacion((prev) => ({ ...prev, isOpen: false }))}
        mensaje={notificacion.mensaje}
        tipo={notificacion.tipo}
      />
    </div>
  );
};

export default PlantillasRadiologia;
