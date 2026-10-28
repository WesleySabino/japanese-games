'use strict';
// Real same-origin service-worker updates. No production requests or personal browser profile.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const vm = require('node:vm');
const { chromium } = require('playwright');
const { root, hash, currentBuild, baselineBuild } = require('./helpers/update-fixture.cjs');
const baselineVersion = process.argv[2] || '1.10.1';
assert.ok(['1.10.1', '1.12.0'].includes(baselineVersion), 'choose a pinned update baseline');
const out = path.join(__dirname, 'artifacts/update');
const report = { startedAt: new Date().toISOString(), passed: false, syntheticProgressOnly: true, userProfileAccess: false, productionAccess: false, serviceWorkers: 'allowed in disposable localhost contexts', checks: [], pageErrors: [], outsideRequests: [], contextsOpened: 0, contextsClosed: 0 };
const contexts = new Set();
const protectedKeys = ['rows', 'best', 'accuracy', 'katakanaUnlocked', 'journeyMixedUnlocked', 'novelty', 'katakanaNovelty', 'sound', 'reducedEffects', 'syntheticLegacyField'];
let browser, server, origin, old, candidate, served, broken = false, networkDown = false, currentPage;
const requests = [];
const failedAsset = '/kana-audio-bundle/audio/kyo.mp3';
function check(name, details = {}) { report.checks.push({ check: name, ...details }); console.log('PASS: ' + name); }
function protectedData(saved) { return Object.fromEntries(protectedKeys.map(key => [key, saved.games['kana-rain'][key]])); }
function preserved(before, after, exactGame = true) {
  assert.deepEqual(after.attemptLedger.slice(0, before.attemptLedger.length), before.attemptLedger, 'old attempts keep their exact shape and order');
  assert.deepEqual(after.exposureLedger.slice(0, before.exposureLedger.length), before.exposureLedger, 'old exposures remain unchanged');
  assert.equal(new Set(after.attemptLedger.map(e => e.attemptId)).size, after.attemptLedger.length, 'no duplicated attempts');
  assert.equal(new Set(after.exposureLedger.map(e => e.exposureId)).size, after.exposureLedger.length, 'no duplicated exposures');
  assert.equal(after.version, before.version, 'save schema unchanged');
  if (exactGame) {
    assert.equal(after.attemptLedger.length, before.attemptLedger.length, 'boot/update does not invent answers');
    assert.deepEqual(protectedData(after), protectedData(before), 'update retains earned rows, brakes, bests, accuracy, access and settings');
    assert.deepEqual(after.items, before.items, 'update preserves all per-kana evidence and aggregates');
  } else {
    const a = after.games['kana-rain'], b = before.games['kana-rain'];
    assert.deepEqual(a.best, b.best); assert.deepEqual(a.syntheticLegacyField, b.syntheticLegacyField);
    assert.deepEqual(a.accuracy.historicalSynthetic, b.accuracy.historicalSynthetic, 'historical accuracy survives new play');
    for (const script of ['hiragana', 'katakana']) assert.ok(a.rows[script] >= b.rows[script], 'earned rows never decrease');
    assert.equal(a.katakanaUnlocked, true);
    assert.equal(a.journeyMixedUnlocked, true);
    assert.equal(a.sound, b.sound); assert.equal(a.reducedEffects, b.reducedEffects);
  }
}
async function syntheticSave() {
  const storage = new Map(), context = vm.createContext({ console, Date, Math, setTimeout, clearTimeout, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) } });
  context.window = context;
  // Generate the save with the historical Learner, not the candidate's persistence implementation.
  for (const name of ['data', 'learner']) vm.runInContext(old.files.get('/src/' + name + '.js').toString(), context, { filename: 'baseline/' + name + '.js' });
  await context.Learner.ready;
  const L = context.Learner, D = context.JPData, at = 1700000000000;
  let index = 0;
  for (const kana of D.kana.filter(k => k.script === 'hiragana' || k.row === 'a')) for (let hit = 0; hit < 2; hit++) {
    L.record(kana.id, 'form→sound', { attemptId: 'update:seed:' + index, roundId: 'update:seed-round:' + index, sessionId: 'update:synthetic', gameId: 'kana-rain', firstAttempt: true, assistance: false, correct: true, response: kana.romaji, responseFormat: 'romaji', inputMethod: 'typing', now: at + index++ * 1000, deferSave: true });
  }
  L.record('kana:カ', 'form→sound', { attemptId: 'update:legacy-choice', roundId: 'update:legacy-choice', sessionId: 'update:synthetic', gameId: 'kana-rain', firstAttempt: true, assistance: true, assistanceReasons: ['hiragana-choice'], correct: false, chosenItemId: 'kana:キ', response: 'き', responseFormat: 'hiragana-choice', inputMethod: 'choice', now: at + 300000, deferSave: true });
  L.record('kana:カ', 'form→sound', { attemptId: 'update:legacy-correction', roundId: 'update:legacy-choice', sessionId: 'update:synthetic', gameId: 'kana-rain', firstAttempt: false, assistance: true, correct: true, response: 'ka', responseFormat: 'romaji', inputMethod: 'composer', now: at + 301000, deferSave: true });
  L.record('kana:あ', 'form→sound', { attemptId: 'update:timeout', roundId: 'update:timeout', gameId: 'kana-rain', outcome: 'timeout', firstAttempt: false, now: at + 302000, deferSave: true });
  L.recordExposure('kana:カ', 'form→sound', { exposureId: 'update:old-exposure', gameId: 'kana-rain', reason: 'reference-audio', now: at + 303000, deferSave: true });
  const seen = Object.fromEntries(D.kana.filter(k => k.script === 'hiragana' || k.row === 'a' || ['kana:カ', 'kana:キ'].includes(k.id)).map(k => [k.id, true]));
  const recent = Array.from({ length: 60 }, (_, i) => ({ roundId: 'update:pressure:' + i, firstCorrect: i < 54, timeout: i >= 58, miss: i >= 54 && i < 58, familiar: true }));
  Object.assign(L.gameData('kana-rain'), {
    rows: { hiragana: 27, katakana: 2 }, katakanaUnlocked: true, journeyMixedUnlocked: true,
    best: { 'hira:normal:180': 1981, 'words:normal:180': 444, 'arcade-v2:hira:easy:180': 321 },
    accuracy: { historicalSynthetic: { correct: 7, total: 9 } }, sound: false, reducedEffects: true,
    syntheticLegacyField: { retained: ['unknown additive data', 42] },
    novelty: { version: 1, pace: 'calm', seen, recent, blocked: true, cooldownRemaining: 7 },
    katakanaNovelty: { version: 1, pace: 'calm', seen: Object.fromEntries(Object.entries(seen).filter(([id]) => D.kanaById[id].script === 'katakana')), recent: [], blocked: false, cooldownRemaining: 0 }
  });
  await L.flush(); return JSON.parse(L.export());
}
async function startServer() {
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
  server = http.createServer((req, res) => {
    const requested = new URL(req.url, 'http://localhost').pathname, file = requested === '/' ? '/index.html' : requested;
    const fail = broken && served === candidate && file === failedAsset;
    const bytes = served.files.get(file);
    requests.push({ release: served.version, file, failed: fail, networkDown, delivered: !networkDown && !fail && !!bytes });
    // Browser-owned worker update checks can bypass Playwright's page offline emulation.
    // Cut the actual test server too: no request can obtain release bytes during offline checks.
    if (networkDown) { res.destroy(); return; }
    res.writeHead(fail ? 503 : bytes && ['GET', 'HEAD'].includes(req.method) ? 200 : 404, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(fail ? 'Deliberate test-only install interruption' : req.method === 'HEAD' ? undefined : bytes);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  origin = 'http://127.0.0.1:' + server.address().port;
}
async function open(mobile) {
  served = old; broken = false; networkDown = false;
  const seed = await syntheticSave();
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1366, height: 768 }, isMobile: mobile, hasTouch: mobile, serviceWorkers: 'allow', acceptDownloads: true });
  contexts.add(context); report.contextsOpened++;
  await context.addCookies([{ name: 'ng_analytics_consent', value: 'denied', url: origin, sameSite: 'Lax' }]);
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === origin || ['blob:', 'data:'].includes(url.protocol)) return route.continue();
    return route.abort();
  });
  context.on('request', request => { const url = new URL(request.url()); if (url.origin !== origin && !['data:', 'blob:'].includes(url.protocol)) report.outsideRequests.push(url.href); });
  // Seed only once, before the historical page starts. Reloads never reseed or repair storage.
  await context.addInitScript(({ seed, origin }) => {
    if (location.origin === origin && !localStorage.getItem('update-fixture-seeded')) {
      localStorage.setItem('jp-learner-v1', JSON.stringify(seed)); localStorage.setItem('update-fixture-seeded', 'synthetic');
    }
  }, { seed, origin });
  const page = await context.newPage(); currentPage = page;
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => report.pageErrors.push(error.message));
  await page.goto(origin); await ready(page);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.evaluate(async () => { const c = await caches.open('update-tests-unrelated'); await c.put('/unrelated-sentinel', new Response('keep me')); });
  await assertCache(page, old);
  const first = await snapshot(page); preserved(seed, first);
  return { page, context, seed };
}
async function ready(page) {
  await page.waitForFunction(() => !!window.KanaRain);
  await page.evaluate(() => KanaAudio.ready);
  assert.equal(await page.evaluate(() => KanaAudio.available), true, 'audio lookup loads');
  assert.equal(await page.locator('#welcome').isVisible(), true);
  assert.equal(await page.locator('#mode option[value=kata]').isEnabled(), true, 'earned Katakana stays unlocked');
}
async function snapshot(page) {
  // Observe the app's own completed saves. Forcing flush here would hide autosave regressions.
  await page.waitForFunction(() => Learner.persistenceStatus().state === 'saved');
  const result = await page.evaluate(async () => {
    const persistenceKey = localStorage.getItem('jp-learner-v1:protected:v1') ? 'jp-learner-v1:protected:v1' : 'jp-learner-v1';
    const status = Learner.persistenceStatus(), saved = JSON.parse(Learner.export()), journal = JSON.parse(localStorage.getItem(persistenceKey));
    const idb = await new Promise((resolve, reject) => {
      const request = indexedDB.open('kana-garden', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction('learner'), read = tx.objectStore('learner').get(persistenceKey);
        read.onerror = () => { db.close(); reject(read.error); };
        read.onsuccess = () => resolve(read.result); tx.oncomplete = () => db.close();
      };
    });
    return { status, saved, journal, idb };
  });
  assert.equal(result.status.backend, 'journal+indexedDB', 'real writes succeed in both backends');
  assert.deepEqual(result.journal, result.saved, 'journal contains the exact latest export');
  assert.deepEqual(result.idb, result.saved, 'IndexedDB contains the exact latest export');
  return result.saved;
}
async function assertCache(page, release) {
  await page.waitForFunction(async cache => (await caches.keys()).includes(cache), release.cache);
  const worker = release.files.get('/sw.js').toString();
  const shell = [...worker.match(/\bconst SHELL=\[([^]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1] === './' ? '/' : '/' + m[1]);
  const audio = Object.values(JSON.parse(release.files.get('/kana-audio-bundle/runtime-manifest.json')).byKana).map(file => '/kana-audio-bundle/' + file);
  const required = [...new Set([...shell, ...audio, '/assets/game-runtime.js'])];
  await page.waitForFunction(async ({ cache, required }) => {
    const c = await caches.open(cache); return (await Promise.all(required.map(p => c.match(p)))).every(Boolean);
  }, { cache: release.cache, required });
  const entries = await page.evaluate(async cache => {
    const c = await caches.open(cache), keys = await c.keys();
    return Promise.all(keys.map(async req => {
      const bytes = await (await c.match(req)).arrayBuffer(), digest = await crypto.subtle.digest('SHA-256', bytes);
      return { file: new URL(req.url).pathname, sha256: [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join('') };
    }));
  }, release.cache);
  for (const entry of entries) assert.equal(entry.sha256, hash(release.files.get(entry.file === '/' ? '/index.html' : entry.file)), 'cached bytes match release: ' + entry.file);
  assert.equal(entries.filter(e => e.file.endsWith('.mp3')).length, 104, 'all 104 recordings cached');
  if (worker.includes('const SOURCE_SCRIPTS=')) {
    const sourceScripts = [...worker.match(/\bconst SOURCE_SCRIPTS=\[([^]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => '/' + m[1]);
    assert.equal(entries.filter(e => sourceScripts.includes(e.file)).length, 0, 'production caches the runtime once, without separate core modules');
    assert.equal(entries.filter(e => e.file === '/').length, 0, 'root navigation reuses index.html without duplicate entry HTML');
    assert.ok(entries.some(e => e.file === '/src/style.css'), 'art gallery keeps its required external stylesheet offline');
    assert.ok(entries.some(e => e.file === '/assets/nihongo-analytics.css'), 'secondary public pages keep their stylesheet offline');
  }
  assert.equal(await page.evaluate(async () => (await (await caches.open('update-tests-unrelated')).match('/unrelated-sentinel'))?.text()), 'keep me');
  return { cache: release.cache, checkedFiles: entries.length, recordings: 104 };
}
async function update(page, succeeds) {
  const state = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration.update(); const worker = registration.installing || registration.waiting;
    if (!worker) return registration.active?.state;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { worker.removeEventListener('statechange', changed); reject(new Error('Worker installation did not settle')); }, 20000);
      function changed() { if (['activated', 'redundant'].includes(worker.state)) { clearTimeout(timer); worker.removeEventListener('statechange', changed); resolve(worker.state); } }
      worker.addEventListener('statechange', changed); changed();
    });
  });
  assert.equal(state, succeeds ? 'activated' : 'redundant', 'real installation ' + (succeeds ? 'activates' : 'fails'));
  if (succeeds) {
    await page.waitForFunction(async oldCache => !(await caches.keys()).includes(oldCache), old.cache);
    await page.waitForFunction(async cache => (await caches.keys()).includes(cache), candidate.cache);
  }
}
async function playOne(page, mobile, mode) {
  const before = await snapshot(page);
  await page.locator('#mode').selectOption(mode);
  await page.locator('#startBtn')[mobile ? 'tap' : 'click'](); await page.locator('#skipCountdown')[mobile ? 'tap' : 'click']();
  await page.waitForFunction(() => KanaRain.state && !KanaRain.state.paused && !KanaRain.state.countingDown && KanaRain.state.drops.length > 0);
  // Control only speed/spawning for determinism; answers use real UI handlers and real storage.
  const target = await page.evaluate(() => {
    const g = KanaRain.state; KanaDifficulty.atTime = () => ({ speed: 1e-7, gap: 1e9 }); g.sinceSpawn = -1e9;
    const d = g.target; return { id: d.id, reading: KanaRain.accepted(d)[0], pad: KanaRain.padPath(d.id) };
  });
  if (mobile) {
    await page.locator('#keyboard [data-family="' + target.pad.family + '"]').tap(); await page.waitForTimeout(90);
    await page.locator('#keyboard [data-slot="' + target.pad.slot + '"]').tap();
  } else { await page.locator('#answer').fill(target.reading); await page.locator('#answer').press('Enter'); }
  await page.waitForFunction(() => KanaRain.state.correct === 1);
  assert.equal(await page.evaluate(() => KanaRain.state.errors), 0);
  await page.locator('#pauseBtn')[mobile ? 'tap' : 'click'](); await page.locator('#finishBtn')[mobile ? 'tap' : 'click']();
  assert.deepEqual(await page.locator('#resultStats b').allTextContents(), ['1', '0', '0']);
  await page.locator('#backBtn')[mobile ? 'tap' : 'click']();
  const after = await snapshot(page); preserved(before, after, false);
  assert.equal(after.attemptLedger.length, before.attemptLedger.length + 1, 'real answer appends exactly one saved event');
  const answer = after.attemptLedger.at(-1);
  assert.equal(answer.itemId, target.id); assert.equal(answer.correct, true); assert.equal(answer.inputMethod, mobile ? 'composer' : 'typing');
  return after;
}
async function offline(page, context, release, mobile, name, before) {
  networkDown = true; await context.setOffline(true);
  const requestCount = requests.length, deliveredBefore = requests.filter(r => r.delivered).length;
  await page.reload(); await ready(page); preserved(before, await snapshot(page)); await assertCache(page, release);
  const title = release.files.get('/about.html').toString().match(/<title>([^<]+)<\/title>/)[1];
  await page.goto(origin + '/about.html'); assert.equal(await page.title(), title);
  await page.goto(origin); await ready(page); preserved(before, await snapshot(page));
  const audio = await page.evaluate(async () => {
    const response = await fetch('kana-audio-bundle/audio/a.mp3');
    if (!response.ok) throw new Error('Offline MP3 unavailable');
    const bytes = await response.arrayBuffer(), size = bytes.byteLength, context = new AudioContext();
    try { const decoded = await context.decodeAudioData(bytes); return { bytes: size, duration: decoded.duration }; }
    finally { await context.close(); }
  });
  assert.ok(audio.bytes > 1000 && audio.duration > 0, 'cached MP3 actually decodes offline');
  const saved = await playOne(page, mobile, 'hira');
  await page.screenshot({ path: path.join(out, name + '-offline.png') });
  await page.reload(); await ready(page); preserved(saved, await snapshot(page));
  assert.equal(requests.filter(r => r.delivered).length, deliveredBefore, 'server delivers no bytes during offline reload/navigation/play');
  check(name + ': offline reload, public page navigation, decoded audio, play and both saves', { audio, attempts: saved.attemptLedger.length, serverBytesBlocked: true, blockedBackgroundRequests: requests.slice(requestCount).map(r => r.file) });
  const reconnect = served; served = release; networkDown = false;
  await context.setOffline(false); await page.reload(); await ready(page); preserved(saved, await snapshot(page));
  served = reconnect;
  return snapshot(page);
}
async function scenario(mobile, interrupted = false) {
  const name = interrupted ? 'interrupted-update' : mobile ? 'phone-update' : 'desktop-update';
  const { page, context, seed } = await open(mobile);
  try {
    const before = await playOne(page, mobile, 'hira');
    check(name + ': historical production build installs, plays and saves', { from: old.version, commit: old.commit, attempts: before.attemptLedger.length });
    served = candidate;
    if (interrupted) {
      broken = true; await update(page, false);
      assert.ok(requests.some(r => r.release === candidate.version && r.file === failedAsset && r.failed), 'real HTTP failure exercised during install');
      await assertCache(page, old); preserved(before, await snapshot(page));
      const retained = await offline(page, context, old, mobile, name + '-old-retained', before);
      // offline() reconnects to the retained release, keeping the old document through this check.
      preserved(seed, retained, false);
      broken = false;
    }
    const beforeActivation = await snapshot(page);
    await update(page, true);
    await page.reload(); await ready(page);
    const after = await snapshot(page); preserved(beforeActivation, after);
    const cache = await assertCache(page, candidate);
    assert.ok(!(await page.evaluate(() => caches.keys())).includes(old.cache), 'obsolete game cache removed only after successful update');
    await page.screenshot({ path: path.join(out, name + '-updated.png') });
    check(name + ': activated candidate retains historical data and exact new cached files', { to: candidate.version, ...cache });
    const online = await playOne(page, mobile, 'kata');
    await offline(page, context, candidate, mobile, name, online);
    preserved(seed, await snapshot(page), false);
  } catch (error) {
    await page.screenshot({ path: path.join(out, name + '-failure.png') }).catch(() => {});
    throw error;
  } finally { await context.close(); contexts.delete(context); report.contextsClosed++; }
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  try {
    old = baselineBuild(baselineVersion); candidate = currentBuild(); served = old;
    assert.notEqual(candidate.cache, old.cache, 'a version update needs a distinct service worker cache');
    report.baseline = { version: old.version, commit: old.commit, cache: old.cache };
    report.candidate = { version: candidate.version, cache: candidate.cache, runtimeSha256: hash(candidate.files.get('/assets/game-runtime.js')) };
    await startServer(); report.origin = origin;
    const channel = process.env.PLAYWRIGHT_BROWSER_CHANNEL;
    browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
    await scenario(false); await scenario(true); await scenario(false, true);
    assert.deepEqual(report.pageErrors, []); assert.deepEqual(report.outsideRequests, []);
    report.passed = true;
  } catch (error) {
    report.failure = error.stack || String(error); console.error(error); process.exitCode = 1;
    if (currentPage && !currentPage.isClosed()) await currentPage.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {});
  } finally {
    for (const context of contexts) { await context.close().catch(() => {}); report.contextsClosed++; }
    if (browser) { await browser.close(); report.browserClosed = true; }
    if (server) { await new Promise(resolve => server.close(resolve)); report.serverClosed = true; }
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
    console.log((report.passed ? 'PASS' : 'FAIL') + ': version updates; ' + report.checks.length + ' checks. Report: ' + path.join(out, 'verification.json'));
  }
})();
