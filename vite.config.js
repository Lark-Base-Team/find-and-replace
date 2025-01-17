import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: ['#minpath', '#minproc', '#minurl'],
      onwarn(warning, warn) {
        if (warning.code === 'UNRESOLVED_IMPORT' && (warning.id === '#minpath' || warning.id === '#minproc' || warning.id === '#minurl')) return;
        warn(warning);
      }
    }
  }
})
