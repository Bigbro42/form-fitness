import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, openNewApp, trackErrors } from './helpers';

async function workoutOn(page: Page, date: string, kg: string, reps: string) {
  await page.clock.setFixedTime(new Date(`${date}T17:00:00+01:00`));
  await openNewApp(page, '#/training');
  await page.getByRole('button', { name: 'Training starten' }).first().click();
  await page.getByRole('button', { name: 'Übung hinzufügen' }).click();
  await page.getByLabel('Übung suchen').fill('kurzhantel bank');
  await page.locator('.pick-row').first().click();
  await page.getByLabel('Gewicht Satz 1 in kg').fill(kg);
  await page.getByLabel('Wiederholungen Satz 1').fill(reps);
  await page.getByRole('link', { name: 'Übersicht' }).click();
  await page.getByRole('button', { name: 'Training abschließen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Abschließen' }).click();
  await expect(page.getByRole('heading', { name: 'Training gespeichert' })).toBeVisible();
}

test('progress shows only real data: weeks, trained muscles, records and exercise history', async ({ page }) => {
  const errors = trackErrors(page);
  await page.clock.setFixedTime(new Date('2026-10-29T10:00:00+01:00'));
  await openNewApp(page, '#/fortschritt');
  await expect(page.getByText('Noch keine abgeschlossenen Trainings')).toBeVisible();
  await expect(page.locator('.stat').first()).toContainText('0');

  await workoutOn(page, '2026-10-19', '10', '10');
  await workoutOn(page, '2026-10-27', '12,5', '8');
  await page.clock.setFixedTime(new Date('2026-10-29T10:00:00+01:00'));
  await openNewApp(page, '#/fortschritt');
  await expect(page.locator('.stat').first()).toContainText('2');
  await expect(page.getByText('Diese Woche: 1 Training')).toBeVisible();
  await page.getByText('Als Tabelle').first().click();
  await expect(page.locator('.chart-table').first()).toContainText('Woche ab 19. Okt.: 1 Training, 1 Sätze');

  // Body map: chest was trained as main muscle, tap shows the numbers.
  const chest = page.getByRole('button', { name: 'Brust' });
  await expect(chest).toHaveClass(/bm-l1/);
  await chest.locator('path').first().click();
  await expect(page.getByText('Brust: 2 Sätze als Hauptmuskel (Kurzhantel-Bankdrücken)')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hintere Oberschenkel' })).not.toHaveClass(/bm-l/);
  await page.getByRole('link', { name: 'Übungen für Brust' }).click();
  await expect(page.getByText(/Übungen für Brust/)).toBeVisible();

  await page.goto('next/#/fortschritt');
  await expect(page.locator('section', { hasText: 'Persönliche Rekorde' }).locator('.row')).toContainText('Höchstgewicht 12,5 kg × 8');
  await page.locator('section', { hasText: 'Deine Übungen' }).locator('.row').first().click();
  await expect(page.getByText('Schwerster Satz (kg) pro Training')).toBeVisible();
  await expect(page.locator('.chart-dot')).toHaveCount(2);
  await expect(page.locator('.chart-readout').first()).toContainText('12,5 kg × 8');
  await expectNoHorizontalOverflow(page);
  expect(errors).toEqual([]);
});

test('generator builds an editable workout that is tracked in the shared history', async ({ page }) => {
  // Fixed random sequence: the generated workout is the same on every run.
  await page.addInitScript(() => {
    let a = 42;
    Math.random = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  });
  const errors = trackErrors(page);
  await openNewApp(page, '#/training');
  await page.getByRole('link', { name: /Workout-Generator/ }).click();
  await page.getByRole('button', { name: 'Bauch & Core' }).click();
  await page.locator('select').selectOption('core');
  await page.getByRole('button', { name: 'Eine Übung weniger' }).click();
  await page.getByRole('button', { name: 'Workout erstellen' }).click();
  const items = page.locator('.gen-item');
  const n = await items.count();
  expect(n).toBeGreaterThanOrEqual(2);
  const first = await items.first().locator('b').textContent();
  await page.getByRole('button', { name: `${first} ersetzen`, exact: true }).click();
  await expect(items.first().locator('b')).not.toHaveText(first!);
  await page.getByRole('button', { name: /entfernen$/ }).last().click();
  await expect(items).toHaveCount(n - 1);
  await page.getByRole('button', { name: 'Übung hinzufügen' }).click();
  await page.getByLabel('Übung suchen').fill('plank');
  await page.getByRole('dialog').locator('.pick-row').first().click();
  await expect(items.last()).toContainText('Von dir hinzugefügt');
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: 'Training starten' }).click();
  await expect(page.getByRole('heading', { name: 'Zufallstraining · Bauch & Core' })).toBeVisible();
  await expect(page.locator('.exercise-list .row')).toHaveCount(n);
  await page.locator('.exercise-list .row').last().click();
  await page.getByLabel('Sekunden Satz 1').fill('40');
  await page.getByRole('link', { name: 'Übersicht' }).click();
  await page.getByRole('button', { name: 'Training abschließen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Abschließen' }).click();
  await page.getByRole('link', { name: 'Details ansehen' }).click();
  await expect(page.getByText('Zufallstraining', { exact: true })).toBeVisible();

  // Same history: the plank logged here shows up in the exercise's history.
  await page.goto('next/#/uebungen/plank');
  await expect(page.locator('.history-list')).toContainText('40 Sek.');
  expect(errors).toEqual([]);
});

test('generator only uses the selected equipment', async ({ page }) => {
  await openNewApp(page, '#/generator');
  await page.getByRole('button', { name: 'Ganzkörper' }).click();
  await page.getByRole('button', { name: 'Workout erstellen' }).click();
  for (const name of await page.locator('.gen-item b').allTextContents()) {
    expect(name).not.toMatch(/Kurzhantel|Langhantel|Maschine|Kabel|Band|Stange/);
  }
});

test('the library opens with the body map visible', async ({ page }) => {
  await openNewApp(page, '#/uebungen');
  await expect(page.getByRole('group', { name: 'Muskel auswählen: Vorderansicht' })).toBeVisible();
});
