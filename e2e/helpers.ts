import type { Locator } from '@playwright/test';

/**
 * Completa un input y confirma que el valor haya quedado -en `next dev`,
 * completar un campo de react-hook-form justo antes de que termine de
 * hidratar puede perderse (el listener real todavía no está conectado
 * cuando corre el fill nativo de Playwright). Reintenta unas pocas veces
 * en vez de agregar un wait fijo a ciegas antes de cada interacción.
 */
export async function fillEstable(locator: Locator, valor: string): Promise<void> {
  for (let intento = 0; intento < 5; intento++) {
    await locator.fill(valor);
    if ((await locator.inputValue()) === valor) return;
    await locator.page().waitForTimeout(200);
  }
  throw new Error(`No se pudo completar el campo con "${valor}" después de varios intentos`);
}
