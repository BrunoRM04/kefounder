import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const api = `http://localhost:${process.env.API_PORT || 3000}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': { target: api, xfwd: true },
      '/uploads': { target: api, xfwd: true }
    }
  },
  build: {
    chunkSizeWarningLimit: 900
  }
});
