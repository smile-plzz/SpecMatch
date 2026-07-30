import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'SPECMATCH – PC Game Recommender',
        short_name: 'SPECMATCH',
        description: 'Find games that run perfectly on your PC',
        theme_color: '#00e5ff',
        background_color: '#0a0c10',
        display: 'standalone',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.rawg\.io\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'rawg-api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 6 }
            }
          }
        ]
      }
    })
  ]
})
