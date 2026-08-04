# Integración Swelab Alfa Plus BHC

## Objetivo

Importar resultados de biometría hemática de la base local `Resultados.mdb` de una Swelab Alfa Plus Standard a CalifornIA, dejándolos guardados para revisión humana en Captura.

## Fuente y contrato

La computadora del analizador recibe datos por USB y conserva una base Access en `C:\Swelab Alfa Plus Standard Interfaz\Resultados.mdb`.

- `Folios` contiene el encabezado (`Folio`, `Fecha`, `Estado`).
- `Resultados` contiene el detalle por analito (`Id`, `Folio`, `Analito`, `Resultado`, `Unidad`, `Referencia`, `Fecha`, `Estado`).
- `Conversiones` traduce el identificador del equipo, por ejemplo `|HGB||`, a la clave de sistema, por ejemplo `BH4`.

## Arquitectura

Un agente local de Windows, instalado en la misma PC de la interfaz Swelab, leerá Access en modo solo lectura. Agrupará resultados por folio, resolverá las claves mediante `Conversiones` y los enviará a una API autenticada de CalifornIA. El navegador no lee la base Access ni recibe credenciales privilegiadas.

## Regla de aplicación

Un lote se aplica únicamente si se cumplen todas estas condiciones:

1. El folio origen coincide exactamente con `ventas.folio`.
2. La venta tiene exactamente un `estudios_venta` con `clave_estudio = 'BHC'` elegible para captura.
3. Cada analito recibido se traduce a una clave configurada para BHC en CalifornIA.
4. Ningún registro de origen (`Resultados.Id`) fue importado antes.

Cuando se aplica, la integración actualiza únicamente `estudios_venta.resultados` del BHC con el JSON de analitos y marca `estado_captura = 'completado'` y `estado_validacion = 'guardado'`. No puede establecer `validado`.

## Excepciones y auditoría

Folios inexistentes, BHC ambiguos, analitos sin conversión y duplicados quedan en una bandeja de excepciones sin modificar resultados clínicos. Se conservará la identidad del registro Access, folio, valor original, unidad, fecha de origen, lote de importación, fecha de aplicación y resultado de la revisión.

## Validación

- Probar la traducción completa de los códigos BHC disponibles, incluidos WBC, RBC, HGB, HCT y PLT.
- Probar aplicación idempotente: reimportar el mismo `Resultados.Id` no modifica ni duplica datos.
- Rechazar folio desconocido, dos BHC en una venta y analito sin mapeo.
- Confirmar que la importación aparece como Guardada y requiere la validación manual normal de Captura.
