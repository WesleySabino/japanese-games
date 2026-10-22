'use strict';
// Local, production-build UX regressions. All learning evidence is generated in memory
// through the real Learner API; no saved browser profile or user export is read.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const { productionPlan, productionHtml } = require('../scripts/build.cjs');
const game = path.resolve(__dirname, '..');
const out = path.resolve(game, '../.release/quick-wins-20261021');
const report = { startedAt: new Date().toISOString(), passed: false, checks: [], screenshots: [], pageErrors: [], deniedRequests: [], contextsOpened: 0, contextsClosed: 0, browserClosed: false, serverClosed: false, userProfileAccess: false, syntheticFixturesOnly: true, serviceWorkers: 'block' };
const liveContexts = new Set();
let browser, server, origin, currentPage;
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const saveReport = () => fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify(report, null, 2) + '\n');

function validatedBuild() {
  const plan = productionPlan(), files = new Map();
  for (const entry of plan.entries) {
    const expected = entry.generated !== undefined ? Buffer.from(entry.generated) : entry.file === 'index.html' ? Buffer.from(productionHtml(entry.file)) : fs.readFileSync(entry.absolute);
    const file = path.join(game, 'dist', entry.file);
    assert.ok(fs.existsSync(file), 'Missing dist/' + entry.file + '; run pnpm build before test:quick-wins');
    const built = fs.readFileSync(file);
    assert.equal(hash(built), hash(expected), 'Stale dist/' + entry.file + '; rebuild before test:quick-wins');
    files.set('/' + entry.file, built);
  }
  report.build = { files: files.size, recordings: plan.recordings, hashes: Object.fromEntries([...files].map(([file, bytes]) => [file.slice(1), hash(bytes)])) };
  return files;
}
async function serve(files) {
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
  server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1'), file = url.pathname === '/' ? '/index.html' : url.pathname;
    const bytes = files.get(file);
    if (!bytes || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : bytes);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  origin = 'http://127.0.0.1:' + server.address().port;
  report.origin = origin;
}
async function fixture(sound = false, rows = 6) {
  const storage = new Map(), context = vm.createContext({ console, Date, Math, setTimeout, clearTimeout, localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k) } });
  context.window = context;
  for (const file of ['data.js', 'learner.js']) vm.runInContext(fs.readFileSync(path.join(game, 'src', file), 'utf8'), context);
  await context.Learner.ready;
  const base = 1700000000000, hira = context.JPData.kana.filter(k => k.script === 'hiragana');
  for (const [i, kana] of hira.entries()) context.Learner.record(kana.id, 'form→sound', { attemptId: 'quick-wins:seed:' + i, sessionId: 'quick-wins:synthetic', roundId: 'quick-wins:round:' + i, gameId: 'kana-rain', responseFormat: 'romaji', inputMethod: 'typing', firstAttempt: true, assistance: false, correct: true, response: kana.romaji, rtMs: 1200, now: base + i * 1000, deferSave: true });
  context.Learner.record('kana:ア', 'form→sound', { attemptId: 'quick-wins:old-assisted', sessionId: 'quick-wins:synthetic', roundId: 'quick-wins:old-kata', gameId: 'kana-rain', responseFormat: 'hiragana-choice', inputMethod: 'choice', firstAttempt: true, assistance: true, assistanceReasons: ['hiragana-choice'], correct: true, response: 'あ', now: base + 200000, deferSave: true });
  context.Learner.recordExposure('kana:ア', 'form→sound', { exposureId: 'quick-wins:old-exposure', reason: 'reference-audio', gameId: 'kana-rain', now: base + 210000, deferSave: true });
  Object.assign(context.Learner.gameData('kana-rain'), { rows: { hiragana: rows, katakana: 1 }, katakanaUnlocked: true, best: { 'hira:normal:180': 1981, 'arcade-v2:hira:easy:180': 321 }, accuracy: { syntheticHistorical: { correct: 7, total: 9 } }, sound, reducedEffects: true, novelty: { version: 1, pace: 'calm', seen: Object.fromEntries(hira.map(k => [k.id, true]).concat([['kana:ア', true]])), recent: [], blocked: false, cooldownRemaining: 0 }, katakanaNovelty: { version: 1, pace: 'calm', seen: { 'kana:ア': true }, recent: [], blocked: false, cooldownRemaining: 0 } });
  await context.Learner.flush();
  return JSON.parse(context.Learner.export());
}
async function open(viewport, { mobile = viewport.width < 700, sound = false, rows = 6, unavailable = false } = {}) {
  const saved = await fixture(sound, rows);
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, serviceWorkers: 'block', acceptDownloads: true });
  liveContexts.add(context); report.contextsOpened++;
  await context.addCookies([{ name: 'ng_analytics_consent', value: 'denied', url: origin, sameSite: 'Lax' }]);
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) { report.deniedRequests.push(url.href); return route.abort(); }
    if (unavailable && url.pathname === '/kana-audio-bundle/runtime-manifest.json') return route.abort();
    return route.continue();
  });
  await context.addInitScript(({ origin, saved }) => {
    if (location.origin !== origin || localStorage.getItem('quick-wins-fixture')) return;
    localStorage.setItem('jp-learner-v1', JSON.stringify(saved)); localStorage.setItem('quick-wins-fixture', 'synthetic-only');
  }, { origin, saved });
  const page = await context.newPage(); currentPage = page;
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => report.pageErrors.push({ url: page.url(), message: error.message }));
  await page.goto(origin);
  await page.waitForFunction(() => !!window.KanaRain);
  await page.evaluate(() => KanaAudio.ready);
  return page;
}
async function close(page) { await page.context().close(); liveContexts.delete(page.context()); report.contextsClosed++; }
async function shot(page, name) { const file = name + '.png'; await page.screenshot({ path: path.join(out, file) }); report.screenshots.push(file); }
const check = (name, evidence = {}) => { report.checks.push({ check: name, ...evidence }); console.log('PASS: ' + name); saveReport(); };
async function pin(page) {
  await page.evaluate(() => { window.KanaDifficulty.atTime = () => ({ speed: 1e-7, gap: 1e9 }); const g = KanaRain.state; g.sinceSpawn = -1e9; g.drops.forEach(d => { d.progress = .2; d.v = 0; }); });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function play(page, reviewId) {
  if (reviewId) await page.evaluate(id => KanaRain.start({ reviewIds: [id] }), reviewId);
  else await page.locator('#startBtn').click();
  await page.locator('#skipCountdown').click();
  await page.waitForFunction(() => KanaRain.state && !KanaRain.state.paused && !KanaRain.state.countingDown && KanaRain.state.drops.length > 0);
  await pin(page);
}
async function next(page, id) {
  assert.equal(await page.evaluate(() => KanaRain.state.drops.length), 0, 'next fixture starts after a real accepted answer');
  await page.evaluate(id => { const g = KanaRain.state; g.queue = [{ id }]; g.sinceSpawn = 1e9; }, id);
  await page.waitForFunction(() => KanaRain.state.drops.length > 0); await pin(page);
}
async function typeCorrect(page) { const text = await page.evaluate(() => JPData.kanaById[KanaRain.state.target.id].romaji); await page.locator('#answer').fill(text); await page.locator('#answer').press('Enter'); await pin(page); }
async function finish(page) { await page.locator('#pauseBtn').click(); await page.locator('#finishBtn').click(); assert.equal(await page.locator('#results').isVisible(), true); }

async function resultLayout(page) {
  return page.evaluate(() => {
    const box = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height, clientHeight: el.clientHeight, scrollHeight: el.scrollHeight, clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, scrollTop: el.scrollTop, scrollLeft: el.scrollLeft, visible: s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0 }; };
    const footer = document.querySelector('#results .result-actions'), panel = document.querySelector('#results .dialog-panel');
    const actions = [...footer.querySelectorAll('button')].map(el => { const r = box(el), hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2); return { ...r, id: el.id, enabled: !el.disabled, hit: hit === el || el.contains(hit) }; });
    const grid = document.querySelector('#resultReview .review-grid');
    let scroll = grid || document.querySelector('#results .result-content');
    while (scroll && scroll !== panel && !(getComputedStyle(scroll).overflowY.match(/auto|scroll/) && scroll.scrollHeight > scroll.clientHeight + 1)) scroll = scroll.parentElement;
    return { width: innerWidth, height: innerHeight, pageX: scrollX, pageY: scrollY, dialog: box(document.querySelector('#results')), panel: box(panel), footer: box(footer), actions, next: box(document.querySelector('#resultNext')), reviewCards: [...document.querySelectorAll('#resultReview .review-card')].map(el => ({ tag: el.tagName, tabIndex: el.tabIndex })), scroll: scroll && scroll !== panel ? { ...box(scroll), id: scroll.id, className: scroll.className, containsFooter: scroll.contains(footer) } : null };
  });
}
function assertResults(layout, label, review) {
  const inside = r => r.left >= -1 && r.top >= -1 && r.right <= layout.width + 1 && r.bottom <= layout.height + 1;
  assert.equal(layout.pageX, 0, label); assert.equal(layout.pageY, 0, label);
  for (const key of ['dialog', 'panel', 'footer']) { assert.ok(layout[key].visible && inside(layout[key]), label + ' ' + key + ' fits: ' + JSON.stringify(layout)); assert.ok(layout[key].scrollWidth <= layout[key].clientWidth + 1, label + ' no horizontal overflow'); }
  assert.ok(layout.panel.scrollHeight <= layout.panel.clientHeight + 1, label + ' panel does not scroll vertically');
  assert.equal(layout.panel.scrollTop, 0, label + ' panel starts unscrolled');
  for (const button of layout.actions.filter(b => b.visible)) assert.ok(inside(button) && button.enabled && button.hit, label + ' first-open ' + button.id + ' visible/clickable: ' + JSON.stringify(button));
  assert.equal(layout.actions.find(b => b.id === 'reviewPracticeBtn').visible, review, label + ' review availability');
  assert.equal(layout.actions.filter(b => b.visible).length, review ? 3 : 2);
}
async function detailsScroll(page, before, label) {
  assert.ok(before.scroll && !before.scroll.containsFooter, label + ' overflowing details have an independent scroll region');
  const state = await page.evaluate(() => {
    const footer = document.querySelector('#results .result-actions'), panel = document.querySelector('#results .dialog-panel');
    let el = document.querySelector('#resultReview .review-grid');
    while (el && el !== panel && !(getComputedStyle(el).overflowY.match(/auto|scroll/) && el.scrollHeight > el.clientHeight + 1)) el = el.parentElement;
    if (!el || el === panel || el.contains(footer)) return null;
    el.scrollTop = el.scrollHeight; return { top: el.scrollTop, max: el.scrollHeight - el.clientHeight };
  });
  assert.ok(state && state.top > 0 && Math.abs(state.top - state.max) <= 1, label + ' details actually scroll');
  const after = await resultLayout(page); assert.deepEqual(after.footer, before.footer, label + ' scrolling details never moves the actions'); assertResults(after, label + ' scrolled', true);
  return state;
}
async function resultsMatrix() {
  const sizes = [[360, 640], [320, 568], [390, 844], [568, 320], [1366, 768], [1440, 900]];
  for (const [i, [width, height]] of sizes.entries()) for (const review of [false, true]) {
    const label = width + 'x' + height + '-' + (review ? 'long-review' : 'no-review'), page = await open({ width, height });
    await play(page);
    if (review) {
      const secondId = await page.evaluate(() => KanaRain.state.target.id === 'kana:か' ? 'kana:あ' : 'kana:か');
      for (let n = 0; n < 2; n++) { if (n) await next(page, secondId); await page.locator('#answer').fill('zzz'); await page.locator('#answer').press('Enter'); await typeCorrect(page); }
      assert.equal(await page.evaluate(() => KanaRain.state.errors), 2);
    }
    await finish(page);
    // Geometry is read before any locator click or scrollIntoView can rescue a clipped action.
    const initial = await resultLayout(page); assertResults(initial, label, review);
    if (review) {
      assert.equal(initial.reviewCards.length, 2, label + ' real wrong submissions produce two review cards');
      assert.ok(initial.reviewCards.every(card => card.tag === 'BUTTON' && card.tabIndex === 0), label + ' recorded review cards are keyboard focusable');
      await page.evaluate(() => { const grid = document.querySelector('#resultReview .review-grid'), cards = [...grid.children]; while (grid.children.length < 20) { const card = cards[grid.children.length % cards.length].cloneNode(true); card.dataset.quickWinsStress = 'dom-only'; grid.append(card); } });
      const stress = await resultLayout(page); assertResults(stress, label + ' synthetic20cards', true);
      await shot(page, label + '-initial');
      const scrolled = await detailsScroll(page, stress, label);
      // Again is the real result autofocus. Shift+Tab traverses Review then the last card.
      await page.keyboard.press('Shift+Tab'); assert.equal(await page.evaluate(() => document.activeElement.id), 'reviewPracticeBtn');
      await page.keyboard.press('Shift+Tab'); assert.equal(await page.evaluate(() => document.activeElement.classList.contains('review-card')), true);
      const attempts = await page.evaluate(() => Learner.attempts().length); await page.keyboard.press('Enter');
      assert.equal(await page.locator('#results').isVisible(), true); assert.equal(await page.evaluate(() => Learner.attempts().length), attempts, 'listening is not an answer');
      assertResults(await resultLayout(page), label + ' keyboard card focus', true);
      await shot(page, label + '-scrolled-card-focus');
      const actionId = ['reviewPracticeBtn', 'againBtn', 'backBtn'][i % 3], rect = (await resultLayout(page)).actions.find(b => b.id === actionId);
      await page.mouse.click((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2);
      if (actionId === 'backBtn') assert.equal(await page.locator('#welcome').isVisible(), true);
      else assert.equal(await page.evaluate(() => KanaRain.state.sessionDuration), actionId === 'reviewPracticeBtn' ? 60 : 180);
      check('results ' + label, { initial, stressCards: 20, stressIsDomOnly: true, detailScroll: scrolled, clicked: actionId });
    } else {
      await shot(page, label + '-initial'); const actionId = i % 2 ? 'backBtn' : 'againBtn', rect = initial.actions.find(b => b.id === actionId);
      await page.mouse.click((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2);
      if (actionId === 'backBtn') assert.equal(await page.locator('#welcome').isVisible(), true); else assert.equal(await page.evaluate(() => KanaRain.state.sessionDuration), 180);
      check('results ' + label, { initial, clicked: actionId });
    }
    await close(page);
  }
}
async function tabUntil(page, selector, backwards = false) {
  const visited = [];
  for (let i = 0; i < 50; i++) { if (await page.evaluate(selector => document.activeElement.matches(selector), selector)) return visited; await page.keyboard.press(backwards ? 'Shift+Tab' : 'Tab'); visited.push(await page.evaluate(() => document.activeElement.id || document.activeElement.dataset.slot || document.activeElement.dataset.family || document.activeElement.tagName)); }
  assert.fail('Keyboard Tab could not reach ' + selector + ': ' + visited.join(','));
}
async function padKeyboard() {
  const page = await open({ width: 1366, height: 768 }, { mobile: false, rows: 27 }); await play(page, 'kana:や');
  await tabUntil(page, '#keyboardBtn'); await page.keyboard.press('Enter');
  const family = '#keyboard [data-family="y"]', first = '#keyboard [data-slot="a"]';
  const traversal = await tabUntil(page, family); await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(selector => document.activeElement.matches(selector), first), true, 'Enter on Y moves focus to first enabled sound');
  await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.dataset.slot), 'u', 'Tab skips disabled i');
  await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.dataset.slot), 'o', 'Tab skips disabled e');
  await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.dataset.pad), 'back');
  await page.keyboard.press('Space'); assert.equal(await page.evaluate(selector => document.activeElement.matches(selector), family), true, 'Space Back returns focus to Y');
  await page.keyboard.press('Space'); assert.equal(await page.evaluate(selector => document.activeElement.matches(selector), first), true, 'Space family opens first sound');
  await page.keyboard.press('Enter'); await page.waitForFunction(() => KanaRain.state.correct === 1);
  assert.equal(await page.evaluate(selector => document.activeElement.matches(selector), family), true, 'correct answer restores originating family');
  for (let i = 0; i < 2; i++) { await next(page, 'kana:や'); await page.keyboard.press(i ? 'Enter' : 'Space'); await page.keyboard.press(i ? 'Space' : 'Enter'); await page.waitForFunction(n => KanaRain.state.correct === n, i + 2); assert.equal(await page.evaluate(selector => document.activeElement.matches(selector), family), true); }
  await next(page, 'kana:や'); await page.keyboard.press('Enter'); await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => KanaRain.state.errors), 1, 'wrong yu is a real wrong answer');
  assert.equal(await page.evaluate(selector => document.activeElement.matches(selector), family), true, 'wrong answer restores Y');
  await page.keyboard.press('Space'); await page.keyboard.press('Space'); await page.waitForFunction(() => KanaRain.state.correct === 4);
  // Keyboard intent survives a pause, but explicit pointer focus on the answer overrides it.
  await next(page, 'kana:や'); await page.keyboard.press('Enter'); await page.keyboard.press('Escape'); await page.keyboard.press('Enter'); await page.locator('#skipCountdown').click();
  assert.equal(await page.evaluate(selector => document.activeElement.matches(selector), first), true, 'resume keeps keyboard pad intent');
  await page.locator('#answer').click(); await page.keyboard.type('x'); await page.locator('#pauseBtn').click(); await page.locator('#resumeBtn').click(); await page.locator('#skipCountdown').click();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'answer', 'explicit typing replaces previous pad focus intent on resume');
  assert.equal(await page.locator('#answer').inputValue(), 'x');
  await shot(page, 'pad-desktop-real-keyboard'); check('pad keyboard Tab/Enter/Space, disabled slots, Back, correct/wrong, cycles, resume and explicit typing', { traversal, correct: 4, errors: 1 }); await close(page);
}
async function padTouch() {
  const page = await open({ width: 390, height: 844 }, { rows: 27 }); await play(page, 'kana:あ');
  await page.evaluate(() => { window.quickWinsClicks = []; document.querySelector('#keyboard').addEventListener('click', e => { const b = e.target.closest('button'); if (b) quickWinsClicks.push({ at: performance.now(), detail: e.detail, family: b.dataset.family, slot: b.dataset.slot }); }, true); });
  const counts = () => page.evaluate(() => ({ correct: KanaRain.state.correct, errors: KanaRain.state.errors, attempts: KanaRain.state.attempts }));
  const noNative = async () => { assert.equal(await page.locator('#answer').evaluate(el => el.inputMode), 'none'); assert.notEqual(await page.evaluate(() => document.activeElement.id), 'answer', 'touch pad does not focus answer/request native keyboard'); };
  const bounces = [];
  for (let i = 0; i < 3; i++) {
    if (i) await next(page, 'kana:あ'); const before = await counts(); await page.waitForTimeout(90);
    const rect = await page.locator('#keyboard [data-family="a"]').boundingBox(), x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
    await page.touchscreen.tap(x, y); await page.touchscreen.tap(x, y);
    const clicks = await page.evaluate(() => quickWinsClicks.slice(-2));
    assert.equal(clicks.length, 2); const gap = clicks[1].at - clicks[0].at; assert.ok(gap < 70, 'real bounce must reach browser under70ms, got ' + gap);
    assert.deepEqual(await counts(), before, 'under70ms repeated touch is not an answer'); assert.equal(await page.locator('#keyboard').getAttribute('data-stage'), 'sound'); await noNative();
    await page.waitForTimeout(90); await page.locator('#keyboard [data-slot="a"]').tap(); await page.waitForFunction(n => KanaRain.state.correct === n, i + 1);
    assert.equal((await counts()).attempts, before.attempts + 1, 'intentional touch commits exactly once'); await noNative(); bounces.push({ gapMs: gap, correctAfter: i + 1 });
  }
  await shot(page, 'pad-phone-touch-cycles'); check('pad touch three cycles: trusted under70ms bounce ignored, deliberate tap submits once, answer remains unfocused', { bounces, nativeKeyboardEvidence: 'inputMode none and answer not focused; no claim of testing mobile OS keyboard' }); await close(page);
  const pointer = await open({ width: 1366, height: 768 }, { mobile: false, rows: 27 }); await play(pointer, 'kana:あ'); await pointer.locator('#keyboardBtn').click(); await pointer.waitForTimeout(90); await pointer.locator('#keyboard [data-family="a"]').click();
  assert.notEqual(await pointer.evaluate(() => document.activeElement.id), 'answer'); assert.notEqual(await pointer.evaluate(() => document.activeElement.dataset.slot), 'a', 'pointer does not receive keyboard-only slot focus'); await pointer.waitForTimeout(90); await pointer.locator('#keyboard [data-slot="a"]').click(); assert.equal(await pointer.evaluate(() => KanaRain.state.correct), 1); assert.notEqual(await pointer.evaluate(() => document.activeElement.id), 'answer');
  check('pad desktop pointer does not transfer focus to answer or first sound'); await close(pointer);
}
async function snapshot(page) { return page.evaluate(() => { const saved = JSON.parse(Learner.export()), gd = saved.games['kana-rain']; return { attempts: saved.attemptLedger, exposures: saved.exposureLedger, protected: Object.fromEntries(['rows', 'best', 'accuracy', 'novelty', 'katakanaNovelty', 'katakanaUnlocked'].map(key => [key, gd[key]])) }; }); }
function preserved(before, after) { assert.deepEqual(after.protected, before.protected, 'audio preference does not reset progression, brakes or historical best'); assert.deepEqual(after.attempts, before.attempts, 'audio preference does not alter old attempts'); assert.deepEqual(after.exposures.slice(0, before.exposures.length), before.exposures, 'audio preference preserves old exposures'); }
async function soundState(page, expected) {
  assert.equal(await page.evaluate(() => KanaRain.gameData.sound), expected);
  assert.equal(await page.evaluate(() => KanaAudio.enabled), expected);
  for (const id of ['soundBtn', 'settingsSoundBtn']) { assert.equal(await page.locator('#' + id).getAttribute('aria-pressed'), String(expected)); assert.equal(await page.locator('#' + id).isEnabled(), true); }
  assert.equal(await page.locator('#settingsSoundState').textContent(), expected ? 'On' : 'Off');
}
async function settingsSound() {
  for (const initial of [false, true]) {
    const page = await open({ width: 390, height: 844 }, { sound: initial }); const before = await snapshot(page); await soundState(page, initial);
    await page.locator('#settingsBtn').click(); assert.match(await page.locator('#settingsNote').textContent(), /Progress stays.*device.*export.*My Kana Garden/);
    await page.locator('#settingsSoundBtn').click(); await soundState(page, !initial); preserved(before, await snapshot(page));
    await shot(page, 'settings-menu-initial-' + initial); await page.locator('#closeSettings').click(); await page.locator('#soundBtn').click(); await soundState(page, initial);
    await page.locator('#settingsBtn').click(); await page.locator('#settingsSoundBtn').click(); await page.reload(); await page.waitForFunction(() => !!window.KanaRain); await page.evaluate(() => KanaAudio.ready); await soundState(page, !initial); preserved(before, await snapshot(page));
    await play(page); await page.locator('#pauseBtn').click(); const pausedBefore = await snapshot(page); const t = await page.evaluate(() => KanaRain.state.t); await page.locator('#pauseSettingsBtn').click();
    assert.match(await page.locator('#settingsNote').textContent(), /current session is paused.*Progress stays.*export.*My Kana Garden/);
    await page.locator('#settingsSoundBtn').click(); await soundState(page, initial); await page.waitForTimeout(100); assert.equal(await page.evaluate(() => KanaRain.state.t), t); preserved(pausedBefore, await snapshot(page));
    await shot(page, 'settings-paused-initial-' + initial); await page.locator('#closeSettings').click(); assert.equal(await page.locator('#pauseOverlay').isVisible(), true); assert.equal(await page.evaluate(() => KanaRain.state.paused), true);
    await page.locator('#pauseGardenBtn').click(); const downloadWait = page.waitForEvent('download'); await page.locator('#exportBtn').click(); const download = await downloadWait, stream = await download.createReadStream(), chunks = []; for await (const chunk of stream) chunks.push(chunk); const exported = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    assert.equal(exported.games['kana-rain'].sound, initial); preserved(before, { attempts: exported.attemptLedger, exposures: exported.exposureLedger, protected: Object.fromEntries(Object.keys(before.protected).map(key => [key, exported.games['kana-rain'][key]])) });
    check('settings sound initial=' + initial + ': menu and pause, global synchronization, reload/export and learning data preserved', { syntheticAttemptsPreserved: before.attempts.length, oldExposuresPreserved: before.exposures.length }); await close(page);
  }
  const page = await open({ width: 1366, height: 768 }, { unavailable: true });
  await page.waitForFunction(() => document.querySelector('#soundBtn').disabled);
  await page.locator('#settingsBtn').click();
  for (const id of ['soundBtn', 'settingsSoundBtn']) { assert.equal(await page.locator('#' + id).isDisabled(), true); assert.equal(await page.locator('#' + id).getAttribute('aria-label'), 'Sound unavailable'); }
  assert.equal(await page.locator('#settingsSoundState').textContent(), 'Unavailable');
  check('unavailable audio disables both synchronized sound controls'); await close(page);
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  try {
    const files = validatedBuild(); await serve(files); browser = await chromium.launch({ headless: true });
    await resultsMatrix(); await padKeyboard(); await padTouch(); await settingsSound();
    assert.deepEqual(report.pageErrors, [], 'zero game page errors'); assert.deepEqual(report.deniedRequests, [], 'no outside HTTP requests were attempted');
    report.passed = true;
  } catch (error) {
    report.failure = { message: error.message, stack: error.stack }; console.error(error);
    if (currentPage && !currentPage.isClosed()) try { await shot(currentPage, 'failure'); } catch {}
    process.exitCode = 1;
  } finally {
    for (const context of liveContexts) try { await context.close(); report.contextsClosed++; } catch {}
    liveContexts.clear();
    if (browser) { await browser.close(); report.browserClosed = true; }
    if (server) { await new Promise(resolve => server.close(resolve)); report.serverClosed = true; }
    report.finishedAt = new Date().toISOString(); saveReport();
    console.log((report.passed ? 'PASS' : 'FAIL') + ': quick wins, ' + report.checks.length + ' checks; report ' + path.join(out, 'verification.json'));
  }
})();
