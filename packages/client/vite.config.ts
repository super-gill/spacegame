import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the built site works from GitHub Pages or any subfolder.
  base: './',
  server: {
    port: 5173,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
