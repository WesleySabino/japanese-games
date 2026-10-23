'use strict';
// Native Chromium storage failures; never open a user's browser or learner export.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const { currentBuild, hash } = require('./helpers/update-fixture.cjs');
const out = path.join(__dirname, 'artifacts/storage');
const KEY = 'jp-learner-v1', PRESSURE = 'storage-test-pressure';
const report = { startedAt: new Date().toISOString(), passed: false, syntheticProgressOnly: true, userProfileAccess: false, productionAccess: false, serviceWorkers: 'blocked', scenarios: [], pageErrors: [], outsideRequests: [], contextsOpened: 0, contextsClosed: 0 };
const live = new Set();
const ownedProfiles = new Set();
const channel = process.env.PLAYWRIGHT_BROWSER_CHANNEL;
let browser, server, origin, build, activeCase;
function seed() {
  const saved = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/cold-katakana-legacy29.json'), 'utf8'));
  const gd = saved.games['kana-rain'];
  gd.sound = false; gd.reducedEffects = true;
  gd.accuracy.storageHistorical = { correct: 7, total: 9 };
  gd.syntheticStorageMarker = { keep: ['old data', 42] };
  return saved;
}
function preserved(before, after) {
  const index = new Map(after.attemptLedger.map(e => [e.attemptId, e]));
  for (const event of before.attemptLedger) assert.deepEqual(index.get(event.attemptId), event, 'historical attempt preserved: ' + event.attemptId);
  const exposures = new Map(after.exposureLedger.map(e => [e.exposureId, e]));
  for (const event of before.exposureLedger) assert.deepEqual(exposures.get(event.exposureId), event, 'historical exposure preserved: ' + event.exposureId);
  assert.equal(index.size, after.attemptLedger.length, 'no duplicated attempts');
  assert.equal(exposures.size, after.exposureLedger.length, 'no duplicated exposures');
  const a = after.games['kana-rain'], b = before.games['kana-rain'];
  for (const script of ['hiragana', 'katakana']) assert.ok(a.rows[script] >= b.rows[script], 'earned rows retained');
  assert.deepEqual(a.best, b.best); assert.deepEqual(a.accuracy.storageHistorical, b.accuracy.storageHistorical);
  assert.deepEqual(a.syntheticStorageMarker, b.syntheticStorageMarker); assert.equal(a.katakanaUnlocked, true);
}
function semantic(saved) { const copy = JSON.parse(JSON.stringify(saved)); delete copy.updatedAt; return copy; }
async function serve() {
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
  server = http.createServer((req, res) => {
    const requested = new URL(req.url, 'http://localhost').pathname, file = requested === '/' ? '/index.html' : requested;
    const bytes = file === '/_storage/blank.html' ? Buffer.from('<!doctype html><title>Disposable storage probe</title>') : build.files.get(file);
    res.writeHead(bytes ? 200 : 404, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(bytes);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  origin = 'http://127.0.0.1:' + server.address().port;
}
async function context(profile, fixture = seed()) {
  const options = { viewport: { width: 1366, height: 768 }, serviceWorkers: 'block', acceptDownloads: true };
  const ctx = profile ? await chromium.launchPersistentContext(profile, { ...options, headless: true, ...(channel ? { channel } : {}) }) : await browser.newContext(options);
  live.add(ctx); report.contextsOpened++;
  await ctx.addCookies([{ name: 'ng_analytics_consent', value: 'denied', url: origin }]);
  await ctx.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === origin || ['blob:', 'data:'].includes(url.protocol)) return route.continue();
    report.outsideRequests.push(url.href); return route.abort();
  });
  // One initial synthetic journal only. Reopening the profile must restore actual disk state.
  await ctx.addInitScript(({ origin, seed }) => {
    if (location.origin === origin && !localStorage.getItem('storage-test-seeded')) {
      localStorage.setItem('jp-learner-v1', JSON.stringify(seed)); localStorage.setItem('storage-test-seeded', 'once');
    }
  }, { origin, seed: fixture });
  ctx.on('page', page => page.on('pageerror', error => report.pageErrors.push({ scenario: activeCase.name, message: error.message })));
  return ctx;
}
async function close(ctx) { await ctx.close(); if (live.delete(ctx)) report.contextsClosed++; }
function profile(prefix) { const folder = fs.mkdtempSync(path.join(out, 'profile-' + prefix + '-')); ownedProfiles.add(folder); return folder; }
async function open(ctx) {
  const page = await ctx.newPage(); page.setDefaultTimeout(15000);
  await page.goto(origin); await page.waitForFunction(() => !!window.KanaRain);
  await page.waitForFunction(() => Learner.persistenceStatus().state === 'saved');
  return page;
}
async function snapshot(page, includeIdb = true) {
  return page.evaluate(async ({ includeIdb, KEY }) => {
    const journal = JSON.parse(localStorage.getItem(KEY));
    const pending = Object.keys(localStorage).filter(key => key.startsWith(KEY + ':pending:')).flatMap(key => JSON.parse(localStorage.getItem(key)));
    const idb = includeIdb ? await new Promise((resolve, reject) => {
      const request = indexedDB.open('kana-garden', 1); request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction('learner'), read = tx.objectStore('learner').get(KEY);
        read.onsuccess = () => resolve(read.result); read.onerror = () => reject(read.error); tx.oncomplete = tx.onabort = () => db.close();
      };
    }) : null;
    return { mem: window.Learner ? JSON.parse(Learner.export()) : null, status: window.Learner?.persistenceStatus(), journal, pending, idb };
  }, { includeIdb, KEY });
}
async function settled(page, backend = 'journal+indexedDB') {
  await page.waitForFunction(expected => { const s = Learner.persistenceStatus(); return s.state === (expected === null ? 'unsaved' : 'saved') && s.backend === expected; }, backend);
  return snapshot(page);
}
function both(s) { assert.deepEqual(s.journal, s.mem, 'journal matches the real in-memory save'); assert.deepEqual(s.idb, s.mem, 'IndexedDB matches the real in-memory save'); }
async function answer(page) {
  await page.bringToFront();
  if (!await page.evaluate(() => KanaRain.state && !KanaRain.state.over)) {
    await page.locator('#startBtn').click(); await page.locator('#skipCountdown').click();
  } else if (await page.locator('#pauseOverlay').isVisible()) {
    await page.locator('#resumeBtn').click(); await page.locator('#skipCountdown').click();
  }
  await page.waitForFunction(() => KanaRain.state && !KanaRain.state.paused && !KanaRain.state.countingDown && KanaRain.state.drops.length > 0);
  const target = await page.evaluate(() => {
    KanaDifficulty.atTime = () => ({ speed: 1e-7, gap: 1e9 });
    const g = KanaRain.state; g.sinceSpawn = -1e9;
    return { id: g.target.id, reading: KanaRain.accepted(g.target)[0], correct: g.correct };
  });
  await page.locator('#answer').fill(target.reading); await page.locator('#answer').press('Enter');
  await page.waitForFunction(n => KanaRain.state.correct === n + 1, target.correct);
  return page.evaluate(() => Learner.attempts().at(-1));
}
async function freshRound(page) {
  if (await page.evaluate(() => !!KanaRain.state && !KanaRain.state.over)) {
    await page.locator('#pauseBtn').click(); await page.locator('#finishBtn').click(); await page.locator('#backBtn').click();
  }
  return answer(page);
}
async function fillLocal(page) {
  const proof = await page.evaluate(() => {
    let serial = 0, chars = 0, last;
    for (const size of [65536, 4096, 256, 1]) {
      for (let count = 0; count < 10000; count++) {
        const key = 'storage-test:quota:' + serial;
        try { localStorage.setItem(key, 'q'.repeat(size)); chars += size; serial++; }
        catch (error) { last = { name: error.name, native: error instanceof DOMException }; break; }
        if (chars > 8 * 1024 * 1024) throw new Error('Local quota fill exceeded bounded test budget');
      }
    }
    return { chars, keys: serial, error: last };
  });
  assert.equal(proof.error?.name, 'QuotaExceededError'); assert.equal(proof.error.native, true);
  activeCase.evidence.localQuota = proof;
}
async function clearLocal(page) {
  await page.evaluate(() => { for (const key of Object.keys(localStorage)) if (key.startsWith('storage-test:quota:')) localStorage.removeItem(key); });
}
async function quota(ctx, page) {
  // Create the pressure store before clamping quota; the failure must be a real native write.
  await page.evaluate(PRESSURE => new Promise((resolve, reject) => {
    const r = indexedDB.open(PRESSURE, 1); r.onupgradeneeded = () => r.result.createObjectStore('fill');
    r.onsuccess = () => { window.storagePressureDb = r.result; resolve(); }; r.onerror = () => reject(r.error);
  }), PRESSURE);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Storage.overrideQuotaForOrigin', { origin, quotaSize: 1 });
  activeCase.evidence.quotaOverride = await cdp.send('Storage.getUsageAndQuota', { origin });
  assert.equal(activeCase.evidence.quotaOverride.overrideActive, true);
  assert.equal(activeCase.evidence.quotaOverride.quota, 1);
  assert.ok(activeCase.evidence.quotaOverride.usage > 1, 'real existing data already exceeds the clamped quota');
  // Chromium caches its native write allowance for 30 seconds. Do not fill the user's disk
  // trying to consume that previous allowance, and do not replace browser storage methods.
  await page.waitForTimeout(31000);
  const proof = await page.evaluate(async () => {
    const db = storagePressureDb;
    const bytes = new Uint8Array(128 * 1024);
    crypto.getRandomValues(bytes.subarray(0, 65536)); crypto.getRandomValues(bytes.subarray(65536));
    try {
      const error = await new Promise(resolve => {
        const tx = db.transaction('fill', 'readwrite'); tx.objectStore('fill').put(bytes, 'quota-probe');
        tx.oncomplete = () => resolve(null); tx.onabort = () => resolve({ name: tx.error?.name, native: tx.error instanceof DOMException });
      });
      return { attemptedBytes: bytes.length, error };
    } finally { db.close(); delete window.storagePressureDb; }
  });
  activeCase.evidence.indexedDbQuota = proof;
  assert.equal(proof.error?.name, 'QuotaExceededError', 'real IndexedDB transaction exhausted its native origin quota');
  assert.equal(proof.error.native, true);
  return cdp;
}
async function releaseQuota(cdp, page) {
  await cdp.send('Storage.overrideQuotaForOrigin', { origin });
  await page.evaluate(PRESSURE => new Promise((resolve, reject) => { const r = indexedDB.deleteDatabase(PRESSURE); r.onsuccess = resolve; r.onerror = () => reject(r.error); r.onblocked = () => reject(new Error('Pressure DB unexpectedly still open')); }), PRESSURE);
}
async function downloaded(page, button) {
  const wait = page.waitForEvent('download'); await page.locator(button).click();
  const download = await wait, stream = await download.createReadStream(), chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  assert.equal(download.suggestedFilename(), 'kana-rain-progress.json');
  return JSON.parse(Buffer.concat(chunks).toString());
}
async function quotaCase(mode) {
  // The native quota override is exercised in an owned disk profile, not an incognito context.
  const folder = profile('quota');
  activeCase.evidence.profile = path.relative(out, folder);
  const ctx = await context(folder), page = await open(ctx); let cdp;
  try {
    const initial = await settled(page); both(initial);
    if (mode !== 'idb') await fillLocal(page);
    if (mode !== 'local') cdp = await quota(ctx, page);
    const event = await answer(page);
    const current = await settled(page, mode === 'both' ? null : mode === 'local' ? 'indexedDB' : 'journal');
    preserved(initial.mem, current.mem); assert.deepEqual(current.mem.attemptLedger.at(-1), event);
    assert.equal(current.mem.attemptLedger.length, initial.mem.attemptLedger.length + 1);
    if (mode === 'both') {
      assert.equal(current.status.saved, false);
      assert.deepEqual(current.journal.attemptLedger, initial.journal.attemptLedger); assert.deepEqual(current.idb.attemptLedger, initial.idb.attemptLedger);
      assert.equal(await page.locator('#storageNotice').isVisible(), true);
      assert.match(await page.locator('#saveStatus').textContent(), /only in memory/);
      const exported = await downloaded(page, '#storageExportBtn'); preserved(current.mem, exported);
      assert.deepEqual(exported, current.mem, 'emergency download contains latest unsaved answer');
      await page.screenshot({ path: path.join(out, 'both-quota-warning.png') });
      await clearLocal(page); await releaseQuota(cdp, page); cdp = null;
      await freshRound(page); const recovered = await settled(page); both(recovered); preserved(current.mem, recovered.mem);
      await page.reload(); await page.waitForFunction(() => !!window.KanaRain); const restored = await settled(page); both(restored); preserved(recovered.mem, restored.mem);
      assert.equal(await page.locator('#storageNotice').isVisible(), false);
      activeCase.evidence.recoveredAttempts = restored.mem.attemptLedger.length;
    } else {
      if (mode === 'local') { assert.deepEqual(current.idb, current.mem); assert.deepEqual(current.journal.attemptLedger, initial.journal.attemptLedger); }
      else { assert.deepEqual(current.journal, current.mem); assert.deepEqual(current.idb.attemptLedger, initial.idb.attemptLedger); }
      assert.equal(await page.locator('#storageNotice').isVisible(), false, 'one working backend still saves progress');
      await page.reload(); await page.waitForFunction(() => !!window.KanaRain);
      const restored = await settled(page, mode === 'local' ? 'indexedDB' : 'journal'); preserved(current.mem, restored.mem);
      if (mode === 'local') await clearLocal(page); else { await releaseQuota(cdp, page); cdp = null; }
      await page.reload(); await page.waitForFunction(() => !!window.KanaRain); const recovered = await settled(page); both(recovered); preserved(restored.mem, recovered.mem);
      activeCase.evidence.restoredAttempts = recovered.mem.attemptLedger.length;
    }
  } finally {
    if (cdp) await cdp.send('Storage.overrideQuotaForOrigin', { origin }).catch(() => {});
    await close(ctx);
  }
}
async function lockDatabase(probe) {
  return probe.evaluate(KEY => new Promise((resolve, reject) => {
    const request = indexedDB.open('kana-garden', 1); request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('learner', 'readwrite'), store = tx.objectStore('learner');
      window.storageTestLock = { active: true, requests: 0 };
      const deadline = Date.now() + 25000;
      const first = store.get(KEY);
      first.onsuccess = () => { resolve(first.result); keepAlive(); };
      function keepAlive() {
        if (window.storageTestLock.release || Date.now() > deadline) { tx.abort(); return; }
        const r = store.get('__storage_test_lock__'); r.onsuccess = () => { storageTestLock.requests++; keepAlive(); };
      }
      tx.oncomplete = tx.onabort = () => { storageTestLock.active = false; db.close(); };
    };
  }), KEY);
}
async function closeCase(pending) {
  // Only this generated profile is reopened. Never use the installed Chrome user-data directory.
  const folder = profile(pending ? 'pending' : 'committed');
  activeCase.evidence.profile = path.relative(out, folder);
  let ctx = await context(folder);
  try {
    const page = await open(ctx), initial = await settled(page); both(initial);
    await page.evaluate(() => {
      window.storageObservedWrites = [];
      Learner.subscribePersistence(status => {
        if (status.state === 'saving' && status.saved && status.journal) storageObservedWrites.push(JSON.parse(Learner.export()));
      });
    });
    let probe;
    if (pending) {
      probe = await ctx.newPage(); await probe.goto(origin + '/_storage/blank.html');
      const locked = await lockDatabase(probe); assert.deepEqual(locked, initial.idb);
    }
    const event = await answer(page);
    const beforeClose = pending ? await snapshot(page, false) : await settled(page);
    if (pending) {
      assert.equal(beforeClose.status.state, 'saving'); assert.equal(beforeClose.status.indexedDB, false);
      assert.equal(await probe.evaluate(() => storageTestLock.active && storageTestLock.requests > 0), true, 'native write lock is still active at shutdown');
      assert.deepEqual(beforeClose.pending.flatMap(op => op.attempts || []).find(e => e.attemptId === event.attemptId), event, 'tab-owned journal committed the newest answer before browser closes');
    } else both(beforeClose);
    const observedWrites = await page.evaluate(() => storageObservedWrites);
    activeCase.evidence.beforeCloseStatus = beforeClose.status;
    activeCase.evidence.observedWrites = observedWrites.length;
    await close(ctx); ctx = null; // Closes the actual owned Chromium process with its pending transaction.
    ctx = await context(folder);
    const rawPage = await ctx.newPage(); await rawPage.goto(origin + '/_storage/blank.html');
    const raw = await snapshot(rawPage);
    assert.deepEqual(semantic(raw.journal), semantic(pending ? beforeClose.journal : beforeClose.mem), 'canonical journal survives a full browser process restart');
    if (pending) assert.deepEqual(raw.pending.flatMap(op => op.attempts || []).find(e => e.attemptId === event.attemptId), event, 'pending answer survives the full browser process restart before game recovery');
    const complete = [initial.idb, ...observedWrites, beforeClose.mem].some(saved => JSON.stringify(semantic(saved)) === JSON.stringify(semantic(raw.idb)));
    assert.equal(complete, true, 'each on-disk transaction is a complete observed snapshot, never torn data');
    activeCase.evidence.indexedDbAtRestart = raw.idb.attemptLedger.some(e => e.attemptId === event.attemptId) ? 'complete new snapshot' : 'complete old snapshot';
    await rawPage.goto(origin); await rawPage.waitForFunction(() => !!window.KanaRain);
    const restored = await settled(rawPage); both(restored); preserved(beforeClose.mem, restored.mem);
    assert.deepEqual(restored.mem.attemptLedger.find(e => e.attemptId === event.attemptId), event);
    assert.deepEqual(restored.mem.games['kana-rain'].accuracy, beforeClose.mem.games['kana-rain'].accuracy, 'pending counter changes are recovered once');
    await rawPage.screenshot({ path: path.join(out, pending ? 'restart-pending.png' : 'restart-committed.png') });
  } finally { if (ctx) await close(ctx); }
}
async function twoTabs(staleClose) {
  const ctx = await context();
  try {
    const a = await open(ctx), initial = await settled(a), b = await open(ctx);
    const first = await answer(a); await settled(a);
    const second = await answer(b); await settled(b);
    assert.notEqual(first.attemptId, second.attemptId, 'different tabs must not assign the same attempt ID');
    activeCase.evidence.tabSaveStates = await Promise.all([a, b].map(p => p.evaluate(() => ({ correct: KanaRain.state.correct, persistence: Learner.persistenceStatus() }))));
    await a.screenshot({ path: path.join(out, (staleClose ? 'stale-close' : 'two-tabs') + '-a.png') });
    await b.screenshot({ path: path.join(out, (staleClose ? 'stale-close' : 'two-tabs') + '-b.png') });
    if (staleClose) await a.close({ runBeforeUnload: false });
    // Inspect from a clean same-origin page before booting another game can write anything.
    const probe = await ctx.newPage(); await probe.goto(origin + '/_storage/blank.html');
    const disk = await snapshot(probe), wanted = [first, second];
    const missing = saved => wanted.filter(e => !saved.attemptLedger.some(x => x.attemptId === e.attemptId)).map(e => e.attemptId);
    activeCase.evidence.events = wanted;
    activeCase.evidence.missingFromJournal = missing(disk.journal);
    activeCase.evidence.missingFromIndexedDb = missing(disk.idb);
    activeCase.evidence.staleTabClosed = staleClose;
    preserved(initial.mem, disk.journal); preserved(initial.mem, disk.idb);
    await probe.goto(origin); await probe.waitForFunction(() => !!window.KanaRain); const restored = await settled(probe); both(restored);
    activeCase.evidence.missingAfterReload = missing(restored.mem);
    assert.deepEqual(missing(disk.journal), [], 'journal must retain answers from BOTH tabs');
    assert.deepEqual(missing(disk.idb), [], 'IndexedDB must retain answers from BOTH tabs');
    for (const event of wanted) assert.deepEqual(restored.mem.attemptLedger.find(e => e.attemptId === event.attemptId), event);
  } finally { await close(ctx); }
}
async function overlappingTabs(mode) {
  // Leave room for a real earned row in each script; the legacy fixture's
  // Hiragana is otherwise already at the catalogue's final row.
  const fixture = seed(); fixture.games['kana-rain'].rows = { hiragana: 2, katakana: 1 };
  const ctx = await context(undefined, fixture); let cdp;
  try {
    const a = await open(ctx), b = await open(ctx), initial = await settled(b);
    if (mode === 'quota') cdp = await quota(ctx, a);
    let probe;
    if (mode === 'close') {
      probe = await ctx.newPage(); await probe.goto(origin + '/_storage/blank.html'); await lockDatabase(probe);
    }
    // Real independent renderer processes submit at the same deadline. A blocked
    // native transaction proves both tabs have pending work together before close.
    const deadline = Date.now() + 250;
    const results = await Promise.all([a, b].map((page, tab) => page.evaluate(async ({ deadline, tab }) => {
      await new Promise(resolve => setTimeout(resolve, Math.max(0, deadline - Date.now())));
      const gd = Learner.gameData('kana-rain'), before = Learner.attempts().length, session = Learner.beginSession('storage-overlap');
      for (let n = 0; n < 12; n++) {
        const id = tab ? 'kana:い' : 'kana:あ';
        Learner.record(id, 'form→sound', { sessionId: session, roundId: session + ':r:' + n, correct: true, firstAttempt: true, assistance: false, gameId: 'kana-rain', deferSave: true });
        gd.accuracy.hira ||= { attempts: 0, correct: 0 }; gd.accuracy.hira.attempts++; gd.accuracy.hira.correct++;
        KanaNovelty.markSeen(gd.novelty, id);
        Learner.flush(); // Do not serialize the callers by awaiting their commits.
      }
      gd.rows[tab ? 'katakana' : 'hiragana']++; gd.sessions = (gd.sessions || 0) + 1;
      if (!tab) gd.sound = false;
      Learner.flush();
      return { session, events: Learner.attempts().slice(before).filter(e => e.sessionId === session) };
    }, { deadline, tab })));
    const wanted = results.flatMap(r => r.events); assert.equal(wanted.length, 24);
    assert.equal(new Set(wanted.map(e => e.attemptId)).size, 24);
    if (mode === 'close') {
      const pending = await snapshot(a, false);
      assert.equal(await probe.evaluate(() => storageTestLock.active), true);
      for (const event of wanted) assert.deepEqual(pending.pending.flatMap(op => op.attempts || []).find(e => e.attemptId === event.attemptId), event, 'both pending tab journals contain every answer before close');
      await a.close({ runBeforeUnload: false });
      await probe.evaluate(() => { storageTestLock.release = true; });
    }
    await settled(b, mode === 'quota' ? 'journal' : 'journal+indexedDB');
    const reader = await ctx.newPage(); await reader.goto(origin + '/_storage/blank.html');
    const disk = await snapshot(reader); preserved(initial.mem, disk.journal);
    for (const event of wanted) assert.deepEqual(disk.journal.attemptLedger.find(e => e.attemptId === event.attemptId), event);
    if (mode !== 'quota') for (const event of wanted) assert.deepEqual(disk.idb.attemptLedger.find(e => e.attemptId === event.attemptId), event);
    const data = disk.journal.games['kana-rain'], old = initial.mem.games['kana-rain'];
    assert.equal(data.accuracy.hira.attempts, (old.accuracy.hira?.attempts || 0) + 24);
    assert.equal(data.accuracy.hira.correct, (old.accuracy.hira?.correct || 0) + 24);
    assert.equal(data.sessions, (old.sessions || 0) + 2);
    for (const script of ['hiragana', 'katakana']) assert.equal(data.rows[script], old.rows[script] + 1);
    assert.equal(data.sound, false); assert.equal(data.novelty.seen['kana:あ'], true); assert.equal(data.novelty.seen['kana:い'], true);
    if (cdp) { await releaseQuota(cdp, a); cdp = null; }
    await reader.goto(origin); await reader.waitForFunction(() => !!window.KanaRain); const restored = await settled(reader); both(restored);
    for (const event of wanted) assert.deepEqual(restored.mem.attemptLedger.find(e => e.attemptId === event.attemptId), event);
    assert.equal(restored.mem.games['kana-rain'].accuracy.hira.correct, data.accuracy.hira.correct, 'reload cannot double-count recovered operations');
    await reader.screenshot({ path: path.join(out, 'overlap-' + mode + '.png') });
    activeCase.evidence = { ...activeCase.evidence, concurrentAnswers: wanted.length, closedWhilePending: mode === 'close', nativeIndexedDbQuota: mode === 'quota', countersPreserved: true, uniqueIds: true };
  } finally {
    if (cdp) await cdp.send('Storage.overrideQuotaForOrigin', { origin }).catch(() => {});
    await close(ctx);
  }
}
async function run(name, work) {
  if (process.argv[2] && process.argv[2] !== name) return;
  activeCase = { name, passed: false, evidence: {}, startedAt: new Date().toISOString() }; report.scenarios.push(activeCase);
  let deadline;
  try {
    await Promise.race([work(), new Promise((_, reject) => { deadline = setTimeout(() => reject(new Error('Storage scenario exceeded 120 seconds')), 120000); })]);
    activeCase.passed = true; console.log('PASS: ' + name);
  }
  catch (error) { activeCase.failure = error.stack || String(error); console.error('FAIL: ' + name + '\n' + activeCase.failure); }
  finally {
    clearTimeout(deadline);
    for (const ctx of [...live]) await close(ctx).catch(() => {});
    activeCase.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
  }
}
(async () => {
  fs.mkdirSync(out, { recursive: true });
  try {
    build = currentBuild(); report.buildRuntimeSha256 = hash(build.files.get('/assets/game-runtime.js'));
    await serve(); report.origin = origin;
    browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
    await run('local-quota', () => quotaCase('local'));
    await run('indexeddb-quota', () => quotaCase('idb'));
    await run('both-quotas', () => quotaCase('both'));
    await run('browser-close-committed', () => closeCase(false));
    await run('browser-close-pending', () => closeCase(true));
    await run('two-tabs', () => twoTabs(false));
    await run('stale-tab-close', () => twoTabs(true));
    await run('simultaneous-tabs', () => overlappingTabs('normal'));
    await run('simultaneous-tabs-close-pending', () => overlappingTabs('close'));
    await run('simultaneous-tabs-indexeddb-quota', () => overlappingTabs('quota'));
    assert.ok(report.scenarios.length, 'unknown scenario filter');
    report.passed = report.scenarios.every(s => s.passed) && !report.pageErrors.length && !report.outsideRequests.length;
  } catch (error) { report.failure = error.stack || String(error); console.error(error); }
  finally {
    for (const ctx of [...live]) await close(ctx).catch(() => {});
    if (browser) { await browser.close(); report.browserClosed = true; }
    if (server) { await new Promise(resolve => server.close(resolve)); report.serverClosed = true; }
    // Delete only directories generated by this run, after every owned browser has closed.
    report.profilesRemoved = 0;
    if (!live.size) for (const folder of ownedProfiles) {
      const base = fs.realpathSync(out), target = fs.realpathSync(folder);
      assert.equal(path.dirname(target), base, 'recursive profile cleanup stays inside this test artifact directory');
      assert.ok(/^profile-(quota|pending|committed)-[\w-]+$/.test(path.basename(target)));
      fs.rmSync(target, { recursive: true, force: true }); report.profilesRemoved++;
    }
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
    const passed = report.scenarios.filter(s => s.passed).length;
    console.log((report.passed ? 'PASS' : 'FAIL') + ': native storage; ' + passed + '/' + report.scenarios.length + ' scenarios passed. Report: ' + path.join(out, 'verification.json'));
    if (!report.passed) process.exitCode = 1;
  }
})();
