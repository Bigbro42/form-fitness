import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, logLegacyWorkout, openNewApp, readLegacy, trackErrors } from './helpers';

test('new user: empty app, no calendar entries, no errors', async ({ page }) => {
  const errors = trackErrors(page);
  await openNewApp(page);
  await expect(page.getByText('Noch keine abgeschlossenen Trainings')).toBeVisible();
  await expect(page.locator('.stat').first()).toContainText('0');
  await page.getByRole('link', { name: 'Daten' }).click();
  await expect(page.locator('.kv').first()).toContainText('Kalendertermine0');
  await page.getByRole('link', { name: 'Verlauf' }).click();
  await expect(page.getByText('Noch keine Trainings')).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  expect(errors).toEqual([]);
});

test('takes over a workout logged in the real legacy app without touching it', async ({ page }) => {
  const errors = trackErrors(page);
  await logLegacyWorkout(page);
  const before = await readLegacy(page);
  expect(JSON.parse(before['form-coach-v5']!).records).toBeTruthy();

  await openNewApp(page);
  await expect(page.getByText('Deine Daten sind da')).toBeVisible();
  await expect(page.locator('.stat').nth(0)).toContainText('1');
  await expect(page.locator('.stat').nth(1)).toContainText('3'); // 12, 10 and 30 seconds

  await page.locator('.row').first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Spontanes Training');
  const squat = page.locator('article', { hasText: 'Kniebeugen' });
  await expect(squat.locator('tbody tr').nth(0)).toContainText('12');
  await expect(squat.locator('tbody tr').nth(0)).toContainText('10 kg');
  await expect(squat.locator('tbody tr').nth(1)).toContainText('10');
  const plank = page.locator('article', { hasText: 'Plank' });
  await expect(plank.locator('th').nth(1)).toHaveText('Sekunden');
  await expect(plank.locator('tbody tr').nth(0)).toContainText('30');
  await expect(page.getByText('Erstes Training')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // Nothing of the legacy data was changed.
  expect(await readLegacy(page)).toEqual(before);

  // Survives a restart; the import is not repeated.
  await openNewApp(page);
  await expect(page.getByText('Deine Daten sind da')).toHaveCount(0);
  await expect(page.locator('.stat').nth(0)).toContainText('1');

  // The legacy app still works with its data.
  await page.goto('./');
  await page.click('[data-view=stats]');
  await expect(page.locator('.v20-stat-grid')).toContainText('1');
  expect(errors).toEqual([]);
});

test('later legacy entries are picked up on the next start', async ({ page }) => {
  await logLegacyWorkout(page);
  await openNewApp(page);
  await expect(page.locator('.stat').nth(0)).toContainText('1');

  // Another completed workout in the legacy app, on the previous day.
  await page.goto('./');
  await page.click('[data-view=training]');
  await page.click('[data-prev]');
  await page.click('[data-v22-quick-start]');
  await page.click('[data-add]');
  await page.click('[data-pick=deadbug]');
  await page.click('[data-open-detail="0"]');
  await page.fill('[data-set="0:0"]', '8');
  await page.click('[data-detail-back]');
  page.once('dialog', (d) => d.accept());
  await page.click('[data-complete]');

  await openNewApp(page);
  await expect(page.getByText('Neue Einträge übernommen')).toBeVisible();
  await expect(page.locator('.stat').nth(0)).toContainText('2');
});

test('starts even if the browser never answers the storage persistence request', async ({ page }) => {
  await page.addInitScript(() => {
    const never = () => new Promise<boolean>(() => undefined);
    Object.defineProperty(navigator.storage, 'persist', { value: never });
    Object.defineProperty(navigator.storage, 'persisted', { value: never });
  });
  await logLegacyWorkout(page);
  await openNewApp(page);
  await expect(page.locator('.stat').nth(0)).toContainText('1');
});
