# Prueba de carga en staging

Esta guía mide el comportamiento de las consultas principales de CalifornIA con
5, 10 y 15 usuarios virtuales. No sustituye las pruebas funcionales ni se debe
ejecutar en producción.

## Alcance

El script consulta la pantalla de inicio de sesión y, con una sesión temporal
de un usuario de pruebas, realiza consultas de solo lectura de pacientes,
citas y ventas. No crea ni modifica registros, no envía WhatsApp y no descarga
archivos DICOM.

Los niveles se ejecutan de manera secuencial: 5 usuarios durante tres minutos,
10 usuarios durante tres minutos y 15 usuarios durante tres minutos. El total
aproximado es de diez minutos incluyendo las separaciones entre escenarios.

## Requisitos

1. Usar el ambiente de staging, nunca producción.
2. Instalar [k6](https://grafana.com/docs/k6/latest/).
3. Contar con un usuario dedicado de pruebas en staging y generar un token de
   acceso temporal. No guardar el token en archivos, capturas ni historial de
   comandos compartido.
4. Tener la URL y clave publishable del proyecto de Supabase de staging.

## Ejecución

Exporta las variables solamente en la sesión actual de la terminal. Sustituye
los valores de ejemplo; no copies secretos reales al repositorio.

```bash
export LOAD_TEST_ENV=staging
export LOAD_TEST_BASE_URL=https://staging.californiadiagnostica.com
export LOAD_TEST_SUPABASE_URL=https://<staging-project-ref>.supabase.co
export LOAD_TEST_SUPABASE_ANON_KEY=<staging-publishable-key>
export LOAD_TEST_ACCESS_TOKEN=<temporary-staging-test-user-token>
k6 run --out json=load-results/california-staging.json load-tests/california-staging.js
```

El script se detiene si falta una variable, si `LOAD_TEST_ENV` no es `staging`
o si se intenta usar el dominio productivo `app.californiadiagnostica.com`.

## Criterios de aprobación

Para el ambiente medido se consideran aceptables los siguientes límites:

- Menos de 1 % de solicitudes HTTP fallidas.
- Percentil 95 de las respuestas menor a 2 segundos.
- Sin errores de autorización para el usuario de pruebas.

Los resultados describen únicamente el ambiente, datos y configuración usados
en la ejecución; no representan una garantía de capacidad ilimitada.

## Registro para la tesis

| Usuarios simultáneos | Duración | Solicitudes correctas | Tiempo promedio | Percentil 95 | Errores | Resultado |
| --- | --- | --- | --- | --- | --- | --- |
| 5 | 3 min | | | | | |
| 10 | 3 min | | | | | |
| 15 | 3 min | | | | | |

Adjunta también la fecha, el ambiente utilizado, la versión desplegada y una
gráfica de tiempo de respuesta o solicitudes por segundo generada a partir del
archivo JSON.
