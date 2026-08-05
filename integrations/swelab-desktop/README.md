# CalifornIA Swelab (Windows x86)

Aplicación de bandeja para la PC que tiene Swelab Alfa Plus Standard. Lee `Resultados.mdb` en modo solo lectura, convierte los analitos usando `Conversiones` y manda lotes BHC a CalifornIA.

## Seguridad y comportamiento

- Requiere Windows de 64 bits y ejecuta PowerShell de 32 bits para usar `Microsoft.ACE.OLEDB.16.0`.
- No modifica la base Access ni valida resultados clínicos.
- Cada `Resultados.Id` confirmado se conserva localmente en `%ProgramData%\CalifornIA\swelab-agent\state.json`; un error HTTP deja el lote pendiente para reintento.
- Debe ejecutarse dentro de una sesión de Windows. La app se registra para iniciar al entrar el usuario; no se instala como servicio SYSTEM.

## Configurar staging

1. Instala Microsoft Access Database Engine **32-bit** y confirma que la prueba manual de lectura funciona.
2. Compila el instalador en Windows desde esta carpeta:

   ```powershell
   npm install
   npm run dist:win
   ```

3. Ejecuta el `.exe` creado en `dist`.
4. Crea `%ProgramData%\CalifornIA\swelab-agent\config.json` copiando `config.example.json` y pega únicamente el valor de `SWELAB_IMPORT_SECRET` de staging.
5. Abre **CalifornIA Swelab**. Usa `Leer ahora` desde el icono de bandeja para una prueba inmediata.

Los registros quedan en `%ProgramData%\CalifornIA\swelab-agent\swelab-agent.log`.
