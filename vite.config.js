import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages hosts this repository under /Chess/.
  // Vite uses this base path for scripts, styles and assets.
  base: '/Chess/',
  build: { target: 'es2020' }
});
