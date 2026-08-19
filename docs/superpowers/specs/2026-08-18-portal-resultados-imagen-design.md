# Portal de resultados: acciones de imagen

## Objetivo

En el portal público de resultados, cada estudio de imagen liberado debe ofrecer acciones para abrir el visor del paciente y descargar su PDF de interpretación, sin exponer ni mostrar el HTML almacenado del reporte en la tarjeta.

## Diseño

`src/pages/portal-resultados.jsx` distingue los estudios con `tipo === "imagen"`. Para cada uno, renderizará dos controles: el visor abre `/visor-paciente/<id>` en una pestaña nueva con aislamiento `noopener,noreferrer`; el PDF invoca el generador de resultados existente con únicamente ese estudio y abre el Blob resultante en otra pestaña. Esta reutilización conserva membrete, datos del paciente y el tratamiento ya existente de los reportes.

Los estudios de laboratorio y el botón general de PDF combinado no cambian. Ya no se renderiza `estudio.reporte` en la tarjeta de imagen: el contenido se entrega exclusivamente a través del PDF.

## Fallos y pruebas

El botón de visor no requiere una llamada adicional. Para el PDF, si el generador rechaza, se evita abrir una pestaña inválida y se muestra un aviso local. Las pruebas del portal verificarán que las acciones se muestran sólo para imagen, usan el identificador correcto, generan el PDF con un único estudio y que el HTML del reporte no aparece inline.
