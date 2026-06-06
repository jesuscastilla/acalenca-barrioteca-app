import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: true,
      watch: {},
    },
    // Añade la propiedad build aquí:
    build: {
      chunkSizeWarningLimit: 1000, // Puedes subirlo a 1500 o más si sigues viendo el aviso
    },
  };
});