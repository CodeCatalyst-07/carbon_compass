import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      thresholds: {
        // Actual values: statements 84.10%, branches 81.25%, functions 97.61%, lines 83.88%
        statements: 80,
        branches: 80,
        functions: 90,
        lines: 80,
      },
    },
  },
});
