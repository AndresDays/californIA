# Prueba de carga de staging

## Objetivo

Medir el comportamiento de CalifornIA con 5, 10 y 15 usuarios simultáneos, que representa el límite de uso esperado por la clínica.

## Alcance

La prueba se ejecutará exclusivamente contra staging. Simulará la carga de la pantalla de acceso y consultas autenticadas de pacientes, citas y ventas. No enviará mensajes de WhatsApp, no cargará archivos DICOM y no modificará datos.

## Diseño

Un script de k6 recibe por variables de entorno la URL de staging, la URL y clave publishable de Supabase, y un token temporal de un usuario de pruebas. Ejecuta tres escenarios secuenciales de tres minutos con 5, 10 y 15 usuarios virtuales. Se aprueba cuando al menos el 99 % de las solicitudes responde correctamente y el percentil 95 de tiempo de respuesta es menor a dos segundos.

## Resultados

La salida de k6 se guarda localmente como JSON fuera del repositorio y se resume en una tabla para la tesis. Los resultados se interpretan como evidencia del ambiente evaluado y no como garantía de capacidad ilimitada.
