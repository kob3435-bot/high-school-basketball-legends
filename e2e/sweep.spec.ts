import type { Page } from '@playwright/test';
import { test, expect, freshHome, pickTeam, toLiveMatch } from './fixtures';

async function state(page: Page) {
  return page.evaluate(() => {
    const ls: string[] = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)!; ls.push(k + '=' + localStorage.getItem(k)); }
    const inputs = [...document.querySelectorAll('input,select')].map((e) => (e as HTMLInputElement).value + ':' + (e as HTMLInputElement).checked).join('|');
    return document.body.innerHTML.length + ':' + document.body.innerHTML + ls.sort().join() + inputs + ':' + ((window as any).__sfxCount || 0) + ':' + history.length;
  });
}

/** Clicks (a sample of) every visible enabled button on a screen and asserts each one does something. */
async function sweep(page: Page, name: string, goto: () => Promise<void>, opts: { skip?: RegExp; maxPerKind?: number } = {}) {
  await goto();
  const descs: string[] = await page.locator('button:visible').evaluateAll((els) => els.map((e, i) => (e.getAttribute('data-testid') || e.getAttribute('aria-label') || (e.textContent || '').trim().slice(0, 30) || 'btn') + '#' + i));
  const seen: Record<string, number> = {};
  const dead: string[] = [];
  let tested = 0;
  for (let i = 0; i < descs.length; i++) {
    const d = descs[i];
    const kind = d.replace(/#\d+$/, '').replace(/[-_]?p?\d+$/, '').replace(/^Colors .*/, 'swatch').replace(/^(Open|Remove|Move) .*/, '$1');
    if (opts.skip && opts.skip.test(d)) continue;
    seen[kind] = (seen[kind] ?? 0) + 1;
    if (seen[kind] > (opts.maxPerKind ?? 2)) continue;
    await goto();
    const btn = page.locator('button:visible').nth(i);
    if (!(await btn.count())) continue;
    const ok = await btn.evaluate((e) => !(e as HTMLButtonElement).disabled && !e.classList.contains('on') && !e.classList.contains('swatch-on') && !(e.classList.contains('swatch') && e.classList.contains('on')));
    if (!ok) continue;
    const before = await state(page);
    await btn.click({ timeout: 5000 });
    await page.waitForTimeout(120);
    const after = await state(page);
    tested++;
    if (before === after) dead.push(d);
  }
  console.log(`[sweep] ${name}: ${tested} buttons clicked, dead: ${dead.length ? dead.join(', ') : 'none'}`);
  expect(dead, `dead buttons on ${name}`).toEqual([]);
  expect(tested).toBeGreaterThan(0);
}

test.describe.configure({ mode: 'serial' });

test('dead-button sweep: home, builder, player DB, settings, history', async ({ page }) => {
  test.setTimeout(600_000);
  await freshHome(page);
  await sweep(page, 'home', async () => { await page.goto('./'); await expect(page.getByTestId('home')).toBeVisible(); });
  await sweep(page, 'builder', async () => { await page.goto('./'); await page.getByTestId('menu-quick').click(); await page.getByTestId('randomize-team').click(); }, { maxPerKind: 2 });
  await sweep(page, 'player-db', async () => { await page.goto('./'); await page.getByTestId('menu-db').click(); });
  await sweep(page, 'settings', async () => { await page.goto('./'); await page.getByTestId('menu-settings').click(); }, { skip: /reset-data/ });
  await sweep(page, 'history(empty)', async () => { await page.goto('./'); await page.getByTestId('menu-history').click(); });
});

test('dead-button sweep: opponent, preview, live match, results, dream teams, tournament, random battle', async ({ page }) => {
  test.setTimeout(900_000);
  await freshHome(page);
  const toOpp = async () => { await page.goto('./'); await page.getByTestId('menu-quick').click(); await page.getByTestId('randomize-team').click(); await page.getByTestId('builder-next').click(); };
  await sweep(page, 'opponent', async () => { await toOpp(); await page.getByTestId('generate-cpu').click(); });
  await sweep(page, 'preview', async () => { await toOpp(); await page.getByTestId('generate-cpu').click(); await page.getByTestId('to-preview').click(); });
  const toLive = async () => { await toOpp(); await page.getByTestId('generate-cpu').click(); await page.getByTestId('to-preview').click(); await page.getByTestId('start-game').click(); await page.waitForTimeout(400); await page.getByTestId('speed-pause').click(); };
  await sweep(page, 'live', toLive, { skip: /speed-pause/ });
  await sweep(page, 'live-lineup-tab', async () => { await toLive(); await page.getByTestId('ltab-lineup').click(); });
  const toResults = async () => { await toLive(); await page.getByTestId('sim-to-end').click(); await page.getByTestId('view-results').click(); };
  await sweep(page, 'results', toResults);
  // dream teams with one saved team
  await page.goto('./'); await page.getByTestId('menu-dream').click(); await page.getByTestId('new-dream').click(); await page.getByTestId('randomize-team').click(); await page.getByTestId('save-dream').click();
  await sweep(page, 'dream-teams', async () => { await page.goto('./'); await page.getByTestId('menu-dream').click(); await expect(page.locator('.dream-name').first()).toBeVisible(); }, { skip: /dream-delete|dream-dup/ });
  await sweep(page, 'tournament-setup', async () => { await page.goto('./'); await page.evaluate(() => localStorage.removeItem('hsbl.v1.tournament')); await page.getByTestId('menu-tournament').click(); });
  await sweep(page, 'tournament-bracket', async () => {
    await page.goto('./'); await page.evaluate(() => localStorage.removeItem('hsbl.v1.tournament')); await page.getByTestId('menu-tournament').click(); await page.getByTestId('tour-start-dream').click();
  });
  await sweep(page, 'random-battle', async () => { await page.goto('./'); await page.getByTestId('menu-random').click(); await expect(page.getByTestId('random-score')).toBeVisible(); });
  await sweep(page, 'history(full)', async () => { await page.goto('./'); await page.getByTestId('menu-history').click(); }, { maxPerKind: 2 });
});
