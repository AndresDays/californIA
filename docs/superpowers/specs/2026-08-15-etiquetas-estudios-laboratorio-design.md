# Etiquetas para estudios de laboratorio

## Objetivo

Generar las etiquetas de toma de muestra al mismo tiempo que el ticket de venta, tanto al registrar una venta como al reimprimir una orden.

## Alcance

- Solo participan estudios de laboratorio; los estudios de imagen no generan etiquetas.
- Las etiquetas se agrupan por recipiente. Cada recipiente distinto genera una etiqueta.
- Un estudio sin recipiente configurado no genera una etiqueta.
- El resultado es un solo PDF de etiquetas, con una página por grupo y páginas de 50 x 30 mm.
- El ticket de venta mantiene su PDF actual y se abre junto con el PDF único de etiquetas.

## Contenido y distribución

Cada página mostrará, de arriba hacia abajo:

1. Nombre del paciente.
2. Sexo, edad, tipo de muestra y recipiente.
3. El mismo código de barras CODE128 del folio que se usa en el ticket.
4. Las claves de todos los estudios que pertenecen a ese recipiente.

Ejemplo: tres estudios con `Tubo amarillo` se imprimen en una sola etiqueta con sus tres claves; un estudio con `Tubo lila` se imprime en otra página del mismo PDF.

## Datos y flujos

En una venta nueva se usan los datos ya cargados del paciente y los metadatos de los estudios seleccionados (`clave`, `tipo_muestra`, `recipiente`, y su tipo de origen).

En la reimpresión se conserva la venta existente y se consulta el catálogo de estudios de laboratorio por clave para recuperar `tipo_muestra` y `recipiente`. Así no se modifica información histórica ni se generan etiquetas de radiología.

## Diseño técnico

Se añadirá un generador de etiquetas aislado del renderizador del ticket. Recibirá folio, datos del paciente y estudios; filtrará laboratorio, agrupará por recipiente y generará un PDF `jsPDF` con formato de página `[50, 30]` mm. El ticket continuará usando su generador actual y ambos flujos invocarán también el generador de etiquetas.

## Manejo de casos límite

- Si no hay grupos de laboratorio con recipiente, no se abre un PDF de etiquetas.
- Sexo, edad o tipo de muestra ausentes se omiten sin dejar separadores vacíos.
- Las claves se acomodan en varias líneas si exceden el ancho disponible.

## Pruebas

- Agrupación de múltiples estudios por recipiente y separación entre recipientes.
- Exclusión de estudios que no son de laboratorio y de recipientes vacíos.
- Contenido de cada etiqueta: paciente, metadatos, folio/barcode y claves.
- Integración en venta nueva y reimpresión, incluida la recuperación de metadatos desde catálogo en esta última.
