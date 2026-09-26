import { test, expect, freshHome, pickTeam, toLiveMatch, setSimSpeed, noHorizontalOverflow } from './fixtures';

const VIEWPORTS = [
  { name: 'm360', width: 360, height: 740, mobile: true },
  { name: 'm390', width: 390, height: 844, mobile: true },
  { name: 'm412', width: 412, height: 915, mobile: true },
  { name: 'tablet', width: 768, height: 1024, mobile: true },
  { name: 'desktop', width: 1440, height: 900, mobile: false },
];

for (const vp of VIEWPORTS) {
  test.describe(`viewport ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.mobile, isMobile: vp.mobile });
    test(`all screens fit without horizontal overflow (${vp.width}x${vp.height})`, async ({ page }) => {
      const dir = `screenshots/qa/${vp.name}`;
      await freshHome(page);
      await noHorizontalOverflow(page);
      await page.screenshot({ path: `${dir}-01-home.png`, fullPage: true });
      // touch targets on home are large
      const h = await page.getByTestId('menu-quick').boundingBox();
      expect(h!.height).toBeGreaterThanOrEqual(44);
      await page.getByTestId('menu-quick').click();
      await pickTeam(page, 5);
      await noHorizontalOverflow(page);
      await page.screenshot({ path: `${dir}-02-builder.png`, fullPage: false });
      await page.getByTestId('builder-next').click();
      await page.getByTestId('generate-cpu').click();
      await noHorizontalOverflow(page);
      await page.getByTestId('to-preview').click();
      await noHorizontalOverflow(page);
      await page.screenshot({ path: `${dir}-03-preview.png`, fullPage: true });
      await page.getByTestId('start-game').click();
      await setSimSpeed(page, 2);
      await page.waitForTimeout(2500);
      await noHorizontalOverflow(page);
      const court = await page.getByTestId('court').boundingBox();
      expect(court!.width).toBeLessThanOrEqual(vp.width);
      expect(court!.width).toBeGreaterThan(vp.width >= 1100 ? vp.width * 0.5 : vp.width * 0.85);
      await page.screenshot({ path: `${dir}-04-live.png`, fullPage: true });
      await page.getByTestId('ltab-lineup').click();
      await noHorizontalOverflow(page);
      await page.getByTestId('ltab-box').click();
      await noHorizontalOverflow(page);
      await page.getByTestId('timeout-btn').click();
      await setSimSpeed(page, 6);
      await expect(page.getByTestId('timeout-modal')).toBeVisible({ timeout: 60_000 });
      await noHorizontalOverflow(page);
      await page.screenshot({ path: `${dir}-05-timeout-modal.png` });
      await page.getByTestId('resume-btn').click();
      await page.getByTestId('sim-to-end').click();
      await expect(page.getByTestId('final-overlay')).toBeVisible();
      await page.screenshot({ path: `${dir}-06-final.png` });
      await page.getByTestId('view-results').click();
      await noHorizontalOverflow(page);
      await page.screenshot({ path: `${dir}-07-results.png`, fullPage: true });
      await page.getByTestId('home-btn').click();
      await page.getByTestId('menu-db').click();
      await noHorizontalOverflow(page);
      await page.getByTestId('db-grid').locator('.pcard-main').first().click();
      await expect(page.getByTestId('player-modal')).toBeVisible();
      await noHorizontalOverflow(page);
      const modalBox = await page.getByTestId('player-modal').boundingBox();
      expect(modalBox!.width).toBeLessThanOrEqual(vp.width);
      await page.screenshot({ path: `${dir}-08-player-modal.png` });
      if (vp.mobile) {
        // swipe to the next player card
        const name1 = await page.getByTestId('player-modal').locator('h2').textContent();
        await page.evaluate(() => {
          const el = document.querySelector('.pm')!;
          const t = (x: number) => new Touch({ identifier: 1, target: el, clientX: x, clientY: 300 });
          el.dispatchEvent(new TouchEvent('touchstart', { touches: [t(300)], changedTouches: [t(300)], bubbles: true }));
          el.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t(120)], bubbles: true }));
        });
        await expect(page.getByTestId('player-modal').locator('h2')).not.toHaveText(name1!);
      }
      await page.getByTestId('modal-close').click();
      await page.getByTestId('home-btn').click();
      await page.getByTestId('menu-tournament').click();
      await page.getByTestId('tour-spectate').click();
      await noHorizontalOverflow(page);
      await page.getByTestId('tour-sim-all').click();
      await expect(page.getByTestId('champion')).toBeVisible();
      await noHorizontalOverflow(page);
      await page.screenshot({ path: `${dir}-09-tournament.png`, fullPage: true });
      for (const m of ['history', 'settings', 'dream', 'random']) {
        await page.getByTestId('home-btn').click();
        await page.getByTestId(`menu-${m}`).click();
        await noHorizontalOverflow(page);
      }
    });
  });
}

test.describe('representative screenshots', () => {
  test('desktop + 390px captures', async ({ page, browser }) => {
    await freshHome(page);
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.screenshot({ path: 'screenshots/home.png', fullPage: true });
    await page.getByTestId('menu-quick').click();
    await page.getByTestId('team-name').fill('Coach Teera Five');
    await pickTeam(page, 6);
    await page.getByTestId('tab-analysis').click();
    await page.screenshot({ path: 'screenshots/team-builder.png', fullPage: false });
    await toLiveMatch(page);
    await setSimSpeed(page, 1);
    await page.waitForTimeout(9000);
    await page.screenshot({ path: 'screenshots/live-match-desktop.png', fullPage: false });
    await page.getByTestId('sim-to-end').click();
    await page.getByTestId('view-results').click();
    await page.screenshot({ path: 'screenshots/box-score-analysis.png', fullPage: true });
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const m = await ctx.newPage();
    await m.goto('./');
    await m.getByTestId('menu-quick').click();
    await m.getByTestId('randomize-team').click();
    await m.getByTestId('builder-next').click();
    await m.getByTestId('generate-cpu').click();
    await m.getByTestId('to-preview').click();
    await m.getByTestId('start-game').click();
    await m.waitForTimeout(9000);
    await m.screenshot({ path: 'screenshots/live-match-390.png', fullPage: false });
    await ctx.close();
  });
});
