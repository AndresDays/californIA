# W/L inicial por serie

## Objetivo

Al abrir una serie de CT, el visor debe aplicar automáticamente el preset de
ventana/nivel que describe la serie cuando ésta pueda identificarse de forma
confiable. Por ejemplo, una serie etiquetada `LUNG` debe abrirse con `CT -
Pulmón` (ancho 1500, nivel -600).

## Diseño

Se añadirá una función pura que normaliza la etiqueta de la serie y obtiene el
identificador del preset CT correspondiente. Reconocerá las etiquetas clínicas
actuales de pulmón, hueso, cerebro, hígado y tejido blando, incluyendo variantes
sin acentos o en inglés. Si no hay coincidencia, devolverá `null`.

Al seleccionar una serie, el visor guardará ese identificador como preset de la
serie activa. El panel activo recibirá el preset y aplicará sus valores VOI tras
cargar la imagen. Las selecciones manuales existentes continúan teniendo
precedencia al volver a usar el menú W/L.

## Datos y límites

- La detección usa exclusivamente la etiqueta ya visible en el panel de series.
- No requiere migraciones ni persiste una configuración nueva en la base de
  datos.
- Si la etiqueta no es reconocida, el viewport conserva el W/L proporcionado
  por el DICOM/Cornerstone; no se fuerza un valor genérico.

## Pruebas

Se agregará una prueba de integración del visor que carga una serie CT etiquetada
`LUNG`, la selecciona y verifica que Cornerstone recibe el ancho 1500 y nivel
-600. También se cubre que una serie sin etiqueta reconocida no recibe un
preset automático.

## Criterio de aceptación

Al pulsar una serie `LUNG`, el panel abre con el efecto de ventana/nivel de
pulmón, sin que el usuario tenga que abrir el menú W/L. Las demás series con
etiquetas reconocidas se comportan de forma equivalente y las no reconocidas
mantienen su presentación DICOM nativa.
