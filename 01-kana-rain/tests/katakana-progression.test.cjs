const test = require('node:test');
const assert = require('node:assert/strict');
const { runtime } = require('./runtime-harness.cjs');

const plain = value => JSON.parse(JSON.stringify(value));
const facet = 'form→sound';
const hira = g => g.data.kana.filter(kana => kana.script === 'hiragana');
const kataOption = g => g.el('mode').options.find(option => option.value === 'kata');

async function garden(gameData = {}) {
  const saved = {
    version: 2, created: 1700000000000, sequence: 0, items: {}, errorLog: [], attemptLedger: [], exposureLedger: [], reveals: {},
    games: { 'kana-rain': { rows: { hiragana: 1, katakana: 1 }, best: {}, accuracy: {}, sound: false, ...gameData } }
  };
  return runtime({ storage: [['jp-learner-v1', JSON.stringify(saved)]] });
}
function record(g, id, extra = {}) {
  const serial = g.fixtureSerial = (g.fixtureSerial || 0) + 1;
  g.learner.record(id, facet, {
    attemptId: 'katakana-progression:' + serial, roundId: 'synthetic-round:' + serial, sessionId: 'synthetic-progression',
    gameId: 'kana-rain', firstAttempt: true, correct: true, assistance: true, assistanceReasons: ['synthetic-reading'],
    responseFormat: g.data.kanaById[id].script === 'katakana' ? 'hiragana-choice' : 'romaji',
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
