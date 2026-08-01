# SCOUT conserva W/L nativo frente a estado guardado

## Objetivo

Una serie SCOUT debe coincidir con el preview aunque tenga un estado de vista previamente guardado.

## Diseño

Al cargar una imagen SCOUT, el visor restaura sus overlays del estado guardado, pero no aplica `estado.viewport`. Las demás series conservan la restauración completa de viewport y overlays.

## Validación

Una prueba inyecta un viewport guardado diferente en SCOUT y verifica que no se usa; el mismo flujo conserva overlays y no afecta los presets CT existentes.
