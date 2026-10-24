'use strict';
// Only synthetic learner history is used here. Never read a personal export.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
const KEY = 'jp-learner-v1', PROTECTED = KEY + ':protected:v1', FACET = 'form→sound';
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const source = fs.readFileSync(path.join(__dirname, '../src/learner.js'), 'utf8');
function attempt(id, itemId = 'kana:あ', extra = {}) {
  return { attemptId: id, itemId, facet: FACET, gameId: 'kana-rain', sessionId: 'synthetic-session', roundId: id,
    at: 100000, firstAttempt: true, assistance: false, assistanceReasons: [], outcome: 'correct', correct: true,
    reason: 'accepted', response: 'a', ...extra };
}
function exposure(id, itemId = 'kana:ア') {
  return { exposureId: id, itemId, facet: FACET, at: 99000, reason: 'reference', gameId: 'kana-rain',
    sessionId: 'synthetic-session', roundId: id };
}
function snapshot(events = [], extra = {}) {
  return { version: 2, created: 1, sequence: events.length, items: {}, games: { 'kana-rain': {
    rows: { hiragana: 4, katakana: 2 }, best: { hiragana: 900 }, sessions: 10, katakanaUnlocked: true,
    accuracy: { hira: { attempts: 100, correct: 80 } }, sound: false, masterVolume: .2,
    currentPreferences: { input: 'sound-pad', nested: ['keep', 3] },
    novelty: { version: 1, pace: 'calm', seen: { 'kana:あ': true }, recent: [], blocked: true, cooldownRemaining: 8 },
    katakanaNovelty: { version: 1, pace: 'calm', seen: { 'kana:ア': true }, recent: [], blocked: false, cooldownRemaining: 0 }
  } }, attemptLedger: clone(events), exposureLedger: [], reveals: {}, errorLog: [], ...clone(extra) };
}
function storage(data) {
  return { local: new Map(data ? [[PROTECTED, JSON.stringify(data)]] : []), idb: new Map() };
}
async function load(shared, options = {}) {
  const callbacks = new Map();
  const localStorage = { get length() { return shared.local.size; }, key: n => [...shared.local.keys()][n] || null,
    getItem: key => shared.local.get(key) || null, removeItem: key => shared.local.delete(key),
    setItem: (key, value) => { if (options.quota?.value) throw new Error('quota'); shared.local.set(key, value); } };
  const context = vm.createContext({ localStorage, crypto: { randomUUID }, console, navigator: options.navigator || {},
    addEventListener: (name, fn) => callbacks.set(name, fn) });
  context.window = context; vm.runInContext(source, context); await context.Learner.ready;
  return { L: context.Learner, saved: () => JSON.parse(context.Learner.export()),
    gd: context.Learner.gameData('kana-rain'), hide: () => callbacks.get('pagehide')(), context };
}
const ids = (saved, name = 'attemptLedger', key = 'attemptId') => saved[name].map(e => e[key]).sort();
function hit(tab, id = 'live-answer') {
  tab.L.record('kana:い', FACET, { attemptId: id, firstAttempt: true, assistance: false, correct: true,
    gameId: 'kana-rain', deferSave: true });
  tab.gd.accuracy.hira.attempts++; tab.gd.accuracy.hira.correct++;
}
function durableState(shared) { return clone([...shared.local]); }
async function rejectWithoutChange(tab, shared, input) {
  const before = tab.L.export(), disk = durableState(shared), status = clone(tab.L.persistenceStatus());
  assert.throws(() => tab.L.previewImport(input));
  assert.equal(tab.L.export(), before, 'preview rejection must not mutate the running learner');
  assert.deepEqual(durableState(shared), disk, 'preview rejection must not write storage');
  assert.deepEqual(clone(tab.L.persistenceStatus()), status);
  await assert.rejects(async () => tab.L.importProgress(input));
  assert.equal(tab.L.export(), before, 'import rejection must not mutate the running learner');
  assert.deepEqual(durableState(shared), disk, 'import rejection must not write storage');
}

test('import preview is pure, including unsaved evidence, sequence, persistence status and storage', async () => {
  const shared = storage(snapshot([attempt('current')])), tab = await load(shared);
  hit(tab); const input = JSON.stringify(snapshot([attempt('imported', 'kana:ア')]));
  const before = tab.L.export(), disk = durableState(shared), status = clone(tab.L.persistenceStatus());
  const one = clone(tab.L.previewImport(input)), two = clone(tab.L.previewImport(input));
  assert.equal(typeof one, 'object'); assert.deepEqual(two, one, 'preview is deterministic');
  assert.equal(tab.L.export(), before); assert.deepEqual(durableState(shared), disk);
  assert.deepEqual(clone(tab.L.persistenceStatus()), status);
  const seq = tab.saved().sequence;
  tab.L.recordExposure('kana:う', FACET, { deferSave: true });
  assert.equal(tab.saved().sequence, seq + 1, 'preview must not consume event identifiers');
  await tab.L.flush();
  assert.deepEqual(ids((await load(shared)).saved()), ['current', 'live-answer']);
});

test('import unions immutable facts once, keeps current settings and preserves earned progress', async () => {
  const common = attempt('shared'), current = snapshot([common, attempt('current')]);
  current.exposureLedger = [exposure('current-exposure')];
  const shared = storage(current), tab = await load(shared), imported = snapshot([common, attempt('imported', 'kana:イ')]);
  imported.exposureLedger = [exposure('current-exposure'), exposure('imported-exposure', 'kana:イ')];
  Object.assign(imported.games['kana-rain'], { sound: true, masterVolume: 1, currentPreferences: { input: 'other' },
    rows: { hiragana: 21, katakana: 9 }, best: { hiragana: 100, katakana: 1200 } });
  imported.games['kana-rain'].novelty.seen['kana:い'] = true;
  imported.games['kana-rain'].katakanaNovelty.seen['kana:ロ'] = true;
  hit(tab); const result = await tab.L.importProgress(JSON.stringify(imported)); assert.equal(result.saved, true);
  let saved = tab.saved();
  assert.deepEqual(ids(saved), ['current', 'imported', 'live-answer', 'shared']);
  assert.deepEqual(ids(saved, 'exposureLedger', 'exposureId'), ['current-exposure', 'imported-exposure']);
  assert.equal(tab.gd.sound, false); assert.equal(tab.gd.masterVolume, .2);
  assert.deepEqual(clone(tab.gd.currentPreferences), current.games['kana-rain'].currentPreferences);
  assert.deepEqual(clone(tab.gd.rows), { hiragana: 21, katakana: 9 });
  assert.deepEqual(clone(tab.gd.best), { hiragana: 900, katakana: 1200 });
  assert.equal(tab.gd.katakanaUnlocked, true);
  assert.equal(tab.gd.novelty.seen['kana:あ'], true); assert.equal(tab.gd.novelty.seen['kana:い'], true);
  assert.equal(tab.gd.katakanaNovelty.seen['kana:ロ'], true);
  assert.equal(saved.attemptLedger.filter(e => e.attemptId === 'shared').length, 1);
  const reloaded = await load(shared); saved = reloaded.saved();
  assert.deepEqual(ids(saved), ['current', 'imported', 'live-answer', 'shared']);
  assert.deepEqual(clone(reloaded.gd.rows), { hiragana: 21, katakana: 9 });
  assert.equal(reloaded.gd.sound, false);
});

test('an imported export from another reset epoch is additive and keeps the current epoch and unsaved facts', async () => {
  const current = snapshot([attempt('current')], { _sync: { epoch: { id: 'current-reset', at: 200 }, applied: {} } });
  const imported = snapshot([attempt('old-export', 'kana:ア')], { _sync: { epoch: { id: 'foreign-newer-reset', at: 999999 }, applied: {} } });
  const shared = storage(current), tab = await load(shared); hit(tab);
  await tab.L.importProgress(JSON.stringify(imported));
  assert.deepEqual(ids(tab.saved()), ['current', 'live-answer', 'old-export']);
  assert.equal(tab.saved()._sync.epoch.id, 'current-reset', 'an additive import must not reset the generation');
  await tab.hide(); const next = await load(shared);
  assert.deepEqual(ids(next.saved()), ['current', 'live-answer', 'old-export']);
  assert.equal(next.saved()._sync.epoch.id, 'current-reset');
});

test('legacy familiarities import as historical baselines even when no new attempt fact exists', async () => {
  const shared = storage(snapshot([attempt('current')])), tab = await load(shared), imported = snapshot();
  imported.items['kana:ろ'] = { itemId: 'kana:ろ', firstSeen: 10, lastSeen: 100000, facets: {}, flags: {},
    legacyFacets: { [FACET]: { correct: 72, errors: 8, reps: 80, stability: 14, difficulty: 3, lastReview: 100000 } } };
  await tab.L.importProgress(JSON.stringify(imported));
  let f = clone(tab.L.state('kana:ろ').facets[FACET]);
  assert.equal(f.correct, 72); assert.equal(f.errors, 8); assert.equal(f.correct / (f.correct + f.errors), .9);
  const again = await load(shared); f = clone(again.L.state('kana:ろ').facets[FACET]);
  assert.equal(f.correct, 72); assert.equal(f.errors, 8);
  await again.L.importProgress(JSON.stringify(imported)); await again.L.flush();
  f = clone((await load(shared)).L.state('kana:ろ').facets[FACET]);
  assert.equal(f.correct, 72, 'repeated profile imports must not add historical totals twice'); assert.equal(f.errors, 8);
  assert.deepEqual(ids((await load(shared)).saved()), ['current']);
});

test('legacy v1 imports retain old aggregate history without inventing independent first hits', async () => {
  const shared = storage(snapshot()), tab = await load(shared), imported = snapshot();
  imported.version = 1; delete imported.attemptLedger; delete imported.exposureLedger;
  imported.items['kana:ん'] = { itemId: 'kana:ん', firstSeen: 1, facets: { [FACET]: {
    correct: 9, errors: 1, reps: 10, stability: 5, difficulty: 4, lastReview: 100000
  } }, confusions: {}, flags: {} };
  const result = await tab.L.importProgress(JSON.stringify(imported)); assert.equal(result.saved, true);
  const f = clone((await load(shared)).L.state('kana:ん').facets[FACET]);
  assert.equal(f.correct, 9); assert.equal(f.errors, 1); assert.equal(f.unknownCorrect, 9);
  assert.equal(f.independentFirstCorrect, 0);
});

test('repeated imports and stale-tab closing cannot duplicate or erase either tab history', async () => {
  const shared = storage(snapshot([attempt('shared')])), a = await load(shared), stale = await load(shared);
  const imported = snapshot([attempt('shared'), attempt('imported', 'kana:ア')]);
  imported.games['kana-rain'].rows.katakana = 9;
  imported.items['kana:ろ'] = { itemId: 'kana:ろ', facets: {}, flags: {}, legacyFacets: {
    [FACET]: { correct: 9, errors: 1, reps: 10, stability: 5, difficulty: 4, lastReview: 100000 }
  } };
  await a.L.importProgress(JSON.stringify(imported));
  const first = a.saved(); await a.L.importProgress(JSON.stringify(imported));
  assert.deepEqual(ids(a.saved()), ids(first));
  assert.deepEqual(a.saved().games['kana-rain'].accuracy, first.games['kana-rain'].accuracy);
  hit(stale, 'other-tab'); await stale.hide(); await a.hide();
  const result = await load(shared);
  assert.deepEqual(ids(result.saved()), ['imported', 'other-tab', 'shared']);
  assert.equal(result.gd.rows.katakana, 9); assert.equal(result.L.state('kana:ろ').facets[FACET].correct, 9);
});

test('import survives closing before the commit lock runs through the owning write-ahead journal', async () => {
  const shared = storage(snapshot([attempt('current')])), tab = await load(shared, {
    navigator: { locks: { request: () => new Promise(() => {}) } }
  });
  const imported = snapshot([attempt('imported', 'kana:ア')]);
  imported.items['kana:ろ'] = { itemId: 'kana:ろ', facets: {}, flags: {}, legacyFacets: {
    [FACET]: { correct: 9, errors: 1, reps: 10, stability: 5, difficulty: 4, lastReview: 100000 }
  } };
  tab.L.importProgress(JSON.stringify(imported));
  await new Promise(resolve => setImmediate(resolve)); tab.hide();
  const result = await load(shared);
  assert.deepEqual(ids(result.saved()), ['current', 'imported']);
  assert.equal(result.L.state('kana:ろ').facets[FACET].correct, 9);
});

test('invalid imports reject safely before any history or storage changes', async () => {
  const shared = storage(snapshot([attempt('current')])), tab = await load(shared);
  hit(tab);
  const invalid = [null, [], {}, { ...snapshot(), version: 3 }, { ...snapshot(), items: [] },
    { ...snapshot(), games: [] }, { ...snapshot(), attemptLedger: {} }, { ...snapshot(), exposureLedger: {} },
    { ...snapshot(), _sync: { epoch: { id: 'x', at: 'bad' }, applied: {} } },
    { ...snapshot(), attemptLedger: [attempt('bad', 'kana:あ', { outcome: 'correct', correct: false })] },
    { ...snapshot(), attemptLedger: [attempt('bad', 'kana:あ', { at: -1 })] },
    { ...snapshot(), exposureLedger: [{ ...exposure('bad'), exposureId: null }] }];
  for (const value of invalid) await rejectWithoutChange(tab, shared, JSON.stringify(value));
  await rejectWithoutChange(tab, shared, '{truncated');
  await rejectWithoutChange(tab, shared, ' '.repeat(32 * 1024 * 1024) + JSON.stringify(snapshot()));
  await tab.L.flush(); assert.deepEqual(ids((await load(shared)).saved()), ['current', 'live-answer']);
});

test('prototype-pollution keys are rejected at any depth without affecting ordinary objects', async () => {
  const shared = storage(snapshot([attempt('current')])), tab = await load(shared);
  for (const dangerous of ['__proto__', 'constructor', 'prototype']) {
    const data = snapshot(); data.games['kana-rain'].custom = JSON.parse('{"' + dangerous + '":{"polluted":true}}');
    await rejectWithoutChange(tab, shared, JSON.stringify(data));
  }
  assert.equal({}.polluted, undefined); assert.equal(vm.runInContext('({}).polluted', tab.context), undefined);
});

test('same-ID conflicting immutable facts are rejected both inside the file and against existing history', async () => {
  const current = attempt('current'), shared = storage(snapshot([current])), tab = await load(shared);
  const conflicts = [snapshot([attempt('duplicated'), attempt('duplicated', 'kana:い')]),
    snapshot([attempt('current', 'kana:い')]), snapshot([], { exposureLedger: [exposure('same'), exposure('same', 'kana:イ')] })];
  tab.L.recordExposure('kana:ア', FACET, { exposureId: 'existing-exposure', now: 99000, deferSave: true });
  conflicts.push(snapshot([], { exposureLedger: [exposure('existing-exposure', 'kana:イ')] }));
  for (const input of conflicts) await rejectWithoutChange(tab, shared, JSON.stringify(input));
});

test('identical duplicated facts in an export are counted once', async () => {
  const shared = storage(snapshot()), tab = await load(shared), ev = attempt('duplicate'), ex = exposure('duplicate');
  const input = snapshot([ev, clone(ev)], { exposureLedger: [ex, clone(ex)] });
  await tab.L.importProgress(JSON.stringify(input)); const saved = (await load(shared)).saved();
  assert.deepEqual(ids(saved), ['duplicate']); assert.deepEqual(ids(saved, 'exposureLedger', 'exposureId'), ['duplicate']);
  assert.equal((await load(shared)).L.state('kana:あ').facets[FACET].correct, 1);
});

test('manual reconstruction provenance remains an array and is unioned without repetition', async () => {
  const first = { at: 1, source: 'synthetic-a', estimate: true }, second = { at: 2, source: 'synthetic-b', estimate: true };
  const shared = storage(snapshot([], { manualReconstruction: [first] })), tab = await load(shared);
  const imported = snapshot([], { manualReconstruction: [clone(first), second] });
  assert.equal(tab.L.previewImport(JSON.stringify(imported)).manualEstimate, true);
  await tab.L.importProgress(JSON.stringify(imported)); await tab.L.importProgress(JSON.stringify(imported));
  assert.deepEqual((await load(shared)).saved().manualReconstruction, [first, second]);
});

test('an import cannot take the identifier of a real answer journaled by another tab after preview', async () => {
  let lockedCommit;
  const shared = storage(snapshot([attempt('current')])), a = await load(shared, {
    navigator: { locks: { request: (_name, commit) => new Promise((resolve, reject) => {
      lockedCommit = () => Promise.resolve().then(commit).then(resolve, reject);
    }) } }
  }), b = await load(shared);
  const imported = snapshot([attempt('concurrent-id', 'kana:ア')]);
  a.L.previewImport(JSON.stringify(imported));
  const applying = a.L.importProgress(JSON.stringify(imported));
  await new Promise(resolve => setImmediate(resolve));
  hit(b, 'concurrent-id'); await b.L.flush();
  const failure = assert.rejects(applying, /conflict/i);
  await lockedCommit(); await failure;
  const saved = (await load(shared)).saved();
  assert.deepEqual(ids(saved), ['concurrent-id', 'current']);
  assert.equal(saved.attemptLedger.find(ev => ev.attemptId === 'concurrent-id').itemId, 'kana:い');
  assert.deepEqual(ids(a.saved()), ['concurrent-id', 'current']);
  assert.equal([...shared.local].filter(([key]) => key.startsWith(KEY + ':pending:')).some(([, raw]) => JSON.parse(raw).some(op => op.importSnapshot)), false);
});

test('full storage reports an unsaved import truthfully and retains its pending facts until quota recovers', async () => {
  const shared = storage(snapshot([attempt('current')])), quota = { value: true }, tab = await load(shared, { quota });
  const input = JSON.stringify(snapshot([attempt('imported', 'kana:ア')]));
  const result = await tab.L.importProgress(input);
  assert.equal(result.saved, false); assert.deepEqual(ids(tab.saved()), ['current', 'imported']);
  assert.deepEqual(ids((await load(shared)).saved()), ['current'], 'a reload cannot claim a failed write persisted');
  quota.value = false; await tab.L.flush();
  assert.deepEqual(ids((await load(shared)).saved()), ['current', 'imported']);
});

test('out-of-range Kana Rain rows and familiarity calculations that overflow are rejected before saving', async () => {
  const shared = storage(snapshot([attempt('current')])), tab = await load(shared);
  for (const script of ['hiragana', 'katakana']) for (const row of [0, 999]) {
    const imported = snapshot(); imported.games['kana-rain'].rows[script] = row;
    await rejectWithoutChange(tab, shared, JSON.stringify(imported));
  }
  const overflow = snapshot([attempt('overflow')]);
  overflow.items['kana:あ'] = { itemId: 'kana:あ', facets: {}, flags: {}, legacyFacets: {
    [FACET]: { correct: 1, errors: 0, reps: 1, stability: Number.MAX_VALUE, difficulty: 4, lastReview: 100000 }
  } };
  await rejectWithoutChange(tab, shared, JSON.stringify(overflow));
});

test('omitted local audio/effects/difficulty preferences keep their current default semantics', async () => {
  const current = snapshot(); delete current.games['kana-rain'].sound; delete current.games['kana-rain'].reducedEffects;
  const shared = storage(current), tab = await load(shared), imported = snapshot([attempt('imported')]);
  Object.assign(imported.games['kana-rain'], { sound: false, reducedEffects: true, difficulty: 'hard' });
  await tab.L.importProgress(JSON.stringify(imported));
  for (const candidate of [tab, await load(shared)]) {
    assert.equal(candidate.gd.sound !== false, true, 'sound defaults to enabled when its key is absent');
    assert.equal(candidate.gd.reducedEffects === true, false, 'effects default to enabled when its key is absent');
    assert.equal(Object.hasOwn(candidate.gd, 'difficulty'), false);
  }
});

test('an acknowledged import journal repairs facts and baseline-only history missing from a smaller checkpoint', async () => {
  const shared = storage(snapshot([attempt('current')])), tab = await load(shared);
  const provenance = [{ source: 'synthetic-estimate', at: 1 }];
  const imported = snapshot([attempt('imported', 'kana:ア')], { manualReconstruction: provenance });
  imported.games['kana-rain'].rows.katakana = 9;
  imported.items['kana:ろ'] = { itemId: 'kana:ろ', facets: {}, flags: {}, legacyFacets: {
    [FACET]: { correct: 9, errors: 1, reps: 10, stability: 5, difficulty: 4, lastReview: 100000 }
  } };
  await tab.L.importProgress(JSON.stringify(imported));
  const smaller = JSON.parse(shared.local.get(PROTECTED));
  assert.ok(Object.keys(smaller._sync.applied).length, 'the checkpoint acknowledges the import writer');
  smaller.attemptLedger = smaller.attemptLedger.filter(ev => ev.attemptId !== 'imported');
  delete smaller.items['kana:ろ']; delete smaller.manualReconstruction; smaller.games['kana-rain'].rows.katakana = 2;
  shared.local.set(PROTECTED, JSON.stringify(smaller));
  const restored = await load(shared);
  assert.deepEqual(ids(restored.saved()), ['current', 'imported']);
  assert.equal(restored.L.state('kana:ろ').facets[FACET].correct, 9);
  assert.equal(restored.gd.rows.katakana, 9); assert.deepEqual(restored.saved().manualReconstruction, provenance);
});

test('a reset in another tab cancels a queued import and cannot be reported as an applied import', async () => {
  let lockedCommit;
  const shared = storage(snapshot([attempt('current')])), a = await load(shared, {
    navigator: { locks: { request: (_name, commit) => new Promise((resolve, reject) => {
      lockedCommit = () => Promise.resolve().then(commit).then(resolve, reject);
    }) } }
  }), b = await load(shared);
  const applying = a.L.importProgress(JSON.stringify(snapshot([attempt('imported', 'kana:ア')])));
  await new Promise(resolve => setImmediate(resolve));
  await b.L.reset(); const resetEpoch = b.saved()._sync.epoch;
  const failure = assert.rejects(applying, /reset.*another tab.*preview/i);
  await lockedCommit(); await failure;
  const saved = (await load(shared)).saved();
  assert.deepEqual(ids(saved), []); assert.deepEqual(saved._sync.epoch, resetEpoch);
  assert.deepEqual(ids(a.saved()), []);
});
