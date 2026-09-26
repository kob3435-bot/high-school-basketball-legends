import { test, expect, freshHome, pickTeam, toLiveMatch } from './fixtures';

test('Dream Team: create, save, refresh persistence, edit, duplicate, delete, play', async ({ page }) => {
  await freshHome(page);
  await page.getByTestId('menu-dream').click();
  await expect(page.getByTestId('dream-teams')).toContainText('No saved teams yet');
  await page.getByTestId('new-dream').click();
  await page.getByTestId('team-name').fill('Red Storm');
  await pickTeam(page, 6);
  await page.getByTestId('tab-tactics').click();
  await page.getByTestId('tactic-defense').selectOption('Full Court Press');
  await page.getByTestId('save-dream').click();
  await expect(page.getByTestId('dream-teams')).toContainText('Red Storm');
  await expect(page.getByTestId('dream-teams')).toContainText('Full Court Press');
  await page.reload();
  await page.getByTestId('menu-dream').click();
  const card = page.locator('[data-testid^=dream-dream_]').first();
  await expect(card).toContainText('Red Storm');
  await expect(card).toContainText('bench 6');
  // edit
  await card.getByTestId('dream-edit').click();
  await expect(page.getByTestId('team-name')).toHaveValue('Red Storm');
  await page.getByTestId('team-name').fill('Red Storm II');
  await page.getByTestId('save-dream').click();
  await expect(page.locator('.dream-name')).toHaveText(['Red Storm II']);
  // duplicate + delete
  await page.getByTestId('dream-dup').first().click();
  await expect(page.locator('.dream-name')).toHaveCount(2);
  await page.getByTestId('dream-delete').nth(1).click();
  await page.getByTestId('confirm-yes').click();
  await expect(page.locator('.dream-name')).toHaveCount(1);
  await page.reload();
  await page.getByTestId('menu-dream').click();
  await expect(page.locator('.dream-name')).toHaveText(['Red Storm II']);
  // play with it
  await page.getByTestId('dream-play').click();
  await page.getByTestId('cpu-level').selectOption('Strong');
  await page.getByTestId('cpu-template').selectOption('Twin Towers');
  await page.getByTestId('generate-cpu').click();
  await expect(page.getByTestId('cpu-team')).toContainText('Twin Towers');
  await page.getByTestId('generate-cpu').click(); // regenerate works
  await page.getByTestId('to-preview').click();
  await page.getByTestId('matchup-PG').selectOption({ index: 2 });
  await page.getByTestId('start-game').click();
  await page.getByTestId('sim-to-end').click();
  await page.getByTestId('view-results').click();
  await expect(page.getByTestId('results')).toContainText('Red Storm II');
});

test('Tournament: build team, play a live game, sim the rest, full bracket to a champion, persists on refresh', async ({ page }) => {
  await freshHome(page);
  await page.getByTestId('menu-tournament').click();
  await page.getByTestId('tour-build').click();
  await page.getByTestId('team-name').fill('Bracket Busters');
  await page.getByTestId('randomize-team').click();
  await page.getByTestId('builder-next').click();
  await expect(page.getByTestId('bracket')).toBeVisible();
  await expect(page.getByTestId('bracket').locator('.b-round').first().locator('.b-match')).toHaveCount(8);
  await expect(page.getByTestId('bracket')).toContainText('Bracket Busters ★');
  // play my first game live
  await page.getByTestId('tour-play-live').click();
  await page.getByTestId('start-game').click();
  await page.getByTestId('sim-to-end').click();
  await page.getByTestId('view-results').click();
  await page.getByTestId('back-tournament').click();
  await expect(page.getByTestId('tournament')).toBeVisible();
  await page.reload();
  await page.getByTestId('menu-tournament').click();
  await expect(page.locator('[data-testid=bm-0-0], [data-testid^=bm-0-]').locator('.b-score').filter({ hasText: /\d+/ }).first()).toBeVisible();
  // loop: sim my games / others / advance until champion
  for (let guard = 0; guard < 20; guard++) {
    if (await page.getByTestId('champion').isVisible()) break;
    if (await page.getByTestId('tour-sim-mine').isVisible()) { await page.getByTestId('tour-sim-mine').click(); continue; }
    if (await page.getByTestId('tour-sim-round').isVisible()) { await page.getByTestId('tour-sim-round').click(); continue; }
    if (await page.getByTestId('tour-advance').isVisible()) { await page.getByTestId('tour-advance').click(); continue; }
  }
  await expect(page.getByTestId('champion')).toBeVisible();
  const scores = page.getByTestId('bracket').locator('.b-score').filter({ hasText: /\d+/ });
  await expect(scores).toHaveCount(30); // 15 games x 2 scores
  await page.screenshot({ path: 'screenshots/tournament-bracket.png', fullPage: true });
  await page.reload();
  await page.getByTestId('menu-tournament').click();
  await expect(page.getByTestId('champion')).toBeVisible();
  // spectator tournament to champion
  await page.getByTestId('tour-new').click();
  await page.getByTestId('tour-spectate').click();
  await page.getByTestId('tour-sim-all').click();
  await expect(page.getByTestId('champion')).toBeVisible();
});

test('Random Battle: instant sim, box score, re-roll, watch live same game, saved to history', async ({ page }) => {
  await freshHome(page);
  await page.getByTestId('menu-random').click();
  const s1 = await page.getByTestId('random-score').textContent();
  expect(s1).toMatch(/^\d+ – \d+$/);
  await expect(page.getByTestId('box-table')).toBeVisible();
  await page.getByTestId('reroll').click();
  await expect(page.getByTestId('random-score')).toHaveText(/^\d+ – \d+$/);
  const s2 = await page.getByTestId('random-score').textContent();
  await page.getByTestId('watch-live').click();
  await expect(page.getByTestId('live-match')).toBeVisible();
  await expect(page.getByTestId('timeout-btn')).toHaveCount(0); // spectator
  await page.getByTestId('sim-to-end').click();
  await expect(page.getByTestId('final-score')).toHaveText(s2!); // same seed -> same game
  await page.getByTestId('view-results').click();
  await page.getByTestId('results-home').click();
  await page.getByTestId('menu-history').click();
  await expect(page.locator('[data-testid^=hist-m_]')).toHaveCount(2);
});

test('Player Database: search, filter, sort, detail modal with radar and swipe navigation', async ({ page }) => {
  await freshHome(page);
  await page.getByTestId('menu-db').click();
  await expect(page.getByTestId('db-count')).toHaveText('76 of 76 players');
  await page.getByTestId('db-search').fill('sakuraba');
  await expect(page.getByTestId('db-grid').locator('.pcard')).toHaveCount(1);
  await page.getByTestId('db-search').fill('');
  await page.getByTestId('db-pos').selectOption('C');
  const nC = await page.getByTestId('db-grid').locator('.pcard').count();
  expect(nC).toBeGreaterThan(5);
  expect(nC).toBeLessThan(40);
  await page.getByTestId('db-pos').selectOption('');
  await page.getByTestId('db-school').selectOption('kaino');
  await expect(page.getByTestId('db-grid')).toContainText('KAI');
  await page.getByTestId('db-school').selectOption('');
  await page.getByTestId('db-height').selectOption('195');
  await page.getByTestId('db-ovr').selectOption('80');
  await page.getByTestId('db-arch').selectOption('');
  const n2 = await page.getByTestId('db-grid').locator('.pcard').count();
  expect(n2).toBeGreaterThan(0);
  await page.getByTestId('db-reset').click();
  for (const s of ['three', 'passing', 'rebound', 'defense', 'speed', 'overall']) {
    await page.getByTestId('db-sort').selectOption(s);
    await expect(page.getByTestId('db-count')).toHaveText('76 of 76 players');
  }
  await page.getByTestId('db-sort').selectOption('three');
  const first = await page.getByTestId('db-grid').locator('.pcard-name').first().textContent();
  await page.getByTestId('db-grid').locator('.pcard-main').first().click();
  const modal = page.getByTestId('player-modal');
  await expect(modal).toBeVisible();
  await expect(modal.locator('.radar')).toBeVisible();
  await expect(modal).toContainText('Strengths');
  await expect(modal).toContainText('Weaknesses');
  await expect(modal).toContainText('Signature skills');
  await expect(modal).toContainText('3PT');
  await expect(modal.locator('h2')).toHaveText(first!.trim());
  await modal.getByTestId('pm-next').click();
  await expect(modal.locator('h2')).not.toHaveText(first!.trim());
  await modal.getByTestId('pm-prev').click();
  await expect(modal.locator('h2')).toHaveText(first!.trim());
  await modal.getByTestId('modal-close').click();
  await expect(modal).toBeHidden();
  await page.getByTestId('db-order').click();
});

test('Match History opens an old box score; Settings volume/mute persist; reset data', async ({ page }) => {
  await freshHome(page);
  await page.getByTestId('menu-history').click();
  await expect(page.getByTestId('history')).toContainText('No matches played yet');
  await page.getByTestId('home-btn').click();
  await page.getByTestId('menu-quick').click();
  await page.getByTestId('randomize-team').click();
  await toLiveMatch(page);
  await page.getByTestId('sim-to-end').click();
  const score = await page.getByTestId('final-score').textContent();
  await page.getByTestId('view-results').click();
  await page.getByTestId('results-home').click();
  await page.getByTestId('menu-history').click();
  const row = page.locator('[data-testid^=hist-m_]').first();
  await expect(row).toContainText(/W|L/);
  await expect(row).toContainText('POTG');
  await row.click();
  await expect(page.getByTestId('result-score')).toHaveText(score!);
  await expect(page.getByTestId('box-table')).toBeVisible();
  await page.getByTestId('back-btn').click();
  // settings
  await page.getByTestId('home-btn').click();
  await page.getByTestId('menu-settings').click();
  await page.getByTestId('volume').fill('25');
  await expect(page.getByTestId('volume-value')).toHaveText('25%');
  await page.getByTestId('mute').check();
  await page.getByTestId('default-speed-2').click();
  await page.getByTestId('test-sound').click();
  await page.reload();
  await page.getByTestId('menu-settings').click();
  await expect(page.getByTestId('volume-value')).toHaveText('25%');
  await expect(page.getByTestId('mute')).toBeChecked();
  await expect(page.getByTestId('default-speed-2')).toHaveClass(/on/);
  await page.getByTestId('mute').uncheck();
  await page.getByTestId('test-sound').click();
  // clear history with confirm
  await page.getByTestId('home-btn').click();
  await page.getByTestId('menu-history').click();
  await page.getByTestId('clear-history').click();
  await page.getByTestId('confirm-no').click();
  await expect(page.locator('[data-testid^=hist-m_]')).toHaveCount(1);
  await page.getByTestId('clear-history').click();
  await page.getByTestId('confirm-yes').click();
  await expect(page.getByTestId('history')).toContainText('No matches played yet');
  // reset all data
  await page.getByTestId('home-btn').click();
  await page.getByTestId('menu-settings').click();
  await page.getByTestId('reset-data').click();
  await page.getByTestId('confirm-yes').click();
  await expect(page.getByTestId('volume-value')).toHaveText('60%');
});

test('browser back button navigates between screens', async ({ page }) => {
  await freshHome(page);
  await page.getByTestId('menu-db').click();
  await expect(page.getByTestId('player-db')).toBeVisible();
  await page.goBack();
  await expect(page.getByTestId('home')).toBeVisible();
});
