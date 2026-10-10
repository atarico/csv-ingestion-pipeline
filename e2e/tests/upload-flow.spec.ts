import { expect, test } from '@playwright/test';
import { expectStatus, sampleFile, selectFile, uniqueName, uploadCsv } from './helpers';

test.describe('CSV upload flow', () => {
  test('valid CSV is uploaded, listed and processed to Completado', async ({ page }) => {
    const name = uniqueName('sample-data');
    await uploadCsv(page, name, sampleFile('sample-data.csv'));

    await expectStatus(page, 'Completado');
    await expect(page.getByText('Filas procesadas: 60 · Filas con errores: 0')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Datos procesados' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Filas con errores' })).toHaveCount(0);

    // The upload shows up in the list with its final state and row counter.
    await page.getByRole('link', { name: 'Volver a la lista' }).click();
    const row = page.getByRole('row').filter({ hasText: name });
    await expect(row).toBeVisible();
    await expect(row.getByRole('cell', { name: 'Completado', exact: true })).toBeVisible();
    await expect(row.getByRole('cell', { name: '60/60' })).toBeVisible();
  });

  test('rows with errors are reported per row while the upload completes', async ({ page }) => {
    const name = uniqueName('sample-with-errors');
    await uploadCsv(page, name, sampleFile('samples/sample-with-errors.csv'));

    await expectStatus(page, 'Completado');
    await expect(page.getByText('Filas procesadas: 19 · Filas con errores: 6')).toBeVisible();

    const errorsTable = page
      .getByRole('heading', { name: 'Filas con errores' })
      .locator('xpath=following-sibling::div[1]');
    // Rows 3, 7, 11, 15, 19 have one defect each; row 23 has two (unit and date).
    const expected: Array<[row: string, field: string]> = [
      ['3', 'amount'],
      ['7', 'amount'],
      ['11', 'date'],
      ['15', 'category'],
      ['19', 'unit'],
      ['23', 'unit'],
      ['23', 'date'],
    ];
    await expect(errorsTable.getByRole('row')).toHaveCount(expected.length + 1);
    for (const [rowNumber, field] of expected) {
      const match = errorsTable.getByRole('row').filter({
        has: page.getByRole('cell', { name: rowNumber, exact: true }),
      });
      await expect(match.filter({ has: page.getByRole('cell', { name: field, exact: true }) })).toHaveCount(1);
    }
  });

  test('CSV with an invalid header ends in Fallido with the missing column', async ({ page }) => {
    const name = uniqueName('invalid-header');
    await uploadCsv(page, name, sampleFile('samples/invalid-header.csv'));

    await expectStatus(page, 'Fallido');
    const alert = page.getByRole('alert').filter({ hasText: 'El procesamiento falló' });
    await expect(alert).toContainText('Invalid CSV header: missing [date]');
    await expect(page.getByRole('heading', { name: 'Datos procesados' })).toHaveCount(0);
  });

  test('a non-CSV file is rejected client-side and nothing is uploaded', async ({ page }) => {
    const name = uniqueName('notes', 'txt');
    let uploadRequests = 0;
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/uploads')) uploadRequests += 1;
    });

    await selectFile(page, name, Buffer.from('not,a,csv\n'), 'text/plain');

    await expect(page.getByRole('alert').filter({ hasText: 'El archivo debe' })).toHaveText('El archivo debe tener extensión .csv');
    await expect(page.getByRole('button', { name: 'Subir' })).toBeDisabled();
    expect(uploadRequests).toBe(0);

    await page.goto('/uploads');
    await expect(page.getByRole('heading', { name: 'Uploads' })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: name })).toHaveCount(0);
  });
});
