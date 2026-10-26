import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    // En desarrollo, los pedidos a /api van al servidor Express (puerto 3000)
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
