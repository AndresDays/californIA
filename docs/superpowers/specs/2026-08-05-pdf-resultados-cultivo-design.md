# PDF de resultados de cultivo

## Objetivo

Permitir que los estudios cuya descripción contenga `cultivo` usen un PDF de
resultado cargado por el usuario, sin cambiar el flujo de los demás estudios.

## Alcance

- La detección es insensible a mayúsculas y minúsculas y se basa únicamente en
  `descripcion_estudio`.
- Captura mostrará una acción **Subir PDF de cultivo** junto a **Vista previa**
  cuando la venta seleccionada incluya al menos un estudio de cultivo.
- La acción acepta únicamente un PDF de hasta 25 MB y lo asocia al estudio de
  cultivo que se elija. Una nueva carga sustituye el archivo previamente
  asociado a ese estudio.
- Al cargar correctamente, el estudio queda `completado` y `guardado`, sin
  exigir analitos. Sigue usando las acciones existentes de validar, invalidar y
  entrega.
- El archivo y sus metadatos se guardan en un bucket y tabla exclusivos de
  cultivos; no se reutilizan las entidades de radiología.

## PDF resultante

- Si la venta contiene solamente estudios de cultivo, vista previa y portal
  abren el PDF cargado.
- Si contiene cultivo y estudios con resultados generados, se crea primero el
  PDF institucional para los estudios no-cultivo y se anexan, conservando sus
  páginas originales, los PDF de cultivo.
- Si hay más de un cultivo, los anexos se ordenan como aparecen en la venta.
- Un cultivo sin archivo no aparece como resultado descargable ni permite que
  se marque como guardado mediante esta ruta.

## Portal

- El RPC seguro devolverá los estudios de cultivo validados que tengan PDF con
  `archivo_cultivo_path`, nunca una URL escrita por el cliente. Tras la
  autorización, Captura y Portal obtienen la URL pública absoluta con
  `hidratarArchivoCultivoUrl(estudio, supabase)`, que internamente llama a
  `supabase.storage.from('resultados-cultivo-adjuntos').getPublicUrl(path)`;
  el compositor recibe esa URL ya hidratada.
- El portal mantiene un único botón **Ver PDF**. Este abre el PDF cargado si es
  el único resultado, o el archivo combinado si hay resultados generados.
- La lista de resultados identifica los cultivos como PDF adjunto en lugar de
  mostrar una tabla vacía de analitos.

## Persistencia y seguridad

- La migración crea `resultados_cultivo_adjuntos`, ligado a
  `estudios_venta.id_estudio_venta`, con ruta, nombre, tipo MIME, tamaño,
  usuario creador y fecha.
- La ruta es determinista: `id_estudio_venta/cultivo.pdf`. Las políticas de
  tabla y Storage permiten sólo estudios cuya descripción contenga `cultivo`.
- El bucket `resultados-cultivo-adjuntos` admite solo `application/pdf`, tiene
  límite de 25 MB y políticas equivalentes a las de Captura para usuarios
  autenticados autorizados.
- El portal únicamente recibe archivos de estudios ya validados y liberados por
  el RPC que comprueba folio, teléfono y saldo.

## Pruebas

- Pruebas de detección de cultivo, validación de tipo/tamaño y selección de
  estudios que se generan frente a los que se anexan.
- Pruebas de Captura para la acción visible, la carga correcta y los mensajes
  de rechazo.
- Pruebas del generador para PDF solo de cultivo y para la composición con
  resultados de laboratorio.
- Pruebas del portal/RPC para exponer solo el cultivo validado con adjunto.
