import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '');
  const backendPort = env.BACKEND_PORT || env.PORT || process.env.BACKEND_PORT || process.env.PORT || '8010';
  const backendUrl = env.BACKEND_URL || process.env.BACKEND_URL || `http://localhost:${backendPort}`;
  const frontendPort = Number(env.FRONTEND_PORT || process.env.FRONTEND_PORT) || 5174;

  return {
    envDir: '../',
    plugins: [
      react(),
      tailwindcss(),
      basicSsl(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'],
        manifest: {
          name: 'WordQuest - 单词冒险岛',
          short_name: 'WordQuest',
          description: '儿童绘本英语单词探险学习应用',
          theme_color: '#0B0F19',
          background_color: '#0B0F19',
          display: 'standalone',
          orientation: 'any',
          icons: [
            {
              src: '/icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,svg,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/api/illustrations/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'wordquest-illustrations',
                expiration: {
                  maxEntries: 500,
                  maxAgeSeconds: 60 * 24 * 60 * 60, // 60 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
    ],
    server: {
      host: true,
      port: frontendPort,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          timeout: 720000, // 12 minutes for multi-page AI analysis
          proxyTimeout: 720000, // 12 minutes
        },
      },
    },
  };
});
