const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Native DOM/focus checks. Visibility is injected, as in music.browser.cjs;
// this exercises event ordering, not operating-system background throttling.
async function checkLifecycle(browser, baseUrl) {
  const out = path.join(__dirname, 'artifacts/lifecycle'), errors = [];
  fs.mkdirSync(out, { recursive: true });
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: mobile ? { width: 390, height: 844 } : { width: 1366, height: 768 }, isMobile: mobile, hasTouch: mobile });
    await context.addCookies([{ name: 'ng_analytics_consent', value: 'denied', url: baseUrl }]);
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const press = id => page.locator('#' + id)[mobile ? 'tap' : 'click']();
    const phase = () => page.evaluate(() => KanaRain.lifecycle.session);
    try {
      await page.goto(baseUrl); await page.waitForFunction(() => !!window.KanaRain);
      await press('startBtn'); assert.equal(await phase(), 'countdown');
      await page.keyboard.press('Escape'); assert.equal(await phase(), 'paused');
      await press('pauseGardenBtn');
      await page.evaluate(() => KanaRain.pause(false));
      assert.equal(await phase(), 'paused');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#pauseOverlay').isVisible(), true);
      await press('resumeBtn'); await press('skipCountdown');
      assert.equal(await phase(), 'playing');

      await press('progressBtn');
      // The DOM handler also supports callers switching panels programmatically.
      await page.evaluate(() => document.getElementById('helpBtn').click());
      await press('closeHelp'); assert.equal(await phase(), 'countdown');
      await press('skipCountdown');
      const before = await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
        const time = KanaRain.state.t;
        KanaRain.pause(false); document.getElementById('skipCountdown').click();
        return time;
      });
      await page.waitForTimeout(100);
      assert.equal(await phase(), 'paused');
      assert.equal(await page.evaluate(() => KanaRain.state.t), before);
      await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
      assert.equal(await phase(), 'paused');
      await press('resumeBtn'); await press('skipCountdown');

      await page.locator('#answer').dispatchEvent('compositionstart');
      await press('pauseBtn'); await press('finishBtn');
      assert.equal(await phase(), 'ended');
      await press('againBtn'); await press('skipCountdown');
      const answer = await page.evaluate(() => KanaRain.accepted(KanaRain.state.drops[0])[0]);
      await page.locator('#answer').fill(answer);
      await page.waitForFunction(() => KanaRain.state.correct === 1);
      await press('pauseBtn'); await press('pauseGardenBtn');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'closeGarden');
      await page.screenshot({ path: path.join(out, mobile ? 'mobile-paused-garden.png' : 'desktop-paused-garden.png') });
      await press('closeGarden'); assert.equal(await page.locator('#pauseOverlay').isVisible(), true);
      await press('resumeBtn'); await press('skipCountdown');
      await page.screenshot({ path: path.join(out, mobile ? 'mobile-playing.png' : 'desktop-playing.png') });
    } finally { await context.close(); }
  }
  assert.deepEqual(errors, []);
  console.log('PASS: explicit lifecycle, modal return/focus, hidden resume and IME restart on desktop and touch.');
}

module.exports = { checkLifecycle };
