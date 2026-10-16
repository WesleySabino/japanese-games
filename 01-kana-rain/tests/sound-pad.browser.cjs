'use strict';
// Real-browser checks for the sound pad: fall space, touch targets, taps, bounces, cancelled
// presses, stable positions and evidence. Isolated contexts with synthetic progress only;
// screenshots and the report stay in ignored test artifacts.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');
const url = 'http://127.0.0.1:4188', out = path.join(__dirname, 'artifacts/sound-pad');
const checks = [], errors = [], contexts = [];
let browser, server;

// Minimum fall distance (px) a drop travels before reaching the pond, per viewport.
const SIZES = [[320, 568, 100], [320, 460, 60], [360, 640, 140], [390, 844, 300], [412, 915, 300], [568, 320, 120], [640, 360, 150], [844, 390, 170]];
const SEEDED = [
  { attemptId: 'seed:1', sessionId: 'seed', roundId: 'seed:r1', itemId: 'kana:あ', facet: 'form→sound', responseFormat: 'romaji', firstAttempt: true, assistance: false, assistanceReasons: [], outcome: 'correct', correct: true, reason: 'accepted', at: 1700000000000, gameId: 'kana-rain', response: 'a', chosenItemId: null, submittedItemId: null, candidateItemIds: [], firstResponseMs: 900, inputActiveMs: 400, displayActiveMs: 900, waitMs: 500, delaySinceExposureMs: null },
  { attemptId: 'seed:2', sessionId: 'seed', roundId: 'seed:r2', itemId: 'kana:か', facet: 'form→sound', responseFormat: 'romaji', firstAttempt: true, assistance: null, assistanceReasons: [], outcome: 'incorrect', correct: false, reason: 'different-item', at: 1700000100000, gameId: 'kana-rain', response: 'ta', chosenItemId: 'kana:た', submittedItemId: null, candidateItemIds: ['kana:た'], firstResponseMs: 1500, inputActiveMs: 700, displayActiveMs: 1500, waitMs: 800, delaySinceExposureMs: null },
  // One earlier hit per open kana, so drops look like ordinary play without first-reading hints.
  ...[...'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほ'].map((char, i) => ({ attemptId: 'seed:hit:' + i, sessionId: 'seed', roundId: 'seed:h' + i, itemId: 'kana:' + char, facet: 'form→sound', responseFormat: 'romaji', firstAttempt: true, assistance: false, assistanceReasons: [], outcome: 'correct', correct: true, reason: 'accepted', at: 1700000200000 + i * 1000, gameId: 'kana-rain', response: null, chosenItemId: null, submittedItemId: null, candidateItemIds: [], firstResponseMs: 1200, inputActiveMs: 600, displayActiveMs: 1200, waitMs: 600, delaySinceExposureMs: null }))
];

async function open(viewport, mobile = true) {
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, serviceWorkers: 'block' });
  contexts.push(ctx);
  await ctx.addCookies([{ name: 'ng_analytics_consent', value: 'denied', url, sameSite: 'Lax' }]);
  await ctx.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await ctx.addInitScript(seeded => {
    if (localStorage.getItem('sound-pad-fixture')) return;
    const chars = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほ'.split('');
    const novelty = { version: 1, pace: 'calm', seen: Object.fromEntries(chars.map(c => ['kana:' + c, true])), recent: [], blocked: false };
    localStorage.setItem('jp-learner-v1', JSON.stringify({ version: 2, created: 1690000000000, sequence: 40, items: {}, attemptLedger: seeded, exposureLedger: [], reveals: {}, games: { 'kana-rain': { rows: { hiragana: 6, katakana: 1 }, best: { 'arcade-v2:hira:easy:180': 321 }, accuracy: {}, playStyle: 'arcade', sound: false, novelty } } }));
    localStorage.setItem('sound-pad-fixture', '1');
  }, SEEDED);
  const page = await ctx.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url); await page.waitForFunction(() => !!window.KanaRain);
  return page;
}
async function play(page) {
  await page.locator('#startBtn').click();
  await page.locator('#skipCountdown').click();
  await page.waitForFunction(() => KanaRain.state && !KanaRain.state.paused && !KanaRain.state.countingDown && KanaRain.state.drops.length > 0);
}
// Hold the rain still and put chosen kana on screen, for repeatable geometry and screenshots.
async function scene(page, ids = ['kana:し', 'kana:つ'], progress = [.55, .2]) {
  await page.evaluate(({ ids, progress }) => {
    const g = KanaRain.state; window.KanaDifficulty.atTime = () => ({ speed: 1e-7, gap: 1e9 });
    g.queue = ids.map(id => ({ id }));
  }, { ids, progress });
  for (let i = 0; i < ids.length && await page.evaluate(() => KanaRain.state.drops.length < 2); i++) {
    await page.evaluate(() => { KanaRain.state.sinceSpawn = 1e9; }); await page.waitForTimeout(50);
  }
  await page.evaluate(progress => { const g = KanaRain.state; g.sinceSpawn = -1e9; g.drops.forEach((d, i) => { d.progress = progress[i] ?? .1; }); }, progress);
  await page.waitForTimeout(80);
}
const stage = page => page.locator('#keyboard').getAttribute('data-stage');
const counts = page => page.evaluate(() => ({ correct: KanaRain.state.correct, attempts: KanaRain.state.attempts, lives: KanaRain.state.lives }));
async function tapCompose(page, id) {
  const p = await page.evaluate(id => KanaRain.padPath(id), id);
  await page.waitForTimeout(90); await page.locator(`#keyboard [data-family="${p.family}"]`).tap();
  await page.waitForTimeout(90); await page.locator(`#keyboard [data-slot="${p.slot}"]`).tap();
}
async function layout(page) {
  return page.evaluate(() => {
    const box = el => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const field = document.querySelector('#field'), drop = KanaRain.state.drops[0];
    return {
      viewport: { width: innerWidth, height: innerHeight }, page: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, scrollY },
      field: box(field), dock: box(document.querySelector('#answerDock')), pad: box(document.querySelector('#keyboard')),
      keys: [...document.querySelectorAll('#keyboard button')].filter(b => b.offsetParent).map(box),
      drop: drop && { width: drop.w, height: drop.h }, travel: drop ? Math.max(8, field.clientHeight - drop.h - 27) - 8 : 0,
      inputMode: document.querySelector('#answer').inputMode, answerFocused: document.activeElement === document.querySelector('#answer')
    };
  });
}
const apart = (a, b) => a.right <= b.left + 1 || a.left >= b.right - 1 || a.bottom <= b.top + 1 || a.top >= b.bottom - 1;
const inside = (r, v) => r.left >= -1 && r.top >= -1 && r.right <= v.width + 1 && r.bottom <= v.height + 1;

async function geometry() {
  for (const [width, height, minTravel] of SIZES) {
    const label = `${width}x${height}`, page = await open({ width, height });
    await play(page); await scene(page);
    assert.equal(await page.locator('#keyboard').isVisible(), true, label + ' pad opens on a phone');
    const family = await layout(page);
    assert.ok(family.page.width <= width + 1 && family.page.height <= height + 1 && family.page.scrollY === 0, label + ' no page scroll');
    assert.equal(family.inputMode, 'none'); assert.equal(family.answerFocused, false, label + ' the answer field is not focused, so no native keyboard opens');
    assert.equal(family.keys.length, 15);
    assert.ok(family.keys.every(k => inside(k, family.viewport) && k.width >= 36 && k.height >= 36), label + ' family targets: ' + JSON.stringify(family.keys.map(k => [k.width, k.height])));
    assert.ok(apart(family.field, family.dock), label + ' pad never covers the rain');
    assert.ok(family.travel >= minTravel, `${label} fall distance ${family.travel}px >= ${minTravel}px`);
    const portrait = height > width;
    if (portrait) assert.ok(family.dock.height <= height * .36, label + ' whole answer dock stays under 36% of the height: ' + family.dock.height);
    else assert.ok(family.dock.width <= width * .5, label + ' landscape pad stays within half the width: ' + family.dock.width);
    if ([320, 390, 568, 844].includes(width)) await page.screenshot({ path: path.join(out, `${label}-families.png`) });
    await page.waitForTimeout(90); await page.locator('#keyboard [data-family="s"]').tap();
    assert.equal(await stage(page), 'sound');
    const sound = await layout(page);
    assert.equal(sound.keys.length, 10, label + ' nine sound slots plus Back');
    assert.ok(sound.keys.every(k => inside(k, sound.viewport) && k.width >= 36 && k.height >= 36), label + ' sound targets');
    assert.deepEqual(sound.pad, family.pad, label + ' the sounds replace the families in the same box');
    assert.equal(await page.locator('#keyboard [data-slot="i"]').textContent(), 'shi');
    if ([320, 390, 568, 844].includes(width)) await page.screenshot({ path: path.join(out, `${label}-sounds.png`) });
    await page.waitForTimeout(90); await page.locator('#keyboard [data-pad="back"]').tap();
    checks.push({ check: 'geometry', label, travel: family.travel, drop: family.drop, dock: { width: Math.round(family.dock.width), height: Math.round(family.dock.height) }, field: { width: Math.round(family.field.width), height: Math.round(family.field.height) }, minFamilyKey: [Math.min(...family.keys.map(k => Math.round(k.width))), Math.min(...family.keys.map(k => Math.round(k.height)))], minSoundKey: [Math.min(...sound.keys.map(k => Math.round(k.width))), Math.min(...sound.keys.map(k => Math.round(k.height)))] });
    await page.context().close();
  }
}

async function interaction() {
  const page = await open({ width: 390, height: 844 });
  await play(page); await scene(page, ['kana:し', 'kana:つ']);
  const families = await page.locator('#keyboard [data-family]').evaluateAll(list => list.map(b => b.getBoundingClientRect().toJSON()));
  // Rapid, deliberate two-tap answers: every drop on screen, then fresh ones.
  for (let n = 1; n <= 4; n++) {
    if (!await page.evaluate(() => KanaRain.state.drops.length)) { await page.evaluate(() => { const g = KanaRain.state; g.queue = [{ id: 'kana:は' }]; g.sinceSpawn = 1e9; }); await page.waitForFunction(() => KanaRain.state.drops.length > 0); await page.evaluate(() => { KanaRain.state.sinceSpawn = -1e9; }); }
    await tapCompose(page, await page.evaluate(() => KanaRain.state.target.id));
    await page.waitForFunction(n => KanaRain.state.correct === n, n);
  }
  assert.deepEqual(await counts(page), { correct: 4, attempts: 4, lives: 3 }, 'four quick compositions, four answers');
  assert.deepEqual(await page.locator('#keyboard [data-family]').evaluateAll(list => list.map(b => b.getBoundingClientRect().toJSON())), families, 'family positions never move between drops and answers');
  const slotsFor = async family => { await page.waitForTimeout(90); await page.locator(`#keyboard [data-family="${family}"]`).tap(); const r = await page.locator('#keyboard [data-slot],#keyboard [data-pad]').evaluateAll(list => list.map(b => b.getBoundingClientRect().toJSON())); await page.waitForTimeout(90); await page.locator('#keyboard [data-pad="back"]').tap(); return r; };
  assert.deepEqual(await slotsFor('k'), await slotsFor('y'), 'every family shows its sounds in the same slots');
  checks.push({ check: 'four rapid two-tap answers and stable family/sound positions', pass: true });

  await scene(page, ['kana:そ']);
  const before = await counts(page);
  // A bounce: two touches on the same spot a few milliseconds apart.
  const s = await page.locator('#keyboard [data-family="s"]').boundingBox(), sx = s.x + s.width / 2, sy = s.y + s.height / 2;
  await page.waitForTimeout(90); await page.touchscreen.tap(sx, sy); await page.touchscreen.tap(sx, sy);
  assert.equal(await stage(page), 'sound'); assert.deepEqual(await counts(page), before, 'the bounced second touch is not an answer');
  // A cancelled press: touch a sound, slide off it, lift elsewhere.
  const cdp = await page.context().newCDPSession(page), so = await page.locator('#keyboard [data-slot="o"]').boundingBox();
  const point = (x, y) => [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }];
  await page.waitForTimeout(90);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(so.x + so.width / 2, so.y + so.height / 2) });
  for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(so.x + so.width / 2, so.y + so.height / 2 - i * 22) }); await page.waitForTimeout(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(120);
  assert.equal(await stage(page), 'sound'); assert.deepEqual(await counts(page), before, 'sliding off a sound cancels it');
  // Control: the same synthetic touch without sliding does press a button (Back, which corrects the family).
  const back = await page.locator('#keyboard [data-pad="back"]').boundingBox();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(back.x + back.width / 2, back.y + back.height / 2) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForFunction(() => document.querySelector('#keyboard').dataset.stage === 'family');
  assert.deepEqual(await counts(page), before);
  await tapCompose(page, 'kana:そ');
  await page.waitForFunction(n => KanaRain.state.correct === n, before.correct + 1);
  assert.equal((await counts(page)).attempts, before.attempts + 1);
  // The same spot tapped again later is just a family choice, never a second submission.
  const so2 = await page.locator('#keyboard [data-family="n"]').boundingBox();
  await page.waitForTimeout(90); await page.touchscreen.tap(so2.x + so2.width / 2, so2.y + so2.height / 2);
  assert.equal((await counts(page)).attempts, before.attempts + 1);
  await page.waitForTimeout(90); await page.locator('#keyboard [data-pad="back"]').tap();
  checks.push({ check: 'bounce ignored, slide-off cancels, Back corrects, one submission per composition', pass: true });

  // An unmatched composition is a visible mistake for the highlighted drop, not a lost heart.
  await scene(page, ['kana:ほ']);
  const target = await page.evaluate(() => KanaRain.state.target.id), mistakes = await counts(page);
  await page.waitForTimeout(90); await page.locator('#keyboard [data-family="m"]').tap();
  await page.waitForTimeout(90); await page.locator('#keyboard [data-slot="u"]').tap();
  assert.match(await page.locator('#feedback').textContent(), /You chose mu/);
  assert.equal(await page.evaluate(() => Learner.attempts().at(-1).inputMethod), 'composer');
  assert.equal(await page.evaluate(() => Learner.attempts().at(-1).itemId), target);
  assert.equal((await counts(page)).lives, mistakes.lives);
  assert.equal(await page.locator('.drop.stained').count(), 1);
  checks.push({ check: 'unmatched composition stains the highlighted drop and keeps hearts', pass: true });

  // The device keyboard is an explicit choice; returning restores the pad without focusing the field.
  await page.locator('#keyboardBtn').tap();
  assert.equal(await page.locator('#keyboard').isVisible(), false);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'answer');
  assert.equal(await page.locator('#answer').evaluate(el => el.inputMode), 'text');
  await page.locator('#keyboardBtn').tap();
  assert.equal(await page.locator('#keyboard').isVisible(), true);
  assert.equal(await page.locator('#answer').evaluate(el => el.inputMode), 'none');
  const end = await layout(page);
  assert.ok(end.page.height <= 845 && end.page.scrollY === 0, 'no page scroll after all interaction');
  checks.push({ check: 'device keyboard only on request; pad restored', pass: true });

  // Pause keeps the composition; resume continues it.
  await page.waitForTimeout(90); await page.locator('#keyboard [data-family="h"]').tap();
  await page.locator('#pauseBtn').tap(); await page.locator('#resumeBtn').tap(); await page.locator('#skipCountdown').tap();
  assert.equal(await stage(page), 'sound', 'pause keeps the chosen family');
  await page.waitForTimeout(90); await page.locator('#keyboard [data-pad="back"]').tap();

  // Evidence: earlier events keep their exact shape; new ones say how they were entered.
  const ledger = await page.evaluate(async () => { await Learner.flush(); return Learner.attempts(); });
  assert.deepEqual(ledger.slice(0, SEEDED.length), SEEDED, 'seeded history is neither rewritten nor reclassified');
  assert.ok(ledger.slice(SEEDED.length).filter(e => e.outcome !== 'timeout').every(e => e.inputMethod === 'composer' && e.responseFormat === 'romaji'));
  assert.equal(await page.evaluate(() => KanaRain.gameData.best['arcade-v2:hira:easy:180']), 321);
  await page.reload(); await page.waitForFunction(() => !!window.KanaRain);
  assert.deepEqual(await page.evaluate(() => Learner.attempts()), ledger, 'all evidence survives reload');
  checks.push({ check: 'seeded history unchanged, new answers labelled composer, survives reload', events: ledger.length });
  await page.context().close();
}

async function desktop() {
  const page = await open({ width: 1440, height: 900 }, false);
  await play(page); await scene(page, ['kana:か', 'kana:な']);
  assert.equal(await page.locator('#keyboard').isVisible(), false, 'desktop starts with the physical keyboard');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'answer');
  await page.screenshot({ path: path.join(out, '1440x900-desktop.png') });
  await page.keyboard.type(await page.evaluate(() => KanaRain.accepted(KanaRain.state.target.id)[0]), { delay: 30 });
  await page.waitForFunction(() => KanaRain.state.correct === 1);
  assert.equal(await page.evaluate(() => Learner.attempts().at(-1).inputMethod), 'typing');
  await page.locator('#keyboardBtn').click();
  assert.equal(await page.locator('#keyboard').isVisible(), true, 'the pad remains available on desktop');
  await page.screenshot({ path: path.join(out, '1440x900-desktop-pad.png') });
  await page.evaluate(() => { const g = KanaRain.state; g.queue = [{ id: 'kana:な' }]; g.sinceSpawn = 1e9; });
  await page.waitForFunction(() => KanaRain.state.drops.some(d => d.id === 'kana:な'));
  await page.locator('#keyboard [data-family="n"]').click(); await page.waitForTimeout(90); await page.locator('#keyboard [data-slot="a"]').click();
  await page.waitForFunction(() => KanaRain.state.correct === 2);
  checks.push({ check: 'desktop typing first, pad optional by mouse', pass: true });
  await page.context().close();
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  server = spawn(process.execPath, [path.join(__dirname, '../scripts/serve.cjs')], { cwd: path.join(__dirname, '..'), env: { ...process.env, PORT: '4188' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(new Error('Server exited ' + code))); });
  const channel = process.env.PLAYWRIGHT_BROWSER_CHANNEL;
  browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
  await geometry(); await interaction(); await desktop();
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify({ verifiedAt: new Date().toISOString(), syntheticProgress: true, externalRequests: 'blocked', checks, errors }, null, 2) + '\n');
  console.log('PASS: sound pad; ' + checks.length + ' checks across ' + SIZES.length + ' phone sizes and desktop, zero page errors.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  for (const ctx of contexts) await ctx.close().catch(() => {});
  if (browser) await browser.close();
  if (server) server.kill();
});
