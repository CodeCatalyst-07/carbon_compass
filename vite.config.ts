/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
  },
  plugins: [tailwindcss(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary'],
      include: ['src/**'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/__tests__/**',
        'src/test-setup.ts',
        'src/main.tsx',
      ],
      thresholds: {
        // Actual values: statements 68.92%, branches 64.76%, functions 64.36%, lines 70.77%
        statements: 65,
        branches: 60,
        functions: 60,
        lines: 70,
      },
    },
  },
});
