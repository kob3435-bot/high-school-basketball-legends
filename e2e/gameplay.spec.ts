import { test, expect, freshHome, pickTeam, toLiveMatch, setSimSpeed } from './fixtures';

test('full gameplay flow: build -> tactics -> CPU -> live (tactic, sub, timeout, halftime) -> finish -> box score -> analysis -> history -> play again', async ({ page, errors }) => {
  await freshHome(page);
  await page.getByTestId('menu-quick').click();
  await expect(page.getByTestId('team-builder')).toBeVisible();
  await page.getByTestId('team-name').fill('E2E Legends');
  // select slot C first, then pick for it (any player in any slot)
  await page.getByTestId('slot-C').locator('.slot-main').click();
  await pickTeam(page, 5);
  for (const s of ['PG', 'SG', 'SF', 'PF', 'C']) await expect(page.getByTestId(`slot-${s}`)).not.toHaveClass(/empty/);
  await expect(page.getByTestId('bench-list').locator('.bench-item')).toHaveCount(5);
  // tactics
  await page.getByTestId('tab-tactics').click();
  await page.getByTestId('tactic-offense').selectOption('Motion Offense');
  await page.getByTestId('tactic-defense').selectOption('2-3 Zone');
  await page.getByTestId('pace-Fast').click();
  await page.getByTestId('tab-analysis').click();
  await expect(page.getByTestId('lineup-analysis')).toContainText('Chemistry');
  await toLiveMatch(page);
  await expect(page.getByTestId('pbp')).toContainText(/tip|ball/i, { timeout: 20_000 });

  // change tactic live
  await page.getByTestId('ltab-tactics').click();
  await page.getByTestId('tactic-offense').selectOption('Fast Break');
  await page.getByTestId('ltab-pbp').click();
  await expect(page.getByTestId('pbp')).toContainText('switch to Fast Break');

  // queue a substitution
  await page.getByTestId('ltab-lineup').click();
  const panel = page.getByTestId('sub-panel');
  await panel.locator('.sub-cols > div').nth(0).locator('button.sub-row').nth(1).click();
  await panel.locator('.sub-cols > div').nth(1).locator('button.sub-row:not([disabled])').first().click();
  await page.getByTestId('do-sub').click();
  await expect(page.getByTestId('toast')).toContainText(/Sub queued|checks in/);

  // timeout -> modal opens at next dead ball -> immediate sub -> resume
  await setSimSpeed(page, 4);
  await page.getByTestId('timeout-btn').click();
  const tmodal = page.getByTestId('timeout-modal');
  await expect(tmodal).toBeVisible({ timeout: 60_000 });
  const tp = tmodal.getByTestId('sub-panel');
  await tp.locator('.sub-cols > div').nth(0).locator('button.sub-row').nth(0).click();
  await tp.locator('.sub-cols > div').nth(1).locator('button.sub-row:not([disabled])').first().click();
  await tmodal.getByTestId('do-sub').click();
  await tmodal.getByTestId('resume-btn').click();
  await expect(tmodal).toBeHidden();
  await page.getByTestId('ltab-pbp').click();
  await expect(page.getByTestId('pbp')).toContainText('Timeout E2E Legends');
  await expect(page.getByTestId('pbp')).toContainText(/Substitution E2E Legends/);

  // fast forward to halftime naturally
  await setSimSpeed(page, 80);
  const half = page.getByTestId('halftime-modal');
  await expect(half).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId('period')).toHaveText('Q2');
  await half.getByTestId('resume-btn').click();
  // play the second half to the final buzzer (no shortcut)
  await setSimSpeed(page, 80);
  await expect(page.getByTestId('final-overlay')).toBeVisible({ timeout: 120_000 });
  const finalText = await page.getByTestId('final-score').textContent();
  const [a, b] = finalText!.split('–').map((x) => parseInt(x.trim(), 10));
  expect(a).not.toBe(b);
  expect(a + b).toBeGreaterThan(60);
  await expect(page.getByTestId('score-0')).toHaveText(String(a));
  await page.getByTestId('view-results').click();

  // box score & analysis
  await expect(page.getByTestId('results')).toBeVisible();
  await expect(page.getByTestId('result-score')).toHaveText(`${a} – ${b}`);
  const head = page.getByTestId('box-table').locator('thead');
  for (const col of ['MIN', 'PTS', 'REB', 'OREB', 'DREB', 'AST', 'STL', 'BLK', 'TO', 'PF', 'FGM/A', 'FG%', '3PM/A', '3P%', 'FTM/A', 'FT%', '+/-']) await expect(head).toContainText(col);
  const totalPts = await page.getByTestId('box-table').locator('tr.totals td').nth(2).textContent();
  expect(parseInt(totalPts!, 10)).toBe(a);
  await expect(page.getByTestId('analysis')).toContainText('Key player');
  await expect(page.getByTestId('analysis')).toContainText('Turning point');
  await expect(page.getByTestId('team-stats')).toContainText('Fast break pts');
  await expect(page.getByTestId('flow-chart')).toBeVisible();
  await expect(page.getByTestId('potg')).toBeVisible();

  // play again (rematch) -> sim to end
  await page.getByTestId('play-again').click();
  await expect(page.getByTestId('preview')).toBeVisible();
  await page.getByTestId('start-game').click();
  await page.getByTestId('sim-to-end').click();
  await expect(page.getByTestId('final-overlay')).toBeVisible();
  await page.getByTestId('view-results').click();
  await expect(page.getByTestId('results')).toBeVisible();

  // history saved (2 games) and survives refresh
  await page.getByTestId('results-home').click();
  await page.reload();
  await page.getByTestId('menu-history').click();
  const rows = page.locator('[data-testid^=hist-m_]');
  await expect(rows).toHaveCount(2);
  await expect(rows.last()).toContainText(`${a}–${b}`);
  await rows.last().click();
  await expect(page.getByTestId('result-score')).toHaveText(`${a} – ${b}`);
  expect(errors).toEqual([]);
});

test('a 5-center lineup and a 5-guard lineup both play a full game', async ({ page }) => {
  await freshHome(page);
  for (const pos of ['C', 'PG']) {
    await page.goto('./');
    await page.getByTestId('menu-quick').click();
    await page.locator('select[aria-label="Position filter"]').selectOption(pos);
    const starts = page.getByTestId('player-pool').locator('[data-testid^=start-]');
    for (let i = 0; i < 5; i++) await starts.nth(i).click();
    await page.getByTestId('tab-analysis').click();
    await expect(page.getByTestId('lineup-analysis')).toBeVisible();
    await toLiveMatch(page);
    await page.getByTestId('sim-to-end').click();
    await expect(page.getByTestId('final-overlay')).toBeVisible();
    await page.getByTestId('view-results').click();
    await expect(page.getByTestId('box-table')).toBeVisible();
  }
});

test('stress: three consecutive live games played to the buzzer at high speed with auto-sub OFF', async ({ page }) => {
  test.setTimeout(400_000);
  await freshHome(page);
  await page.getByTestId('menu-quick').click();
  await page.getByTestId('randomize-team').click();
  await toLiveMatch(page);
  for (let g = 0; g < 3; g++) {
    await page.getByTestId('autosub-toggle').click();
    await expect(page.getByTestId('autosub-toggle')).toHaveText('Auto-sub OFF');
    await setSimSpeed(page, 120);
    await expect(page.getByTestId('halftime-modal')).toBeVisible({ timeout: 120_000 });
    await page.getByTestId('resume-btn').click();
    await setSimSpeed(page, 120);
    await expect(page.getByTestId('final-overlay')).toBeVisible({ timeout: 120_000 });
    // with auto-sub off, the user team only substitutes when forced by a foul-out
    const info = await page.evaluate(() => {
      const st = (window as any).__hsbl.sim.st;
      const ev = st.events as any[];
      const subs = ev.filter((e) => e.type === 'sub' && e.team === 0);
      const fouls = ev.filter((e) => e.type === 'foulOut' && e.team === 0);
      return { subs: subs.length, foulOuts: fouls.length, final: [st.teams[0].score, st.teams[1].score] };
    });
    expect(info.subs).toBeLessThanOrEqual(info.foulOuts);
    await page.getByTestId('view-results').click();
    await expect(page.getByTestId('result-score')).toHaveText(`${info.final[0]} – ${info.final[1]}`);
    await page.getByTestId('play-again').click();
    await page.getByTestId('start-game').click();
  }
});
