const test = require('node:test');
const assert = require('node:assert/strict');
const { runtime } = require('./runtime-harness.cjs');

const plain = value => JSON.parse(JSON.stringify(value));
const facet = 'form→sound';
const hira = g => g.data.kana.filter(kana => kana.script === 'hiragana');
const kataOption = g => g.el('mode').options.find(option => option.value === 'kata');

async function garden(gameData = {}, options = {}) {
  const saved = {
    version: 2, created: 1700000000000, sequence: 0, items: {}, errorLog: [], attemptLedger: [], exposureLedger: [], reveals: {},
    games: { 'kana-rain': { rows: { hiragana: 1, katakana: 1 }, best: {}, accuracy: {}, sound: false, ...gameData } }
  };
  return runtime({ ...options, storage: [['jp-learner-v1', JSON.stringify(saved)]] });
}
function record(g, id, extra = {}) {
  const serial = g.fixtureSerial = (g.fixtureSerial || 0) + 1;
  g.learner.record(id, facet, {
    attemptId: 'katakana-progression:' + serial, roundId: 'synthetic-round:' + serial, sessionId: 'synthetic-progression',
    gameId: 'kana-rain', firstAttempt: true, correct: true, assistance: true, assistanceReasons: ['synthetic-reading'],
    responseFormat: 'romaji',
    now: 1700000000000 + serial * 1000, deferSave: true, ...extra
  });
}
function readyHiragana(g, except) {
  for (const kana of hira(g)) if (kana.id !== except) {
    record(g, kana.id); record(g, kana.id);
  }
}
function renderMenu(g) {
  g.el('mode').value = 'hira'; g.el('mode').onchange();
}
function assertLocked(g, message) {
  assert.equal(g.app.gameData.katakanaUnlocked, false, message);
  assert.equal(kataOption(g).disabled, true, message);
  g.el('mode').value = 'kata'; g.el('mode').onchange();
  assert.equal(g.app.settings.mode, 'hira', message + ': assigning a locked option cannot bypass access');
}

test('a fresh garden persists a false Katakana flag and disables the Katakana option', async () => {
  const g = await runtime();
  assertLocked(g, 'fresh garden');
  assert.equal(JSON.parse(g.learner.export()).games['kana-rain'].katakanaUnlocked, false);
  await g.learner.flush();
  const restored = await runtime({ storage: g.storage });
  assertLocked(restored, 'fresh garden after reload');
});

test('an explicit false flag remains locked at the former eleven-row threshold', async () => {
  const g = await garden({ katakanaUnlocked: false, rows: { hiragana: 11, katakana: 1 } });
  const availableRows = g.data.rowsOrder.slice(0, 11);
  for (const kana of hira(g).filter(kana => availableRows.includes(kana.row))) {
    record(g, kana.id); record(g, kana.id);
  }
  for (let pass = 0; pass < 3; pass++) { renderMenu(g); assertLocked(g, 'explicit false at eleven rows'); }
  assert.deepEqual(plain(g.app.gameData.rows), { hiragana: 11, katakana: 1 });
});

test('all 27 rows stay locked until the final Hiragana also has two correct first answers', async () => {
  const g = await garden({ katakanaUnlocked: false, rows: { hiragana: 27, katakana: 1 } });
  const final = hira(g).at(-1);
  assert.equal(hira(g).length, 104);
  readyHiragana(g, final.id);
  renderMenu(g); assertLocked(g, 'one of 104 Hiragana is still unseen');
  record(g, final.id);
  renderMenu(g); assertLocked(g, 'the last Hiragana has only one first-answer success');
  record(g, final.id, { firstAttempt: false });
  renderMenu(g); assertLocked(g, 'a correction cannot supply the missing first-answer success');
  record(g, final.id);
  assert.equal(g.app.gameData.katakanaUnlocked, false, 'recording evidence alone does not fake a menu refresh');
  renderMenu(g);
  assert.equal(g.app.gameData.katakanaUnlocked, true);
  assert.equal(kataOption(g).disabled, false);
  g.el('mode').value = 'kata'; g.el('mode').onchange();
  assert.equal(g.app.settings.mode, 'kata');
  assert.ok(hira(g).every(kana => g.learner.state(kana.id).facets[facet].firstCorrect >= 2));
});

test('85 percent accuracy is required in every Hiragana, even an earlier row with enough successes', async () => {
  const g = await garden({ katakanaUnlocked: false, rows: { hiragana: 27, katakana: 1 } });
  readyHiragana(g);
  record(g, 'kana:あ', { correct: false, response: 'zzz' });
  renderMenu(g); assertLocked(g, 'two successes in three first answers are below 85 percent');
  for (let correct = 3; correct <= 5; correct++) {
    record(g, 'kana:あ'); renderMenu(g); assertLocked(g, correct + '/' + (correct + 1) + ' remains below 85 percent');
  }
  record(g, 'kana:あ'); renderMenu(g);
  const evidence = g.learner.state('kana:あ').facets[facet];
  assert.equal(evidence.firstCorrect, 6); assert.equal(evidence.firstAttempts, 7);
  assert.equal(g.app.gameData.katakanaUnlocked, true, '6/7 crosses 85 percent and unlocks after all 104 qualify');
  assert.equal(kataOption(g).disabled, false);
});

test('a real final first-answer hit unlocks Katakana through checkUnlock during play', async () => {
  const g = await garden({ katakanaUnlocked: false, rows: { hiragana: 27, katakana: 1 } });
  const final = hira(g).at(-1);
  readyHiragana(g, final.id); record(g, final.id);
  g.app.gameData.novelty.seen[final.id] = true;
  renderMenu(g); assertLocked(g, 'one more first-answer hit is required');
  g.app.start({ reviewIds: [final.id] }); g.skip();
  assert.equal(g.app.state.target.id, final.id);
  g.answer(final.romaji);
  const event = g.learner.attempts().at(-1);
  assert.equal(event.itemId, final.id); assert.equal(event.firstAttempt, true); assert.equal(event.correct, true);
  assert.equal(g.app.state.correct, 1);
  assert.equal(g.app.gameData.katakanaUnlocked, true, 'the actual hit calls checkUnlock without a manual menu render');
  g.app.end('Synthetic progression check');
  assert.equal(kataOption(g).disabled, false);
});

test('earned Katakana access never relocks after later Hiragana failures or reload', async () => {
  const g = await garden({ katakanaUnlocked: false, rows: { hiragana: 27, katakana: 1 } });
  readyHiragana(g); renderMenu(g);
  assert.equal(g.app.gameData.katakanaUnlocked, true);
  for (let miss = 0; miss < 8; miss++) record(g, 'kana:あ', { correct: false, response: 'zzz' });
  const evidence = g.learner.state('kana:あ').facets[facet];
  assert.ok(evidence.firstCorrect / evidence.firstAttempts < 0.85);
  renderMenu(g);
  assert.equal(g.app.gameData.katakanaUnlocked, true); assert.equal(kataOption(g).disabled, false);
  await g.learner.flush();
  const restored = await runtime({ storage: g.storage });
  assert.equal(restored.app.gameData.katakanaUnlocked, true); assert.equal(kataOption(restored).disabled, false);
  restored.el('mode').value = 'kata'; restored.el('mode').onchange();
  assert.equal(restored.app.settings.mode, 'kata');
});

test('legacy gardens without the flag retain access from eleven rows, Katakana rows or recorded Katakana progress', async () => {
  for (const rows of [{ hiragana: 11, katakana: 1 }, { hiragana: 1, katakana: 2 }]) {
    const g = await garden({ rows });
    assert.equal(g.app.gameData.katakanaUnlocked, true); assert.equal(kataOption(g).disabled, false);
    assert.deepEqual(plain(g.app.gameData.rows), rows);
  }
  const original = await garden({ katakanaUnlocked: false });
  record(original, 'kana:ア'); await original.learner.flush();
  const legacy = JSON.parse(original.learner.export()); delete legacy.games['kana-rain'].katakanaUnlocked;
  const restored = await runtime({ storage: [['jp-learner-v1', JSON.stringify(legacy)]] });
  assert.equal(restored.app.gameData.katakanaUnlocked, true); assert.equal(kataOption(restored).disabled, false);
  assert.deepEqual(plain(restored.learner.attempts()), legacy.attemptLedger, 'migration preserves the actual recorded Katakana evidence');
});

test('an explicit false flag survives export/reload alongside rows, novelty, bests and all prior evidence', async () => {
  const g = await garden({
    katakanaUnlocked: false, rows: { hiragana: 11, katakana: 3 },
    best: { 'hira:normal:180': 1981, 'arcade-v2:kata:easy:180': 321, retired: { points: 444 } },
    novelty: { version: 1, pace: 'balanced', seen: { 'kana:あ': true, 'kana:ア': true }, recent: [{ roundId: 'retained-round', firstCorrect: true, timeout: false, miss: false, familiar: true }], blocked: false, cooldownRemaining: 7 }
  });
  record(g, 'kana:あ'); record(g, 'kana:ア', { correct: false, response: 'い' });
  g.learner.recordExposure('kana:ア', facet, { exposureId: 'synthetic-preserved-exposure', reason: 'reference-panel', gameId: 'kana-rain' });
  renderMenu(g); assertLocked(g, 'explicit false overrides every legacy migration hint');
  await g.learner.flush();
  const before = JSON.parse(g.learner.export());
  assert.equal(before.games['kana-rain'].katakanaUnlocked, false);
  assert.equal(JSON.parse(g.storage.get('jp-learner-v1')).games['kana-rain'].katakanaUnlocked, false);
  const restored = await runtime({ storage: g.storage });
  assertLocked(restored, 'explicit false after reload');
  const after = JSON.parse(restored.learner.export());
  for (const key of ['katakanaUnlocked', 'rows', 'novelty', 'best']) assert.deepEqual(after.games['kana-rain'][key], before.games['kana-rain'][key], key + ' is preserved');
  assert.deepEqual(after.attemptLedger, before.attemptLedger);
  assert.deepEqual(after.exposureLedger.slice(0, before.exposureLedger.length), before.exposureLedger);
  for (const [id, item] of Object.entries(before.items)) assert.deepEqual(after.items[id].facets, item.facets, id + ' learning evidence is preserved');
});

test('ten real typed Katakana vowel answers unlock K and admit a new K drop', async () => {
  const g = await garden({ katakanaUnlocked: true, best: { 'arcade-v2:kata:easy:180': 321 } });
  const vowels = g.data.kana.filter(kana => kana.script === 'katakana' && kana.row === 'a');
  for (const kana of vowels) g.app.gameData.novelty.seen[kana.id] = true;
  g.el('mode').value = 'kata'; g.el('mode').onchange(); g.app.start(); g.skip();
  const first = g.app.state.target;
  const sequence = [first.id, ...vowels.filter(kana => kana.id !== first.id).map(kana => kana.id), ...vowels.map(kana => kana.id)];
  g.app.state.queue = sequence.slice(1).map(id => ({ id }));
  for (let index = 0; index < sequence.length; index++) {
    if (!g.app.state.drops.length) { g.app.state.sinceSpawn = 99999; g.tick(); }
    const drop = g.app.state.target; assert.equal(drop.id, sequence[index]);
    answerKatakana(g, drop);
    assert.equal(g.app.gameData.rows.katakana, index < 9 ? 1 : 2, 'the last required first-answer hit opens K');
  }
  assert.equal(g.app.state.correct, 10); assert.equal(g.app.state.errors, 0); assert.equal(g.app.state.expirations, 0);
  const events = g.learner.attempts(); assert.equal(events.length, 10);
  assert.ok(events.every(event => event.correct && event.firstAttempt && event.responseFormat === 'romaji' && event.inputMethod === 'typing' && !event.assistanceReasons.includes('recognition-options')));
  for (const kana of vowels) {
    const evidence = g.learner.state(kana.id).facets[facet];
    assert.equal(evidence.firstCorrect, 2); assert.equal(evidence.firstAttempts, 2);
  }
  let introduced;
  for (let attempt = 0; attempt < 30 && !introduced; attempt++) {
    if (!g.app.state.drops.length) { g.app.state.sinceSpawn = 99999; g.tick(); }
    const drop = g.app.state.target;
    if (g.data.kanaById[drop.id].row === 'k') { introduced = drop; break; }
    answerKatakana(g, drop);
  }
  assert.ok(introduced, 'ordinary refill and admission present a newly unlocked K kana');
  assert.equal(introduced.isIntroduction, true); assert.equal(g.app.gameData.novelty.blocked, false); assert.equal(g.app.gameData.novelty.cooldownRemaining, 0);
  await g.learner.flush();
  const before = JSON.parse(g.learner.export()), restored = await runtime({ storage: g.storage });
  assert.equal(restored.app.gameData.rows.katakana, 2);
  assert.deepEqual(JSON.parse(restored.learner.export()).attemptLedger, before.attemptLedger);
  assert.deepEqual(plain(restored.app.gameData.best), { 'arcade-v2:kata:easy:180': 321 });
});

// Each helper submits its sound while the round is the only drop on screen.
function answerKatakana(g, drop = g.app.state.target) {
  assert.ok(drop, 'a real Katakana round is present');
  const before = g.learner.attempts().length;
  g.answer(g.data.kanaById[drop.id].romaji);
  assert.equal(g.learner.attempts().length, before + 1); assert.equal(g.learner.attempts().at(-1).roundId, drop.roundId);
  return drop;
}
function missKatakana(g, drop = g.app.state.target) {
  const before = g.app.state.errors;
  g.answer('qq');
  assert.equal(g.app.state.errors, before + 1); assert.equal(g.learner.attempts().at(-1).roundId, drop.roundId);
  return drop;
}
function nextKatakana(g, queuedId) {
  assert.equal(g.app.state.drops.length, 0, 'the preceding round has ended');
  if (queuedId) g.app.state.queue = [{ id: queuedId }];
  g.app.state.sinceSpawn = 99999; g.tick();
  assert.ok(g.app.state.target, 'normal admission keeps familiar practice available');
  return g.app.state.target;
}

test('successful Katakana practice can introduce a third nonstarter in the same session', async () => {
  const g = await garden({ katakanaUnlocked: true });
  g.el('mode').value = 'kata'; g.el('mode').onchange(); g.app.start(); g.skip();
  const sessionId = g.app.state.sessionId;
  for (let count = 0; count < 120 && g.app.state.newIds.size < 3; count++) {
    if (!g.app.state.drops.length) nextKatakana(g);
    answerKatakana(g);
  }
  assert.equal(g.app.state.sessionId, sessionId); assert.equal(g.app.state.over, false);
  assert.ok(g.app.state.newIds.size >= 3, 'ready introductions release learning slots without restarting the session');
  const introduced = [...g.app.state.newIds];
  assert.ok(introduced.slice(0, 3).every(id => g.data.kanaById[id].row === 'k'));
  assert.ok(introduced.slice(0, 2).some(id => g.learner.state(id).facets[facet].firstCorrect >= 2));
  assert.equal(g.app.gameData.novelty.blocked, false); assert.equal(g.app.gameData.novelty.cooldownRemaining, 0);
  assert.ok(g.learner.attempts().every(event => event.responseFormat === 'romaji' && event.inputMethod === 'typing'));
});

test('two unready Katakana introductions block a third, and open slots never bypass a failure pause', async () => {
  const g = await garden({ katakanaUnlocked: true, rows: { hiragana: 27, katakana: 2 }, best: { legacy: 1981 } });
  const vowels = g.data.kana.filter(kana => kana.script === 'katakana' && kana.row === 'a');
  for (const kana of vowels) { record(g, kana.id); record(g, kana.id); g.app.gameData.novelty.seen[kana.id] = true; }
  g.el('mode').value = 'kata'; g.el('mode').onchange(); g.app.start(); g.skip();
  answerKatakana(g);
  for (let count = 0; count < 2; count++) answerKatakana(g, nextKatakana(g, 'kana:ア'));
  const ka = nextKatakana(g, 'kana:カ'); assert.equal(ka.id, 'kana:カ'); assert.equal(ka.isIntroduction, true); answerKatakana(g, ka);
  for (let count = 0; count < 3; count++) answerKatakana(g, nextKatakana(g, 'kana:ア'));
  const ki = nextKatakana(g, 'kana:キ'); assert.equal(ki.id, 'kana:キ'); assert.equal(ki.isIntroduction, true); answerKatakana(g, ki);
  assert.deepEqual([...g.app.state.newIds], ['kana:カ', 'kana:キ']);
  for (const id of g.app.state.newIds) assert.equal(g.learner.state(id).facets[facet].firstCorrect, 1);
  const deferred = nextKatakana(g, 'kana:ク'); assert.notEqual(deferred.id, 'kana:ク');
  assert.equal(g.app.gameData.novelty.seen['kana:ク'], undefined, 'two still-unready forms occupy both slots');
  answerKatakana(g, deferred); answerKatakana(g, nextKatakana(g, 'kana:カ'));
  const kaEvidence = g.learner.state('kana:カ').facets[facet];
  assert.ok(kaEvidence.firstCorrect >= 2 && kaEvidence.firstCorrect / kaEvidence.firstAttempts >= 0.85);
  const failing = nextKatakana(g, 'kana:ア');
  missKatakana(g, failing); assert.equal(g.app.gameData.novelty.cooldownRemaining, 10);
  answerKatakana(g, failing); assert.equal(g.app.gameData.novelty.cooldownRemaining, 10, 'correcting the error does not recover admission');
  const blocked = nextKatakana(g, 'kana:ク'); assert.notEqual(blocked.id, 'kana:ク'); answerKatakana(g, blocked);
  for (let count = 0; count < 8; count++) answerKatakana(g, nextKatakana(g, 'kana:ア'));
  assert.equal(g.app.gameData.novelty.cooldownRemaining, 1);
  const ninth = nextKatakana(g, 'kana:ク'); assert.notEqual(ninth.id, 'kana:ク'); answerKatakana(g, ninth);
  assert.equal(g.app.gameData.novelty.cooldownRemaining, 0);
  const ku = nextKatakana(g, 'kana:ク'); assert.equal(ku.id, 'kana:ク'); assert.equal(ku.isIntroduction, true);
  assert.deepEqual([...g.app.state.newIds], ['kana:カ', 'kana:キ', 'kana:ク'], 'the session keeps the full introduction history');
  assert.deepEqual(plain(g.app.gameData.best), { legacy: 1981 });
});

test('free Katakana learning slots never bypass the longer expiration brake', async () => {
  const g = await garden({ katakanaUnlocked: true, rows: { hiragana: 27, katakana: 2 } });
  const vowels = g.data.kana.filter(kana => kana.script === 'katakana' && kana.row === 'a');
  for (const kana of vowels) { record(g, kana.id); record(g, kana.id); g.app.gameData.novelty.seen[kana.id] = true; }
  g.el('mode').value = 'kata'; g.el('mode').onchange(); g.app.start(); g.skip();
  g.app.state.target.progress = 1; g.tick();
  nextKatakana(g, 'kana:ア').progress = 1; g.tick();
  assert.equal(g.app.state.lives, 1); assert.equal(g.app.gameData.novelty.blocked, true);
  for (let count = 0; count < 10; count++) answerKatakana(g, nextKatakana(g, 'kana:ア'));
  assert.equal(g.app.gameData.novelty.cooldownRemaining, 0);
  assert.equal(g.app.gameData.novelty.blocked, true, 'the short pause can recover while the longer brake is still closed');
  assert.equal(g.app.gameData.katakanaNovelty.blocked, true, 'the real Katakana expirations also close its own longer brake');
  assert.equal(g.app.state.newIds.size, 0);
  assert.notEqual(nextKatakana(g, 'kana:カ').id, 'kana:カ');
  assert.equal(g.app.gameData.novelty.seen['kana:カ'], undefined);
});

function hiraganaPressure() {
  return {
    version: 1, pace: 'calm', seen: { 'kana:あ': true }, blocked: true, cooldownRemaining: 10,
    recent: Array.from({ length: 60 }, (_, index) => ({
      roundId: 'prior-hiragana:' + index, firstCorrect: index < 58, timeout: index >= 58, miss: false, familiar: true
    }))
  };
}
function startKatakana(g) {
  g.el('mode').value = 'kata'; g.el('mode').onchange(); g.app.start(); g.skip();
}

test('cold Katakana recovers the global pause without inheriting Hiragana long pressure, including exploration', async () => {
  for (const explore of [false, true]) {
    const g = await garden({ katakanaUnlocked: true, rows: { hiragana: 27, katakana: 1 }, novelty: hiraganaPressure() }, { explore });
    startKatakana(g);
    for (let correct = 1; correct <= 11; correct++) {
      const drop = correct === 1 ? g.app.state.target : nextKatakana(g);
      assert.equal(drop.id, 'kana:ア', 'the global pause keeps practice on the bootstrapped vowel');
      answerKatakana(g, drop);
      assert.equal(g.app.gameData.novelty.cooldownRemaining, Math.max(0, 11 - correct));
    }
    const next = nextKatakana(g);
    assert.equal(next.id, 'kana:イ', 'ten familiar first-try hits permit the next vowel without waiting for Hiragana pressure to expire');
    assert.equal(next.isIntroduction, true);
    assert.equal(g.app.gameData.novelty.blocked, true, 'the shared history retains its genuine long pressure');
    assert.equal(g.app.gameData.novelty.recent.filter(round => round.timeout).length, 2);
    assert.equal(g.app.gameData.katakanaNovelty.blocked, false);
    assert.equal(g.app.gameData.katakanaNovelty.recent.length, 11);
    assert.ok(g.learner.attempts().every(event => event.responseFormat === 'romaji' && event.inputMethod === 'typing'));
  }
});

test('a Katakana mistake restarts the global pause even when its own long gate is open', async () => {
  const g = await garden({ katakanaUnlocked: true, novelty: hiraganaPressure() });
  startKatakana(g);
  for (let correct = 1; correct <= 15; correct++) {
    const drop = correct === 1 ? g.app.state.target : nextKatakana(g);
    assert.equal(drop.id, 'kana:ア', 'no new vowel bypasses the current global pause');
    if (correct === 5) {
      missKatakana(g, drop);
      assert.equal(g.app.gameData.novelty.cooldownRemaining, 10);
    }
    answerKatakana(g, drop);
    if (correct >= 5) assert.equal(g.app.gameData.novelty.cooldownRemaining, 15 - correct, 'a correction supplies no recovery hit');
  }
  assert.equal(g.app.state.correct, 15); assert.equal(g.app.state.errors, 1);
  assert.equal(nextKatakana(g).id, 'kana:イ');
  assert.equal(g.app.gameData.katakanaNovelty.recent.filter(round => round.miss).length, 1);
  assert.equal(g.app.gameData.katakanaNovelty.blocked, false);
  assert.equal(g.app.gameData.novelty.blocked, true);
});

test('four real corrected familiar Katakana rounds retain the own long brake after the short pause recovers', async () => {
  const g = await garden({
    katakanaUnlocked: true, rows: { hiragana: 27, katakana: 2 },
    novelty: { version: 1, pace: 'calm', seen: { 'kana:ア': true }, recent: [], blocked: false, cooldownRemaining: 0 }
  });
  startKatakana(g);
  for (let miss = 0; miss < 4; miss++) {
    const drop = miss === 0 ? g.app.state.target : nextKatakana(g, 'kana:ア');
    missKatakana(g, drop); answerKatakana(g, drop);
    assert.equal(g.app.gameData.katakanaNovelty.blocked, miss === 3);
  }
  for (let hit = 0; hit < 10; hit++) answerKatakana(g, nextKatakana(g, 'kana:ア'));
  assert.equal(g.app.gameData.novelty.cooldownRemaining, 0);
  assert.equal(g.app.gameData.katakanaNovelty.cooldownRemaining, 0);
  assert.equal(g.app.gameData.katakanaNovelty.blocked, true);
  assert.equal(g.app.gameData.katakanaNovelty.recent.filter(round => round.miss).length, 4);
  assert.notEqual(nextKatakana(g, 'kana:カ').id, 'kana:カ', 'open learning slots cannot bypass Katakana reading pressure');
});

test('Katakana pressure survives retired pace normalization and mode changes, and explicit reset replaces both states', async () => {
  const own = { version: 1, pace: 'bold', seen: { 'kana:ア': true }, recent: [], blocked: true, cooldownRemaining: 0 };
  const g = await garden({ katakanaUnlocked: true, katakanaNovelty: own, novelty: hiraganaPressure() });
  const pressure = g.app.gameData.katakanaNovelty;
  assert.equal(g.app.gameData.novelty.pace, 'calm'); assert.equal(pressure.pace, 'calm');
  for (const mode of ['kata', 'hira', 'kata']) {
    g.el('mode').value = mode; g.el('mode').onchange();
    assert.equal(g.app.gameData.katakanaNovelty, pressure);
    assert.equal(pressure.blocked, true);
  }
  g.el('resetBtn').onclick();
  assert.notEqual(g.app.gameData.katakanaNovelty, pressure);
  for (const state of [g.app.gameData.novelty, g.app.gameData.katakanaNovelty]) {
    assert.equal(state.pace, 'calm'); assert.equal(state.blocked, false); assert.equal(state.cooldownRemaining, 0);
    assert.deepEqual(plain(state.recent), []); assert.deepEqual(plain(state.seen), {});
  }
  g.app.gameData.katakanaUnlocked = true;
  startKatakana(g); answerKatakana(g);
  assert.equal(g.app.gameData.katakanaNovelty.recent.length, 1, 'future Katakana rounds update the fresh state, not the discarded closure');
  assert.equal(pressure.recent.length, 0);
});
