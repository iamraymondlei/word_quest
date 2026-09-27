import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { readFileSync } from 'fs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '');
  const backendPort = env.BACKEND_PORT || env.PORT || process.env.BACKEND_PORT || process.env.PORT || '8010';
  const backendUrl = env.BACKEND_URL || process.env.BACKEND_URL || `http://localhost:${backendPort}`;
  const frontendPort = Number(env.FRONTEND_PORT || process.env.FRONTEND_PORT) || 5174;
  const certFile = env.FRONTEND_TLS_CERT_FILE || process.env.FRONTEND_TLS_CERT_FILE;
  const keyFile = env.FRONTEND_TLS_KEY_FILE || process.env.FRONTEND_TLS_KEY_FILE;
  const tls = certFile && keyFile
    ? { cert: readFileSync(certFile), key: readFileSync(keyFile) }
    : undefined;
  const apiProxy = {
    '/api': {
      target: backendUrl,
      changeOrigin: true,
      timeout: 720000,
      proxyTimeout: 720000,
    },
  };

  return {
    envDir: '../',
    plugins: [
      react(),
      tailwindcss(),
      ...(!tls ? [basicSsl()] : []),
      VitePWA({
        registerType: 'autoUpdate',
        strategies: 'injectManifest',
        srcDir: '.',
        filename: 'sw.js',
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
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,svg,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
      }),
    ],
    server: {
      host: true,
      port: frontendPort,
      https: tls,
      proxy: apiProxy,
    },
    preview: {
      host: true,
      port: frontendPort,
      https: tls,
      proxy: apiProxy,
    },
  };
});
