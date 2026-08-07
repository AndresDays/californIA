# Plantillas de Radiología Compartidas — Diseño

## Objetivo

Permitir que Radiólogo Director, Administrador y Desarrollador publiquen plantillas de reporte radiológico desde la ventana de Plantillas, y que cualquier usuario con acceso al Visor pueda seleccionarlas al redactar un reporte.

## Alcance

- Las plantillas nuevas publicadas desde Plantillas se guardan con visibilidad `organizacion`.
- El selector del Visor consulta y muestra únicamente plantillas con visibilidad `organizacion`.
- Las plantillas con visibilidad `privado` no se muestran en el Visor compartido.
- Los roles `radiologo`, `admin`/`administrador` y `desarrollador` pueden abrir Plantillas y crear, editar o eliminar plantillas.
- Los demás usuarios con acceso al Visor sólo pueden consultar y seleccionar las plantillas de organización; no pueden abrir la administración ni mutarlas.
- Las opciones actuales del Visor —Normal, Hallazgos y Limpiar— permanecen disponibles y no requieren datos de Supabase.

## Arquitectura y permisos

La página de Plantillas y el encabezado usarán una única política de roles de publicación. Las políticas RLS de `plantillas_radiologia` y del bucket `plantillas-radiologia` separarán lectura de plantillas de organización de las operaciones de escritura. Así, el selector del Visor puede leer la colección común sin heredar permisos para subir o modificar archivos.

## Flujo

1. Un publicador autorizado abre Plantillas, carga una plantilla y la guarda como organización.
2. El registro y su archivo quedan disponibles para lectura a usuarios autenticados que acceden al Visor.
3. El usuario abre Usar plantilla en el Visor y selecciona una opción de organización.
4. El Visor aplica el membrete y/o contenido de reporte de la plantilla seleccionada.
5. Si no hay plantillas cargadas o falla la consulta, las opciones predeterminadas actuales siguen funcionando.

## Pruebas

- Roles autorizados ven Plantillas y pueden guardar una plantilla de organización.
- Administrador puede entrar a Plantillas; un técnico no puede.
- El selector del Visor solicita sólo `visibilidad = organizacion`.
- Una plantilla privada no se ofrece en el selector compartido.
- Las tres opciones predeterminadas del Visor continúan disponibles.
- La migración conserva RLS para evitar inserción, actualización, eliminación o escritura de Storage por roles de sólo lectura.
