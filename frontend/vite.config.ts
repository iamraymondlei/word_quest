import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
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
      basicSsl()
    ],
    server: {
      host: true,
      port: frontendPort,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          timeout: 300000, // 5 minutes
          proxyTimeout: 300000, // 5 minutes
        }
      }
    }
  };
});
