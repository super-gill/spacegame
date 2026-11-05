import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const here = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  // Relative base so the built site works from GitHub Pages or any subfolder.
  base: './',
  server: {
    port: 5173,
    // In development (npm run dev) the page comes from Vite, the world from
    // the game server (npm start): pass the WebSocket through to it.
    proxy: {
      '/ws': { target: 'ws://localhost:8080', ws: true },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    // Two pages: the game, and the fitter (docs/fitting.md, "The fitter").
    rollupOptions: {
      input: {
        game: here('./index.html'),
        fitter: here('./fitter.html'),
      },
    },
  },
});
