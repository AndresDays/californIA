# Sincronización inicial de índices MPR

## Objetivo

Al abrir MPR, Axial, Sagital y Coronal deben iniciar en sus índices centrales o geométricamente alineados, sin un primer frame en la imagen 1.

## Diseño

Cuando cambien `seriesSeleccionadas`, el componente detectará su primera sincronización completa y calculará los índices iniciales para los totales ya disponibles. Los índices guardados solo se respetan cuando `restaurarIndices` es verdadero. La alineación geométrica posterior mantiene el mismo punto anatómico.

## Validación

Una prueba monta el componente antes de que las series estén disponibles y comprueba que, al llegar las tres, Sagital y Coronal quedan en sus índices centrales en vez de cero. Restaurar conserva su comportamiento.
