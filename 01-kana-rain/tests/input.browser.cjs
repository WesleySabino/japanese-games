const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

async function checkPrefixInput(browser, baseUrl, { baseline = false } = {}) {
  const artifacts = path.join(__dirname, 'artifacts/input-prefix');
  fs.mkdirSync(artifacts, { recursive: true });
  const checks = [], errors = [];
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile });
    await context.addCookies([{ name: 'ng_analytics_consent', value: 'denied', url: baseUrl, sameSite: 'Lax' }]);
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(new URL('?all', baseUrl).href);
      await page.waitForFunction(() => !!window.KanaRain);
      async function fixture(char = 'ん', partner = 'ね') {
        await page.evaluate(({ char, partner }) => {
          if (KanaRain.state && !KanaRain.state.over) KanaRain.end('Input regression fixture');
          const mode = document.getElementById('mode');
          mode.value = char === 'ン' ? 'kata' : 'hira'; mode.onchange();
          // This fixture tests typing ambiguity between kana that have already debuted.
          if (KanaRain.gameData.novelty) for (const id of [char, partner].filter(Boolean)) KanaRain.gameData.novelty.seen['kana:' + id] = true;
          KanaRain.start({ reviewIds: ['kana:' + char] });
          KanaRain.state.queue = partner ? [{ id: 'kana:' + partner }] : [];
          KanaRain.state.sinceSpawn = partner ? 99999 : -99999;
        }, { char, partner });
        await page.locator('#skipCountdown').click();
        if (partner) await page.waitForFunction(() => KanaRain.state.drops.length === 2);
        await page.evaluate(() => { KanaRain.state.sinceSpawn = -99999; });
      }
      // Phones compose n and ne on the sound pad; the typed-only spelling nn goes through the text field.
      async function type(text) {
        if (mobile && text !== 'nn') {
          await page.waitForTimeout(90); await page.locator('#keyboard [data-family="n"]').tap();
          await page.waitForTimeout(90); await page.locator('#keyboard [data-slot="' + (text === 'n' ? 'n' : text.slice(1)) + '"]').tap();
        } else await page.locator('#answer').pressSequentially(text, { delay: 40 });
      }
      await fixture();
      await type('n');
      if (baseline) {
        await page.waitForTimeout(700);
        assert.equal(await page.evaluate(() => KanaRain.state.correct), 0);
        assert.equal(await page.locator('#answer').inputValue(), 'n');
        await page.screenshot({ path: path.join(artifacts, `before-${mobile ? 'mobile' : 'desktop'}.png`) });
        checks.push({ mobile, reproducedStuckN: true });
        continue;
      }
      await page.waitForFunction(() => KanaRain.state.correct === 1, null, { timeout: 1500 });
      assert.equal(await page.locator('#answer').inputValue(), '');
      assert.deepEqual(await page.evaluate(() => KanaRain.state.events.map(e => e.itemId)), ['kana:ん']);
      assert.equal(await page.locator('.drop[data-id="kana:ね"]').count(), 1);
      await page.screenshot({ path: path.join(artifacts, `after-${mobile ? 'mobile' : 'desktop'}.png`) });

      await fixture(); await type('ne');
      await page.waitForFunction(() => KanaRain.state.correct === 1);
      await page.waitForTimeout(400);
      assert.deepEqual(await page.evaluate(() => KanaRain.state.events.map(e => e.itemId)), ['kana:ね']);
      assert.equal(await page.locator('#answer').inputValue(), '');

      await fixture(); await type('nn');
      await page.waitForFunction(() => KanaRain.state.correct === 1);
      await page.waitForTimeout(400);
      assert.equal(await page.evaluate(() => KanaRain.state.events.length), 1);
      assert.equal(await page.locator('#answer').inputValue(), '');

      // Katakana offers six visible Hiragana choices; hidden romaji and pad handlers cannot submit it.
      await fixture('ン', 'ネ');
      assert.equal(await page.locator('#answerForm').isVisible(), false);
      assert.equal(await page.locator('#keyboard').isVisible(), false);
      assert.equal(await page.locator('#hiraganaChoices button').count(), 6);
      await page.evaluate(() => {
        const answer = document.getElementById('answer'); answer.value = 'n'; answer.dispatchEvent(new Event('input', { bubbles: true }));
        document.getElementById('answerForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        const keyboard = document.getElementById('keyboard');
        for (const dataset of [{ family: 'n' }, { slot: 'n' }]) keyboard.onclick({ target: { closest: () => ({ dataset }) }, detail: 0 });
      });
      await page.waitForTimeout(400);
      assert.equal(await page.evaluate(() => KanaRain.state.attempts), 0);
      const nasal = page.locator('#hiraganaChoices button[data-hiragana-id="kana:ん"]');
      if (mobile) await nasal.tap(); else await nasal.click();
      await page.waitForFunction(() => KanaRain.state.correct === 1, null, { timeout: 1500 });
      assert.deepEqual(await page.evaluate(() => KanaRain.state.events.map(e => e.itemId)), ['kana:ン']);
      assert.deepEqual(await page.evaluate(() => { const e = KanaRain.state.events.at(-1); return { response: e.response, format: e.responseFormat, method: e.inputMethod, assisted: e.assistance, recognition: e.assistanceReasons.includes('recognition-options') }; }), { response: 'ん', format: 'hiragana-choice', method: 'hiragana-choice', assisted: true, recognition: true });
      const recorded = await page.evaluate(async () => { await Learner.flush(); return Learner.attempts(); });
      await page.reload(); await page.waitForFunction(() => !!window.KanaRain);
      assert.deepEqual(await page.evaluate(() => Learner.attempts()), recorded);
      checks.push({ mobile, nAuto: true, neNotConsumed: true, nnSingleHit: true, katakanaHiraganaChoice: true, katakanaRomajiAndPadIgnored: true, historySurvivesReload: true });
    } finally { await context.close(); }
  }
  assert.deepEqual(errors, []);
  const report = { verifiedAt: new Date().toISOString(), baseUrl, isolatedProfiles: true, baseline, checks, errors };
  fs.writeFileSync(path.join(artifacts, baseline ? 'baseline.json' : new URL(baseUrl).hostname === '127.0.0.1' ? 'local.json' : 'production.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
}
module.exports = { checkPrefixInput };

if (require.main === module) {
  (async () => {
    const { chromium } = require('playwright');
    const browser = await chromium.launch({ headless: true });
    try { await checkPrefixInput(browser, process.env.KANA_RAIN_TEST_URL || 'http://127.0.0.1:4173/', { baseline: process.env.EXPECT_PREFIX_STALL === '1' }); }
    finally { await browser.close(); }
  })().catch(error => { console.error(error); process.exitCode = 1; });
}
