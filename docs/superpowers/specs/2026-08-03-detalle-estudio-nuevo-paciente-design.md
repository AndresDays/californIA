# Detalle de estudio en Nuevo Paciente

## Objetivo

Permitir que la persona usuaria consulte el detalle del estudio ya seleccionado sin sacarlo de la tabla de Nuevo Paciente.

## Alcance

- La descripción de cada estudio seleccionado será un control interactivo.
- El hover comunica que el nombre es seleccionable; el modal se abre únicamente al hacer clic.
- El modal presenta clave, descripción, área y días de proceso. También presenta los campos clínicos y técnicos que existan en el catálogo:
  - Laboratorio: condiciones del paciente, tipo de muestra, recipiente, método, técnica, equipo y etiquetas extra.
  - Imagen: preparación, duración, región anatómica, requerimiento de contraste e interpretación, modalidad y empresa operativa.
- Los campos vacíos no se renderizan.
- Cerrar con el botón Cerrar, Escape o clic fuera del diálogo.

## Diseño técnico

`nuevo-paciente.jsx` ampliará las consultas de los catálogos para incluir los datos de detalle y conservarlos en cada estudio seleccionado. Un componente de modal dedicado recibe el estudio seleccionado y se limita a mostrar los campos presentes. La tabla conserva las acciones de eliminar y muestra el nombre como botón accesible, sin modificar precios, cliente ni selección.

## Accesibilidad y validación

- El nombre del estudio tendrá un nombre accesible que indique que abre su detalle.
- El diálogo tendrá título y control de cierre por teclado.
- Una prueba verificará el hover/semántica del control y que el clic muestre los datos disponibles, omitiendo los ausentes.
- La prueba E2E de Nuevo Paciente validará abrir y cerrar el modal desde la tabla.
