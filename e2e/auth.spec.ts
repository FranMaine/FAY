import { test, expect } from '@playwright/test';
import { fillEstable } from './helpers';

test('login muestra error con credenciales inválidas', async ({ page }) => {
  await page.goto('/login');
  await fillEstable(page.locator('input[type="email"]'), 'no-existe-este-usuario@example.com');
  await fillEstable(page.locator('input[type="password"]'), 'cualquiercosa123');
  await page.getByRole('button', { name: /iniciar sesión/i }).click();
  await expect(page.getByText('Email o contraseña incorrectos')).toBeVisible({ timeout: 10000 });
});

test('registro rechaza contraseñas que no coinciden', async ({ page }) => {
  await page.goto('/registro');
  await fillEstable(page.locator('input[name="name"]'), 'Test E2E');
  await fillEstable(page.locator('input[name="email"]'), `e2e-${Date.now()}@example.com`);
  await fillEstable(page.locator('input[name="password"]'), 'password123');
  await fillEstable(page.locator('input[name="confirmPassword"]'), 'otracosa456');
  await page.locator('input[name="aceptoTerminos"]').check();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page.getByText('Las contraseñas no coinciden')).toBeVisible({ timeout: 5000 });
});
