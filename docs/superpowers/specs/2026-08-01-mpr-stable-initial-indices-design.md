# Índices iniciales MPR estables

## Objetivo

Evitar que la alineación geométrica asíncrona reemplace los índices centrales de Sagital y Coronal por la imagen 1 al abrir MPR.

## Diseño

La apertura MPR conserva los índices centrales calculados para las tres series, igual que Restaurar. La alineación por punto anatómico queda disponible para navegación explícita, pero no modifica el estado inicial.

## Validación

La regresión MPR verifica los índices centrales `[47,105,89]` para los totales del estudio y que Restaurar mantiene el mismo resultado.
