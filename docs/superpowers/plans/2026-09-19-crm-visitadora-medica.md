# CRM del Representante Médico — Plan de implementación

> **Para trabajadores agénticos:** SUB-SKILL REQUERIDA: usar `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para ejecutar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:** convertir el módulo actual de Visitadora (3 pantallas: informe semanal, programación semanal y concentrado de comisiones) en un CRM médico completo, usable desde celular, que cubra los 16 puntos solicitados por la visitadora médica.

**Arquitectura:** se extiende la aplicación que ya existe, no se crea un sistema aparte. React 18 + Vite + React Router + TanStack Query + Zustand en el frente; Supabase (Postgres + RLS + Auth + Storage + Edge Functions) atrás; PWA ya configurada (`vite-plugin-pwa`) para el uso en celular; exportación con `xlsx` y `jspdf`/`jspdf-autotable`, que ya son dependencias del proyecto.

**Stack:** React 18, React Router 6, TanStack Query 5, Supabase JS 2, Jest + React Testing Library, Playwright (e2e), CSS propio del módulo (`src/pages/visitadora/visitadora.css`).

---

## 1. Qué ya existe hoy (punto de partida)

| Pieza | Estado | Archivo |
| --- | --- | --- |
| Informe semanal de visitas (captura, edición, importar/exportar Excel) | Funciona | `src/pages/visitadora/informe-visitas.jsx`, `src/hooks/use-visitas-medicas.js` |
| Programación semanal por día/zona/objetivos | Funciona | `src/pages/visitadora/programacion-semanal.jsx`, `src/hooks/use-programacion-visitas.js` |
| Concentrado de comisiones por médico | Funciona | `src/pages/visitadora/concentrado-comisiones.jsx` |
| Tablas `visitas_medicas`, `programacion_visitas`, `comisiones_doctor`, `comisiones_mensuales` + RLS por rol | Funciona | `supabase/migrations/20260828120000_visitadora_comisiones.sql` |
| Catálogo `doctores` (nombre, especialidad, teléfono, email, fecha de nacimiento, institución) | Parcial | baseline, `src/hooks/use-doctores.js` |
| Catálogo de estudios de laboratorio e imagen con precios por convenio | Funciona | `estudios_lab_catalogo`, `estudios_imagen_catalogo`, `precios_*` |
| Notificaciones internas en tiempo real (campana) | Funciona | `supabase/migrations/20260604120000_notificaciones.sql`, `src/components/notification-bell.jsx` |
| Login, roles y permisos (`visitadora` ya es un rol con menú propio) | Funciona | `src/utils/role-permissions.js` |
| PWA / uso en celular | Base lista, falta diseño móvil del módulo | `vite.config.js` |

**Lo que falta** respecto a lo pedido: expediente comercial del médico, convenios estructurados, prospectos, agenda día/semana/mes con reprogramación, captura rápida móvil, recordatorios y cumpleaños, reportes automáticos con exportación, control de órdenes, control de VisorDICOM, ficha de servicios por especialidad, mapa/zonas y panel principal.

---

## 2. Modelo de datos nuevo (una migración por fase)

Todo cuelga de `doctores.id_doctor` para no duplicar el catálogo que ya usan recepción y radiología.

- `doctores_crm` (1–1 con `doctores`): whatsapp, dirección del consultorio, hospital/clínica, zona, latitud, longitud, días y horarios de consulta, foto (Storage), notas, estatus (`activo|prospecto|inactivo|suspendido`), frecuencia de visita en días, origen del contacto.
- `convenios_medico`: tipo (`mixto|puntos|especial|prospecto|sin_convenio`), descripción de condiciones, usa órdenes propias o de la clínica, maneja puntos, vigencia, estado. Histórico: se guarda cada cambio, no se sobreescribe.
- `visitas_medicas` (ampliar la tabla existente): `tipo_visita`, `objetivo`, `resultado`, `que_se_ofrecio`, `que_se_entrego`, `compromisos`, `proxima_accion`, `fecha_seguimiento`, `id_programacion`.
- `agenda_visitas`: sustituye/extiende `programacion_visitas` con visitas individuales con fecha y hora, estatus (`programada|realizada|reprogramada|cancelada`) y enlace a la visita registrada. La tabla actual se conserva y se migran sus filas.
- `tareas_seguimiento`: tipo (`seguimiento|llamada|entrega_ordenes|reactivar_convenio|alta_ebudaicom|confirmar_cita|cumpleanos`), médico, fecha objetivo, estado, notas.
- `prospectos_medicos`: vive como `doctores` con estatus `prospecto` + campos propios (interés, probabilidad de cierre, servicios ofrecidos, número de contactos). Convertir a activo es un cambio de estatus + alta de convenio, sin recapturar nada.
- `ordenes_medicas_entregadas`: médico, fecha, cantidad, tipo, folios, seguimiento, observaciones.
- `visordicom_medicos`: estado (`pendiente|creado|activo`), fecha de creación, usuario, observaciones.
- `servicios_por_especialidad`: relación especialidad → estudios recomendados, sobre los catálogos de estudios que ya existen.

RLS: mismas funciones ya escritas (`es_usuario_visitadora()`, `es_usuario_comisiones_admin()`); cuando entre un segundo representante se añade filtro por `id_empleado` para que cada quien vea su cartera y dirección vea todo.

---

## 3. Fases

### Fase 1 — Directorio y expediente del médico (puntos 1, 2, 14)
- [x] Migración `doctores_crm` + `convenios_medico` + índices y RLS.
- [x] Hooks `use-directorio-medicos.js` y `use-convenios-medico.js` (TanStack Query, mismo patrón que `use-visitas-medicas.js`).
- [x] Pantalla `/visitadora/directorio`: lista con búsqueda y filtros por especialidad, zona, convenio, hospital, estatus y cumpleaños del mes.
- [x] Ficha `/visitadora/medico/:id` con pestañas: Datos · Convenio · Visitas · Llamadas · Órdenes · Seguimientos · VisorDICOM · Notas.
- [x] Alta y edición del médico en un formulario de una sola columna, pensado para celular.
- [ ] Foto del médico en Supabase Storage (bucket privado con URL firmada, igual que radiología).
- [x] Pruebas Jest de filtros, alta y ficha.

### Fase 2 — Agenda y registro de visitas (puntos 3, 4)
- [x] Migración `agenda_visitas` + ampliación de `visitas_medicas`; migrar `programacion_visitas` existente.
- [x] Vistas de agenda Día / Semana / Mes con cambio de fecha y filtro por zona.
- [x] Reprogramar: cambiar fecha desde la propia tarjeta de la visita (en celular, con un selector; en escritorio, además arrastrar).
- [x] Captura rápida post-visita: un modal de pantalla completa en celular con médico, motivo, qué se ofreció, qué se entregó, resultado, compromisos, próxima acción y fecha de seguimiento; guardar crea automáticamente la tarea de seguimiento.
- [x] Al guardar una visita se actualizan `última visita` y `próxima visita` del médico.
- [x] Pruebas de agenda, reprogramación y creación automática de seguimiento.

### Fase 3 — Seguimientos, recordatorios y cumpleaños (puntos 5, 8)
- [x] Migración `tareas_seguimiento`.
- [x] Bandeja de pendientes con filtros Hoy / Vencidos / Semana y cierre en un toque.
- [x] Cumpleaños: calendario del mes y aviso configurable N días antes (se calcula de `doctores.fecha_nacimiento`, ya existente).
- [ ] Recordatorios dentro de la app reutilizando la tabla `notificaciones` y la campana ya implementadas.
- [ ] Notificaciones push del PWA (Web Push) y, opcionalmente, recordatorio por WhatsApp reusando la Edge Function `whatsapp-reminders`.
- [ ] Pruebas de vencimientos, cumpleaños y generación de avisos.

### Fase 4 — Panel principal (punto 13)
- [ ] Vista SQL o RPC `panel_visitadora(id_empleado, fecha)` que devuelva los contadores en una sola llamada.
- [x] Pantalla de inicio del módulo: bloque **Hoy** (visitas programadas, seguimientos, llamadas, médicos por visitar, cumpleaños, tareas) y bloque **Esta semana** (visitas, prospectos nuevos, convenios, seguimientos, resultados).
- [x] Cada tarjeta es un botón grande que lleva a la lista filtrada correspondiente.
- [x] El módulo abre aquí por defecto (`redireccionPorRol` en `role-permissions.js`).

### Fase 5 — Prospectos, órdenes y VisorDICOM (puntos 7, 9, 10)
- [x] Migraciones `ordenes_medicas_entregadas` y `visordicom_medicos`; campos de prospecto en `doctores_crm`.
- [x] Embudo de prospectos con estatus y probabilidad de cierre; botón **Convertir en médico activo** que pide el tipo de convenio y conserva todo el historial.
- [x] Registro de órdenes entregadas y alerta de médicos con órdenes por renovar.
- [x] Tablero de VisorDICOM con filtro «pendientes de crear usuario».
- [ ] Pruebas de conversión de prospecto y de los dos tableros.

### Fase 6 — Reportes (punto 6)
- [ ] RPC de reporte con parámetros de periodo, médico, especialidad, zona y tipo de convenio.
- [x] Pantalla de reportes con el resumen semanal completo solicitado (visitados, visitas, nuevos, prospectos, convenios nuevos y reactivados, seguimientos, llamadas, órdenes, altas en VisorDICOM, pendientes, resultados).
- [x] Exportar a Excel (`xlsx`, como ya hace `exportar-informe-visitas.js`) y a PDF (`jspdf-autotable`).
- [x] Pruebas de los conteos con datos de ejemplo.

### Fase 7 — Catálogo de servicios y sugerencia por especialidad (punto 11)
- [x] Tabla `servicios_por_especialidad` sobre los catálogos de estudios existentes, con semilla inicial.
- [ ] Consulta rápida durante la visita: buscador de estudios, paquetes y (si se autoriza) precios.
- [x] Al abrir la ficha de un médico, el sistema propone los estudios más relevantes para su especialidad.

### Fase 8 — Mapa, zonas y ruta (punto 12)
- [x] Guardar latitud/longitud del consultorio (captura manual o desde la ubicación del celular).
- [ ] «Médicos cercanos» ordenados por distancia desde la posición actual.
- [x] Botón **Cómo llegar** que abre Google Maps, y armado de la agenda del día agrupando por zona.

### Fase 9 — Uso móvil y cierre (punto 15)
- [x] Repaso responsive de todo el módulo: una columna, botones grandes, tipografía legible, barra inferior de accesos.
- [x] Accesos directos a llamar y a WhatsApp desde la ficha del médico.
- [ ] Verificar que el PWA se instala y que la captura funciona con conexión intermitente.
- [ ] Pruebas e2e Playwright del recorrido completo: abrir panel → ver agenda → registrar visita → crear seguimiento → generar reporte.
- [ ] Auditoría de accesibilidad/contraste con `npm run audit:contraste`.

### Fase 10 (futuro, punto 16)
Metas mensuales y estadísticas de productividad, comisiones ligadas a referencias, varios representantes con cartera propia, reportes para dirección, comparación entre periodos e integraciones de calendario y WhatsApp. El modelo de datos de las fases anteriores ya deja lugar para esto (`id_empleado` en todas las tablas y convenios con histórico).

---

## 3 bis. Estado de la implementación (19 de septiembre de 2026)

Las fases 1 a 7 quedaron implementadas en la rama `claude/medical-rep-crm-jwa735`:
migración `20260919130000_crm_visitadora.sql`, hooks nuevos, y las pantallas
Panel, Directorio, Expediente del médico, Agenda, Pendientes, Prospectos,
Órdenes y VisorDICOM, y Reportes, con su diseño móvil y pruebas.

Después se agregó, a pedido de la representante: la ventana **Pacientes
referidos** (cuántos pacientes distintos mandó cada médico, con filtro por
fechas y exportación a Excel), la exportación de la agenda a Excel, el
renombre de eBudaicom a **VisorDICOM** en la aplicación y en la base
(`20260920120000_visordicom_rename.sql`), y el submenú del módulo, que ahora
se ancla hacia donde quepa para que no se corte la última opción.

En la versión 2.18.0 se retiró la pantalla de **Programación semanal**: la
agenda la cubre con fecha, hora, reprogramación y registro de la visita. Las
rutas ya capturadas se migraron a `agenda_visitas`
(`20260920130000_programacion_a_agenda.sql`) y `programacion_visitas` queda
como archivo de solo lectura. Con ella se fue la importación y exportación
del Excel semanal en el formato antiguo; la agenda exporta su propio Excel.

Sigue pendiente, por orden:

- Fotografía del médico en Supabase Storage (el campo `foto_url` ya existe).
- Notificaciones push del PWA y recordatorio por WhatsApp (hoy los avisos se ven
  dentro de la aplicación, en el panel y en la bandeja de pendientes).
- Pantalla de "médicos cercanos" y armado de ruta por zona: el cálculo de
  distancia y los enlaces a Google Maps ya están, falta la pantalla que los use.
- Pruebas e2e del recorrido completo y auditoría de contraste (fase 9).
- Fase 10 completa (metas, productividad, varios representantes).

## 4. Respuesta a las preguntas de la solicitud

- **¿Es posible?** Sí. Más de la mitad de la base (autenticación, roles, catálogo de médicos, visitas, programación, comisiones, catálogo de estudios con precios, notificaciones y PWA) ya está construida y en producción en CalifornIA; lo que falta es sobre todo pantallas y tablas nuevas alrededor de eso.
- **Tecnología recomendada:** la misma del sistema actual — React + Vite (PWA para celular sin necesidad de publicar en tiendas) y Supabase (Postgres, autenticación, permisos por rol, respaldos y archivos). Evita mantener dos plataformas y aprovecha el catálogo de médicos que ya existe.
- **Primera versión funcional (fases 1 a 4):** directorio con expediente, convenios, agenda con reprogramación, captura rápida desde celular, seguimientos, cumpleaños y panel principal. Estimado **6 a 8 semanas** de trabajo.
- **Versión completa (fases 5 a 9):** prospectos, órdenes, VisorDICOM, reportes exportables, catálogo de servicios y mapa. **6 a 8 semanas adicionales**, entregables por fases para ir usándolas conforme se liberan.
- **Costo:** al construirse dentro de CalifornIA no hay licencias ni infraestructura nueva; el costo es tiempo de desarrollo. La cifra concreta depende de la tarifa que se acuerde con la dirección, sobre la estimación de horas de arriba.

## 5. Orden sugerido de entrega

Fase 1 → 2 → 3 → 4 (primera versión usable en el día a día) → 6 (reportes, lo que más pesa en su carga de trabajo) → 5 → 7 → 8 → 9.
