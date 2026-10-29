import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, logLegacyWorkout, openNewApp, trackErrors } from './helpers';

async function downloadFrom(page: Page, click: () => Promise<void>): Promise<{ name: string; text: string }> {
  const [download] = await Promise.all([page.waitForEvent('download'), click()]);
  const file = await download.path();
  return { name: download.suggestedFilename(), text: fs.readFileSync(file, 'utf8') };
}

async function importFile(page: Page, name: string, text: string, mode: 'Zusammenführen' | 'Ersetzen') {
  await page.locator('input[type=file]').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(text) });
  const dialog = page.getByRole('dialog', { name: 'Backup importieren' });
  await expect(dialog).toBeVisible();
  if (mode === 'Ersetzen') await dialog.getByText('Ersetzen', { exact: true }).click();
  await dialog.getByRole('button', { name: mode === 'Ersetzen' ? 'Daten ersetzen' : 'Zusammenführen' }).click();
  await expect(page.getByText('Import abgeschlossen')).toBeVisible();
}

test('backup of the new app restores everything on another device', async ({ page, browser }) => {
  await logLegacyWorkout(page);
  await openNewApp(page, '#/daten');
  const json = await downloadFrom(page, () => page.getByRole('button', { name: 'Backup herunterladen (JSON)' }).click());
  expect(json.name).toMatch(/^FORM_Backup_\d{4}-\d{2}-\d{2}\.json$/);
  const backup = JSON.parse(json.text);
  expect(backup.format).toBe('form-backup');
  expect(backup.data.sessions).toHaveLength(1);
  expect(backup.legacyRaw['form-coach-v5']).toBeTruthy();

  const csv = await downloadFrom(page, () => page.getByRole('button', { name: 'Trainings als Tabelle (CSV)' }).click());
  expect(csv.text).toContain('Kniebeugen;squat;standard;1;12;;;10;Ja');

  // "Another device": a fresh browser profile without any data.
  const other = await (await browser.newContext({ ...test.info().project.use })).newPage();
  const errors = trackErrors(other);
  await openNewApp(other, '#/daten');
  await importFile(other, json.name, json.text, 'Zusammenführen');
  await other.getByRole('link', { name: 'Verlauf' }).click();
  await expect(other.locator('.row')).toHaveCount(1);
  await other.locator('.row').first().click();
  await expect(other.locator('article', { hasText: 'Kniebeugen' }).locator('tbody tr').first()).toContainText('12');
  expect(errors).toEqual([]);
});

test('a JSON backup exported by the legacy app can be imported', async ({ page, browser }) => {
  await logLegacyWorkout(page);
  await page.click('[data-view=stats]');
  const legacyBackup = await downloadFrom(page, () => page.click('[data-v20-export]'));
  expect(JSON.parse(legacyBackup.text).version).toBe(20);

  const other = await (await browser.newContext({ ...test.info().project.use })).newPage();
  await openNewApp(other, '#/daten');
  await other.locator('input[type=file]').setInputFiles({ name: legacyBackup.name, mimeType: 'application/json', buffer: Buffer.from(legacyBackup.text) });
  await expect(other.getByRole('dialog')).toContainText('(bisherige App)');
  await expect(other.getByRole('dialog')).toContainText('1 Trainings (1 abgeschlossen)');
  await other.getByRole('dialog').getByRole('button', { name: 'Zusammenführen' }).click();
  await expect(other.getByText('Import abgeschlossen: 1 neu')).toBeVisible();
  // Importing the same file again adds nothing.
  await importFile(other, legacyBackup.name, legacyBackup.text, 'Zusammenführen');
  await expect(other.getByText('Import abgeschlossen: 0 neu')).toBeVisible();
  await expect(other.getByText('Vor dem Import von')).toHaveCount(2);
});

test('replacing data asks for confirmation and keeps a snapshot', async ({ page }) => {
  await logLegacyWorkout(page);
  await openNewApp(page, '#/daten');
  const empty = JSON.stringify({ format: 'form-backup', schemaVersion: 1, app: 'FORM.', exportedAt: new Date().toISOString(), data: { sessions: [], plans: [], customExercises: [], settings: {} }, legacyRaw: null });
  await page.locator('input[type=file]').setInputFiles({ name: 'leer.json', mimeType: 'application/json', buffer: Buffer.from(empty) });
  await page.getByRole('dialog').getByRole('button', { name: 'Abbrechen' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.kv').first()).toContainText('Trainings1');

  await importFile(page, 'leer.json', empty, 'Ersetzen');
  await expect(page.locator('.kv').first()).toContainText('Trainings0');
  const snapshot = await downloadFrom(page, () => page.getByRole('button', { name: /Vor dem Import von „leer.json“/ }).click());
  expect(JSON.parse(snapshot.text).data.sessions).toHaveLength(1);
});

test('rejects files that are not backups with a clear message', async ({ page }) => {
  await openNewApp(page, '#/daten');
  await page.locator('input[type=file]').setInputFiles({ name: 'foto.json', mimeType: 'application/json', buffer: Buffer.from('nicht json') });
  await expect(page.getByRole('alert')).toContainText('kein gültiges JSON');
});

test('works offline after the first visit', async ({ page, context }) => {
  await openNewApp(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
  await page.getByRole('link', { name: 'Daten' }).click();
  await expect(page.getByRole('heading', { name: 'Sichern & Wiederherstellen' })).toBeVisible();
  // Exercise photos are available offline too.
  const ok = await page.evaluate(async () => (await fetch('media/exercises/Plank/0.jpg')).ok);
  expect(ok).toBe(true);
});

test('no horizontal overflow and no errors on any screen', async ({ page }) => {
  const errors = trackErrors(page);
  await logLegacyWorkout(page);
  for (const hash of ['#/', '#/training', '#/verlauf', '#/daten']) {
    await openNewApp(page, hash);
    await expectNoHorizontalOverflow(page);
  }
  await openNewApp(page, '#/verlauf');
  await page.locator('.row').first().click();
  await expectNoHorizontalOverflow(page);
  await openNewApp(page, '#/verlauf/gibt-es-nicht');
  await expect(page.getByText('Training nicht gefunden')).toBeVisible();
  expect(errors).toEqual([]);
});
