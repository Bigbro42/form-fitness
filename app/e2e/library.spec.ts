import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, openNewApp, trackErrors } from './helpers';

test('library: search, body map, filters and exercise details', async ({ page }) => {
  const errors = trackErrors(page);
  await openNewApp(page, '#/uebungen');
  await expect(page.getByText('123 Übungen')).toBeVisible(); // 124 minus one hidden duplicate
  await page.getByLabel('Übungen durchsuchen').fill('hip thrust');
  await expect(page.locator('.lib-row').first()).toContainText('Hip Thrust');
  await page.getByLabel('Übungen durchsuchen').fill('');

  await page.getByRole('button', { name: /Körperkarte/ }).click();
  await page.getByRole('button', { name: 'Hintere Oberschenkel' }).locator('path').first().click();
  await expect(page.getByRole('button', { name: 'Hintere Oberschenkel' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/Übungen für Hintere Oberschenkel/)).toBeVisible();
  const first = page.locator('.lib-row').first();
  await expect(first).toBeVisible();

  await page.getByRole('button', { name: 'Zurücksetzen' }).click();
  await page.getByRole('button', { name: /^Filter/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Widerstandsband' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Übungen anzeigen/ }).click();
  await expect(page.getByRole('button', { name: 'Filter (1)' })).toBeVisible();
  for (const row of await page.locator('.lib-row').all()) await expect(row).toContainText('Widerstandsband');
  await expectNoHorizontalOverflow(page);

  // Details with a verified photo.
  await page.getByRole('button', { name: 'Zurücksetzen' }).click();
  await page.getByLabel('Übungen durchsuchen').fill('rumänisches kreuzheben langhantel');
  await page.locator('.lib-row').first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Rumänisches Kreuzheben Langhantel');
  await expect(page.getByRole('img', { name: /Startposition/ })).toBeVisible();
  await expect(page.getByText('Beanspruchte Muskeln')).toBeVisible();
  await expect(page.locator('.steps li')).toHaveCount(4);
  await expect(page.getByText('Häufige Fehler')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Alternativen' })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // Without photo: labelled muscle overview, never another exercise's photo.
  await page.goto('next/#/uebungen/bird');
  await expect(page.getByText('Für diese Übung gibt es kein geprüftes Foto')).toBeVisible();
  await expect(page.locator('main img')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('every photo referenced by the library loads', async ({ page, request }) => {
  await openNewApp(page, '#/uebungen');
  const srcs = await page.locator('.lib-row img').evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).getAttribute('src')!));
  expect(srcs.length).toBe(59);
  for (const src of srcs) {
    const res = await request.get(`next/${src}`);
    expect(res.status(), src).toBe(200);
    expect(res.headers()['content-type']).toContain('image/jpeg');
  }
});

test('the recommendation follows the goal and starting from the library adds the exercise', async ({ page }) => {
  await openNewApp(page, '#/uebungen/squat');
  await page.locator('#info-goal').selectOption('strength');
  await expect(page.getByLabel('Richtwert').or(page.locator('section', { hasText: 'Richtwert' })).locator('.rec-main')).toContainText('3–6');
  await page.locator('#info-goal').selectOption('muscular');
  await expect(page.locator('section', { hasText: 'Richtwert' }).locator('.rec-main')).toContainText('15–25');
  await page.getByRole('button', { name: 'Mit dieser Übung trainieren' }).click();
  await expect(page.getByRole('heading', { name: 'Kniebeugen' })).toBeVisible();
  await expect(page.getByLabel('Wiederholungen Satz 1')).toBeVisible();
});

test('custom exercises can be created, trained, found in history and deleted safely', async ({ page }) => {
  await openNewApp(page, '#/uebungen/neu');
  await page.getByLabel('Name').fill('Kettlebell Swing');
  await page.getByRole('button', { name: 'Kurzhanteln' }).click();
  await page.getByRole('button', { name: 'Gesäß' }).locator('path').first().click();
  await page.getByRole('button', { name: 'Hintere Oberschenkel' }).locator('path').first().click();
  await page.getByRole('button', { name: 'Hintere Oberschenkel' }).locator('path').first().click(); // second tap: supporting
  await expect(page.getByRole('button', { name: 'Hintere Oberschenkel · unterstützend' })).toBeVisible();
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kettlebell Swing');
  await expect(page.getByText('Eigene Übung', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Mit dieser Übung trainieren' }).click();
  await page.getByLabel('Wiederholungen Satz 1').fill('15');
  await page.getByRole('button', { name: 'Satz 1 abhaken' }).click();
  await page.getByRole('link', { name: 'Übersicht' }).click();
  await page.getByRole('button', { name: 'Training abschließen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Abschließen' }).click();

  await page.goto('next/#/uebungen');
  await page.getByLabel('Übungen durchsuchen').fill('kettlebell');
  await page.locator('.lib-row').first().click();
  await expect(page.locator('.history-list')).toContainText('15 Wdh.');
  await page.getByRole('link', { name: 'Eigene Übung bearbeiten' }).click();
  await page.getByRole('button', { name: 'Übung löschen' }).click();
  await expect(page.getByRole('dialog')).toContainText('1 Training');
  await page.getByRole('dialog').getByRole('button', { name: 'Löschen' }).click();
  await page.getByRole('link', { name: 'Verlauf' }).click();
  await page.locator('.row').first().click();
  await expect(page.locator('article', { hasText: 'Kettlebell Swing' }).locator('tbody tr').first()).toContainText('15');
});
