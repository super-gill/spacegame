import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const here = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

/**
 * The commit this client was built from, shown in the corner by the fps
 * so anyone can tell at a glance whether they are on the latest build
 * (the version number only moves at releases). "unknown" outside git.
 */
function buildCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: here('.'), stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'unknown';
  }
}

export default defineConfig({
  // Relative base so the built site works from GitHub Pages or any subfolder.
  base: './',
  define: { __BUILD_COMMIT__: JSON.stringify(buildCommit()) },
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
