import { test as base, expect, type Page } from '@playwright/test';

/** Every test fails on any uncaught page error or console error. */
export const test = base.extend<{ errors: string[] }>({
  errors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
    await use(errors);
    expect(errors, 'console / page errors').toEqual([]);
  },
});
export { expect };

export async function freshHome(page: Page) {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.goto('./');
  await expect(page.getByTestId('home')).toBeVisible();
}

/** Build a team in the builder by clicking pool players: 5 starters + n bench. */
export async function pickTeam(page: Page, benchN = 5) {
  const pool = page.getByTestId('player-pool');
  const starts = pool.locator('[data-testid^=start-]');
  const picks = [0, 7, 14, 21, 28];
  for (const i of picks) await starts.nth(i).click();
  const benchBtns = pool.locator('.pcard:not(.selected) [data-testid^=benchadd-]');
  for (let i = 0; i < benchN; i++) await benchBtns.nth(3 + i * 4).click();
}

export async function toLiveMatch(page: Page) {
  await page.getByTestId('builder-next').click();
  await page.getByTestId('generate-cpu').click();
  await expect(page.getByTestId('cpu-team')).toBeVisible();
  await page.getByTestId('to-preview').click();
  await page.getByTestId('start-game').click();
  await expect(page.getByTestId('live-match')).toBeVisible();
}

export async function setSimSpeed(page: Page, n: number) {
  await page.evaluate((n) => (window as any).__hsbl.setSpeed(n), n);
}

export async function noHorizontalOverflow(page: Page) {
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(ov, 'horizontal overflow in px').toBeLessThanOrEqual(0);
}
