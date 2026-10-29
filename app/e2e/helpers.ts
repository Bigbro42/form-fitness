import { expect, type Page } from '@playwright/test';

export const LEGACY_KEYS = [
  'form-coach-v5', 'form-trainingscoach-v4', 'form-trainingscoach-v3', 'form-trainingscoach-v2', 'form-trainingscoach-v1',
  'form-random-workouts-v1', 'form-calendar-v20', 'form-pwa-reminders', 'form-rest-length', 'form-rest-auto',
];

/** Collects uncaught errors and console errors of a page. */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  return errors;
}

export async function readLegacy(page: Page): Promise<Record<string, string | null>> {
  return page.evaluate((keys) => Object.fromEntries(keys.map((k) => [k, localStorage.getItem(k)])), LEGACY_KEYS);
}

export async function openNewApp(page: Page, hash = '') {
  await page.goto(`next/${hash}`);
  await expect(page.locator('.spinner')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
}

/**
 * Checks with the page's own fonts and again with a wide fallback font: on an iPhone SF Pro is
 * used, on CI machines whatever is installed, so text must never depend on a narrow font.
 */
export async function expectNoHorizontalOverflow(page: Page) {
  const measure = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(await measure(), 'horizontal overflow in px').toBeLessThanOrEqual(0);
  const style = await page.addStyleTag({ content: '* { font-family: Verdana, "DejaVu Sans", sans-serif !important; }' });
  expect(await measure(), 'horizontal overflow in px with a wide font').toBeLessThanOrEqual(0);
  await style.evaluate((el) => (el as Element).remove());
}

/** Uses the legacy app the way a person does: spontaneous workout with two exercises. */
export async function logLegacyWorkout(page: Page) {
  await page.goto('./');
  await page.click('[data-v22-quick-start]');
  await page.click('[data-add]');
  await page.click('[data-pick=plank]');
  await page.click('[data-add]');
  await page.click('[data-muscle=legs]');
  await page.click('[data-pick=squat]');
  await page.click('[data-open-detail="1"]');
  await page.fill('[data-weight="1:0"]', '10');
  await page.fill('[data-set="1:0"]', '12');
  await page.fill('[data-set="1:1"]', '10');
  await page.click('[data-checkset="1:0"]');
  await page.click('[data-detail-back]');
  await page.click('[data-open-detail="0"]');
  await page.fill('[data-set="0:0"]', '30');
  await page.click('[data-detail-back]');
  await page.fill('[data-entry="note"]', 'Erstes Training');
  page.once('dialog', (d) => d.accept());
  await page.click('[data-complete]');
  // The legacy app shows a summary overlay after completing.
  await page.click('[data-v19-close]');
}
