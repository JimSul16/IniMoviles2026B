import { expect, test } from '@playwright/test';

test('abre la raíz y muestra el inicio de UrbanInspect', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('ion-title').first()).toContainText('UrbanInspect');
});

test('navega al listado de incidencias', async ({ page }) => {
  await page.goto('/incidencias');
  await expect(page.locator('ion-title').first()).toContainText('Incidencias');
});
