# Nuevo paciente: precios, crédito y catálogo Veterinaria

## Objetivo

Actualizar el registro de Nuevo paciente para que los precios ya incluyan IVA, permita registrar ventas a crédito, ofrezca opciones de sexo inclusivas y asigne Veterinaria a Central Diagnóstica California.

## Alcance aprobado

- Eliminar de la interfaz el porcentaje de IVA y el total con IVA.
- Calcular el total como subtotal menos descuento. La venta conserva `iva: 0` para cumplir el esquema actual de la base de datos.
- Añadir `credito` como una forma de pago adicional; no sustituye efectivo, tarjetas ni transferencia. Los pagos parciales o vacíos siguen creando un adeudo.
- Añadir las opciones de sexo `otro` y `prefiero_no_decirlo` en el formulario de Nuevo paciente.
- Migrar todos los registros con modalidad `veterinaria` al código operativo `CDC` y actualizar la semilla de Veterinaria para instalaciones futuras.

## Límites

- No se recalculan ventas históricas ni se cambia el requisito `NOT NULL` de `ventas.iva`.
- No se modifica la estructura de la tabla `pacientes`; los nuevos valores de sexo caben en su columna existente.
- No se cambian otros catálogos de imagen ni métodos de pago existentes.

## Diseño

`NuevoPaciente` dejará de mantener estado para porcentaje IVA, IVA calculado y total con IVA. Su cálculo conservará subtotal y descuento, calculará el descuento directamente sobre el subtotal y persistirá IVA igual a cero. El resumen visual mostrará subtotal, descuento y total final.

La migración corrige la información ya desplegada con `update public.estudios_imagen_catalogo set empresa_operativa = 'CDC' where modalidad = 'veterinaria'` y la semilla mantendrá esa misma asociación para que la migración sea idempotente.

## Pruebas

- Una prueba del helper de totales confirma que el descuento se aplica al subtotal sin IVA.
- El filtrado de catálogo muestra un estudio Veterinaria para CDC y no para CDI.
- Una prueba de interfaz verifica las opciones nuevas de sexo y Crédito, así como la ausencia de controles IVA.
