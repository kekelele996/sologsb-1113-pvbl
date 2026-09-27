import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 21813, host: true },
  preview: { port: 21813, host: true },
  build: { outDir: 'dist', chunkSizeWarningLimit: 2500 },
});
