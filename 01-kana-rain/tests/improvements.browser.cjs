'use strict';
// Real-browser regression checks for the learning fixes. Uses isolated, synthetic progress.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');
const output = path.resolve(__dirname, 'artifacts/improvements');
const shots = path.join(output, 'capturas');
const url = 'http://127.0.0.1:4182';
const checks = [], errors = [], contexts = [];
let browser, server;
async function context(viewport, denied = false) {
  const ctx = await browser.newContext({ viewport, isMobile: viewport.width < 500, hasTouch: viewport.width < 500, serviceWorkers: 'block' });
  contexts.push(ctx);
  await ctx.addCookies([{ name: 'ng_analytics_consent', value: 'denied', url, sameSite: 'Lax' }]);
  await ctx.route('**/*', route => {
    const target = new URL(route.request().url());
    if (target.hostname === '127.0.0.1' || ['data:', 'blob:'].includes(target.protocol)) route.continue();
    else route.abort();
  });
  if (denied) await ctx.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('Synthetic storage denial'); } });
    Object.defineProperty(window, 'indexedDB', { value: undefined });
  });
  const page = await ctx.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.waitForFunction(() => !!window.KanaRain);
  return page;
}
async function ready(page) {
  for (let step = 0; step < 8; step++) {
    if (await page.locator('#countdownOverlay').isVisible()) await page.locator('#skipCountdown').click();
    if (await page.evaluate(() => KanaRain.state && !KanaRain.state.paused && !KanaRain.state.countingDown)) return;
    await page.waitForTimeout(50);
  }
  throw new Error('No active question after introductions/countdown');
}
async function screenshot(page, name) {
  await page.screenshot({ path: path.join(shots, name + '.png'), fullPage: true });
}
async function geometry(page, label) {
  const data = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight }));
  assert.ok(data.scrollWidth <= data.width + 1, label + ': horizontal overflow');
  assert.ok(data.scrollHeight <= data.height + 1, label + ': page overflow');
  checks.push({ type: 'viewport', label, ...data });
}
async function responsive() {
  for (const [width, height] of [[320, 568], [320, 720], [390, 844], [568, 320], [1440, 1000]]) {
    const page = await context({ width, height });
    await geometry(page, `${width}x${height} menu`);
    assert.equal(await page.locator('#practiceSelect,#settingsPracticeSelect,#durationSelect,#noveltyPaceSelect').count(), 0);
    assert.equal(await page.evaluate(() => KanaRain.settings.playStyle), 'arcade');
    assert.equal(await page.locator('#difficultySelect,#difficultyNote').count(), 0);

    assert.equal(await page.locator('.ng-analytics-settings').isVisible(), false);
    await page.locator('#settingsBtn').click();
    await page.locator('[data-analytics-settings]').click();
    assert.equal(await page.locator('.ng-analytics-dialog').isVisible(), true);
    await page.locator('.ng-analytics-close').click();
    if (await page.locator('#settingsDialog').isVisible()) await page.locator('#closeSettings').click();
    await page.locator('#startBtn').click(); await ready(page);
    assert.equal(await page.evaluate(() => KanaRain.state.playStyle), 'arcade');
    assert.equal(await page.evaluate(() => KanaRain.state.drops.length), 1);
    await geometry(page, `${width}x${height} arcade`);
    const overlap = await page.evaluate(() => {
      const button = document.querySelector('.ng-analytics-settings');
      return button && getComputedStyle(button).display !== 'none';
    });
    assert.equal(overlap, false);
    await screenshot(page, `rain-arcade-${width}x${height}`);
    await page.locator('#pauseBtn').click();
    await page.locator('#pauseSettingsBtn').click();
    await page.locator('[data-analytics-settings]').click();
    assert.equal(await page.locator('.ng-analytics-dialog').isVisible(), true);
    assert.equal(await page.evaluate(() => KanaRain.state.paused), true);
    assert.equal(await page.evaluate(() => KanaRain.state.countingDown), false, 'Analytics settings must not start a resume countdown');
    await page.locator('.ng-analytics-close').click();
    await page.close();
  }
  checks.push({ type: 'pass', label: 'Single arcade setup and analytics in menu/paused Settings at five viewport sizes' });
}
async function correction() {
  const page = await context({ width: 390, height: 844 });
  await page.locator('#startBtn').click(); await ready(page);
  const displayed = await page.evaluate(() => JPData.kanaById[KanaRain.state.target.id].char);
  await page.locator('#answer').fill(displayed); await page.locator('#answer').press('Enter');
  assert.equal(await page.evaluate(() => KanaRain.state.correct), 0);
  assert.equal(await page.locator('#continueFeedbackBtn').count(), 0);
  const text = await page.locator('#feedback').textContent();
  assert.ok(text.length > 0);
  await page.locator('#pauseBtn').click();
  await page.waitForTimeout(4100);
  assert.equal(await page.locator('#feedback').textContent(), text);
  assert.ok((await page.locator('#feedback').getAttribute('class')).includes('show'));
  await page.locator('#resumeBtn').click();
  if (await page.locator('#countdownOverlay').isVisible()) await page.locator('#skipCountdown').click();
  await screenshot(page, 'rain-correction-retained');
  assert.equal(await page.evaluate(() => KanaRain.state.lives), 3, 'an incorrect submitted answer does not lose a heart');
  assert.equal(await page.evaluate(() => KanaRain.state.over), false);
  const exported = await page.evaluate(() => JSON.parse(Learner.export()));
  assert.equal(exported.version, 2);
  assert.ok(exported.attemptLedger.length >= 1);
  const wrong = exported.attemptLedger.find(event => event.correct === false);
  assert.ok(wrong && wrong.firstAttempt && wrong.reason);
  const before = exported.attemptLedger.length;
  await page.reload(); await page.waitForFunction(() => !!window.KanaRain);
  assert.equal(await page.evaluate(() => JSON.parse(Learner.export()).attemptLedger.length), before);
  checks.push({ type: 'pass', label: 'Copy rejected, explicit correction retained across pause, event survives reload', ledgerEvents: before });
  await page.close();
}
async function unavailableStorage() {
  const page = await context({ width: 390, height: 844 }, true);
  await page.locator('#startBtn').click(); await ready(page);
  await page.locator('#storageNotice').waitFor({ state: 'visible' });
  assert.match(await page.locator('#saveStatus').textContent(), /not saved|unsaved|unable|memory|unavailable/i);
  const saved = await page.evaluate(() => JSON.parse(Learner.export()));
  assert.equal(saved.version, 2);
  const download = page.waitForEvent('download');
  await page.locator('#storageExportBtn').click();
  assert.equal((await download).suggestedFilename(), 'kana-rain-progress.json');
  await screenshot(page, 'rain-storage-unavailable');
  checks.push({ type: 'pass', label: 'Denied storage gives persistent truthful warning and preserves export' });
  await page.close();
}
async function progressDetails() {
  const page = await context({ width: 390, height: 844 });
  await page.locator('#gardenBtn').click();
  assert.equal(await page.locator('.map-legend > span').count(), 4);
  await page.locator('.learning-details summary').click();
  assert.equal(await page.locator('#learningStats').isVisible(), true);
  assert.match(await page.locator('#learningStats').textContent(), /independent|with help/i);
  await screenshot(page, 'rain-progress-estimates');
  checks.push({ type: 'pass', label: 'Detailed learning evidence remains in the garden' });
  await page.close();
}

(async () => {
  fs.mkdirSync(shots, { recursive: true });
  server = spawn(process.execPath, [path.join(__dirname, '../scripts/serve.cjs')], { cwd: path.join(__dirname, '..'), env: { ...process.env, PORT: '4182' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(new Error('Server exited ' + code))); });
  const channel = process.env.PLAYWRIGHT_BROWSER_CHANNEL;
  browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
  await responsive(); await correction(); await unavailableStorage(); await progressDetails();
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(output, 'rain-browser-verification.json'), JSON.stringify({ verifiedAt: new Date().toISOString(), syntheticProgress: true, externalRequests: 'blocked', checks, errors }, null, 2) + '\n');
  console.log('PASS: Kana Rain learning improvements; ' + checks.length + ' checks, zero page errors.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  for (const ctx of contexts) await ctx.close().catch(() => {});
  if (browser) await browser.close();
  if (server) server.kill();
});
