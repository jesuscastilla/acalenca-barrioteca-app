import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, Plugin} from 'vite';

function versionGeneratorPlugin(buildTime: number): Plugin {
  return {
    name: 'version-generator-plugin',
    buildStart() {
      const publicDir = path.resolve(__dirname, 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, {recursive: true});
      }
      fs.writeFileSync(
        path.resolve(publicDir, 'version.json'),
        JSON.stringify({buildTime, builtAt: new Date(buildTime).toISOString()}, null, 2)
      );
    },
  };
}

export default defineConfig(() => {
  const buildTime = Date.now();
  return {
    base: './',
    define: {
      __APP_BUILD_TIME__: JSON.stringify(buildTime),
    },
    plugins: [react(), tailwindcss(), versionGeneratorPlugin(buildTime)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: true,
      watch: {},
    },
    build: {
      chunkSizeWarningLimit: 1000,
    },
  };
});