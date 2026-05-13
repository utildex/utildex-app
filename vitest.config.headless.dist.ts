import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/headless-dist/**/*.spec.ts'],
    isolate: true,
    pool: 'forks',
  },
});
