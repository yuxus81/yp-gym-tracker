import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// base './' + HashRouter: läuft auf GitHub Pages unter jedem Unterpfad.
export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.1.0') },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'YP Gym Tracker',
        // Unter dem Home-Bildschirm-Icon ist nur Platz für ~12 Zeichen.
        short_name: 'YP Gym',
        description: 'Trainingsplan, Sessions und Verlauf — auch ohne Netz.',
        lang: 'de',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0c0c0d',
        theme_color: '#0c0c0d',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Alles, was die App braucht, liegt nach dem ersten Besuch auf dem Gerät.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        // Supabase-Aufrufe nie aus dem Cache beantworten — Daten kommen aus IndexedDB.
        navigateFallbackDenylist: [/^\/rest\//, /^\/auth\//],
        // Nur lateinische Schriftschnitte vorhalten — spart ~500 KB beim ersten Laden.
        globIgnores: ['**/*cyrillic*', '**/*greek*', '**/*vietnamese*'],
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          data: ['@supabase/supabase-js', 'dexie', 'dexie-react-hooks'],
          motion: ['motion'],
        },
      },
    },
  },
  test: { environment: 'node' },
} as never);
