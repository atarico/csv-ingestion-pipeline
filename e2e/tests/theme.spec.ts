import { expect, test } from '@playwright/test';
import { sampleFile, uniqueName, uploadCsv } from './helpers';

test.describe('Theme toggle', () => {
  test('follows the system, toggles, persists across reloads and keeps badges visible', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    // Guarantees /uploads has at least one status badge even on a cold volume.
    await uploadCsv(page, uniqueName('theme'), sampleFile('sample-data.csv'));

    const html = page.locator('html');
    await page.goto('/uploads');
    await expect(html).toHaveAttribute('data-theme', 'dark');
    const badge = page.getByRole('cell', { name: /Pendiente|Procesando|Completado|Fallido/ }).first();
    await expect(badge).toBeVisible();

    await page.getByRole('button', { name: 'Activar modo claro' }).click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await expect(badge).toBeVisible();

    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await expect(page.getByRole('button', { name: 'Activar modo oscuro' })).toBeVisible();
  });
});
