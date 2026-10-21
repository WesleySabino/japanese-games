const test = require('node:test');
const assert = require('node:assert/strict');
const { runtime } = require('./runtime-harness.cjs');

const BASE = 1700000000000, FACET = 'form→sound';
const plain = value => JSON.parse(JSON.stringify(value));
const scope = g => {
  assert.ok(g.app.gameData.katakanaNovelty, 'Katakana pressure has its own additive persisted state');
  return g.app.gameData.katakanaNovelty;
};
function event(itemId, key, extra = {}) {
  return { attemptId: 'pressure-attempt:' + key, roundId: 'pressure-round:' + key, sessionId: 'synthetic-practice', itemId,
    gameId: 'kana-rain', facet: FACET, responseFormat: /[ァ-ヺ]/.test(itemId) ? 'hiragana-choice' : 'romaji',
    firstAttempt: true, assistance: true, assistanceReasons: ['synthetic-fixture'], outcome: 'correct', correct: true,
    reason: 'accepted', response: 'synthetic', at: BASE, ...extra };
}
function exposure(itemId, extra = {}) {
  return { exposureId: 'pressure-exposure:' + itemId, itemId, gameId: 'kana-rain', facet: FACET,
    reason: 'initial-reading', sessionId: 'synthetic-earlier-session', roundId: null, at: BASE - 1000, ...extra };
}
function pressure(rounds = 4) {
  return { version: 1, pace: 'calm', seen: { 'kana:あ': true, 'kana:ア': true },
    recent: Array.from({ length: rounds }, (_, index) => ({ roundId: 'unattributed:' + index, firstCorrect: false, timeout: false, miss: true, familiar: true })),
    blocked: true, cooldownRemaining: 10 };
}
function saved({ attempts = [], exposures = [], items = {}, gameData = {}, version = 2 } = {}) {
  return { version, created: BASE, sequence: 0, items, errorLog: [], attemptLedger: attempts, exposureLedger: exposures, reveals: {},
    games: { 'kana-rain': { rows: { hiragana: 11, katakana: 1 }, katakanaUnlocked: true, best: { 'hira:normal:180': 1981, 'arcade-v2:kata:easy:180': 321 },
      accuracy: { hira: { attempts: 7, correct: 6 } }, sound: false, ...gameData } } };
}
const boot = input => runtime({ storage: [['jp-learner-v1', JSON.stringify(input)]] });
function correctedMisses(itemId, count = 4) {
  return Array.from({ length: count }, (_, index) => {
    const roundId = 'miss-round:' + itemId + ':' + index, at = BASE + index * 2000;
    return [event(itemId, 'wrong:' + itemId + ':' + index, { roundId, outcome: 'incorrect', correct: false, reason: 'different-item', at }),
      event(itemId, 'correction:' + itemId + ':' + index, { roundId, firstAttempt: false, at: at + 1000 })];
  }).flat();
}

test('v1 aggregates retain Katakana familiarity and old facts without inventing ordered pressure samples', async () => {
  const oldFacet = { correct: 8, errors: 9, reps: 17, lastReview: BASE, stability: 2, difficulty: 6, unaided: 3 };
  const input = saved({ version: 1, items: {
    'kana:ア': { itemId: 'kana:ア', facets: { [FACET]: oldFacet }, confusions: { 'kana:イ': 2 }, flags: {}, scaffold: {} },
    'kana:あ': { itemId: 'kana:あ', facets: { [FACET]: { ...oldFacet, errors: 100 } }, confusions: {}, flags: {}, scaffold: {} }
  } });
  const g = await boot(input), scoped = scope(g);
  assert.equal(scoped.seen['kana:ア'], true);
  assert.equal(scoped.seen['kana:あ'], undefined);
  assert.deepEqual(plain(scoped.recent), [], 'cumulative v1 counts do not prove round order or a recent window');
  assert.equal(scoped.blocked, false);
  assert.deepEqual(plain(g.learner.attempts()), [], 'migration creates no synthetic attempt evidence');
  assert.deepEqual(plain(g.learner.state('kana:ア').legacyFacets[FACET]), oldFacet);
  assert.deepEqual(plain(g.app.gameData.rows), input.games['kana-rain'].rows);
  assert.deepEqual(plain(g.app.gameData.best), input.games['kana-rain'].best);
});

test('a saved global window without item IDs remains intact and is never relabeled as Katakana pressure', async () => {
  const global = pressure(), before = plain(global);
  const g = await boot(saved({ gameData: { novelty: global } }));
  assert.deepEqual(plain(g.app.gameData.novelty), before, 'the original global pressure and cooldown are not discarded');
  assert.equal(scope(g).seen['kana:ア'], true, 'a previously introduced Katakana remains familiar');
  assert.deepEqual(plain(scope(g).recent), [], 'authorship cannot be invented from global round IDs');
  assert.equal(scope(g).blocked, false, 'Hiragana or ambiguous global pressure must not recreate the first-Katakana lock');
  assert.equal(g.app.gameData.novelty.cooldownRemaining, 10, 'the existing immediate global pause remains');
});

test('a saved valid Katakana state is authoritative even with no attempt ledger and survives export/reload', async () => {
  const scoped = pressure(); scoped.seen = { 'kana:ア': true }; scoped.retainedMarker = 'old-scoped-history';
  const global = pressure(), input = saved({ gameData: { novelty: global, katakanaNovelty: scoped } });
  const g = await boot(input);
  assert.deepEqual(plain(scope(g)), scoped, 'do not replace existing hysteresis with an empty replay');
  assert.deepEqual(plain(g.app.gameData.novelty), global);
  await g.learner.flush();
  const exported = JSON.parse(g.learner.export()), restored = await runtime({ storage: g.storage });
  assert.deepEqual(plain(scope(restored)), scoped);
  assert.deepEqual(plain(restored.app.gameData.novelty), global);
  assert.deepEqual(plain(restored.learner.attempts()), []);
  for (const key of ['rows', 'best', 'accuracy']) assert.deepEqual(plain(restored.app.gameData[key]), exported.games['kana-rain'][key]);
});

test('four real corrected familiar Katakana misses rebuild a closed scoped gate without rewriting evidence', async () => {
  const attempts = correctedMisses('kana:ア'), exposures = [exposure('kana:ア')];
  const g = await boot(saved({ attempts, exposures })), scoped = scope(g);
  assert.equal(scoped.blocked, true);
  assert.equal(scoped.recent.length, 4);
  assert.ok(scoped.recent.every(round => round.miss === true && round.familiar === true && !round.firstCorrect && !round.timeout));
  assert.equal(scoped.cooldownRemaining, 10);
  assert.deepEqual(plain(g.learner.attempts()), attempts);
  assert.deepEqual(plain(g.learner.exposures().slice(0, exposures.length)), exposures);
});

test('two real Katakana expirations rebuild their own long brake, including untouched rounds', async () => {
  const attempts = [0, 1].map(index => event('kana:ア', 'timeout:' + index, { outcome: 'timeout', correct: null, reason: 'timeout', response: null, at: BASE + index * 1000 }));
  const g = await boot(saved({ attempts })), scoped = scope(g);
  assert.equal(scoped.blocked, true);
  assert.equal(scoped.recent.length, 2);
  assert.ok(scoped.recent.every(round => round.timeout === true && !round.firstCorrect));
  assert.equal(g.app.gameData.novelty.cooldownRemaining, 10);
  assert.deepEqual(plain(g.learner.attempts()), attempts);
});

test('sixty later Hiragana successes cannot wash out reconstructed Katakana pressure', async () => {
  const kata = correctedMisses('kana:ア');
  const hira = Array.from({ length: 60 }, (_, index) => event('kana:あ', 'later-hira:' + index, { at: BASE + 100000 + index * 1000 }));
  const attempts = kata.concat(hira), exposures = [exposure('kana:ア'), exposure('kana:あ')];
  const g = await boot(saved({ attempts, exposures }));
  assert.equal(g.app.gameData.novelty.blocked, false, 'the old global gate genuinely recovered');
  assert.equal(g.app.gameData.novelty.cooldownRemaining, 0);
  assert.equal(scope(g).blocked, true, 'only Katakana samples can recover the Katakana window');
  assert.equal(scope(g).recent.length, 4);
  assert.ok(scope(g).recent.every(round => round.roundId.startsWith('miss-round:kana:ア:')));
  await g.learner.flush();
  const before = JSON.parse(g.learner.export()), restored = await runtime({ storage: g.storage });
  assert.deepEqual(plain(scope(restored)), before.games['kana-rain'].katakanaNovelty);
  assert.deepEqual(plain(restored.learner.attempts()), attempts);
});

test('scoped replay excludes Hiragana, other games/facets and IDs outside the 104-Katakana catalogue', async () => {
  const ignored = correctedMisses('kana:あ').concat(
    [0, 1].map(index => event('kana:ア', 'other-game:' + index, { gameId: 'other-game', outcome: 'timeout', correct: null })),
    [0, 1].map(index => event('kana:ア', 'other-facet:' + index, { facet: 'script→script', outcome: 'timeout', correct: null })),
    [0, 1].map(index => event('kana:ニホン', 'outside-catalogue:' + index, { outcome: 'timeout', correct: null })),
    [0, 1].map(index => event('w:ねこ', 'old-word:' + index, { outcome: 'timeout', correct: null }))
  );
  const exposures = [exposure('kana:イ'), exposure('kana:ウ', { gameId: 'other-game' }), exposure('kana:エ', { facet: 'script→script' }), exposure('kana:ニホン')];
  const g = await boot(saved({ attempts: ignored, exposures })), scoped = scope(g);
  assert.deepEqual(plain(scoped.recent), []);
  assert.equal(scoped.blocked, false);
  assert.equal(scoped.seen['kana:イ'], true);
  for (const id of ['kana:あ', 'kana:ウ', 'kana:エ', 'kana:ニホン', 'w:ねこ']) assert.equal(scoped.seen[id], undefined, id + ' is outside scoped evidence');
  assert.deepEqual(plain(g.learner.attempts()), ignored, 'filtering affects the new pressure view, never the durable ledger');
  assert.deepEqual(plain(g.learner.exposures().slice(0, exposures.length)), exposures);
});
