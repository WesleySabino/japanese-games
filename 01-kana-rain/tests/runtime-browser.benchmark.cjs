'use strict';
// Isolated comparison: public release versus the local source, with consent denied.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');
const publicUrl = process.env.KANA_RAIN_BASELINE_URL || 'https://kana-rain.nihongogrove.top/';
const port = 4184, localUrl = `http://127.0.0.1:${port}/`;
const output = path.join(__dirname, 'artifacts/runtime-benchmark');
let browser, server;

async function measure(url) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  await context.addCookies([{ name: 'ng_analytics_consent', value: 'denied', url, sameSite: 'Lax' }]);
  await context.addInitScript(() => {
    const metrics = { rafCallbacks: 0, fieldReads: 0, dropReads: 0, mapMutations: 0, unlockMutations: 0, keyboardMutations: 0 };
    const nativeRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = callback => nativeRaf.call(window, now => { metrics.rafCallbacks++; callback(now); });
    for (const [prototype, property] of [[Element.prototype, 'clientWidth'], [Element.prototype, 'clientHeight'], [HTMLElement.prototype, 'offsetWidth'], [HTMLElement.prototype, 'offsetHeight']]) {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, property);
      Object.defineProperty(prototype, property, { ...descriptor, get() {
        if (this.id === 'field') metrics.fieldReads++;
        if (this.classList.contains('drop')) metrics.dropReads++;
        return descriptor.get.call(this);
      } });
    }
    window.__runtimeMetrics = metrics;
    window.__resetRuntimeMetrics = () => { for (const key of Object.keys(metrics)) metrics[key] = 0; };
    document.addEventListener('DOMContentLoaded', () => {
      for (const [id, key] of [['masteryMap', 'mapMutations'], ['unlockDetails', 'unlockMutations'], ['keyboard', 'keyboardMutations']]) {
        const target = document.getElementById(id);
        if (target) new MutationObserver(records => { metrics[key] += records.length; }).observe(target, { childList: true, subtree: true });
      }
    });
  });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url); await page.waitForFunction(() => !!window.KanaRain);
  const menuRainState = await page.locator('.rain-lines').evaluate(el => getComputedStyle(el).animationPlayState);
  await page.locator('#difficultySelect').selectOption('easy');
  await page.locator('#startBtn').click(); await page.locator('#skipCountdown').click();
  await page.waitForFunction(() => !KanaRain.state.paused && !KanaRain.state.countingDown);
  await page.waitForTimeout(100);
  await page.evaluate(() => __resetRuntimeMetrics()); await page.waitForTimeout(5000);
  const gameplay = await page.evaluate(() => ({ ...__runtimeMetrics, drops: KanaRain.state.drops.length, rainState: getComputedStyle(document.querySelector('.rain-lines')).animationPlayState }));
  await page.locator('#pauseBtn').click(); await page.waitForTimeout(100);
  const frozenBefore = await page.evaluate(() => KanaRain.state.t);
  await page.evaluate(() => __resetRuntimeMetrics()); await page.waitForTimeout(1500);
  const paused = await page.evaluate(() => ({ ...__runtimeMetrics, time: KanaRain.state.t, rainState: getComputedStyle(document.querySelector('.rain-lines')).animationPlayState }));
  paused.timerFrozen = paused.time === frozenBefore;
  await page.locator('#resumeBtn').click(); await page.locator('#skipCountdown').click();
  await page.evaluate(() => __resetRuntimeMetrics());
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => { if (!KanaRain.state.drops.length) KanaRain.state.sinceSpawn = 99999; });
    await page.waitForFunction(() => KanaRain.state.drops.length);
    await page.evaluate(() => {
      const round = KanaRain.state.drops[0], answer = document.getElementById('answer');
      answer.value = KanaRain.accepted(round)[0]; answer.dispatchEvent(new Event('input', { bubbles: true }));
      if (answer.value) document.getElementById('answerForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(75);
  }
  const answers = await page.evaluate(() => ({ ...__runtimeMetrics, correct: KanaRain.state.correct }));
  await context.close();
  return { url, menuRainState, gameplayWindowMs: 5000, gameplay, pauseWindowMs: 1500, paused, threeAnswers: answers, errors };
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  server = spawn(process.execPath, [path.join(__dirname, '../scripts/serve.cjs')], { env: { ...process.env, PORT: String(port) }, windowsHide: true });
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); });
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL || 'chrome', headless: true });
  const baseline = await measure(publicUrl), optimized = await measure(localUrl);
  const report = { measuredAt: new Date().toISOString(), browser: 'Chrome', viewport: { width: 390, height: 844 }, baseline, optimized,
    notes: ['Fresh isolated contexts; analytics consent denied; service workers blocked.', 'Geometry reads caused by new sprite creation or resize are legitimate.', 'Synthetic answers and progress stay inside each temporary browser context.'] };
  const filename = path.join(output, 'runtime-browser.json'); fs.writeFileSync(filename, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2)); console.log('Report: ' + filename);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await browser?.close(); server?.kill(); });
