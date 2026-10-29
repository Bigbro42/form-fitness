import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, openNewApp, trackErrors } from './helpers';

async function addExercise(page: Page, search: string) {
  await page.getByRole('button', { name: 'Übung hinzufügen' }).click();
  await page.getByLabel('Übung suchen').fill(search);
  await page.locator('.pick-row').first().click();
}

async function logSet(page: Page, n: number, value: string, kg?: string) {
  if (kg !== undefined) await page.getByLabel(`Gewicht Satz ${n} in kg`).fill(kg);
  await page.getByLabel(new RegExp(`^(Wiederholungen|Sekunden|Minuten) Satz ${n}$`)).fill(value);
  await page.getByRole('button', { name: `Satz ${n} abhaken` }).click();
}

async function finish(page: Page, rpe?: number) {
  await page.getByRole('link', { name: 'Übersicht' }).click();
  await page.getByRole('button', { name: 'Training abschließen' }).click();
  if (rpe) await page.getByRole('radio', { name: String(rpe), exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Abschließen' }).click();
  await expect(page.getByRole('heading', { name: 'Training gespeichert' })).toBeVisible();
}

test('complete flow: start, log sets, rest, finish, summary, history', async ({ page }) => {
  const errors = trackErrors(page);
  await openNewApp(page);
  await page.getByRole('button', { name: 'Training starten' }).click();
  await expect(page.getByText('Noch keine Übungen')).toBeVisible();

  await addExercise(page, 'kurzhantel bank');
  await expect(page.getByRole('heading', { name: 'Kurzhantel-Bankdrücken' })).toBeVisible();
  await expect(page.getByLabel('Richtwert')).toContainText('Wiederholungen');
  await expect(page.getByRole('img', { name: /Startposition/ })).toBeVisible();
  await expect(page.getByText('Erstes Mal mit dieser Übung')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // Ticking an empty set is refused with a hint instead of logging nothing.
  await page.getByRole('button', { name: 'Satz 1 abhaken' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Trage zuerst' })).toBeVisible();

  await logSet(page, 1, '10', '12,5');
  await expect(page.getByRole('timer', { name: 'Pausentimer' })).toBeVisible();
  await page.getByRole('button', { name: '15 Sekunden mehr' }).click();
  await page.getByRole('button', { name: 'Stopp' }).click();
  await expect(page.getByRole('timer')).toHaveCount(0);
  await logSet(page, 2, '8', '12,5');

  await page.getByRole('link', { name: 'Übersicht' }).click();
  await addExercise(page, 'plank');
  await expect(page.getByText('Muskelübersicht')).toHaveCount(0); // plank has verified photos
  await logSet(page, 1, '45');
  await finish(page, 7);

  await expect(page.locator('.stat').nth(1)).toContainText('2'); // exercises
  await expect(page.locator('.stat').nth(2)).toContainText('3'); // sets
  await expect(page.getByText('225 kg')).toBeVisible(); // 12.5 × 10 + 12.5 × 8
  await page.getByRole('link', { name: 'Details ansehen' }).click();
  await expect(page.locator('article', { hasText: 'Kurzhantel-Bankdrücken' }).locator('tbody tr').first()).toContainText('12,5 kg');
  await expect(page.getByText('7 / 10')).toBeVisible();
  expect(errors).toEqual([]);
});

test('autosave: a running workout survives a restart', async ({ page }) => {
  await openNewApp(page);
  await page.getByRole('button', { name: 'Training starten' }).click();
  await addExercise(page, 'kniebeugen');
  await page.getByLabel('Wiederholungen Satz 1').fill('15');
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.getByLabel('Wiederholungen Satz 1')).toHaveValue('15');
  await openNewApp(page);
  await expect(page.getByText('Training läuft')).toBeVisible();
  await page.getByRole('link', { name: /Fortsetzen/ }).click();
  await page.getByRole('link', { name: /Kniebeugen/ }).click();
  await expect(page.getByLabel('Wiederholungen Satz 1')).toHaveValue('15');
});

test('second workout shows last performance, copies values and detects a record', async ({ page }) => {
  await openNewApp(page);
  await page.getByRole('button', { name: 'Training starten' }).click();
  await addExercise(page, 'kurzhantel bank');
  await logSet(page, 1, '10', '12');
  await logSet(page, 2, '9', '12');
  await finish(page);
  await page.getByRole('link', { name: 'Fertig' }).click();

  await page.getByRole('button', { name: 'Training starten' }).click();
  // The exercise is offered under "recently used".
  await page.getByRole('button', { name: 'Übung hinzufügen' }).click();
  await expect(page.getByRole('dialog').getByText('Zuletzt verwendet')).toBeVisible();
  await page.getByRole('dialog').locator('.pick-row').first().click();
  await expect(page.getByLabel('Letztes Training und Bestleistung')).toContainText('12 kg × 10 · 12 kg × 9');
  await expect(page.getByLabel('Wiederholungen Satz 1')).toHaveAttribute('placeholder', '10');
  await page.getByRole('button', { name: 'Vorherige Werte' }).click();
  await expect(page.getByLabel('Wiederholungen Satz 2')).toHaveValue('9');
  await page.getByLabel('Gewicht Satz 1 in kg').fill('14');
  await page.getByRole('button', { name: 'Satz 1 abhaken' }).click();
  await finish(page);
  await expect(page.getByText('Neues Höchstgewicht: 14 kg × 10')).toBeVisible();
});

test('completed workouts are protected; correcting keeps the date', async ({ page }) => {
  await openNewApp(page);
  await page.getByRole('button', { name: 'Training starten' }).click();
  await addExercise(page, 'kniebeugen');
  await logSet(page, 1, '12');
  await finish(page);
  await page.getByRole('link', { name: 'Details ansehen' }).click();
  await page.getByRole('button', { name: 'Korrigieren' }).click();
  await page.getByRole('button', { name: 'Zum Korrigieren öffnen' }).click();
  await expect(page.getByText(/Korrektur ·/)).toBeVisible();
  await page.getByRole('link', { name: /Kniebeugen/ }).click();
  await page.getByLabel('Wiederholungen Satz 1').fill('14');
  await page.getByRole('link', { name: 'Training', exact: true }).click();
  // Discarding restores the original values.
  await page.getByRole('button', { name: 'Korrektur verwerfen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Verwerfen' }).click();
  await page.getByRole('link', { name: 'Verlauf' }).click();
  await page.locator('.row').first().click();
  await expect(page.locator('tbody tr').first()).toContainText('12');
  await expect(page.getByRole('button', { name: 'Korrigieren' })).toBeEnabled();
});

test('leaving without completing keeps sets as "not completed", empty workouts disappear', async ({ page }) => {
  await openNewApp(page);
  await page.getByRole('button', { name: 'Training starten' }).click();
  await page.getByRole('button', { name: 'Training beenden ohne Abschluss' }).click();
  await expect(page.getByRole('dialog')).toContainText('leere Training wird verworfen');
  await page.getByRole('dialog').getByRole('button', { name: 'Beenden' }).click();
  await expect(page.locator('.stat').nth(2)).toContainText('0');

  await page.getByRole('button', { name: 'Training starten' }).click();
  await addExercise(page, 'kniebeugen');
  await page.getByLabel('Wiederholungen Satz 1').fill('8');
  await page.getByRole('link', { name: 'Übersicht' }).click();
  await page.getByRole('button', { name: 'Training beenden ohne Abschluss' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Beenden' }).click();
  await expect(page.locator('.stat').nth(0)).toContainText('0'); // not counted as training
  await expect(page.locator('.stat').nth(2)).toContainText('1');
  await page.getByRole('link', { name: 'Verlauf' }).click();
  await page.getByRole('button', { name: 'Offen' }).click();
  await page.locator('.row').first().click();
  await page.getByRole('button', { name: 'Fortsetzen' }).click();
  await expect(page.getByText(/Läuft ·/)).toBeVisible();
});

test('exercises can be reordered, replaced and removed', async ({ page }) => {
  await openNewApp(page);
  await page.getByRole('button', { name: 'Training starten' }).click();
  await addExercise(page, 'kniebeugen');
  await page.getByRole('link', { name: 'Übersicht' }).click();
  await addExercise(page, 'plank');
  await page.getByRole('button', { name: 'Nach oben verschieben' }).click();
  await page.getByRole('link', { name: 'Übersicht' }).click();
  await expect(page.locator('.exercise-list .row-main b')).toHaveText(['Plank', 'Kniebeugen']);
  await page.locator('.exercise-list .row').nth(1).click();
  await page.getByRole('button', { name: 'Ersetzen' }).click();
  await page.getByLabel('Übung suchen').fill('glute bridge');
  await page.getByRole('dialog').locator('.pick-row').first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Glute Bridge');
  await page.getByRole('button', { name: 'Entfernen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Entfernen' }).click();
  await expect(page.locator('.exercise-list .row-main b')).toHaveText(['Plank']);
});

test('exercise without verified photo shows a labelled muscle overview', async ({ page }) => {
  await openNewApp(page);
  await page.getByRole('button', { name: 'Training starten' }).click();
  await addExercise(page, 'bird dog');
  await expect(page.getByLabel('Muskelübersicht')).toContainText('keine Bewegungsdemonstration');
  await expect(page.locator('main img')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  // Nothing inside the card may stick out of it either.
  const overflow = await page.locator('.muscle-card').evaluate((card) => {
    const r = card.getBoundingClientRect();
    return [...card.querySelectorAll('*')].filter((el) => el.getBoundingClientRect().right > r.right + 1).length;
  });
  expect(overflow).toBe(0);
});

test('small screens: weights are fully visible and nothing hides behind the rest timer', async ({ page }) => {
  await openNewApp(page);
  await page.getByRole('button', { name: 'Training starten' }).click();
  await addExercise(page, 'kurzhantel bank');
  await logSet(page, 1, '10', '102,5');
  const kg = page.getByLabel('Gewicht Satz 1 in kg');
  await expect(kg).toHaveValue('102,5');
  expect(await kg.evaluate((el: HTMLInputElement) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.getByRole('link', { name: 'Übersicht' }).click();
  await expect(page.getByRole('timer')).toBeVisible();
  const finish = page.getByRole('button', { name: 'Training abschließen' });
  await finish.scrollIntoViewIfNeeded();
  const [b, t] = [await finish.boundingBox(), await page.getByRole('timer').boundingBox()];
  expect(b!.y + b!.height <= t!.y || b!.y >= t!.y + t!.height).toBe(true);
  await expectNoHorizontalOverflow(page);
});
