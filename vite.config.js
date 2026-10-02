import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const api = `http://localhost:${process.env.API_PORT || 3000}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': { target: api },
      '/uploads': { target: api }
    }
  },
  build: {
    chunkSizeWarningLimit: 900
  }
});
