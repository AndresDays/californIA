# Reporte radiológico con campos editables

## Objetivo

Permitir que quien redacta un reporte radiológico elimine u ajuste los datos de
encabezado y de identificación que aparecen en su plantilla, sin modificar los
datos clínicos almacenados. En la administración de usuarios, mostrar el rol
interno `radiologo_clinico` con la etiqueta `Radiólogo`.

## Alcance

- El texto de ubicación, fecha y hora del encabezado será editable en el reporte.
- Los bloques de paciente, médico referente y estudio podrán vaciarse de forma
  independiente. Un valor vacío no se mostrará en la plantilla ni en el PDF.
- Los cambios solo pertenecen al reporte en edición; no actualizan las tablas de
  paciente, médico o estudio.
- La visualización de roles usa etiquetas humanas y conserva el valor interno
  para autorización y permisos.

## Implementación

Se concentrará la representación de cada línea opcional del encabezado para que
la vista de reporte, el visor DICOM y la generación de PDF apliquen el mismo
criterio: texto vacío significa que no se renderiza. Los valores iniciales se
hidratan de los datos existentes, pero su edición se almacena con el reporte.

El mapeo de etiquetas de roles traducirá `radiologo_clinico` a `Radiólogo` solo
en la interfaz de usuarios.

## Pruebas

- Comprobar que cada campo puede quedar vacío y desaparece de la vista.
- Comprobar que la exportación PDF omite los mismos campos vacíos.
- Comprobar que el rol interno `radiologo_clinico` conserva su valor, pero se
  muestra como `Radiólogo`.

## Fuera de alcance

- Editar permanentemente los datos maestros del paciente, médico o estudio.
- Cambiar los permisos asociados a `radiologo_clinico`.
