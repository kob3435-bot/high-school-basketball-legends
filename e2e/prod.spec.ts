import { test, expect, pickTeam } from './fixtures';

// Production smoke test: run with BASE_URL=https://<user>.github.io/<repo>/ npx playwright test
test('production smoke: open, quick match, build, CPU, start, sim to end, box score, analysis, dream team persists, new match', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.goto('./');
  await expect(page.getByTestId('home')).toBeVisible();
  await expect(page).toHaveTitle(/High School Basketball Legends/);
  // quick match
  await page.getByTestId('menu-quick').click();
  await pickTeam(page, 5);
  for (const s of ['PG', 'SG', 'SF', 'PF', 'C']) await expect(page.getByTestId(`slot-${s}`)).not.toHaveClass(/empty/);
  await page.getByTestId('builder-next').click();
  await page.getByTestId('generate-cpu').click();
  await expect(page.getByTestId('cpu-team')).toBeVisible();
  await page.getByTestId('to-preview').click();
  await page.getByTestId('start-game').click();
  await expect(page.getByTestId('pbp')).toContainText(/ball|tip/i, { timeout: 20_000 });
  await page.getByTestId('sim-to-end').click();
  await expect(page.getByTestId('final-overlay')).toBeVisible();
  await page.getByTestId('view-results').click();
  await expect(page.getByTestId('box-table')).toBeVisible();
  await expect(page.getByTestId('analysis')).toContainText('Key player');
  // dream team save + refresh
  await page.getByTestId('results-home').click();
  await page.getByTestId('menu-dream').click();
  await page.getByTestId('new-dream').click();
  await page.getByTestId('team-name').fill('Prod Smoke Squad');
  await page.getByTestId('randomize-team').click();
  await page.getByTestId('save-dream').click();
  await expect(page.getByTestId('dream-teams')).toContainText('Prod Smoke Squad');
  await page.reload();
  await page.getByTestId('menu-dream').click();
  await expect(page.locator('.dream-name')).toHaveText(['Prod Smoke Squad']);
  // history persisted too
  await page.getByTestId('home-btn').click();
  await page.getByTestId('menu-history').click();
  await expect(page.locator('[data-testid^=hist-m_]')).toHaveCount(1);
  // new match with the saved team
  await page.getByTestId('home-btn').click();
  await page.getByTestId('menu-dream').click();
  await page.getByTestId('dream-play').click();
  await page.getByTestId('generate-cpu').click();
  await page.getByTestId('to-preview').click();
  await page.getByTestId('start-game').click();
  await page.getByTestId('speed-4').click();
  await expect(page.getByTestId('pbp').locator('li')).not.toHaveCount(0);
  await page.getByTestId('sim-to-end').click();
  await page.getByTestId('view-results').click();
  await expect(page.getByTestId('results')).toContainText('Prod Smoke Squad');
});
