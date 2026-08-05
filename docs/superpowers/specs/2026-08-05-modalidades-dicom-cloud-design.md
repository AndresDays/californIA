# Modalidades DICOM Cloud al crear estudios de radiologia

## Objetivo

Al cobrar un estudio de imagen en `nuevo-paciente`, la tarjeta creada en
`estudios_radiologia.tipo_estudio` debe usar exclusivamente los codigos que
acepta DICOM Cloud: `DX`, `MR`, `CT`, `MG` o `US`.

## Flujo

1. El catalogo conserva sus modalidades operativas actuales para filtrar y
   seleccionar estudios.
2. Al construir el payload de `estudios_radiologia`, una sola funcion traduce
   los datos del estudio a un codigo DICOM Cloud:
   - radiografia/RX -> `DX`
   - resonancia/RM -> `MR`
   - tomografia/TAC -> `CT`
   - mastografia -> `MG`
   - ultrasonido -> `US`
3. Si el estudio no corresponde a uno de esos codigos, el resolvedor lanza un
   error antes de construir el payload y se detiene el registro, con un mensaje
   que identifica la modalidad invalida. No se enviaran codigos internos como
   `RX`, `TAC`, `RM`, `EC`, `IMG`, `UO` o `VET`.

## Limites

No se cambian modalidades ya almacenadas, filtros del catalogo, ni la UI de
radiologia; solo la modalidad persistida al crear nuevas tarjetas.

## Pruebas

Se agregaran pruebas unitarias para cada conversion y para el rechazo de una
modalidad fuera del conjunto permitido. Se verificara el flujo de
`nuevo-paciente` afectado y el build.
