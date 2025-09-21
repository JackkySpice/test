import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  root: path.resolve(__dirname, './'),
  publicDir: path.resolve(__dirname, './public'),
  build: {
    // Output the production bundle alongside the frontend source so the
    // Express server can serve it from `web/dist`.
    outDir: path.resolve(__dirname, './dist'),
    emptyOutDir: true
  },
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://localhost:3000',
        changeOrigin: true,
        ws: true
      }
    }
  }
});
