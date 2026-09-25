# Reparto del dictado de visitas con Claude Haiku

La representante médica escribe la visita de corrido y el sistema la reparte en
las columnas de su informe semanal (actividades, comentarios del médico,
observaciones, seguimiento y convenio). Con IA, además, la redacta como va en el
informe: tercera persona, ortografía corregida, sin muletillas ni abreviaturas.
No lo alarga —el resultado queda igual de corto que el dictado o más corto—:
redactar mejor no es escribir más.
Redactar es reescribir lo que dictó —nunca agregarle hechos, quitarle
información ni suavizar lo negativo—, y las instrucciones de la función lo dicen
con esas palabras.

Hay dos repartos, y ése es el punto: el de la aplicación nunca depende de que
haya señal.

| | Dónde corre | Cuándo se usa | Costo |
| --- | --- | --- | --- |
| Reparto por palabras (`src/utils/clasificar-captura.js`) | En el navegador | Siempre, mientras se escribe | Ninguno |
| Claude Haiku 4.5 (`supabase/functions/clasificar-visita`) | Edge Function | Al tocar «Acomodar con IA» | Por uso |

El reparto local sólo reparte: deja el texto tal como se escribió. La redacción
es lo que aporta la IA, y es la razón principal para tocar el botón.

Si la función no contesta —sin internet, sin llave, un error de la API— la
pantalla lo dice y se queda con el reparto por palabras.

## Qué hay que configurar

La llave de la API vive en el servidor; nunca viaja al navegador.

1. Generar una llave en la consola de Anthropic.
2. Guardarla como secreto del proyecto:

   ```bash
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   ```

3. Publicar la función:

   ```bash
   supabase functions deploy clasificar-visita
   ```

Sin el secreto la función responde 503 y la aplicación sigue funcionando con su
reparto local, así que publicarla antes de cargar la llave no rompe nada.

## Qué cuesta

Claude Haiku 4.5 cobra 1 USD por millón de tokens de entrada y 5 por millón de
salida. Un dictado de visita ronda los 700 tokens de entrada (instrucciones y
ejemplo incluidos) y 250 de salida: **unos 0.002 USD por visita**, alrededor de
cuatro centavos de peso. Cien visitas al mes salen en menos de 5 pesos.

Por eso el reparto con IA es un botón y no algo automático mientras se escribe:
cobrar por cada tecleo no tendría sentido, y el reparto local ya enseña una
vista previa gratis. La respuesta de la función devuelve los tokens usados
(`uso.entrada`, `uso.salida`) para poder revisar el gasto real en los registros.

## Si el reparto se equivoca

Por orden de esfuerzo:

1. Corregir en «Campo por campo», que reparte lo ya escrito.
2. Escribir la etiqueta al principio del renglón (`Seguimiento: ...`): manda
   sobre cualquier reparto, con IA o sin ella.
3. Ajustar las instrucciones de la función (`INSTRUCCIONES` en `index.ts`) o las
   reglas locales (`REGLAS` en `clasificar-captura.js`), según cuál de los dos
   falló. Si lo que falla es la redacción —inventa un dato, suaviza un
   comentario, se pone florido—, la sección «Lo que NO debes hacer nunca» de esas
   instrucciones es el lugar donde se corrige.
