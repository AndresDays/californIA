# W/L nativo para series SCOUT

## Objetivo

Al abrir una serie CT SCOUT, el visor debe conservar el W/L nativo del DICOM, igual que su preview.

## Diseño

La detección de la serie identificará `SCOUT`, `LOCALIZER` y `TOPOGRAM` como series que preservan el viewport nativo. `PanelDicom` no impondrá el fallback genérico W:2000/L:0 sobre esas series ni les aplicará un preset semántico.

## Validación

Se añadirá una prueba que cargue SCOUT sin VOI nativo y verifique que no se llama al fallback de W/L. Las pruebas de presets de pulmón y de carga diferida seguirán pasando.
