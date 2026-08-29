import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    basicSsl()
  ],
  server: {
    host: true,
    port: 5174,
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://localhost:8010',
        changeOrigin: true,
        timeout: 300000, // 5 minutes
        proxyTimeout: 300000, // 5 minutes
      }
    }
  }
});
