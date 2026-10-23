'use strict';
// Synthetic snapshots only. These regressions never load production/browser exports.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
const KEY = 'jp-learner-v1';
const PROTECTED = KEY + ':protected:v1';
const CHECKPOINT = KEY + ':checkpoint:v1';
const FACET = 'form→sound';
const clone = data => data === undefined ? undefined : JSON.parse(JSON.stringify(data));
const source = name => fs.readFileSync(path.join(__dirname, '../src/' + name + '.js'), 'utf8');
function event(id, itemId = 'kana:あ', extra = {}) {
  return { attemptId: id, itemId, facet: FACET, gameId: 'kana-rain', sessionId: 'synthetic:session', roundId: id,
    at: 100000 + Number(id.replace(/\D/g, '') || 1) * 1000, firstAttempt: true, assistance: false,
    assistanceReasons: [], outcome: 'correct', correct: true, reason: 'accepted', response: 'a', ...extra };
}
function snapshot(attempts = [], extra = {}) {
  return { version: 2, created: 1, sequence: attempts.length, updatedAt: 500, items: {}, reveals: {}, errorLog: [],
    attemptLedger: clone(attempts), exposureLedger: [], games: { 'kana-rain': {
      rows: { hiragana: 2, katakana: 1 }, best: { hiragana: 200 }, katakanaUnlocked: false,
      sessions: 4, accuracy: { hira: { attempts: 40, correct: 35 } }, sound: false,
      customFixtureMetadata: { preserve: ['synthetic', 7] }, novelty: {
        version: 1, pace: 'calm', seen: {}, recent: [], blocked: false, cooldownRemaining: 0
      }
    } }, ...clone(extra) };
}
function stores(localEntries = {}, idbEntries = {}) {
  return { local: new Map(Object.entries(localEntries).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])),
    idb: new Map(Object.entries(idbEntries).map(([k, v]) => [k, clone(v)])) };
}
async function load(storage) {
  const callbacks = new Map(), writes = [];
  const localStorage = { get length() { return storage.local.size; }, key: n => [...storage.local.keys()][n] || null,
    getItem: key => storage.local.get(key) || null, setItem: (key, value) => storage.local.set(key, value), removeItem: key => storage.local.delete(key) };
  const indexedDB = { open() { const request = {}; queueMicrotask(() => {
    request.result = { transaction() { const tx = {}; let complete;
      const later = () => { clearImmediate(complete); complete = setImmediate(() => tx.oncomplete?.()); };
      tx.objectStore = () => ({ get(key) { const read = {}; queueMicrotask(() => { read.result = clone(storage.idb.get(key)); read.onsuccess?.(); later(); }); return read; },
        put(value, key) { storage.idb.set(key, clone(value)); writes.push({ key, value: clone(value) }); later(); return {}; } });
      tx.abort = () => { clearImmediate(complete); queueMicrotask(() => tx.onabort?.()); }; return tx;
    }, close() {} }; request.onsuccess?.();
  }); return request; } };
  const context = vm.createContext({ localStorage, indexedDB, crypto: { randomUUID }, console,
    navigator: {}, addEventListener: (type, fn) => callbacks.set(type, fn) });
  context.window = context; vm.runInContext(source('learner'), context); vm.runInContext(source('novelty'), context);
  await context.Learner.ready;
  return { L: context.Learner, N: context.KanaNovelty, saved: () => JSON.parse(context.Learner.export()),
    gd: context.Learner.gameData('kana-rain'), hide: () => callbacks.get('pagehide')(), writes };
}
function facts(saved) { return saved.attemptLedger.map(e => e.attemptId).sort(); }
function assertUnique(saved) {
  assert.equal(new Set(saved.attemptLedger.map(e => e.attemptId)).size, saved.attemptLedger.length, 'each attempt appears once');
  assert.equal(new Set(saved.exposureLedger.map(e => e.exposureId)).size, saved.exposureLedger.length, 'each exposure appears once');
}

test('a vector on a small snapshot cannot discard richer unversioned legacy evidence, regardless of timestamp/backend', async () => {
  for (const placement of ['protected-local', 'legacy-local', 'protected-idb']) {
    const old = snapshot([event('fact:1'), event('fact:2', 'kana:い'), event('fact:3', 'kana:ア')]);
    old.games['kana-rain'].rows = { hiragana: 21, katakana: 4 }; old.games['kana-rain'].katakanaUnlocked = true;
    const small = snapshot([event('fact:1')], { updatedAt: 999999, _sync: { epoch: { id: 'legacy:1', at: 0 }, applied: { 'new-writer': 9 } } });
    const storage = placement === 'legacy-local' ? stores({ [KEY]: old }, { [PROTECTED]: small }) :
      placement === 'protected-idb' ? stores({}, { [PROTECTED]: small, [KEY]: old }) : stores({ [PROTECTED]: small }, { [KEY]: old });
    const tab = await load(storage);
    assert.deepEqual(facts(tab.saved()), ['fact:1', 'fact:2', 'fact:3'], placement);
    assert.deepEqual(clone(tab.gd.rows), { hiragana: 21, katakana: 4 }, placement);
    assert.equal(tab.gd.katakanaUnlocked, true, placement);
    await tab.L.flush();
    assert.ok(storage.local.has(PROTECTED) || storage.idb.has(PROTECTED), 'canonical storage is protected from old runtimes');
  }
});

test('current commits never rewrite or remove legacy compatibility snapshots used by older runtimes', async () => {
  const old = snapshot([event('fact:1')]), storage = stores({ [KEY]: old }, { [KEY]: old });
  const originalLocal = storage.local.get(KEY), originalIdb = clone(storage.idb.get(KEY));
  const tab = await load(storage);
  tab.L.record('kana:ア', FACET, { attemptId: 'new:2', correct: true, firstAttempt: true, assistance: false, gameId: 'kana-rain', deferSave: true });
  await tab.L.flush(); await tab.hide();
  assert.equal(storage.local.get(KEY), originalLocal);
  assert.deepEqual(storage.idb.get(KEY), originalIdb);
  assert.ok(tab.writes.some(write => write.key === PROTECTED));
  assert.equal(tab.writes.some(write => write.key === KEY), false);
});

test('equal-size divergent snapshots union immutable facts and monotone achievements without count inflation', async () => {
  const common = event('fact:1'), a = snapshot([common, event('fact:2')]), b = snapshot([common, event('fact:3', 'kana:い')]);
  a.games['kana-rain'].rows.hiragana = 21; a.games['kana-rain'].novelty.seen['kana:あ'] = true;
  b.games['kana-rain'].rows.katakana = 3; b.games['kana-rain'].best.katakana = 180; b.games['kana-rain'].katakanaUnlocked = true;
  b.games['kana-rain'].novelty.seen['kana:ア'] = true;
  const storage = stores({ [PROTECTED]: a }, { [KEY]: b });
  let tab = await load(storage);
  assert.deepEqual(facts(tab.saved()), ['fact:1', 'fact:2', 'fact:3']);
  assert.deepEqual(clone(tab.gd.rows), { hiragana: 21, katakana: 3 });
  assert.deepEqual(clone(tab.gd.best), { hiragana: 200, katakana: 180 });
  assert.deepEqual(clone(tab.gd.novelty.seen), { 'kana:あ': true, 'kana:ア': true });
  assert.equal(tab.L.state('kana:あ').facets[FACET].correct, 2);
  const historical = clone(tab.gd.accuracy), sessions = tab.gd.sessions;
  for (let i = 0; i < 3; i++) { await tab.L.flush(); tab = await load(storage); }
  assert.deepEqual(facts(tab.saved()), ['fact:1', 'fact:2', 'fact:3']); assertUnique(tab.saved());
  assert.deepEqual(clone(tab.gd.accuracy), historical, 'saved aggregate counters are not repeatedly added');
  assert.equal(tab.gd.sessions, sessions);
  assert.deepEqual(clone(tab.gd.customFixtureMetadata), { preserve: ['synthetic', 7] });
});

test('legacy v1 facet history survives alongside modern ledger evidence without inventing independent hits', async () => {
  const legacy = snapshot(); legacy.version = 1; delete legacy.attemptLedger; delete legacy.exposureLedger;
  legacy.items['kana:あ'] = { itemId: 'kana:あ', firstSeen: 1, lastSeen: 100, facets: {
    [FACET]: { correct: 12, errors: 3, reps: 15, stability: 2, difficulty: 6, lastReview: 100 }
  }, confusions: {}, flags: {} };
  const modern = snapshot([event('modern:1')], { _sync: { epoch: { id: 'legacy:1', at: 0 }, applied: { 'modern-tab': 1 } } });
  const storage = stores({ [PROTECTED]: modern }, { [KEY]: legacy });
  const tab = await load(storage); const facet = clone(tab.L.state('kana:あ').facets[FACET]);
  assert.equal(facet.correct, 13); assert.equal(facet.errors, 3); assert.equal(facet.independentFirstCorrect, 1);
  assert.equal(facet.unknownCorrect, 12, 'legacy assistance remains unknown');
  await tab.L.flush(); const restored = await load(storage);
  assert.equal(restored.L.state('kana:あ').facets[FACET].correct, 13);
});

test('a valid checkpoint recovers when both protected primaries are corrupt and legacy mirrors are smaller', async () => {
  const saved = snapshot([event('fact:1'), event('fact:2', 'kana:ア')]); saved.games['kana-rain'].rows.katakana = 5;
  const storage = stores({ [PROTECTED]: '{truncated', [CHECKPOINT]: saved, [KEY]: snapshot() },
    { [PROTECTED]: { version: 2, items: null, games: null }, [CHECKPOINT]: saved, [KEY]: snapshot() });
  const tab = await load(storage);
  assert.deepEqual(facts(tab.saved()), ['fact:1', 'fact:2']); assert.equal(tab.gd.rows.katakana, 5);
  await tab.L.flush(); assert.deepEqual(facts((await load(storage)).saved()), ['fact:1', 'fact:2']);
});

test('overwritten legacy mirrors cannot roll back protected progress after all current tabs close', async () => {
  const storage = stores({ [KEY]: snapshot([event('fact:1')]) });
  const tab = await load(storage);
  tab.L.record('kana:ア', FACET, { attemptId: 'current:2', correct: true, firstAttempt: true, assistance: false, gameId: 'kana-rain', deferSave: true });
  tab.gd.rows.katakana = 6; tab.gd.katakanaUnlocked = true; await tab.L.flush(); await tab.hide();
  const stale = snapshot([event('fact:1')], { updatedAt: Date.now() + 100000 });
  storage.local.set(KEY, JSON.stringify(stale)); storage.idb.set(KEY, clone(stale));
  const restored = await load(storage);
  assert.deepEqual(facts(restored.saved()), ['current:2', 'fact:1']); assert.equal(restored.gd.rows.katakana, 6);
  assert.equal(restored.gd.katakanaUnlocked, true);
});

test('exposure/attempt metadata, assistance, novelty pause and aggregate counts remain stable over repeated recovery', async () => {
  const attempt = event('fact:1', 'kana:ア', { assistance: true, assistanceReasons: ['recent-reference'], inputMethod: 'sound-pad',
    chosenItemId: 'kana:ア', candidateItemIds: ['kana:ア', 'kana:イ'], firstResponseMs: 1777, inputActiveMs: 333 });
  const exposed = { exposureId: 'exposure:1', itemId: 'kana:ア', facet: FACET, at: 99999, reason: 'reference', gameId: 'kana-rain', roundId: 'round:exposure' };
  const a = snapshot([attempt]); a.exposureLedger = [exposed]; a.reveals['kana:ア|' + FACET] = { ...exposed, intervening: ['kana:い'] };
  a.games['kana-rain'].katakanaNovelty = { ...clone(a.games['kana-rain'].novelty), cooldownRemaining: 9, blocked: true,
    seen: { 'kana:ア': true }, recent: [{ roundId: 'synthetic:recovery', firstCorrect: true, familiar: true }] };
  const b = snapshot([event('fact:2', 'kana:い')]);
  const storage = stores({ [PROTECTED]: a }, { [KEY]: b });
  let tab = await load(storage);
  for (let i = 0; i < 3; i++) { await tab.L.flush(); tab = await load(storage); }
  const saved = tab.saved(); assertUnique(saved);
  assert.deepEqual(saved.attemptLedger.find(e => e.attemptId === attempt.attemptId), attempt);
  assert.deepEqual(saved.exposureLedger.find(e => e.exposureId === exposed.exposureId), exposed);
  const f = tab.L.state('kana:ア').facets[FACET]; assert.equal(f.assistedCorrect, 1); assert.equal(f.independentFirstCorrect, 0);
  assert.equal(tab.gd.katakanaNovelty.cooldownRemaining, 9); assert.equal(tab.gd.katakanaNovelty.blocked, true);
  assert.equal(tab.gd.katakanaNovelty.recent.length, 1); assert.equal(tab.L.assistanceFor('kana:ア', FACET, 100000).assisted, true);
});

test('explicit reset is an epoch boundary; old mirrors/checkpoints and stale closing tabs cannot resurrect facts', async () => {
  const old = snapshot([event('fact:1')]); old.games['kana-rain'].rows.hiragana = 21;
  const storage = stores({ [KEY]: old }, { [KEY]: old }), stale = await load(storage), current = await load(storage);
  await current.L.reset(); await stale.hide();
  // An actual old runtime can rewrite only the compatibility keys, without an epoch.
  storage.local.set(KEY, JSON.stringify(old)); storage.idb.set(KEY, clone(old));
  const restored = await load(storage);
  assert.deepEqual(facts(restored.saved()), []); assert.deepEqual(clone(restored.gd), {});
});

test('explicit import supersedes richer previous-epoch progress while remaining durable through stale legacy writes', async () => {
  const old = snapshot([event('old:1'), event('old:2')]); old.games['kana-rain'].rows.katakana = 12;
  const storage = stores({ [KEY]: old }, { [KEY]: old }), tab = await load(storage);
  const imported = snapshot([event('imported:3', 'kana:う')]); imported.games['kana-rain'].rows.katakana = 1;
  await tab.L.import(JSON.stringify(imported));
  storage.local.set(KEY, JSON.stringify(old)); storage.idb.set(KEY, clone(old));
  const restored = await load(storage);
  assert.deepEqual(facts(restored.saved()), ['imported:3']); assert.equal(restored.gd.rows.katakana, 1);
});

test('an applied vector cannot suppress missing immutable journal facts or earned metadata, and additive deltas are not replayed', async () => {
  const epoch = { id: 'legacy:1', at: 0 }, base = snapshot([event('fact:1')], { _sync: { epoch, applied: { 'old-vector': 1 } } });
  const attempt = event('missing:2', 'kana:ア'), exposure = {
    exposureId: 'missing:exposure', itemId: 'kana:ア', facet: FACET, at: 99999, reason: 'reference', gameId: 'kana-rain'
  };
  const op = { writer: 'old-vector', seq: 1, sequence: 2, epoch, at: 123456, attempts: [attempt], exposures: [exposure], items: {},
    games: [{ path: ['kana-rain', 'rows', 'katakana'], kind: 'max', value: 3 },
      { path: ['kana-rain', 'katakanaUnlocked'], kind: 'earned', value: true },
      { path: ['kana-rain', 'accuracy', 'hira', 'correct'], kind: 'add', value: 1 }],
    novelty: [{ game: 'kana-rain', name: 'novelty', seen: ['kana:ア'], rounds: [], pause: false, blocked: false }] };
  const storage = stores({ [PROTECTED]: base, [KEY + ':pending:old-vector']: [op] }, { [PROTECTED]: base });
  let tab = await load(storage);
  for (let i = 0; i < 3; i++) {
    const saved = tab.saved();
    assert.deepEqual(facts(saved), ['fact:1', 'missing:2']); assertUnique(saved);
    assert.deepEqual(saved.exposureLedger, [exposure]);
    assert.equal(tab.gd.rows.katakana, 3); assert.equal(tab.gd.katakanaUnlocked, true); assert.equal(tab.gd.novelty.seen['kana:ア'], true);
    assert.equal(tab.gd.accuracy.hira.correct, 35, 'already-applied additive delta cannot be counted again');
    await tab.L.flush(); tab = await load(storage);
  }
});

test('valid JSON with malformed synchronization metadata cannot prevent valid checkpoint and legacy recovery', async () => {
  const malformed = [
    { epoch: { id: 'legacy:1', at: 0 } },
    { epoch: { id: 'legacy:1', at: 0 }, applied: null },
    { epoch: { id: 'legacy:1', at: 0 }, applied: [] },
    { epoch: { at: 0 }, applied: {} },
    { epoch: { id: 'legacy:1', at: 'not-a-timestamp' }, applied: {} },
    { epoch: { id: 'legacy:1', at: 0 }, applied: { brokenWriter: -1 } }
  ];
  for (const info of malformed) {
    const broken = snapshot([event('broken:9')], { _sync: info, updatedAt: 999999 });
    const backup = snapshot([event('valid:1', 'kana:ア')]); backup.games['kana-rain'].rows.katakana = 4;
    const legacy = snapshot([event('valid:2', 'kana:い')]); legacy.games['kana-rain'].rows.hiragana = 21;
    const storage = stores({ [PROTECTED]: broken, [CHECKPOINT]: backup, [KEY]: legacy },
      { [PROTECTED]: broken, [CHECKPOINT]: { at: 777, snapshot: backup }, [KEY]: legacy });
    const tab = await load(storage), saved = tab.saved();
    for (const id of ['valid:1', 'valid:2']) assert.ok(facts(saved).includes(id), JSON.stringify(info));
    assert.equal(tab.gd.rows.katakana, 4); assert.equal(tab.gd.rows.hiragana, 21); assertUnique(saved);
    await tab.L.flush(); const restored = await load(storage);
    for (const id of ['valid:1', 'valid:2']) assert.ok(facts(restored.saved()).includes(id), 'successful reload after metadata repair');
  }
});

test('immutable exposure facts repair missing reveal state and preserve the assistance delay and intervening evidence', async () => {
  const exposed = { exposureId: 'synthetic:orphan-exposure', itemId: 'kana:ア', facet: FACET, at: 100000,
    reason: 'reference', gameId: 'kana-rain', sessionId: 'synthetic:session' };
  const a = snapshot([event('before:1', 'kana:ア', { at: 90000 })]); a.exposureLedger = [exposed]; a.reveals = {};
  const b = snapshot([event('after:2', 'kana:い', { at: 101000 }), event('after:3', 'kana:う', { at: 102000 })]);
  const storage = stores({ [PROTECTED]: a }, { [KEY]: b });
  let tab = await load(storage);
  for (let i = 0; i < 3; i++) {
    const recent = tab.L.assistanceFor('kana:ア', FACET, 102001);
    assert.equal(recent.assisted, true, 'a recent durable reference remains assistance even without its derived reveal entry');
    assert.equal(recent.lastExposureReason, 'reference');
    assert.deepEqual(clone(recent.interveningItems).sort(), ['kana:い', 'kana:う']);
    assert.equal(tab.L.assistanceFor('kana:ア', FACET, 160001).assisted, false, 'both distinct intervening answers and a full minute remove the hint dependence');
    assert.deepEqual(tab.saved().exposureLedger, [exposed]); assertUnique(tab.saved());
    await tab.L.flush(); tab = await load(storage);
  }
});

test('snapshot joins retain opaque historical accuracy fields and mixed-mode buckets without repeated count inflation', async () => {
  const a = snapshot([event('common:1'), event('left:2')]), b = snapshot([event('common:1'), event('right:3', 'kana:い')]);
  a.games['kana-rain'].accuracy.hira.retiredInput = { soundPad: { correct: 4, total: 5 }, label: 'synthetic older schema' };
  a.games['kana-rain'].accuracy.mixed = { attempts: 77, correct: 59, legacyRomaji: { total: 17, mode: 'paired' } };
  b.games['kana-rain'].accuracy.hira.customLearningEvidence = { total: 9, correct: 6, unknownProperty: ['preserve', 42] };
  b.games['kana-rain'].accuracy.mixed = { attempts: 77, correct: 59, migratedBridge: { attempts: 8, correct: 5 } };
  const storage = stores({ [PROTECTED]: a }, { [KEY]: b }); let tab = await load(storage);
  const initial = clone(tab.gd.accuracy);
  for (let i = 0; i < 3; i++) {
    const accuracy = clone(tab.gd.accuracy);
    assert.deepEqual(accuracy.hira.retiredInput, a.games['kana-rain'].accuracy.hira.retiredInput);
    assert.deepEqual(accuracy.hira.customLearningEvidence, b.games['kana-rain'].accuracy.hira.customLearningEvidence);
    assert.deepEqual(accuracy.mixed, { attempts: 77, correct: 59, legacyRomaji: { total: 17, mode: 'paired' }, migratedBridge: { attempts: 8, correct: 5 } });
    assert.deepEqual(accuracy, initial, 'repeated recovery must not reinterpret or repeatedly add opaque historical counters');
    await tab.L.flush(); tab = await load(storage);
  }
});

test('minimal legacy v2 snapshots with omitted optional ledgers preserve earned progress and initialize empty evidence', async () => {
  const legacy = snapshot(); delete legacy.attemptLedger; delete legacy.exposureLedger;
  legacy.games['kana-rain'].rows = { hiragana: 21, katakana: 7 }; legacy.games['kana-rain'].katakanaUnlocked = true;
  legacy.games['kana-rain'].opaqueLegacyVersion = { doNotDrop: 'synthetic old fixture' };
  const storage = stores({ [KEY]: legacy }, { [KEY]: legacy }); let tab = await load(storage);
  for (let i = 0; i < 2; i++) {
    const saved = tab.saved(); assert.deepEqual(saved.attemptLedger, []); assert.deepEqual(saved.exposureLedger, []);
    assert.deepEqual(clone(tab.gd.rows), { hiragana: 21, katakana: 7 }); assert.equal(tab.gd.katakanaUnlocked, true);
    assert.deepEqual(clone(tab.gd.best), legacy.games['kana-rain'].best);
    assert.deepEqual(clone(tab.gd.accuracy), legacy.games['kana-rain'].accuracy);
    assert.deepEqual(clone(tab.gd.opaqueLegacyVersion), { doNotDrop: 'synthetic old fixture' });
    await tab.L.flush(); tab = await load(storage);
  }
});

test('identical ledgers in both protected copies repair missing reveal entries and their intervening credit', async () => {
  const exposure = { exposureId: 'synthetic:identical-reference', itemId: 'kana:ア', facet: FACET,
    at: 100000, reason: 'reference', gameId: 'kana-rain' };
  const saved = snapshot([event('intervening:1', 'kana:い', { at: 101000 }), event('intervening:2', 'kana:う', { at: 102000 })]);
  saved.exposureLedger = [exposure]; saved.reveals = {};
  const storage = stores({ [PROTECTED]: saved }, { [PROTECTED]: saved }); let tab = await load(storage);
  for (let i = 0; i < 3; i++) {
    const recent = tab.L.assistanceFor('kana:ア', FACET, 102001);
    assert.equal(recent.assisted, true); assert.equal(recent.lastExposureReason, 'reference');
    assert.deepEqual(clone(recent.interveningItems).sort(), ['kana:い', 'kana:う']);
    assert.equal(tab.L.assistanceFor('kana:ア', FACET, 160001).assisted, false);
    assert.deepEqual(tab.saved().exposureLedger, [exposure]); assertUnique(tab.saved());
    await tab.L.flush(); tab = await load(storage);
  }
});

test('late exposure-only journals retain their immutable fact without replacing a newer reference before or after reload', async () => {
  for (const alreadyApplied of [false, true]) {
    const epoch = { id: 'legacy:1', at: 0 };
    const older = { exposureId: 'synthetic:late-old-reference', itemId: 'kana:ア', facet: FACET,
      at: 100000, reason: 'reference', gameId: 'kana-rain' };
    const newer = { exposureId: 'synthetic:newer-correction', itemId: 'kana:ア', facet: FACET,
      at: 200000, reason: 'correction', gameId: 'kana-rain' };
    const base = snapshot([], { _sync: { epoch, applied: { 'late-exposure-writer': alreadyApplied ? 1 : 0 } } });
    base.exposureLedger = [newer]; base.reveals['kana:ア|' + FACET] = { ...newer, intervening: [] };
    const op = { writer: 'late-exposure-writer', seq: 1, sequence: 1, epoch, at: 150000,
      attempts: [], exposures: [older], games: [], novelty: [], items: {} };
    const storage = stores({ [PROTECTED]: base, [KEY + ':pending:late-exposure-writer']: [op] }, { [PROTECTED]: base });
    let tab = await load(storage);
    for (let i = 0; i < 3; i++) {
      const assistance = tab.L.assistanceFor('kana:ア', FACET, 200001);
      assert.equal(assistance.assisted, true); assert.equal(assistance.lastExposureReason, 'correction');
      assert.equal(assistance.delaySinceExposureMs, 1, 'the latest exposure remains the assistance source immediately after joining');
      const ledger = tab.saved().exposureLedger; assert.equal(ledger.length, 2); assertUnique(tab.saved());
      assert.deepEqual(ledger.find(e => e.exposureId === older.exposureId), older);
      assert.deepEqual(ledger.find(e => e.exposureId === newer.exposureId), newer);
      await tab.L.flush(); tab = await load(storage);
    }
  }
});

test('accuracy buckets introduced after historical ledger events count only their overlapping new answers', async () => {
  const historical = Array.from({ length: 8 }, (_, index) => event('historical:' + index, 'kana:あ', { at: 100000 + index * 1000 }));
  const old = snapshot(historical); delete old.games['kana-rain'].accuracy.hira;
  old.games['kana-rain'].accuracy.retiredMode = { correct: 7, total: 8, label: 'synthetic historical bucket' };
  const a = clone(old), b = clone(old);
  a.attemptLedger.push(event('new-left:9', 'kana:い', { at: 200000 }));
  b.attemptLedger.push(event('new-right:10', 'kana:う', { at: 201000 }));
  a.games['kana-rain'].accuracy.hira = { attempts: 1, correct: 1 };
  b.games['kana-rain'].accuracy.hira = { attempts: 1, correct: 1 };
  for (const includeAbsentLegacyBucket of [false, true]) {
    const storage = stores(includeAbsentLegacyBucket ? { [PROTECTED]: a, [KEY]: old } : { [PROTECTED]: a },
      includeAbsentLegacyBucket ? { [PROTECTED]: b, [KEY]: old } : { [PROTECTED]: b });
    let tab = await load(storage);
    for (let i = 0; i < 3; i++) {
      assert.deepEqual(clone(tab.gd.accuracy.hira), { attempts: 2, correct: 2 },
        'historical evidence before this bucket existed cannot inflate its two newly counted answers');
      assert.deepEqual(clone(tab.gd.accuracy.retiredMode), old.games['kana-rain'].accuracy.retiredMode);
      assert.equal(tab.saved().attemptLedger.length, 10, 'the original eight historical attempts remain durable facts');
      assertUnique(tab.saved());
      await tab.L.flush(); tab = await load(storage);
    }
  }
});
