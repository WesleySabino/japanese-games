const test = require('node:test');
const assert = require('node:assert/strict');
const Difficulty = require('../src/difficulty.js');
const { runtime, inputRain, play } = require('./runtime-harness.cjs');

const plain = value => JSON.parse(JSON.stringify(value));
const totals = g => [g.app.state.correct, g.app.state.errors, g.app.state.expirations];
function assertTotals(g, expected) {
  assert.deepEqual(totals(g), expected);
  assert.equal(g.app.state.attempts, expected[0] + expected[1], 'only submitted answers enter attempts');
  assert.equal(Number(g.el('correctCount').textContent), expected[0], 'the live correct-answer total agrees with the session');
  const events = g.learner.attempts().filter(event => event.sessionId === g.app.state.sessionId);
  assert.deepEqual([
    events.filter(event => event.correct === true).length,
    events.filter(event => event.correct === false && event.outcome !== 'timeout').length,
    events.filter(event => event.outcome === 'timeout').length
  ], expected, 'visible counts agree with independently recorded learner events');
}
function assertResults(g, expected) {
  assertTotals(g, expected);
  const stats = [...g.el('resultStats').innerHTML.matchAll(/<div><b>(\d+)<\/b><small>([^<]+)<\/small><\/div>/g)].map(match => [Number(match[1]), match[2]]);
  assert.deepEqual(stats, expected.map((count, index) => [count, ['CORRECT ANSWERS', 'WRONG ANSWERS', 'EXPIRED DROPS'][index]]));
  assert.doesNotMatch(g.el('resultStats').innerHTML + g.el('resultTitle').textContent + g.el('resultMessage').textContent, /points|score|personal best/i);
}
function nextDrop(g) {
  if (!g.app.state.drops.length) { g.app.state.sinceSpawn = 99999; g.tick(); }
  const drop = g.app.state.drops[0]; assert.ok(drop, 'an eligible familiar drop is available'); return drop;
}
function expire(g, drop = nextDrop(g)) { drop.progress = 1; g.tick(); }

test('two wrong submissions followed by correction count 1 correct, 2 wrong and no expiration', async () => {
  const g = await inputRain(['kana:あ']);
  g.answer('zzz'); g.answer('zzz'); g.answer('a');
  assertTotals(g, [1, 2, 0]);
  assert.equal(g.app.state.mistakes.size, 1, 'unique mistaken kana are not the wrong-answer count');
  const facet = g.learner.state('kana:あ').facets['form→sound'];
  assert.equal(facet.correct, 1); assert.equal(facet.errors, 2);
  assert.equal(facet.firstAttempts, 1); assert.equal(facet.firstCorrect, 0, 'a counted correction does not become an unlock hit');
  assert.equal(g.app.gameData.novelty.cooldownRemaining, 10, 'correction does not recover the failure pause');
  assert.equal(g.app.gameData.novelty.recent.at(-1).miss, true);
  g.tick();
  const curve = Difficulty.atTime('easy', 1.6);
  assert.equal(g.app.state.speed, curve.speed); assert.equal(g.app.state.gap, curve.gap);
  g.app.end('Synthetic correction check'); assertResults(g, [1, 2, 0]);
  assert.match(g.el('resultDetails').textContent, /0 first-try · 1 after correction/);
});

test('a wrong answer and later expiration count 0 correct, 1 wrong and 1 expiration', async () => {
  const g = await inputRain(['kana:あ']);
  g.answer('zzz'); expire(g);
  assertTotals(g, [0, 1, 1]);
  assert.equal(g.app.state.lives, 2);
  const facet = g.learner.state('kana:あ').facets['form→sound'];
  assert.equal(facet.errors, 1); assert.equal(facet.timeouts, 1);
  assert.equal(facet.firstAttempts, 1); assert.equal(facet.firstCorrect, 0);
  const recent = g.app.gameData.novelty.recent.at(-1);
  assert.equal(recent.timeout, true); assert.equal(recent.miss, true);
  assert.equal(g.app.gameData.novelty.cooldownRemaining, 10);
  g.tick(); assert.equal(g.app.state.speed, .1, 'expiration still floors the adaptive curve at its opening pace');
  g.app.end('Synthetic wrong and expiration check'); assertResults(g, [0, 1, 1]);
});

test('an untouched expiration counts separately without inventing a wrong answer or a first attempt', async () => {
  const g = await inputRain(['kana:あ']); expire(g);
  assertTotals(g, [0, 0, 1]);
  const facet = g.learner.state('kana:あ').facets['form→sound'];
  assert.equal(facet.errors, 0); assert.equal(facet.timeouts, 1); assert.equal(facet.firstAttempts, 0);
  assert.equal(g.app.gameData.novelty.recent.at(-1).miss, false);
  g.app.end('Synthetic untouched expiration check'); assertResults(g, [0, 0, 1]);
});

test('blank submission, unfinished typing and choosing a sound family do not count as wrong answers', async () => {
  const g = await inputRain(['kana:か']);
  g.answer(''); g.answer('   '); g.type('k'); play(g, 500);
  assertTotals(g, [0, 0, 0]);
  g.type('zzz'); play(g, 500); assertTotals(g, [0, 0, 0]);
  g.pad({ family: 'k' }); assertTotals(g, [0, 0, 0]);
  g.app.end('Synthetic unfinished answer check'); assertResults(g, [0, 0, 0]);
});

test('sound-pad compositions count each deliberate wrong or correct answer once', async () => {
  const g = await inputRain(['kana:あ']);
  g.compose('kana:い'); assertTotals(g, [0, 1, 0]);
  g.compose('kana:あ'); play(g, 400); assertTotals(g, [1, 1, 0]);
  const events = g.learner.attempts();
  assert.equal(events.length, 2); assert.ok(events.every(event => event.inputMethod === 'composer'));
  g.app.end('Synthetic composition check'); assertResults(g, [1, 1, 0]);
});

test('pending n answers resolve once, whether committed by the typing pause or Enter', async () => {
  for (const enter of [false, true]) {
    const g = await inputRain(['kana:ん', 'kana:ね']);
    g.type('n'); play(g, 100); assertTotals(g, [0, 0, 0]);
    if (enter) g.answer('n');
    play(g, 400); assertTotals(g, [1, 0, 0]);
    assert.equal(g.learner.attempts().length, 1); assert.equal(g.learner.attempts()[0].response, 'n');
    assert.equal(g.app.state.drops[0].id, 'kana:ね');
    g.app.end('Synthetic prefix check'); assertResults(g, [1, 0, 0]);
  }
});

test('last-heart expiration is counted before results and duplicate ending cannot count it twice', async () => {
  const g = await inputRain(['kana:あ']); g.app.state.lives = 1; expire(g);
  assert.equal(g.app.state.over, true); assert.equal(g.app.state.lives, 0);
  assertResults(g, [0, 0, 1]);
  const saved = g.learner.export(), sessions = g.app.gameData.sessions;
  g.app.end('Repeated ending'); g.tick();
  assert.equal(g.app.gameData.sessions, sessions); assert.equal(g.learner.export(), saved);
  assertResults(g, [0, 0, 1]);
  g.app.start(); g.skip(); assertTotals(g, [0, 0, 0]); assert.equal(g.app.state.lives, 3);
});

test('timer accepts its already entered pending answer once and a new run resets all counts', async () => {
  const g = await inputRain(['kana:ん']);
  g.app.state.t = .01; g.type('n'); g.tick(16);
  assert.equal(g.app.state.over, true); assertResults(g, [1, 0, 0]);
  assert.equal(g.learner.attempts().length, 1);
  g.app.end('Repeated timer ending'); assertResults(g, [1, 0, 0]);
  g.app.start(); g.skip(); assertTotals(g, [0, 0, 0]);
});

test('manual ending leaves unfinished input uncounted and review starts with fresh counts', async () => {
  const g = await inputRain(['kana:ん']);
  g.type('n'); g.app.end('Synthetic manual ending'); play(g, 400);
  assertResults(g, [0, 0, 0]);
  g.app.start({ reviewIds: ['kana:ん'] }); g.skip();
  assert.equal(g.app.state.sessionDuration, 60); assertTotals(g, [0, 0, 0]);
  play(g, 400); assertTotals(g, [0, 0, 0]);
  g.answer('n'); g.app.end('Synthetic review ending'); assertResults(g, [1, 0, 0]);
});

test('all historical point records survive normal play, review, storage, export and reload unchanged', async () => {
  const best = { hira: 1981, 'hira:normal:180': 444, 'arcade-v2:hira:easy:180': 9876, 'arcade-v2:hira:easy:60:review': 321, 'arcade-v2:kata:hard:180': 123, retired: { points: 777, note: 'preserve exactly' } };
  const seed = {
    version: 2, created: 1700000000000, sequence: 0, items: {}, errorLog: [], attemptLedger: [], exposureLedger: [], reveals: {},
    games: { 'kana-rain': { rows: { hiragana: 1, katakana: 1 }, best, accuracy: {}, novelty: { version: 1, pace: 'calm', seen: { 'kana:あ': true }, recent: [], blocked: false, cooldownRemaining: 0 } } }
  };
  const g = await runtime({ storage: [['jp-learner-v1', JSON.stringify(seed)]] });
  const assertBest = async () => {
    await g.learner.flush();
    assert.deepEqual(plain(g.app.gameData.best), best);
    assert.deepEqual(JSON.parse(g.learner.export()).games['kana-rain'].best, best);
    assert.deepEqual(JSON.parse(g.storage.get('jp-learner-v1')).games['kana-rain'].best, best);
  };
  g.app.start(); g.skip(); g.answer('zzz'); g.answer('a'); g.app.end('Synthetic normal session');
  assertResults(g, [1, 1, 0]); await assertBest();
  for (const oldField of ['score', 'bestKey', 'previousBest', 'bestBeaten']) assert.equal(Object.hasOwn(g.app.state, oldField), false);
  g.app.start({ reviewIds: ['kana:あ'] }); g.skip(); assertTotals(g, [0, 0, 0]);
  g.answer('a'); g.app.end('Synthetic focused review'); assertResults(g, [1, 0, 0]); await assertBest();
  const restored = await runtime({ storage: g.storage });
  assert.deepEqual(plain(restored.app.gameData.best), best);
  assert.deepEqual(JSON.parse(restored.learner.export()).games['kana-rain'].best, best);
  assert.deepEqual(plain(restored.app.gameData.rows), { hiragana: 1, katakana: 1 });
  assert.deepEqual(plain(restored.learner.attempts()), plain(g.learner.attempts()));
  assert.deepEqual(plain(restored.app.gameData.novelty), plain(g.app.gameData.novelty));
  const round = restored.app.generateRound({ id: 'kana:あ' });
  assert.deepEqual(plain(restored.app.score(round, { correct: true })[0]), { correct: true, itemId: 'kana:あ', facet: 'form→sound', responseFormat: 'romaji', gameId: 'kana-rain' }, 'the public evidence-building score API remains compatible');
});

test('analytics still sends only session mode and completion reason, never the new counts', async () => {
  const events = [], analytics = { track(name, params) { events.push({ name, params: plain(params) }); } };
  const g = await inputRain(['kana:あ'], 'hira', { analytics });
  g.answer('zzz'); g.answer('a'); expire(g); g.app.end('Synthetic analytics ending');
  assertResults(g, [1, 1, 1]);
  assert.deepEqual(events, [
    { name: 'practice_start', params: { practice_mode: 'review' } },
    { name: 'practice_complete', params: { practice_mode: 'review', completion_reason: 'manual_finish' } }
  ]);
  g.app.end('Repeated ending'); assert.equal(events.length, 2);
  for (const { name, params } of events) assert.deepEqual(Object.keys(params).sort(), name === 'practice_start' ? ['practice_mode'] : ['completion_reason', 'practice_mode']);
});
