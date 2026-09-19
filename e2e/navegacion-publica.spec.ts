import { test, expect } from '@playwright/test';

// Smoke tests de las páginas públicas más importantes: que carguen sin
// romper, con el contenido mínimo esperado. No verifican datos concretos
// (dependen de lo que haya cargado en la base en cada entorno) -eso ya lo
// cubren los tests unitarios de src/lib/scoring.ts contra datos fijos.

test('la home carga y linkea a rankings y campeonatos', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Regateando/i);
  await expect(page.getByRole('link', { name: /rankings/i }).first()).toBeVisible();
});

test('rankings de regatistas carga la tabla de filtros', async ({ page }) => {
  await page.goto('/rankings');
  await expect(page.getByRole('heading', { name: 'Rankings Generales' })).toBeVisible();
  await expect(page.getByText('Clase')).toBeVisible();
  await expect(page.getByText('Temporada (Año)')).toBeVisible();
});

test('ranking de clubes carga desde el link de rankings', async ({ page }) => {
  await page.goto('/rankings');
  await page.locator('main').getByRole('link', { name: 'Clubes' }).click();
  await expect(page).toHaveURL(/\/rankings\/clubes/);
  await expect(page.getByRole('heading', { name: 'Ranking de Clubes' })).toBeVisible();
});

test('listado de clubes carga y el buscador filtra', async ({ page }) => {
  await page.goto('/clubes');
  await expect(page.getByPlaceholder(/buscar club/i)).toBeVisible();
});

test('página de contacto muestra el formulario', async ({ page }) => {
  await page.goto('/contacto');
  await expect(page.getByRole('heading', { name: 'Contacto' })).toBeVisible();
  await expect(page.getByLabel('Nombre')).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByRole('button', { name: /enviar mensaje/i })).toBeVisible();
});

test('/admin redirige a login si no hay sesión', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login/);
});

test('/mi-perfil redirige a login si no hay sesión', async ({ page }) => {
  await page.goto('/mi-perfil');
  await expect(page).toHaveURL(/\/login/);
});
