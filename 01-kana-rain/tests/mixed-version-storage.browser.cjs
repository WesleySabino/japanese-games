'use strict';
// Real Chromium/IndexedDB, isolated localhost and synthetic learner evidence only.
// The pinned 1.10.2 learner deliberately writes the legacy key without Web Locks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createHash } = require('node:crypto');
const { chromium } = require('playwright');
const KEY = 'jp-learner-v1', PRIMARY = KEY + ':protected:v1', CHECKPOINT = KEY + ':checkpoint:v1';
const out = path.join(__dirname, 'artifacts/mixed-version-storage');
// Git may check text out as CRLF on Windows; pin the source after LF normalization.
const oldSource = Buffer.from(fs.readFileSync(path.join(__dirname, 'fixtures/learner-1.10.2.js'), 'utf8').replace(/\r\n/g, '\n'));
const oldHash = 'b908462e680bf53855f36a68ab6d66dc60b0fea4d9e3758d124094bb8846fa5d';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(oldSource), oldHash, 'pinned 1.10.2 learner source must remain unchanged');
const previousSource = Buffer.from(fs.readFileSync(path.join(__dirname, 'fixtures/learner-1.11.1.js'), 'utf8').replace(/\r\n/g, '\n'));
assert.equal(hash(previousSource), 'cdeac72f7937c24bcc0aabb5308d1313afd40bda2830604a406ee21855e91a72', 'pinned protected-key runtime must remain unchanged');
const productionSource = Buffer.from(fs.readFileSync(path.join(__dirname, 'fixtures/learner-1.12.0.js'), 'utf8').replace(/\r\n/g, '\n'));
assert.equal(hash(productionSource), '11c250e1e483920d2e2dff3ed64bdcbf6fa3fd3fe65b7fbf43de147f21f7688d', 'pinned 1.12.0 production runtime must remain unchanged');
const currentSource = fs.readFileSync(path.join(__dirname, '../src/learner.js'));
const noveltySource = fs.readFileSync(path.join(__dirname, '../src/novelty.js'));
const report = { startedAt: new Date().toISOString(), passed: false, syntheticProgressOnly: true,
  userProfileAccess: false, productionAccess: false, serviceWorkers: 'blocked', oldCommit: '6bdf542',
  oldRuntimeSha256: oldHash, currentRuntimeSha256: hash(currentSource), scenarios: [], outsideRequests: [], pageErrors: [],
  contextsOpened: 0, contextsClosed: 0 };
const contexts = new Set();
let browser, server, origin;
function seed() {
  return { version: 2, created: 1, sequence: 1, updatedAt: 100, items: {}, errorLog: [], reveals: {}, exposureLedger: [],
    attemptLedger: [{ attemptId: 'synthetic:baseline', itemId: 'kana:あ', facet: 'form→sound', at: 100000,
      gameId: 'kana-rain', correct: true, outcome: 'correct', assistance: false, firstAttempt: true }],
    games: { 'kana-rain': { rows: { hiragana: 21, katakana: 1 }, best: { synthetic: 700 }, katakanaUnlocked: true, journeyMixedUnlocked: true,
      sound: false, sessions: 1, syntheticMetadata: { preserve: 42 }, novelty: {
        version: 1, pace: 'calm', seen: { 'kana:あ': true }, recent: [], blocked: false, cooldownRemaining: 0
      } } } };
}
async function serve() {
  server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost'), file = url.pathname;
    let body, type;
    if (file === '/current.js') { body = currentSource; type = 'text/javascript'; }
    else if (file === '/legacy.js') { body = oldSource; type = 'text/javascript'; }
    else if (file === '/previous.js') { body = previousSource; type = 'text/javascript'; }
    else if (file === '/production.js') { body = productionSource; type = 'text/javascript'; }
    else if (file === '/novelty.js') { body = noveltySource; type = 'text/javascript'; }
    else if (file === '/blank.html') { body = '<!doctype html><title>Disposable storage probe</title>'; type = 'text/html'; }
    else if (['/current.html', '/legacy.html', '/previous.html', '/production.html'].includes(file)) {
      const runtime = file.slice(1, -5);
      body = '<!doctype html><title>Synthetic ' + runtime + ' learner</title><script src="/' + runtime + '.js"></script><script src="/novelty.js"></script>';
      type = 'text/html';
    }
    response.writeHead(body ? 200 : 404, { 'Content-Type': type || 'text/plain', 'Cache-Control': 'no-store' });
    response.end(body);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  origin = 'http://127.0.0.1:' + server.address().port;
}
async function context() {
  const ctx = await browser.newContext({ serviceWorkers: 'block' }); contexts.add(ctx); report.contextsOpened++;
  await ctx.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === origin || ['data:', 'blob:'].includes(url.protocol)) return route.continue();
    report.outsideRequests.push(url.href); return route.abort();
  });
  ctx.on('page', page => page.on('pageerror', error => report.pageErrors.push(error.message)));
  return ctx;
}
async function close(ctx) { await ctx.close(); if (contexts.delete(ctx)) report.contextsClosed++; }
async function probe(ctx, fixture = seed()) {
  const page = await ctx.newPage(); await page.goto(origin + '/blank.html');
  await page.evaluate(async ({ KEY, fixture }) => {
    localStorage.setItem(KEY, JSON.stringify(fixture));
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('kana-garden', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('learner');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { const db = request.result, tx = db.transaction('learner', 'readwrite');
        tx.objectStore('learner').put(fixture, KEY); tx.oncomplete = () => { db.close(); resolve(); }; tx.onabort = () => reject(tx.error); };
    });
  }, { KEY, fixture });
  return page;
}
async function open(ctx, runtime = 'current') {
  const page = await ctx.newPage(); page.setDefaultTimeout(10000); await page.goto(origin + '/' + runtime + '.html');
  await page.waitForFunction(() => !!window.Learner); await page.evaluate(() => Learner.ready); return page;
}
async function disk(page, key = PRIMARY) {
  return page.evaluate(async key => {
    const local = JSON.parse(localStorage.getItem(key));
    const idb = await new Promise((resolve, reject) => {
      const request = indexedDB.open('kana-garden', 1); request.onerror = () => reject(request.error);
      request.onsuccess = () => { const db = request.result, tx = db.transaction('learner'), read = tx.objectStore('learner').get(key);
        read.onsuccess = () => resolve(read.result); read.onerror = () => reject(read.error); tx.oncomplete = () => db.close(); };
    }); return { local, idb: idb || null };
  }, key);
}
async function add(page, id, itemId, rows) {
  return page.evaluate(async ({ id, itemId, rows }) => {
    Learner.record(itemId, 'form→sound', { attemptId: id, correct: true, firstAttempt: true, assistance: false,
      gameId: 'kana-rain', deferSave: true });
    const gd = Learner.gameData('kana-rain'); gd.rows.katakana = rows;
    KanaNovelty.markSeen(gd.novelty, itemId); await Learner.flush();
    return JSON.parse(Learner.export()).attemptLedger.find(e => e.attemptId === id);
  }, { id, itemId, rows });
}
async function exported(page) { return page.evaluate(() => JSON.parse(Learner.export())); }
function check(saved, events, row = 4) {
  for (const event of events) assert.deepEqual(saved.attemptLedger.find(e => e.attemptId === event.attemptId), event, 'exact historical event retained');
  assert.equal(saved.attemptLedger.length, events.length, 'all evidence, no duplicated attempts');
  assert.equal(new Set(saved.attemptLedger.map(e => e.attemptId)).size, events.length);
  assert.equal(saved.games['kana-rain'].rows.hiragana, 21); assert.equal(saved.games['kana-rain'].rows.katakana, row);
  assert.equal(saved.games['kana-rain'].katakanaUnlocked, true);
  assert.equal(saved.games['kana-rain'].journeyMixedUnlocked, true);
  assert.deepEqual(saved.games['kana-rain'].best, { synthetic: 700 });
  assert.deepEqual(saved.games['kana-rain'].syntheticMetadata, { preserve: 42 });
  assert.equal(saved.games['kana-rain'].sound, false);
}
async function staleClose(whileClosed) {
  const ctx = await context();
  try {
    const reader = await probe(ctx), fixture = seed(), old = await open(ctx, 'legacy'), current = await open(ctx);
    const newer = await add(current, 'synthetic:new-runtime', 'kana:ア', 4);
    const protectedBefore = await disk(reader);
    assert.ok(protectedBefore.local && protectedBefore.idb, 'new runtime writes protected storage in both backends');
    assert.deepEqual(await disk(reader, KEY), { local: fixture, idb: fixture }, 'new runtime never rewrites old canonical keys');
    if (whileClosed) await current.close();
    // First prove that the actual old runtime can overwrite both old canonical backends.
    const older = await add(old, 'synthetic:old-flushed', 'kana:イ', 2);
    // Keep another answer deferred until real pagehide. The synchronous LS write survives
    // even if Chromium aborts that page's asynchronous IndexedDB transaction on navigation.
    await old.evaluate(() => {
      Learner.record('kana:ウ', 'form→sound', { attemptId: 'synthetic:old-pagehide', correct: true,
        firstAttempt: true, assistance: false, gameId: 'kana-rain', deferSave: true });
      Learner.gameData('kana-rain').rows.katakana = 2;
      KanaNovelty.markSeen(Learner.gameData('kana-rain').novelty, 'kana:ウ');
    });
    const closing = (await exported(old)).attemptLedger.find(e => e.attemptId === 'synthetic:old-pagehide');
    await old.goto(origin + '/blank.html');
    await old.waitForFunction(key => JSON.parse(localStorage.getItem(key)).attemptLedger.some(e => e.attemptId === 'synthetic:old-pagehide'), KEY);
    const overwritten = await disk(reader, KEY);
    assert.deepEqual(overwritten.local.attemptLedger.find(e => e.attemptId === closing.attemptId), closing, 'pagehide journals the final answer synchronously');
    for (const snapshot of [overwritten.local, overwritten.idb]) {
      assert.equal(snapshot.attemptLedger.some(e => e.attemptId === newer.attemptId), false, 'old runtime really overwrote the legacy snapshot');
      assert.deepEqual(snapshot.attemptLedger.find(e => e.attemptId === older.attemptId), older);
    }
    await old.close();
    const restored = whileClosed ? await open(ctx) : current;
    if (!whileClosed) { await restored.reload(); await restored.evaluate(() => Learner.ready); }
    const events = [fixture.attemptLedger[0], newer, older, closing]; check(await exported(restored), events);
    await restored.evaluate(() => Learner.flush()); await restored.reload(); await restored.evaluate(() => Learner.ready);
    check(await exported(restored), events);
    const protectedAfter = await disk(reader);
    for (const snapshot of [protectedAfter.local, protectedAfter.idb]) check(snapshot, events);
    return { oldRuntimeClosedWithDeferredAnswer: true, legacyBackendsBothOverwritten: true,
      currentTabClosedDuringOverwrite: whileClosed, preservedAttempts: events.length, repeatedReloadPreserved: true };
  } finally { await close(ctx); }
}
async function corruptPrimary() {
  const ctx = await context();
  try {
    const reader = await probe(ctx), current = await open(ctx), fixture = seed();
    const newer = await add(current, 'synthetic:checkpoint', 'kana:ア', 4);
    await current.evaluate(() => Learner.flush());
    // Wait for the optional post-commit checkpoint transaction, without assuming its ordering.
    await reader.waitForFunction(async key => new Promise(resolve => {
      const request = indexedDB.open('kana-garden', 1); request.onerror = () => resolve(false);
      request.onsuccess = () => { const db = request.result, tx = db.transaction('learner'), read = tx.objectStore('learner').get(key);
        read.onsuccess = () => { const value = read.result?.snapshot || read.result; resolve(!!value?.attemptLedger?.some(e => e.attemptId === 'synthetic:checkpoint')); };
        tx.oncomplete = () => db.close(); };
    }), CHECKPOINT);
    await current.close();
    await reader.evaluate(async ({ PRIMARY }) => {
      localStorage.setItem(PRIMARY, '{truncated');
      await new Promise((resolve, reject) => {
        const request = indexedDB.open('kana-garden', 1); request.onerror = () => reject(request.error);
        request.onsuccess = () => { const db = request.result, tx = db.transaction('learner', 'readwrite');
          tx.objectStore('learner').put({ version: 2, items: null, games: null }, PRIMARY);
          tx.oncomplete = () => { db.close(); resolve(); }; tx.onabort = () => reject(tx.error); };
      });
    }, { PRIMARY });
    const restored = await open(ctx); check(await exported(restored), [fixture.attemptLedger[0], newer]);
    await restored.evaluate(() => Learner.flush());
    return { bothProtectedPrimariesCorrupt: true, checkpointRecoveredAttempts: 2, oldLegacySnapshotNotSelected: true };
  } finally { await close(ctx); }
}
async function resetBoundary() {
  const ctx = await context();
  try {
    const reader = await probe(ctx), old = await open(ctx, 'legacy'), current = await open(ctx);
    await add(current, 'synthetic:before-reset', 'kana:ア', 4); await current.evaluate(() => Learner.reset()); await current.close();
    await add(old, 'synthetic:stale-after-reset', 'kana:イ', 2); await old.goto(origin + '/blank.html'); await old.close();
    const restored = await open(ctx); const saved = await exported(restored);
    assert.deepEqual(saved.attemptLedger, []); assert.deepEqual(saved.games, {});
    const protectedDisk = await disk(reader); assert.deepEqual(protectedDisk.idb.attemptLedger, []);
    return { explicitResetPreserved: true, staleOldTabCouldNotResurrectProgress: true };
  } finally { await close(ctx); }
}
async function protectedRuntimeCoexistence(runtime = 'previous', version = '1.11.1') {
  const ctx = await context();
  try {
    const reader = await probe(ctx), fixture = seed(), previous = await open(ctx, runtime), current = await open(ctx);
    const events = await Promise.all([add(current, 'synthetic:optimized', 'kana:ア', 4), add(previous, 'synthetic:previous', 'kana:イ', 2)]);
    await Promise.all([current, previous].map(page => page.evaluate(() => Learner.flush())));
    // Hold the ordinary native origin lock so the previous runtime must close
    // with a real pending journal, rather than winning a timing race in the test.
    await reader.evaluate(() => { window.heldSaveLock = navigator.locks.request('jp-learner-v1:commit', () => { window.lockHeld = true; return new Promise(resolve => window.releaseSaveLock = resolve); }); });
    await reader.waitForFunction(() => window.lockHeld);
    const pending = await previous.evaluate(() => {
      Learner.recordExposure('kana:ウ', 'form→sound', { exposureId: 'synthetic:previous-reference', gameId: 'kana-rain', deferSave: true });
      Learner.record('kana:ウ', 'form→sound', { attemptId: 'synthetic:previous-pending', correct: true, firstAttempt: true, assistance: false, gameId: 'kana-rain', deferSave: true });
      window.pendingCommit = Learner.flush();
      return { event: Learner.attempts().find(e => e.attemptId === 'synthetic:previous-pending'), exposure: Learner.exposures().find(e => e.exposureId === 'synthetic:previous-reference'), journal: Object.keys(localStorage).some(k => k.startsWith('jp-learner-v1:pending:') && localStorage.getItem(k).includes('synthetic:previous-pending')) };
    });
    assert.equal(pending.journal, true); await previous.close();
    await reader.evaluate(() => window.releaseSaveLock());
    await current.evaluate(() => Learner.flush());
    const expected = [fixture.attemptLedger[0], ...events, pending.event];
    for (const saved of Object.values(await disk(reader))) {
      check(saved, expected);
      assert.deepEqual(saved.exposureLedger.find(e => e.exposureId === pending.exposure.exposureId), pending.exposure);
      assert.equal(saved.exposureLedger.length, 1);
    }
    await current.close(); const reloaded = await open(ctx); check(await exported(reloaded), expected);
    return { previousRelease: version, sameProtectedKey: true, concurrentAnswersRetained: true, previousClosedWhileLockBlocked: true, pendingReferenceRetained: true, preservedAttempts: expected.length, reloadPreserved: true };
  } finally { await close(ctx); }
}
async function run(name, work) {
  if (process.argv[2] && process.argv[2] !== name) return;
  const result = { name, passed: false }; report.scenarios.push(result); let timer;
  try { result.evidence = await Promise.race([work(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Scenario exceeded 30 seconds')), 30000); })]);
    result.passed = true; console.log('PASS: ' + name);
  } catch (error) { result.failure = error.stack; console.error('FAIL: ' + name + '\n' + error.stack); }
  finally { clearTimeout(timer); for (const ctx of [...contexts]) await close(ctx).catch(() => {}); }
}
(async () => {
  fs.mkdirSync(out, { recursive: true });
  try {
    await serve(); report.origin = origin;
    browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_BROWSER_CHANNEL ? { channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL } : {}) });
    await run('mixed-version-stale-close', () => staleClose(false));
    await run('legacy-overwrite-while-current-closed', () => staleClose(true));
    await run('checkpoint-after-corruption', corruptPrimary);
    await run('reset-survives-old-runtime', resetBoundary);
    await run('protected-runtime-concurrent-close', protectedRuntimeCoexistence);
    await run('production-1.12.0-concurrent-close', () => protectedRuntimeCoexistence('production', '1.12.0'));
    assert.ok(report.scenarios.length, 'unknown scenario filter');
    report.passed = report.scenarios.every(s => s.passed) && !report.pageErrors.length && !report.outsideRequests.length;
  } catch (error) { report.failure = error.stack; console.error(error); }
  finally {
    for (const ctx of [...contexts]) await close(ctx).catch(() => {});
    if (browser) { await browser.close(); report.browserClosed = true; }
    if (server) { await new Promise(resolve => server.close(resolve)); report.serverClosed = true; }
    report.finishedAt = new Date().toISOString(); fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
    console.log((report.passed ? 'PASS' : 'FAIL') + ': mixed-version storage; ' + report.scenarios.filter(s => s.passed).length + '/' + report.scenarios.length + ' scenarios.');
    if (!report.passed) process.exitCode = 1;
  }
})();
