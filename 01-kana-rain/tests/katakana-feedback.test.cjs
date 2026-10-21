// Synthetic, in-memory regressions: error feedback must not introduce new Katakana.
const test = require('node:test');
const assert = require('node:assert/strict');
const { runtime } = require('./runtime-harness.cjs');

const plain = value => JSON.parse(JSON.stringify(value));
const facet = 'form→sound';
function savedGarden({ rows = 1, seen = ['kana:ア'], legacy = false } = {}) {
  const saved = {
    version: 2, created: 1700000000000, sequence: 40, items: {}, errorLog: [], attemptLedger: [], exposureLedger: [], reveals: {},
    games: { 'kana-rain': {
      rows: { hiragana: 27, katakana: rows }, katakanaUnlocked: true,
      best: { 'hira:normal:180': 1981, 'arcade-v2:kata:easy:180': 321 }, accuracy: {}, sound: false,
      novelty: { version: 1, pace: 'calm', seen: Object.fromEntries(['kana:あ', ...seen].map(id => [id, true])), blocked: true, cooldownRemaining: 10,
        recent: Array.from({ length: 60 }, (_, i) => ({ roundId: 'old-hira:' + i, firstCorrect: i < 58, timeout: i >= 58, miss: false, familiar: true })) }
    } }
  };
  if (legacy) {
    saved.attemptLedger.push({ attemptId: 'old-unseen-confusion', roundId: 'old-unseen-round', sessionId: 'synthetic-old-session', itemId: 'kana:ア', facet,
      gameId: 'kana-rain', at: 1700000001000, firstAttempt: true, assistance: true, assistanceReasons: ['initial-reading'], correct: false, outcome: 'incorrect',
      reason: 'different-item', responseFormat: 'romaji', inputMethod: 'typing', response: 'ka', chosenItemId: 'kana:カ', candidateItemIds: ['kana:カ'], submittedItemId: null });
    saved.exposureLedger.push({ exposureId: 'old-unseen-review', itemId: 'kana:カ', facet, gameId: 'kana-rain', reason: 'results-review', at: 1700000002000,
      sessionId: 'synthetic-old-session', roundId: 'old-unseen-round' });
  }
  return saved;
}
async function normalGarden(options = {}, mobile = false, mode = 'kata') {
  const saved = savedGarden(options), g = await runtime({ mobile, storage: [['jp-learner-v1', JSON.stringify(saved)]] });
  g.el('mode').value = mode; g.el('mode').onchange(); g.app.start(); g.skip();
  assert.equal(g.app.state.reviewIds, null, 'this is ordinary practice, not an exploration or injected review');
  assert.equal(g.app.state.target.id, mode === 'kata' ? 'kana:ア' : 'kana:あ');
  return { g, saved };
}
function notIntroduced(g, id) {
  assert.notEqual(g.app.gameData.novelty.seen[id], true, id + ' remains unintroduced');
  assert.ok(!Array.from(g.app.state.confs).some(pair => pair.split('|').includes(id)), id + ' is not a new visual confusion partner');
  assert.ok(!g.app.state.queue.some(entry => entry.partner === id), id + ' is not queued as a confusion partner');
}
function assertStoredError(g, response, chosen, method) {
  const event = g.learner.attempts().at(-1);
  assert.equal(event.response, response); assert.equal(event.chosenItemId, chosen); assert.equal(event.correct, false);
  assert.equal(event.inputMethod, method); assert.equal(event.responseFormat, 'romaji');
  if (chosen) assert.deepEqual(plain(event.candidateItemIds), [chosen], 'the inferred evidence is preserved even when its glyph is hidden');
  assert.equal(g.app.state.correct, 0); assert.equal(g.app.state.lives, 3); assert.equal(g.app.state.expirations, 0);
  assert.equal(g.app.gameData.novelty.cooldownRemaining, 10, 'a real error still applies the admission pause');
}

test('typing or composing an off-curriculum sound never reveals its unseen Katakana', async () => {
  for (const mobile of [false, true]) {
    const { g } = await normalGarden({}, mobile);
    if (mobile) g.compose('kana:ヌ'); else g.answer('nu');
    assertStoredError(g, 'nu', 'kana:ヌ', mobile ? 'composer' : 'typing');
    assert.match(g.el('feedback').textContent, /^ア = あ\. You (typed|chose) nu/);
    assert.doesNotMatch(g.el('feedback').textContent, /ヌ/, 'the error cannot bypass the new-form gate');
    notIntroduced(g, 'kana:ヌ');
    g.app.end('Synthetic feedback regression');
    assert.doesNotMatch(g.el('resultReview').innerHTML, /ヌ/);
    assert.ok(!g.learner.exposures().some(event => event.itemId === 'kana:ヌ'));
  }
});

test('an unlocked but unseen Katakana stays out of feedback, partners, result cards and reading exposures', async () => {
  for (const mobile of [false, true]) {
    const { g, saved } = await normalGarden({ rows: 2 }, mobile);
    assert.ok(g.app.candidates().includes('kana:カ'), 'the test distinguishes unlocked from introduced');
    if (mobile) g.compose('kana:カ'); else g.answer('ka');
    assertStoredError(g, 'ka', 'kana:カ', mobile ? 'composer' : 'typing');
    assert.doesNotMatch(g.el('feedback').textContent, /カ/);
    notIntroduced(g, 'kana:カ');
    g.app.end('Synthetic feedback regression');
    assert.match(g.el('resultReview').innerHTML, /ア/); assert.doesNotMatch(g.el('resultReview').innerHTML, /カ/);
    assert.ok(!g.learner.exposures().some(event => event.itemId === 'kana:カ'));
    const before = JSON.parse(g.learner.export()), reloaded = await runtime({ storage: g.storage });
    const after = JSON.parse(reloaded.learner.export());
    assert.deepEqual(after.attemptLedger, before.attemptLedger); assert.deepEqual(after.exposureLedger.slice(0, before.exposureLedger.length), before.exposureLedger);
    assert.ok(!after.exposureLedger.slice(before.exposureLedger.length).some(event => event.itemId === 'kana:カ'), 'normal menu references after reload cannot reveal the hidden Katakana');
    assert.deepEqual(after.games['kana-rain'].rows, saved.games['kana-rain'].rows); assert.deepEqual(after.games['kana-rain'].best, saved.games['kana-rain'].best);
    assert.notEqual(after.games['kana-rain'].novelty.seen['kana:カ'], true);
  }
});

test('raw full-width, half-width, yoon and mixed pasted Katakana cannot echo unlearned glyphs', async () => {
  const { g } = await normalGarden({ rows: 2 });
  for (const raw of ['カ', 'ｶ', 'キャ', 'romajiカmixed', 'アカ']) {
    g.answer(raw);
    assertStoredError(g, raw.toLowerCase().normalize('NFKC'), null, 'typing');
    const message = g.el('feedback').textContent;
    assert.match(message, /^ア = あ\./, 'the already introduced target and its reading remain useful');
    assert.doesNotMatch(message.slice('ア = あ.'.length), /[ァ-ヿｦ-ﾟ]/u, 'no part of an unsafe pasted response is repeated as a new glyph');
  }
  assert.equal(g.app.state.errors, 5); notIntroduced(g, 'kana:カ'); notIntroduced(g, 'kana:キャ');
});

test('already introduced Katakana remains useful in corrections and confusion review', async () => {
  const { g } = await normalGarden({ rows: 2, seen: ['kana:ア', 'kana:カ'] });
  g.answer('ka'); assertStoredError(g, 'ka', 'kana:カ', 'typing');
  assert.equal(g.el('feedback').textContent, 'ア = あ. You typed ka → カ.');
  assert.ok(g.app.state.confs.has('kana:ア|kana:カ')); assert.ok(g.app.state.queue.some(entry => entry.partner === 'kana:カ'));
  g.app.end('Synthetic familiar correction');
  assert.match(g.el('resultReview').innerHTML, /カ/);
  assert.match(g.el('resultNext').innerHTML, /カ/, 'introduced pending Katakana remains visible in next-row guidance');
  assert.doesNotMatch(g.el('resultNext').innerHTML, /[イウエオキクケコ]/, 'known corrections do not reveal other pending Katakana');
  assert.ok(g.learner.exposures().some(event => event.itemId === 'kana:カ' && event.reason === 'results-review'));
});

test('Hiragana keeps its existing correction and confusion-review behavior', async () => {
  const { g } = await normalGarden({ rows: 2 }, false, 'hira');
  g.answer('ka'); assertStoredError(g, 'ka', 'kana:か', 'typing');
  assert.equal(g.el('feedback').textContent, 'あ = a. You typed ka → か.');
  assert.ok(g.app.state.confs.has('kana:あ|kana:か'));
  g.app.end('Synthetic Hiragana control');
  assert.match(g.el('resultReview').innerHTML, /か/); assert.ok(g.learner.exposures().some(event => event.itemId === 'kana:か' && event.reason === 'results-review'));
  assert.match(g.el('resultNext').innerHTML, /0 \/ 104 kana ready/);
  assert.match(g.el('resultNext').innerHTML, /い/, 'Hiragana next-row guidance retains its existing pending glyphs');
});

test('legacy unseen confusion evidence is preserved but cannot render or expose an unseen review partner', async () => {
  const { g, saved } = await normalGarden({ rows: 2, legacy: true });
  assert.equal(g.learner.state('kana:ア').confusions['kana:カ'], 1, 'the imported confusion remains evidence');
  // G.confs is transient, not a saved field. Model a stale pre-fix run entry defensively at the renderer boundary.
  g.app.state.confs.add('kana:ア|kana:カ');
  const exposuresBefore = g.learner.exposures().length;
  g.app.end('Synthetic legacy review');
  assert.match(g.el('resultReview').innerHTML, /ア/); assert.doesNotMatch(g.el('resultReview').innerHTML, /カ/);
  assert.ok(!g.learner.exposures().slice(exposuresBefore).some(event => event.itemId === 'kana:カ'));
  g.el('reviewPracticeBtn').onclick(); g.skip(); assert.deepEqual(plain(g.app.state.reviewIds), ['kana:ア']);
  await g.learner.flush(); const reloaded = await runtime({ storage: g.storage }), restored = JSON.parse(reloaded.learner.export());
  assert.deepEqual(restored.attemptLedger.slice(0, saved.attemptLedger.length), saved.attemptLedger);
  assert.deepEqual(restored.exposureLedger.slice(0, saved.exposureLedger.length), saved.exposureLedger);
  assert.equal(reloaded.learner.state('kana:ア').confusions['kana:カ'], 1);
  assert.deepEqual(restored.games['kana-rain'].rows, saved.games['kana-rain'].rows); assert.deepEqual(restored.games['kana-rain'].best, saved.games['kana-rain'].best);
  assert.notEqual(restored.games['kana-rain'].novelty.seen['kana:カ'], true);
});

test('Katakana result guidance shows only introduced pending forms without changing readiness totals or the remainder', async () => {
  const { g, saved } = await normalGarden();
  g.answer('nu'); g.app.end('Synthetic pending guidance');
  const guidance = g.el('resultNext').innerHTML;
  assert.match(guidance, /0 \/ 5 kana ready/, 'readiness still includes every unlocked vowel');
  assert.match(guidance, /ア/, 'the introduced target retains useful first-hit guidance');
  assert.doesNotMatch(guidance, /[イウエオ]/, 'the result screen cannot reveal vowels that have never fallen');
  assert.match(guidance, /\+4 more kana/, 'the count retains unshown pending forms without displaying their glyphs');
  for (const id of ['kana:イ', 'kana:ウ', 'kana:エ', 'kana:オ']) notIntroduced(g, id);
  assert.deepEqual(plain(g.app.gameData.rows), saved.games['kana-rain'].rows);
  assert.deepEqual(plain(g.app.gameData.best), saved.games['kana-rain'].best);
  assert.equal(g.app.state.correct, 0); assert.equal(g.app.state.errors, 1); assert.equal(g.app.gameData.novelty.cooldownRemaining, 10);
});

test('unlocking Katakana announces the curriculum row without introducing its glyphs while Hiragana keeps its row preview', async () => {
  for (const [script, mode, target] of [['katakana', 'kata', 'kana:ア'], ['hiragana', 'hira', 'kana:あ']]) {
    const saved = savedGarden({ seen: script === 'katakana' ? ['kana:ア', 'kana:イ', 'kana:ウ', 'kana:エ', 'kana:オ'] : [] });
    saved.games['kana-rain'].rows.hiragana = 1;
    const g = await runtime({ storage: [['jp-learner-v1', JSON.stringify(saved)]] });
    let serial = 0;
    for (const kana of g.data.kana.filter(k => k.script === script && k.row === 'a')) {
      for (let hit = 0; hit < (kana.id === target ? 1 : 2); hit++) {
        serial++;
        g.learner.record(kana.id, facet, { gameId: 'kana-rain', sessionId: 'synthetic-unlock', roundId: 'ready-round:' + serial,
          attemptId: 'ready-attempt:' + serial, firstAttempt: true, correct: true, assistance: false, responseFormat: 'romaji',
          response: kana.romaji, now: 1700000000000 + serial * 1000, deferSave: true });
      }
    }
    g.el('mode').value = mode; g.el('mode').onchange(); g.app.start({ reviewIds: [target] }); g.skip();
    assert.equal(g.app.state.target.id, target); g.answer('a');
    assert.equal(g.app.gameData.rows[script], 2, 'the real final first hit opens the row');
    assert.equal(g.app.state.correct, 1); assert.equal(g.app.state.errors, 0);
    assert.equal(g.learner.state(target).facets[facet].firstCorrect, 2);
    const message = g.el('feedback').textContent;
    assert.match(message, /^A new row is growing:/);
    if (mode === 'kata') {
      assert.match(message, /K/i, 'the curriculum name still identifies the newly earned row');
      assert.doesNotMatch(message, /[ァ-ヿ]/u, 'unlocked Katakana still wait for their normal first presentation');
      for (const k of g.data.kana.filter(k => k.script === script && k.row === 'k')) notIntroduced(g, k.id);
    } else assert.match(message, /か き く け こ/, 'Hiragana retains its original row-glyph announcement');
    assert.deepEqual(plain(g.app.gameData.best), saved.games['kana-rain'].best);
  }
});
