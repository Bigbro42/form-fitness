import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, openNewApp, trackErrors } from './helpers';

const PHOTO = path.join(import.meta.dirname, 'fixtures', 'iphone-photo.jpg');

async function addPhoto(page: Page, file = PHOTO) {
  await page.getByLabel('Foto hinzufügen: Bird Dog').setInputFiles(file);
}

test('own photo: added on the exercise page, shrunk, without metadata, shown everywhere and kept', async ({ page }) => {
  const errors = trackErrors(page);
  await openNewApp(page, '#/uebungen/bird');
  await expect(page.getByText('Für diese Übung gibt es kein geprüftes Foto.')).toBeVisible();
  await addPhoto(page);
  const img = page.getByRole('img', { name: 'Eigenes Foto: Bird Dog' });
  await expect(img).toBeVisible();
  // 4032 × 3024 from the camera → 1280 × 960 stored.
  expect(await img.evaluate((el: HTMLImageElement) => [el.naturalWidth, el.naturalHeight])).toEqual([1280, 960]);
  await expectNoHorizontalOverflow(page);

  // Survives a restart.
  await openNewApp(page, '#/uebungen/bird');
  await expect(img).toBeVisible();

  // Library thumbnail and workout screen use it.
  await page.goto('next/#/uebungen');
  await page.getByLabel('Übungen durchsuchen').fill('bird dog');
  await expect(page.locator('.row', { hasText: 'Bird Dog' }).locator('img.thumb')).toHaveAttribute('src', /^blob:/);
  await page.locator('.row', { hasText: 'Bird Dog' }).click();
  await page.getByRole('button', { name: 'Mit dieser Übung trainieren' }).click();
  await expect(page.getByText('Dein Foto')).toBeVisible();
  await expect(page.getByText('Muskelübersicht · keine Bewegungsdemonstration')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('own photos are part of the backup and can be restored on another device', async ({ page, browser }) => {
  await openNewApp(page, '#/uebungen/bird');
  await addPhoto(page);
  await expect(page.getByRole('img', { name: 'Eigenes Foto: Bird Dog' })).toBeVisible();
  await page.goto('next/#/daten');
  await expect(page.locator('.kv').first()).toContainText('Eigene Fotos1');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Backup herunterladen (JSON)' }).click()]);
  const text = fs.readFileSync(await download.path(), 'utf8');
  const backup = JSON.parse(text);
  expect(backup.photos).toHaveLength(1);
  const stored = Buffer.from(backup.photos[0].data, 'base64');
  expect(stored.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8])); // JPEG
  expect(stored.includes('TestCam')).toBe(false); // camera metadata (incl. location) removed
  expect(stored.length).toBeLessThan(fs.statSync(PHOTO).size);

  const other = await (await browser.newContext({ ...test.info().project.use })).newPage();
  await openNewApp(other, '#/daten');
  await other.locator('input[type=file]').setInputFiles({ name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(text) });
  await expect(other.getByRole('dialog')).toContainText('sowie 1 eigene Fotos');
  await other.getByRole('dialog').getByRole('button', { name: 'Zusammenführen' }).click();
  await expect(other.getByText('1 Foto übernommen')).toBeVisible();
  await other.goto('next/#/uebungen/bird');
  await expect(other.getByRole('img', { name: 'Eigenes Foto: Bird Dog' })).toBeVisible();
});

test('own photo can be replaced and removed; non-images are rejected', async ({ page }) => {
  await openNewApp(page, '#/uebungen/bird');
  await page.getByLabel('Foto hinzufügen: Bird Dog').setInputFiles({ name: 'notiz.txt', mimeType: 'text/plain', buffer: Buffer.from('kein Bild') });
  await expect(page.getByRole('alert')).toContainText('Bitte wähle ein Bild aus.');
  await addPhoto(page);
  const img = page.getByRole('img', { name: 'Eigenes Foto: Bird Dog' });
  const first = await img.getAttribute('src');
  await page.getByLabel('Ersetzen: Bird Dog').setInputFiles(PHOTO);
  await expect(img).not.toHaveAttribute('src', first!);
  await page.getByRole('button', { name: 'Entfernen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Foto entfernen' }).click();
  await expect(img).toHaveCount(0);
  await openNewApp(page, '#/uebungen/bird');
  await expect(page.getByRole('img', { name: 'Eigenes Foto: Bird Dog' })).toHaveCount(0);
  await expect(page.getByLabel('Foto hinzufügen: Bird Dog')).toBeAttached();
});
