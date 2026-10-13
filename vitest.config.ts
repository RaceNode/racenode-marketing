import { defineConfig } from 'vitest/config';

// Unit tests cover pure TypeScript: schemas, helpers, configuration
// consistency. Pages are covered by the Playwright smoke suite.
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
});
