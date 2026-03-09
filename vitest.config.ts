import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['**/__tests__/**/*.test.{ts,tsx}', '**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['services/calculator.ts', 'hooks/useAppState.ts'],
      thresholds: {
        'services/calculator.ts': { statements: 90, branches: 90, functions: 90, lines: 90 },
        'hooks/useAppState.ts': { statements: 60, branches: 60, functions: 60, lines: 60 },
      },
    },
  },
});
