import { expect, test, type Page } from '@playwright/test';
import { openHistory, expectNoHorizontalOverflow, openNewApp, trackErrors } from './helpers';

// Thursday, 29 October 2026, 10:00 in Vienna.
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-29T10:00:00+01:00'));
});

async function planWeekly(page: Page, title: string, opts: { repeat?: string; exercises?: string[]; until?: string } = {}) {
  await page.goto('next/#/planen?datum=2026-10-29');
  await page.getByLabel('Bezeichnung').fill(title);
  await page.getByRole('radio', { name: opts.repeat ?? 'Jede Woche' }).click();
  if (opts.until) await page.getByLabel(/Endet am/).fill(opts.until);
  for (const x of opts.exercises ?? []) {
    await page.getByRole('button', { name: 'Übung hinzufügen' }).click();
    await page.getByLabel('Übung suchen').fill(x);
    await page.getByRole('dialog').locator('.pick-row').first().click();
  }
  await page.getByRole('button', { name: 'Termin speichern' }).click();
  await expect(page.getByRole('heading', { name: 'Oktober 2026' })).toBeVisible();
}

const day = (page: Page, label: RegExp) => page.getByRole('gridcell', { name: label });

test('a new calendar is empty and offers to plan', async ({ page }) => {
  const errors = trackErrors(page);
  await openNewApp(page, '#/kalender');
  await expect(page.getByText('Dein Kalender ist leer')).toBeVisible();
  await expect(page.locator('.mark')).toHaveCount(3); // legend only
  await expectNoHorizontalOverflow(page);
  expect(errors).toEqual([]);
});

test('weekly series continues across the month boundary; planned never counts as training', async ({ page }) => {
  await openNewApp(page);
  await planWeekly(page, 'Beine & Core', { exercises: ['kniebeugen'] });
  await expect(day(page, /^Donnerstag, 29\. Oktober, 1 geplant/)).toBeVisible();
  await page.getByRole('button', { name: 'Nächster Monat' }).click();
  await expect(page.getByRole('heading', { name: 'November 2026' })).toBeVisible();
  for (const d of [5, 12, 19, 26]) await expect(day(page, new RegExp(`^Donnerstag, ${d}\\. November, 1 geplant`))).toBeVisible();
  await expect(day(page, /^Mittwoch, 11\. November$/)).toBeVisible();
  await page.getByRole('button', { name: 'Nächster Monat' }).click();
  await expect(day(page, /^Donnerstag, 3\. Dezember, 1 geplant/)).toBeVisible();

  await page.getByRole('link', { name: 'Start' }).click();
  await expect(page.getByText('Heute geplant')).toBeVisible();
  await expect(page.locator('.stat').first()).toContainText('0');
});

test('starting a planned workout links it; completing marks the occurrence as done', async ({ page }) => {
  await openNewApp(page);
  await planWeekly(page, 'Beine & Core', { exercises: ['kniebeugen', 'dead bug'] });
  await page.getByRole('link', { name: 'Start' }).click();
  await page.getByRole('button', { name: 'Geplantes Training starten' }).click();
  await expect(page.getByRole('heading', { name: 'Beine & Core' })).toBeVisible();
  await expect(page.locator('.exercise-list .row-main b')).toHaveText(['Kniebeugen', 'Dead Bug']);
  await page.locator('.exercise-list .row').first().click();
  await page.getByLabel('Wiederholungen Satz 1').fill('12');
  await page.getByRole('button', { name: 'Satz 1 abhaken' }).click();
  await page.getByRole('link', { name: 'Übersicht' }).click();
  await page.getByRole('button', { name: 'Training abschließen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Abschließen' }).click();
  await page.getByRole('link', { name: 'Kalender' }).click();
  await expect(day(page, /^Donnerstag, 29\. Oktober, 1 absolviert$/)).toBeVisible();
  await expect(page.locator('.occ-row')).toContainText('Absolviert');
  await page.getByRole('link', { name: 'Start' }).click();
  await expect(page.locator('.stat').first()).toContainText('1');
  // The next occurrence is now the first upcoming one.
  await expect(page.getByLabel('Als Nächstes').or(page.locator('section', { hasText: 'Als Nächstes' })).locator('.row').first()).toContainText('Beine & Core');
});

test('single occurrences can be skipped, restored, moved and changed', async ({ page }) => {
  await openNewApp(page);
  await planWeekly(page, 'Lauf');
  await page.goto('next/#/kalender/2026-11');
  // Skip 5 Nov.
  await day(page, /^Donnerstag, 5\. November/).click();
  await page.locator('.occ-row').click();
  await page.getByRole('button', { name: 'Auslassen' }).click();
  await expect(day(page, /^Donnerstag, 5\. November$/)).toBeVisible();
  await expect(page.locator('.occ-row')).toContainText('Ausgelassen');
  // Restore it.
  await page.locator('.occ-row').click();
  await page.getByRole('button', { name: 'Termin wiederherstellen' }).click();
  await expect(day(page, /^Donnerstag, 5\. November, 1 geplant/)).toBeVisible();
  // Move 26 Nov into December.
  await day(page, /^Donnerstag, 26\. November/).click();
  await page.locator('.occ-row').click();
  await page.getByRole('button', { name: 'Verschieben' }).click();
  await page.getByLabel(/Neues Datum/).fill('2026-12-01');
  await page.getByRole('dialog').getByRole('button', { name: 'Verschieben' }).click();
  await expect(day(page, /^Donnerstag, 26\. November$/)).toBeVisible();
  await expect(day(page, /^Dienstag, 1\. Dezember, 1 geplant/)).toBeVisible();
  // Change only 12 Nov.
  await day(page, /^Donnerstag, 12\. November/).click();
  await page.locator('.occ-row').click();
  await page.getByRole('link', { name: 'Nur diesen ändern' }).click();
  await expect(page.getByText('gilt nur für diesen einen Termin')).toBeVisible();
  await page.getByLabel('Bezeichnung').fill('Lauf locker');
  await page.getByRole('button', { name: 'Diesen Termin speichern' }).click();
  await page.goto('next/#/kalender/2026-11');
  await day(page, /^Donnerstag, 12\. November/).click();
  await expect(page.locator('.occ-row')).toContainText('Lauf locker');
  await expect(page.locator('.occ-row')).toContainText('Einzeln geändert');
  await day(page, /^Donnerstag, 19\. November/).click();
  await expect(page.locator('.occ-row')).toContainText('Lauf');
  await expect(page.locator('.occ-row')).not.toContainText('locker');
});

test('a series can be edited, ended from a date and deleted without touching history', async ({ page }) => {
  await openNewApp(page);
  await planWeekly(page, 'Kraft', { exercises: ['kniebeugen'] });
  // Complete today's occurrence first.
  await page.locator('.occ-row').click();
  await page.getByRole('button', { name: 'Training starten' }).click();
  await page.getByRole('button', { name: 'Training abschließen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Abschließen' }).click();

  await page.goto('next/#/kalender/2026-11');
  await day(page, /^Donnerstag, 5\. November/).click();
  await page.locator('.occ-row').click();
  await page.getByRole('link', { name: 'Serie bearbeiten' }).click();
  await page.getByLabel('Bezeichnung').fill('Kraft Ganzkörper');
  await page.getByRole('radio', { name: 'Alle 2 Wochen' }).click();
  await page.getByRole('button', { name: 'Änderungen speichern' }).click();
  await page.getByRole('button', { name: 'Nächster Monat' }).click();
  await expect(day(page, /^Donnerstag, 12\. November, 1 geplant/)).toBeVisible();
  await expect(day(page, /^Donnerstag, 5\. November$/)).toBeVisible();

  await day(page, /^Donnerstag, 26\. November/).click();
  await page.locator('.occ-row').click();
  await page.getByRole('button', { name: 'Ab hier beenden' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Ab hier beenden' }).click();
  await expect(day(page, /^Donnerstag, 26\. November$/)).toBeVisible();
  await expect(day(page, /^Donnerstag, 12\. November, 1 geplant/)).toBeVisible();

  await day(page, /^Donnerstag, 12\. November/).click();
  await page.locator('.occ-row').click();
  await page.getByRole('button', { name: 'Serie löschen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Serie löschen' }).click();
  await expect(day(page, /^Donnerstag, 12\. November$/)).toBeVisible();
  await openHistory(page);
  await expect(page.locator('.row')).toHaveCount(1);
  await expect(page.locator('.row')).toContainText('Kraft');
});

test('monthly series skips months without that day', async ({ page }) => {
  await openNewApp(page);
  await page.goto('next/#/planen?datum=2026-10-31');
  await page.getByLabel('Bezeichnung').fill('Monatstest');
  await page.getByRole('radio', { name: 'Jeden Monat' }).click();
  await expect(page.getByText('In Monaten ohne den 31. entfällt der Termin.')).toBeVisible();
  await page.getByRole('button', { name: 'Termin speichern' }).click();
  await expect(day(page, /^Samstag, 31\. Oktober, 1 geplant/)).toBeVisible();
  await page.getByRole('button', { name: 'Nächster Monat' }).click();
  await expect(page.locator('.day:not(.day-out) .mark')).toHaveCount(0);
  await page.getByRole('button', { name: 'Nächster Monat' }).click();
  await expect(day(page, /^Donnerstag, 31\. Dezember, 1 geplant/)).toBeVisible();
});

test('workouts can be saved as template, repeated and planned from the template', async ({ page }) => {
  await openNewApp(page);
  await page.getByRole('button', { name: 'Training starten' }).click();
  await page.getByRole('button', { name: 'Übung hinzufügen' }).click();
  await page.getByLabel('Übung suchen').fill('kniebeugen');
  await page.locator('.pick-row').first().click();
  await page.getByLabel('Wiederholungen Satz 1').fill('10');
  await page.getByRole('link', { name: 'Übersicht' }).click();
  await page.getByRole('button', { name: 'Training abschließen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Abschließen' }).click();
  await page.getByRole('link', { name: 'Details ansehen' }).click();
  await page.getByRole('button', { name: 'Als Vorlage speichern' }).click();
  await expect(page.getByRole('button', { name: 'Als Vorlage gespeichert' })).toBeDisabled();

  await page.getByRole('button', { name: 'Erneut trainieren' }).click();
  await expect(page.locator('.exercise-list .row-main b')).toHaveText(['Kniebeugen']);
  await page.getByRole('button', { name: 'Training beenden ohne Abschluss' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Beenden' }).click();

  await page.goto('next/#/planen?datum=2026-11-03');
  await page.getByLabel('Aus Vorlage übernehmen').selectOption({ label: 'Training' });
  await expect(page.locator('.plan-ex')).toContainText('Kniebeugen');
  await page.getByRole('button', { name: 'Termin speichern' }).click();
  await expect(page.getByRole('heading', { name: 'November 2026' })).toBeVisible();
});

test('calendar entries from the legacy app appear with their repetitions', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    localStorage.setItem('form-calendar-v20', JSON.stringify({
      version: 1, oneOff: {}, skips: { 's1|2026-11-09': true },
      series: [{ id: 's1', name: 'Kampfsport', type: 'sport', time: '19:00', preset: '', freq: 'weekly', interval: 1, startsOn: '2026-10-26' }],
    }));
  });
  await openNewApp(page, '#/kalender/2026-11');
  await expect(day(page, /^Montag, 2\. November, 1 geplant/)).toBeVisible();
  await expect(day(page, /^Montag, 9\. November$/)).toBeVisible();
  await day(page, /^Montag, 16\. November/).click();
  await expect(page.locator('.occ-row')).toContainText('19:00');
  await expect(page.locator('.occ-row')).toContainText('Jeden Montag');
});
