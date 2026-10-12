import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

/** Time the worker has to turn an upload into a terminal state (async via SQS). */
export const PROCESSING_TIMEOUT_MS = 45_000;

export function sampleFile(relativePath: string): Buffer {
  return readFileSync(path.join(REPO_ROOT, relativePath));
}

/** A name unique per test run so assertions never depend on rows already in the DB. */
export function uniqueName(base: string, extension = 'csv'): string {
  return `${base}-${randomUUID().slice(0, 8)}.${extension}`;
}

/** Selects a file through the real file input of the upload page. */
export async function selectFile(page: Page, name: string, buffer: Buffer, mimeType = 'text/csv') {
  await page.goto('/uploads/new');
  await page.getByLabel(/Arrastra y suelta un archivo CSV/).setInputFiles({ name, mimeType, buffer });
}

/** Uploads a CSV and waits for the redirect to its detail page. */
export async function uploadCsv(page: Page, name: string, buffer: Buffer) {
  await selectFile(page, name, buffer);
  await expect(page.getByRole('group', { name: 'Archivo seleccionado' })).toContainText(name);
  await page.getByRole('button', { name: 'Subir' }).click();
  await page.getByRole('button', { name: 'Sí, procesar' }).click();
  await expect(page).toHaveURL(/\/uploads\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { name: 'Detalle del upload' })).toBeVisible();
  await expect(page.getByRole('definition').filter({ hasText: name })).toBeVisible();
}

/** Waits (polling the UI, which refreshes itself every 3 s) for a terminal status badge. */
export async function expectStatus(page: Page, label: 'Completado' | 'Fallido') {
  await expect(page.getByRole('status').filter({ hasText: label })).toBeVisible({
    timeout: PROCESSING_TIMEOUT_MS,
  });
}
