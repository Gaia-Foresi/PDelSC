import { defineConfig } from 'vite';

export default defineConfig({
  // ... lo que ya tenía ...
  resolve: {
    alias: {
      events: 'events',
    },
  },
  // AGREGAR ESTO:
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});