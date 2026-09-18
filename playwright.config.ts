import { defineConfig, devices } from '@playwright/test';

// Tests end-to-end de humo: antes solo había tests unitarios de la lógica
// de puntaje (scoring.ts) -nada probaba que las páginas reales carguen de
// punta a punta (servidor + base de datos + render). Corren contra un
// `next dev` que Playwright levanta solo (ver webServer más abajo), así
// que necesitan DATABASE_URL apuntando a una base real -por eso son
// lecturas de páginas públicas, sin altas/bajas, para poder correr sin
// riesgo contra la base de producción si hace falta.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
