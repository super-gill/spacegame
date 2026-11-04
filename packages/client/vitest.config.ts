import { defineConfig } from 'vitest/config';

// Tests cover the client's pure helpers (no DOM). Run with `npm test`
// in this package; the root `npm test` runs the sim only.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
