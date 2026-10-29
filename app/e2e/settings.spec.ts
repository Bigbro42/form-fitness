import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, openNewApp, trackErrors } from './helpers';

test('long-term goals are set once and preselected everywhere, but stay changeable per workout', async ({ page }) => {
  const errors = trackErrors(page);
  await openNewApp(page);
  await page.getByRole('link', { name: /Ziel festlegen/ }).click();
  await expect(page.getByRole('heading', { name: 'Ziele & Vorgaben' })).toBeVisible();

  const secondary = page.getByRole('group', { name: 'Nebenziele' });
  await expect(page.getByText('Wähle zuerst ein Hauptziel.')).toBeVisible();
  await page.getByRole('radio', { name: /^Muskelaufbau/ }).check();
  await expect(secondary.getByRole('button', { name: 'Muskelaufbau' })).toHaveCount(0);
  await secondary.getByRole('button', { name: 'Core' }).click();
  await secondary.getByRole('button', { name: 'Mobilität' }).click();
  await expect(secondary.getByRole('button', { name: 'Ausdauer', exact: true })).toBeDisabled();
  await page.getByRole('group', { name: 'Trainingsniveau' }).getByRole('button', { name: 'Einsteiger' }).click();
  await page.getByRole('slider', { name: 'Übliche Trainingsdauer' }).fill('20');
  await expect(page.getByText('20 Minuten')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // Saved immediately and kept after a restart.
  await openNewApp(page, '#/einstellungen');
  await expect(page.getByRole('radio', { name: /^Muskelaufbau/ })).toBeChecked();
  await expect(secondary.getByRole('button', { name: 'Core' })).toHaveAttribute('aria-pressed', 'true');
  await expect(secondary.getByRole('button', { name: 'Mobilität' })).toHaveAttribute('aria-pressed', 'true');

  await openNewApp(page);
  await expect(page.getByRole('link', { name: /Ziel: Muskelaufbau/ })).toContainText('Nebenziele: Core, Mobilität');

  // Generator starts from the settings; own goals are listed first.
  await page.goto('next/#/generator');
  const goal = page.getByLabel('Ziel');
  await expect(goal).toHaveValue('hypertrophy');
  await expect(goal.locator('optgroup[label="Deine Ziele"] option')).toHaveText(['Muskelaufbau · Hauptziel', 'Core & Rumpfstabilität · Nebenziel', 'Mobilität · Nebenziel']);
  await expect(page.getByText('Dauer: 20 Minuten')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Einsteiger' })).toHaveAttribute('aria-pressed', 'true');

  // A new workout uses the main goal; today it can be something else without changing the settings.
  await openNewApp(page);
  await page.getByRole('button', { name: 'Training starten' }).click();
  const sessionGoal = page.locator('#session-goal');
  await expect(sessionGoal).toHaveValue('hypertrophy');
  await sessionGoal.selectOption('cardio');
  await expect(sessionGoal).toHaveValue('cardio');
  await page.goto('next/#/einstellungen');
  await expect(page.getByRole('radio', { name: /^Muskelaufbau/ })).toBeChecked();

  // Making a secondary goal the main goal removes it from the secondary goals.
  await page.getByRole('radio', { name: /^Core & Rumpfstabilität/ }).check();
  await expect(secondary.getByRole('button', { name: 'Core' })).toHaveCount(0);
  await expect(secondary.getByRole('button', { name: 'Mobilität' })).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('without goals nothing is preselected and the calendar stays empty', async ({ page }) => {
  await openNewApp(page, '#/einstellungen');
  await expect(page.getByRole('radio', { name: /Noch kein festes Ziel/ })).toBeChecked();
  await page.getByRole('radio', { name: /^Ausdauer/ }).check();
  await openNewApp(page, '#/kalender');
  await expect(page.getByText('Dein Kalender ist leer')).toBeVisible();
});
