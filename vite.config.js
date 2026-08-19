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
          globPatterns: ['**/*.{js,css,html,ico,png,PNG,svg,webp,jpg,jpeg,woff2}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          navigateFallbackDenylist: [
            /^\/rest\//,
            /^\/auth\//,
            /^\/storage\//,
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
