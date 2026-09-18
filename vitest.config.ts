import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // /e2e usa @playwright/test, con su propio test runner (playwright.config.ts)
    // -sin excluirlo, vitest también intenta correr esos archivos y falla
    // porque test.describe() de Playwright no es compatible con el suyo.
    exclude: ['**/node_modules/**', '**/e2e/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
