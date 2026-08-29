import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// En Vercel el repositorio no siempre trae historial de git, por eso se usa
// primero la variable que expone la plataforma.
const obtenerCommit = () => {
  const desdeEntorno = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA
  if (desdeEntorno) return desdeEntorno.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return ''
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    assetsInclude: ['**/*.PNG'],
    worker: {
      format: 'es',
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['icons/favicon-32.png', 'apple-touch-icon.png', '_redirects'],
        manifest: {
          name: 'CalifornIA',
          short_name: 'CalifornIA',
          description: 'Sistema de diagnostico y operacion clinica de Central Diagnostico California',
          theme_color: '#020F23',
          background_color: '#020F23',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          lang: 'es-MX',
          icons: [
            {
              src: '/icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icons/maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          // El precache sólo lleva el "shell": el HTML, el chunk de entrada y su
          // CSS, los iconos y las fuentes. Antes el patrón metía *todo* el build
          // (~13 MB: cornerstone, xlsx, jspdf y las imágenes de botones), así que
          // en la primera visita —y en cada despliegue— la clínica descargaba el
          // visor DICOM completo aunque nadie fuera a abrirlo. Lo pesado ahora se
          // guarda en caché la primera vez que se usa (runtimeCaching), no antes.
          // (los iconos del manifest y los de `includeAssets` los añade el plugin
          // por su cuenta, no hace falta listarlos aquí)
          globPatterns: ['index.html', 'assets/index-*.{js,css}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          navigateFallbackDenylist: [
            /^\/rest\//,
            /^\/auth\//,
            /^\/storage\//,
          ],
          runtimeCaching: [
            {
              // Chunks y CSS diferidos de cada pantalla: se cachean al abrirla por
              // primera vez. StaleWhileRevalidate sirve la copia local al instante
              // y refresca en segundo plano, sin bloquear el flujo de actualización
              // (el service worker sigue avisando por needRefresh como hasta ahora).
              urlPattern: ({ url, sameOrigin, request }) =>
                sameOrigin &&
                url.pathname.startsWith('/assets/') &&
                (request.destination === 'script' || request.destination === 'style'),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'california-chunks',
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              // Imágenes propias de la app (botones, logos, iconos). Son inmutables
              // porque llevan hash en el nombre, por eso CacheFirst. Se limita a
              // mismo origen para no cachear jamás imágenes de Supabase Storage,
              // que sí cambian y no deben servirse rancias.
              urlPattern: ({ sameOrigin, request }) =>
                sameOrigin && request.destination === 'image',
              handler: 'CacheFirst',
              options: {
                cacheName: 'california-imagenes',
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 60 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
    define: {
      'process.env.VITE_CALIFORNIA_API': JSON.stringify(env.VITE_CALIFORNIA_API || ''),
      __APP_VERSION__: JSON.stringify(version),
      __APP_COMMIT__: JSON.stringify(obtenerCommit()),
      __APP_BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    },
  }
})
