'use strict';
// Exercise the player's file-import flow against the production build. The only
// progress used here is generated below; never read a personal browser or export.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const vm = require('node:vm');
const { chromium } = require('playwright');
const { currentBuild } = require('./helpers/update-fixture.cjs');
const root = path.resolve(__dirname, '..'), out = path.join(__dirname, 'artifacts/import');
const PRIMARY = 'jp-learner-v1:protected:v1', FACET = 'form→sound';
const report = { startedAt: new Date().toISOString(), passed: false, syntheticFixturesOnly: true, personalProfileAccess: false, personalBackupAccess: false, productionAccess: false, serviceWorkers: 'block', checks: [], screenshots: [], pageErrors: [], outsideRequests: [], contextsOpened: 0, contextsClosed: 0 };
const live = new Set();
let browser, server, origin, activePage;
function saveReport() { fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify(report, null, 2) + '\n'); }
function check(name, evidence = {}) { report.checks.push({ name, ...evidence }); console.log('PASS: ' + name); saveReport(); }
const clone = value => JSON.parse(JSON.stringify(value));

async function makeFixtures() {
  const context = vm.createContext({ console, Date, Math, setTimeout, clearTimeout }); context.window = context;
  for (const file of ['data.js', 'learner.js']) vm.runInContext(fs.readFileSync(path.join(root, 'src', file), 'utf8'), context);
  await context.Learner.ready;
  const now = Date.now(), L = context.Learner;
  L.record('kana:あ', FACET, { attemptId: 'import-test:existing-correct', sessionId: 'import-test:existing', gameId: 'kana-rain', roundId: 'import-test:existing-round-1', correct: true, firstAttempt: true, assistance: false, inputMethod: 'typing', responseFormat: 'romaji', response: 'a', now: now - 200000, deferSave: true });
  L.record('kana:い', FACET, { attemptId: 'import-test:existing-wrong', sessionId: 'import-test:existing', gameId: 'kana-rain', roundId: 'import-test:existing-round-2', correct: false, firstAttempt: true, assistance: false, inputMethod: 'typing', responseFormat: 'romaji', response: 'u', now: now - 190000, deferSave: true });
  L.recordExposure('kana:あ', FACET, { exposureId: 'import-test:existing-exposure', reason: 'reference-audio', gameId: 'kana-rain', now: now - 180000, deferSave: true });
  Object.assign(L.gameData('kana-rain'), { rows: { hiragana: 6, katakana: 1 }, katakanaUnlocked: true, sound: false, reducedEffects: true, best: { 'arcade-v2:hira:easy:180': 321 }, sessions: 5, syntheticExisting: { keep: ['current', 42] }, novelty: { version: 1, pace: 'calm', seen: { 'kana:あ': true, 'kana:い': true, 'kana:ア': true }, recent: [], blocked: false, cooldownRemaining: 0 }, katakanaNovelty: { version: 1, pace: 'calm', seen: { 'kana:ア': true }, recent: [], blocked: false, cooldownRemaining: 0 } });
  Object.assign(L.gameData('other-synthetic-game'), { keep: ['unrelated game', 77] });
  const initial = JSON.parse(L.export());
  L.record('kana:ア', FACET, { attemptId: 'import-test:new-correct', sessionId: 'import-test:imported', gameId: 'kana-rain', roundId: 'import-test:new-round', correct: true, firstAttempt: true, assistance: false, inputMethod: 'choice', responseFormat: 'hiragana-choice', response: 'あ', candidateItemIds: ['kana:あ', 'kana:い', 'kana:う'], chosenItemId: 'kana:あ', now: now - 100000, deferSave: true });
  L.recordExposure('kana:イ', FACET, { exposureId: 'import-test:new-exposure', reason: 'reference-audio', gameId: 'kana-rain', now: now - 90000, deferSave: true });
  const partial = JSON.parse(L.export());
  partial.attemptLedger = partial.attemptLedger.filter(e => e.attemptId === 'import-test:new-correct');
  partial.exposureLedger = partial.exposureLedger.filter(e => e.exposureId === 'import-test:new-exposure');
  partial.games['kana-rain'].rows = { hiragana: 3, katakana: 9 };
  partial.games['kana-rain'].best = { 'arcade-v2:hira:easy:180': 12, 'arcade-v2:kata:easy:180': 99 };
  partial.games['kana-rain'].sound = true; partial.games['kana-rain'].reducedEffects = false;
  partial.games['kana-rain'].novelty.pace = 'bold'; partial.games['kana-rain'].katakanaNovelty.pace = 'bold';
  delete partial.games['other-synthetic-game']; delete partial.games['kana-rain'].syntheticExisting;
  const manual = { version: 2, created: now - 86400000, sequence: 0, items: {}, games: {}, attemptLedger: [], exposureLedger: [], reveals: {}, errorLog: [] };
  const hira = context.JPData.kana.filter(k => k.script === 'hiragana'), kata = context.JPData.kana.filter(k => k.script === 'katakana' && context.JPData.rowsOrder.indexOf(k.row) <= context.JPData.rowsOrder.indexOf('r'));
  // The legacy baseline is an explicit estimate, never fabricated answer events.
  // Account for the existing wrong answer instead of erasing it to reach 90%.
  function estimate(base, events) {
    const f = { ...base };
    for (const ev of events) {
      if (ev.outcome === 'timeout') continue;
      const w = ev.assistance === false ? 1 : .5, R = Math.pow(1 + Math.max(0, ev.at - f.lastReview) / 86400000 / (9 * Math.max(.02, f.stability)), -1);
      if (ev.correct) { f.correct++; const gain = 1 + w * Math.exp(.9) * (11 - f.difficulty) / 10 * Math.pow(f.stability, -.2) * (Math.exp((1 - R) * 1.5) - 1); f.stability *= Math.max(1.05, gain); f.difficulty = Math.max(1, Math.min(10, f.difficulty - .15 * w)); }
      else { f.stability = Math.max(.02, f.stability * (.35 + .3 * (1 - w))); f.difficulty = Math.max(1, Math.min(10, f.difficulty + .6 * w)); }
      f.reps++; f.lastReview = ev.at;
    }
    const R = Math.pow(1 + Math.max(0, now - f.lastReview) / 86400000 / (9 * Math.max(.02, f.stability)), -1);
    return .6 * R + .4 * Math.min(1, Math.log1p(f.stability) / Math.log1p(60));
  }
  for (const k of hira) {
    const events = initial.attemptLedger.filter(ev => ev.itemId === k.id && ev.facet === FACET), at = events.reduce((t, ev) => Math.min(t, ev.at - 1), now);
    const base = { stability: .2, difficulty: 5, lastReview: at, correct: 1, errors: 0, reps: 1, lapses: 0 }; let low = .000001, high = 60;
    while (estimate({ ...base, stability: high }, events) < .9) high *= 10;
    for (let n = 0; n < 100; n++) { const mid = (low + high) / 2; if (estimate({ ...base, stability: mid }, events) < .9) low = mid; else high = mid; }
    base.stability = high;
    manual.items[k.id] = { itemId: k.id, firstSeen: at, lastSeen: at, lastError: 0, exposures: 0, facets: {}, confusions: {}, confusionsByFacet: {}, scaffold: { romaji: false, furigana: true, gloss: true }, flags: {}, legacyFacets: { [FACET]: base } };
  }
  const seen = Object.fromEntries(hira.concat(kata).map(k => [k.id, true])), kataSeen = Object.fromEntries(kata.map(k => [k.id, true]));
  manual.games['kana-rain'] = { rows: { hiragana: 27, katakana: 9 }, katakanaUnlocked: true, novelty: { version: 1, pace: 'calm', seen, recent: [], blocked: false, cooldownRemaining: 0 }, katakanaNovelty: { version: 1, pace: 'calm', seen: kataSeen, recent: [], blocked: false, cooldownRemaining: 0 } };
  manual.manualReconstruction = [{ at: now, kind: 'user-requested-approximate-baseline', hiraganaFamiliarityTarget: .9, hiraganaCount: 104, katakanaThrough: 'ロ', katakanaCount: 43, observedAttemptEventsAdded: 0, observedExposureEventsAdded: 0, note: 'Synthetic test estimate. No measured answer or exposure events were generated for this baseline.' }];
  assert.equal(hira.length, 104); assert.equal(kata.length, 43);
  return { initial, partial, manual };
}
async function serve(build) {
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
  server = http.createServer((req, res) => { const file = new URL(req.url, 'http://127.0.0.1').pathname, key = file === '/' ? '/index.html' : file, bytes = build.files.get(key); res.writeHead(bytes && ['GET', 'HEAD'].includes(req.method) ? 200 : 404, { 'Content-Type': mime[path.extname(key)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(req.method === 'HEAD' ? undefined : bytes); });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  origin = 'http://127.0.0.1:' + server.address().port; report.origin = origin;
}
async function open(seed, viewport = { width: 1366, height: 768 }) {
  const mobile = viewport.width < 700 || viewport.height < 400;
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, serviceWorkers: 'block', acceptDownloads: true }); live.add(context); report.contextsOpened++;
  await context.addCookies([{ name: 'ng_analytics_consent', value: 'denied', url: origin }]);
  await context.route('**/*', route => { const url = new URL(route.request().url()); if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) { report.outsideRequests.push(url.href); return route.abort(); } return route.continue(); });
  await context.addInitScript(({ origin, seed }) => { if (location.origin !== origin || localStorage.getItem('import-test-seeded')) return; localStorage.setItem('jp-learner-v1', JSON.stringify(seed)); localStorage.setItem('import-test-seeded', 'synthetic-only'); }, { origin, seed });
  const page = await context.newPage(); activePage = page; page.setDefaultTimeout(12000); page.on('pageerror', error => report.pageErrors.push(error.message));
  await page.goto(origin); await page.waitForFunction(() => !!window.KanaRain); await page.waitForFunction(() => Learner.persistenceStatus().state === 'saved');
  return page;
}
async function close(page) { const context = page.context(); await context.close(); if (live.delete(context)) report.contextsClosed++; }
async function shot(page, name) { const file = name + '.png'; await page.screenshot({ path: path.join(out, file) }); report.screenshots.push(file); }
async function garden(page, touch = false) { await page.locator('#gardenBtn')[touch ? 'tap' : 'click'](); await page.locator('#progressDialog').waitFor({ state: 'visible' }); }
async function snapshot(page) { return page.evaluate(() => JSON.parse(Learner.export())); }
async function stores(page) { return page.evaluate(async PRIMARY => { const memory = JSON.parse(Learner.export()), local = JSON.parse(localStorage.getItem(PRIMARY)); const idb = await new Promise((resolve, reject) => { const r = indexedDB.open('kana-garden', 1); r.onerror = () => reject(r.error); r.onsuccess = () => { const db = r.result, tx = db.transaction('learner'), get = tx.objectStore('learner').get(PRIMARY); get.onsuccess = () => resolve(get.result); get.onerror = () => reject(get.error); tx.oncomplete = tx.onabort = () => db.close(); }; }); return { memory, local, idb, status: Learner.persistenceStatus() }; }, PRIMARY); }
function factsPreserved(before, after) { for (const [ledger, id] of [['attemptLedger', 'attemptId'], ['exposureLedger', 'exposureId']]) { const index = new Map(after[ledger].map(ev => [ev[id], ev])); for (const ev of before[ledger]) assert.deepEqual(index.get(ev[id]), ev, 'preserve existing ' + ev[id]); assert.equal(index.size, after[ledger].length, 'no duplicate immutable facts'); } }
function unchanged(before, after) { assert.deepEqual(after.attemptLedger, before.attemptLedger); assert.deepEqual(after.exposureLedger, before.exposureLedger); assert.deepEqual(after.games, before.games); assert.deepEqual(after.items, before.items); assert.deepEqual(after.manualReconstruction, before.manualReconstruction); }
function payload(data, name = 'synthetic-progress.json') { return { name, mimeType: 'application/json', buffer: Buffer.from(typeof data === 'string' ? data : JSON.stringify(data)) }; }
async function choose(page, data, { touch = false, keyboard = false } = {}) {
  const chooser = page.waitForEvent('filechooser');
  if (keyboard) { await page.locator('#importBtn').focus(); await page.keyboard.press('Enter'); }
  else await page.locator('#importBtn')[touch ? 'tap' : 'click']();
  // The oversize rejection deliberately sends more than 32 MiB through the
  // browser protocol; allow transfer time independently of the app's UI waits.
  await (await chooser).setFiles(payload(data), { timeout: 45000 });
}
async function preview(page, data, options) { await choose(page, data, options); await page.locator('#importPreview').waitFor({ state: 'visible' }); await page.waitForFunction(() => !document.querySelector('#applyImportBtn').disabled); }
async function apply(page, keyboard = false) {
  if (keyboard) { await page.locator('#applyImportBtn').focus(); await page.keyboard.press('Enter'); } else await page.locator('#applyImportBtn').click();
  await page.waitForFunction(() => /saved on this device|save is pending|could not.*sav|only in memory/i.test(document.querySelector('#importStatus').textContent));
  await page.waitForFunction(() => Learner.persistenceStatus().state === 'saved');
}
async function reopen(page) { await page.reload(); await page.waitForFunction(() => !!window.KanaRain); await page.waitForFunction(() => Learner.persistenceStatus().state === 'saved'); }

async function cancelAndInvalid(fixtures) {
  const page = await open(fixtures.initial); await garden(page); const before = await snapshot(page);
  await preview(page, fixtures.partial, { keyboard: true }); unchanged(before, await snapshot(page));
  const downloadWait = page.waitForEvent('download'); await page.locator('#importBackupBtn').click(); const download = await downloadWait, stream = await download.createReadStream(), chunks = []; for await (const chunk of stream) chunks.push(chunk);
  assert.equal(download.suggestedFilename(), 'kana-rain-progress.json'); assert.deepEqual(JSON.parse(Buffer.concat(chunks).toString('utf8')), before); unchanged(before, await snapshot(page));
  check('preview backup download contains the complete current history before any import');
  await page.locator('#cancelImportBtn').focus(); await page.keyboard.press('Enter'); await page.locator('#importPreview').waitFor({ state: 'hidden' }); unchanged(before, await snapshot(page));
  check('file chooser and keyboard preview/cancel leave current evidence and games unchanged');
  const zeroRows = clone(fixtures.partial), excessiveRows = clone(fixtures.partial); zeroRows.games['kana-rain'].rows.katakana = 0; excessiveRows.games['kana-rain'].rows.hiragana = 999;
  const bad = [ ['malformed JSON', '{broken'], ['unsupported version', { ...clone(fixtures.partial), version: 999 }], ['prototype pollution', '{"version":2,"items":{},"games":{},"__proto__":{"polluted":"bad"}}'], ['zero curriculum rows', zeroRows], ['out-of-catalogue curriculum rows', excessiveRows], ['oversize 32 MiB', ' '.repeat(32 * 1024 * 1024 + 1)] ];
  for (const [name, data] of bad) {
    await choose(page, data); await page.waitForFunction(() => document.querySelector('#importStatus').dataset.kind === 'error');
    assert.equal(await page.locator('#applyImportBtn').isVisible(), false, name + ': cannot apply rejected file'); unchanged(before, await snapshot(page)); assert.equal(await page.evaluate(() => Object.prototype.polluted), undefined);
    check(name + ' rejected before any progress mutation');
  }
  await close(page);
}
async function mergeAndReload(fixtures) {
  const page = await open(fixtures.initial); await garden(page); const before = await snapshot(page); await preview(page, fixtures.partial); await apply(page, true);
  const after = await snapshot(page); factsPreserved(before, after); factsPreserved(fixtures.partial, after);
  assert.equal(after.attemptLedger.length, before.attemptLedger.length + 1); assert.equal(after.exposureLedger.length, before.exposureLedger.length + 1);
  const gd = after.games['kana-rain']; assert.equal(gd.rows.hiragana, 6); assert.equal(gd.rows.katakana, 9); assert.equal(gd.best['arcade-v2:hira:easy:180'], 321); assert.equal(gd.best['arcade-v2:kata:easy:180'], 99);
  assert.equal(gd.sound, false); assert.equal(gd.reducedEffects, true); assert.equal(gd.novelty.pace, 'calm'); assert.equal(gd.katakanaNovelty.pace, 'calm'); assert.deepEqual(gd.syntheticExisting, before.games['kana-rain'].syntheticExisting); assert.deepEqual(after.games['other-synthetic-game'], before.games['other-synthetic-game']);
  let saved = await stores(page); assert.deepEqual(saved.local, saved.memory); assert.deepEqual(saved.idb, saved.memory);
  check('partial import unions immutable facts, keeps earned maxima, current settings and unrelated games', { attempts: after.attemptLedger.length, exposures: after.exposureLedger.length, rows: gd.rows });
  await preview(page, fixtures.partial); await apply(page); const repeated = await snapshot(page); unchanged(after, repeated);
  check('importing the same file twice is idempotent');
  await reopen(page); const restored = await snapshot(page); factsPreserved(after, restored); assert.deepEqual(restored.games['kana-rain'].rows, after.games['kana-rain'].rows); assert.equal(restored.games['kana-rain'].sound, false); saved = await stores(page); assert.deepEqual(saved.local, saved.memory); assert.deepEqual(saved.idb, saved.memory);
  check('real reload recovers merged progress from native protected localStorage and IndexedDB'); await close(page);
}
async function manualBaseline(fixtures) {
  const page = await open(fixtures.initial); await garden(page); const before = await snapshot(page); await preview(page, fixtures.manual); await apply(page);
  const after = await snapshot(page); factsPreserved(before, after); assert.equal(after.attemptLedger.length, before.attemptLedger.length); assert.equal(after.exposureLedger.length, before.exposureLedger.length);
  const mastery = await page.evaluate(() => JPData.kana.filter(k => k.script === 'hiragana').map(k => Learner.mastery(k.id, 'form→sound'))); assert.equal(mastery.length, 104); assert.ok(mastery.every(n => n >= .8999), 'estimated Hiragana familiarity remains at least approximately 90%');
  const gd = after.games['kana-rain']; assert.equal(gd.rows.hiragana, 27); assert.equal(gd.rows.katakana, 9); assert.equal(gd.katakanaUnlocked, true); assert.equal(Object.keys(gd.katakanaNovelty.seen).length, 43); assert.equal(gd.katakanaNovelty.seen['kana:ロ'], true); assert.notEqual(gd.katakanaNovelty.seen['kana:ワ'], true); assert.equal(after.manualReconstruction.length, 1);
  await preview(page, fixtures.manual); await apply(page); const repeated = await snapshot(page); assert.deepEqual(repeated.attemptLedger, after.attemptLedger); assert.deepEqual(repeated.exposureLedger, after.exposureLedger); assert.deepEqual(repeated.manualReconstruction, after.manualReconstruction);
  await reopen(page); const restored = await snapshot(page); factsPreserved(after, restored); assert.deepEqual(restored.attemptLedger, after.attemptLedger); assert.ok(restored.exposureLedger.filter(ev => !after.exposureLedger.some(old => old.exposureId === ev.exposureId)).every(ev => ev.reason === 'lesson-reference'), 'reload adds only the actual visible menu lesson references'); assert.equal(restored.games['kana-rain'].katakanaNovelty.seen['kana:ロ'], true); assert.equal(restored.games['kana-rain'].rows.katakana, 9);
  const reloadedMastery = await page.evaluate(() => JPData.kana.filter(k => k.script === 'hiragana').map(k => Learner.mastery(k.id, 'form→sound'))); assert.equal(reloadedMastery.length, 104); assert.ok(reloadedMastery.every(n => n >= .8999), 'all 104 estimated familiarities survive native reload'); const saved = await stores(page); assert.deepEqual(saved.local, saved.memory); assert.deepEqual(saved.idb, saved.memory);
  check('explicit 90% baseline reaches all 104 Hiragana and 43 Katakana through ロ without invented observed facts; repeated import and reload preserve provenance', { minimumFamiliarity: Math.min(...mastery), maximumFamiliarity: Math.max(...mastery), estimatedItems: mastery.length }); await close(page);
}
async function defaultPreferences(fixtures) {
  const seed = clone(fixtures.initial), imported = clone(fixtures.partial); delete seed.games['kana-rain'].sound; delete seed.games['kana-rain'].reducedEffects; imported.games['kana-rain'].sound = false; imported.games['kana-rain'].reducedEffects = true;
  const page = await open(seed); await page.evaluate(() => KanaAudio.ready); assert.equal(await page.evaluate(() => KanaAudio.enabled), true); assert.equal(await page.evaluate(() => document.body.classList.contains('reduce-effects')), false);
  await garden(page); const before = await snapshot(page); await preview(page, imported); await apply(page);
  factsPreserved(before, await snapshot(page)); assert.equal(await page.evaluate(() => KanaAudio.enabled), true); assert.equal(await page.evaluate(() => document.body.classList.contains('reduce-effects')), false); assert.equal(await page.locator('#soundBtn').getAttribute('aria-pressed'), 'true');
  await reopen(page); await page.evaluate(() => KanaAudio.ready); assert.equal(await page.evaluate(() => KanaAudio.enabled), true); assert.equal(await page.evaluate(() => document.body.classList.contains('reduce-effects')), false);
  check('import retains effective default sound and effects preferences when they were never explicitly saved, including after reload'); await close(page);
}
async function quotaFallback(fixtures) {
  const page = await open(fixtures.initial); await garden(page); const before = await snapshot(page); await preview(page, fixtures.partial);
  const quota = await page.evaluate(() => { let serial = 0, chars = 0, failure; for (const size of [65536, 4096, 256, 1]) for (let n = 0; n < 10000; n++) { try { localStorage.setItem('import-test:quota:' + serial, 'q'.repeat(size)); serial++; chars += size; } catch (e) { failure = { name: e.name, native: e instanceof DOMException }; break; } if (chars > 8 * 1024 * 1024) throw Error('Bounded quota budget exceeded'); } return { chars, serial, failure }; });
  assert.equal(quota.failure.name, 'QuotaExceededError'); assert.equal(quota.failure.native, true); await apply(page); let saved = await stores(page); assert.equal(saved.status.indexedDB, true); assert.deepEqual(saved.idb, saved.memory); factsPreserved(before, saved.memory); factsPreserved(fixtures.partial, saved.memory);
  const applied = saved.memory; await reopen(page); saved = await stores(page); factsPreserved(applied, saved.memory); assert.equal(saved.memory.games['kana-rain'].rows.katakana, 9); assert.equal(saved.status.indexedDB, true); assert.match(await page.locator('#saveStatus').textContent(), /saved/i);
  await page.evaluate(() => { for (const key of Object.keys(localStorage)) if (key.startsWith('import-test:quota:')) localStorage.removeItem(key); }); await reopen(page); saved = await stores(page); assert.deepEqual(saved.local, saved.memory); assert.deepEqual(saved.idb, saved.memory);
  check('native localStorage quota does not lose imported progress: IndexedDB survives reload and later repairs both stores', { nativeQuota: quota }); await close(page);
}
async function activeSession(fixtures) {
  const page = await open(fixtures.initial); await page.locator('#startBtn').click(); await page.locator('#skipCountdown').click(); await page.locator('#pauseBtn').click(); await page.locator('#pauseGardenBtn').click();
  assert.equal(await page.locator('#importBtn').isDisabled(), true); const before = await snapshot(page); assert.equal(await page.locator('#importPreview').isVisible(), false); unchanged(before, await snapshot(page));
  await page.locator('#closeGarden').click(); await page.locator('#finishBtn').click(); await page.locator('#backBtn').click(); await garden(page); assert.equal(await page.locator('#importBtn').isEnabled(), true);
  check('import is disabled during an active paused session and reenabled on the main menu'); await close(page);
}
async function responsive(fixtures) {
  for (const [width, height] of [[1366, 768], [390, 844], [568, 320]]) {
    const page = await open(fixtures.initial, { width, height }), touch = width < 700 || height < 400; await garden(page, touch); await preview(page, fixtures.manual, { touch });
    const layout = await page.evaluate(() => { const box = el => { const r = el.getBoundingClientRect(); return { id: el.id, left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; }; const preview = document.querySelector('#importPreview'); const buttons = ['applyImportBtn', 'cancelImportBtn'].map(id => { const el = document.getElementById(id), r = box(el), hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2); return { ...r, enabled: !el.disabled, hit: hit === el || el.contains(hit) }; }); return { width: innerWidth, height: innerHeight, preview: box(preview), documentWidth: document.documentElement.scrollWidth, buttons }; });
    assert.ok(layout.documentWidth <= width + 1, 'no horizontal page overflow');
    for (const b of layout.buttons) assert.ok(b.left >= -1 && b.top >= -1 && b.right <= width + 1 && b.bottom <= height + 1 && b.width > 0 && b.height > 0 && b.enabled && b.hit, 'first-open preview action fits and is clickable: ' + JSON.stringify({ width, height, b }));
    const [a, b] = layout.buttons; assert.ok(a.right <= b.left + 1 || b.right <= a.left + 1 || a.bottom <= b.top + 1 || b.bottom <= a.top + 1, 'actions do not overlap');
    await shot(page, 'preview-' + width + 'x' + height); await page.locator('#cancelImportBtn')[touch ? 'tap' : 'click'](); await page.locator('#importPreview').waitFor({ state: 'hidden' });
    check('file chooser and preview actions fit ' + width + 'x' + height + ' with ' + (touch ? 'touch' : 'pointer') + ' input', { layout }); await close(page);
  }
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  try {
    const fixtures = await makeFixtures(), build = currentBuild(); report.build = { version: build.version, cache: build.cache, publicFiles: build.files.size }; await serve(build); browser = await chromium.launch({ headless: true });
    await cancelAndInvalid(fixtures); await mergeAndReload(fixtures); await manualBaseline(fixtures); await defaultPreferences(fixtures); await quotaFallback(fixtures); await activeSession(fixtures); await responsive(fixtures);
    assert.deepEqual(report.pageErrors, [], 'no game errors'); assert.deepEqual(report.outsideRequests, [], 'no outside HTTP attempts'); report.passed = true;
  } catch (error) { report.failure = { message: error.message, stack: error.stack }; console.error(error); process.exitCode = 1; if (activePage && !activePage.isClosed()) try { await shot(activePage, 'failure'); } catch {} }
  finally {
    for (const context of live) try { await context.close(); report.contextsClosed++; } catch {} live.clear();
    if (browser) { await browser.close(); report.browserClosed = true; } if (server) { await new Promise(resolve => server.close(resolve)); report.serverClosed = true; }
    report.finishedAt = new Date().toISOString(); saveReport(); console.log((report.passed ? 'PASS' : 'FAIL') + ': import, ' + report.checks.length + ' checks; report ' + path.join(out, 'verification.json'));
  }
})();
