const test = require('node:test');
const assert = require('node:assert/strict');
const { runtime, play, inputRain } = require('./runtime-harness.cjs');

test('a single n auto-submits both hiragana and katakana after a bounded typing pause', async () => {
  for (const [id, mode] of [['kana:ん', 'hira'], ['kana:ン', 'kata']]) {
    const g = await inputRain([id], mode);
    g.type('n'); play(g, 290);
    assert.equal(g.app.state.correct, 0, 'leave a short window for the accepted nn spelling');
    play(g, 20);
    assert.equal(g.app.state.correct, 1); assert.equal(g.app.state.attempts, 1);
    assert.equal(g.el('answer').value, '');
    assert.equal(g.learner.attempts().at(-1).itemId, id);
    assert.equal(g.learner.attempts().at(-1).response, 'n');
  }
});

test('n resolves with ne on screen, while continued typing still selects ne or nn exactly once', async () => {
  for (const response of ['n', 'ne', 'nn']) {
    const g = await inputRain(['kana:ん', 'kana:ね']);
    g.type('n'); play(g, 100);
    if (response !== 'n') g.type(response);
    play(g, 400);
    assert.equal(g.app.state.correct, 1); assert.equal(g.app.state.attempts, 1);
    assert.equal(g.el('answer').value, '');
    const answer = g.learner.attempts().at(-1);
    assert.equal(answer.itemId, response === 'ne' ? 'kana:ね' : 'kana:ん');
    assert.equal(answer.response, response);
    assert.equal(g.app.state.drops.length, 1, 'the other falling kana is untouched');
  }
});


test('Enter remains immediate and the sound pad commits n at once, only once', async () => {
  const forced = await inputRain(['kana:ん', 'kana:ね']);
  forced.type('n'); play(forced, 100); forced.answer('n');
  assert.equal(forced.app.state.correct, 1, 'Enter commits before the ambiguity window ends');
  play(forced, 400); assert.equal(forced.app.state.attempts, 1);
  const touch = await inputRain(['kana:ん', 'kana:ね']);
  touch.compose('kana:ん');
  assert.equal(touch.app.state.correct, 1, 'an explicit n slot needs no ambiguity wait');
  play(touch, 400);
  assert.equal(touch.app.state.attempts, 1); assert.equal(touch.app.state.drops[0].id, 'kana:ね');
  assert.equal(touch.el('answer').value, '');
});

test('editing or deleting an ambiguous answer cancels its old completion', async () => {
  for (const replacement of ['', 'nx']) {
    const g = await inputRain(['kana:ん', 'kana:ね']);
    g.type('n'); play(g, 100); g.type(replacement); play(g, 400);
    assert.equal(g.app.state.correct, 0); assert.equal(g.app.state.attempts, 0);
    assert.equal(g.el('answer').value, replacement);
    assert.equal(g.app.state.lives, 3);
  }
});

test('IME composition cannot submit a pending answer and composition end starts a fresh window', async () => {
  const g = await inputRain(['kana:ん', 'kana:ね']);
  g.type('n'); play(g, 100); g.el('answer').oncompositionstart(); play(g, 400);
  assert.equal(g.app.state.correct, 0); assert.equal(g.app.state.attempts, 0);
  g.el('answer').oncompositionend(); play(g, 290);
  assert.equal(g.app.state.correct, 0);
  play(g, 20); assert.equal(g.app.state.correct, 1); assert.equal(g.app.state.attempts, 1);
});

test('pausing and the resume countdown freeze an ambiguous answer until active play continues', async () => {
  const g = await inputRain(['kana:ん', 'kana:ね']);
  g.type('n'); play(g, 100); g.app.pause(true); play(g, 1000);
  assert.equal(g.app.state.correct, 0); assert.equal(g.el('answer').value, 'n');
  g.app.pause(false); play(g, 1000);
  assert.equal(g.app.state.countingDown, true); assert.equal(g.app.state.correct, 0);
  g.skip(); play(g, 100); assert.equal(g.app.state.correct, 0);
  play(g, 120); assert.equal(g.app.state.correct, 1); assert.equal(g.app.state.attempts, 1);
});

test('ending and restarting cannot carry a delayed answer into another session', async () => {
  const g = await inputRain(['kana:ん']);
  g.type('n'); play(g, 100); g.app.end('Finished'); play(g, 400);
  assert.equal(g.app.state.correct, 0); assert.equal(g.learner.attempts().length, 0);
  g.app.start({ reviewIds: ['kana:ん'] }); g.skip(); play(g, 400);
  assert.equal(g.app.state.correct, 0); assert.equal(g.app.state.attempts, 0);
  g.type('n'); play(g, 350); assert.equal(g.app.state.correct, 1);
  assert.equal(g.learner.attempts().length, 1);
});

test('a removed pending round cannot score a replacement with the same kana or mark another drop wrong', async () => {
  const g = await inputRain(['kana:ん', 'kana:ね']), removed = g.app.state.drops[0];
  g.type('n'); play(g, 100);
  // Simulate a round removed between input and the next frame, then spawn the same kana again.
  g.app.state.drops = g.app.state.drops.filter(drop => drop !== removed); removed.el.remove();
  g.app.state.queue = [{ id: 'kana:ん' }]; g.app.state.sinceSpawn = 9999; g.tick();
  play(g, 400);
  assert.equal(g.app.state.correct, 0); assert.equal(g.app.state.attempts, 0);
  assert.equal(g.app.state.lives, 3); assert.equal(g.el('answer').value, 'n');
  assert.equal(g.app.state.drops.length, 2);
});

test('a correct pending answer reaching the waterline resolves before a life can be lost', async () => {
  const g = await inputRain(['kana:ん', 'kana:ね']);
  g.app.state.drops[0].progress = .999;
  g.type('n'); g.tick(16);
  assert.equal(g.app.state.correct, 1); assert.equal(g.app.state.attempts, 1);
  assert.equal(g.app.state.lives, 3); assert.equal(g.app.state.missed.size, 0);
  assert.equal(g.learner.attempts().length, 1); assert.equal(g.learner.attempts()[0].correct, true);
  assert.equal(g.el('answer').value, '');
});

test('an expired drop clears an unfinished answer even when another drop was highlighted', async () => {
  const g = await inputRain(['kana:ん', 'kana:ね']);
  const expired = g.app.state.drops[1];
  g.type('k'); play(g, 100);
  assert.equal(g.app.state.target.id, 'kana:ん');
  expired.progress = .999; g.tick(16);
  assert.equal(g.el('answer').value, '');
  assert.equal(g.app.state.lives, 2); assert.equal(g.app.state.correct, 0);
  assert.equal(g.app.state.attempts, 0, 'clearing partial input does not submit it as a mistake');
  assert.equal(g.app.state.inputStartedAt, null); assert.equal(g.app.state.inputPausedMs, 0);
  const event = g.learner.attempts().at(-1);
  assert.equal(event.itemId, expired.id); assert.equal(event.outcome, 'timeout');
  assert.equal(event.inputActiveMs, 116, 'the timeout retains the elapsed partial-input timing');
  g.type('n'); play(g, 350);
  assert.equal(g.app.state.correct, 1, 'the next answer starts from an empty field');
});

test('an expiration cancels a delayed prefix answer for a different surviving drop', async () => {
  const g = await inputRain(['kana:ん', 'kana:ね']);
  g.type('n'); play(g, 100);
  assert.ok(g.app.state.pendingAnswer);
  g.app.state.drops[1].progress = .999; g.tick(16);
  assert.equal(g.el('answer').value, ''); assert.equal(g.app.state.pendingAnswer, null);
  play(g, 400);
  assert.equal(g.app.state.correct, 0); assert.equal(g.app.state.attempts, 0);
  assert.equal(g.app.state.lives, 2); assert.equal(g.learner.attempts().length, 1);
  g.type('n'); play(g, 350);
  assert.equal(g.app.state.correct, 1, 'only freshly typed input may score the surviving drop');
});


test('the session clock accepts a correct answer already entered before time runs out', async () => {
  const g = await inputRain(['kana:ん']);
  g.app.state.t = .01; g.type('n'); g.tick(16);
  assert.equal(g.app.state.over, true); assert.equal(g.app.state.correct, 1);
  assert.equal(g.app.state.attempts, 1); assert.equal(g.learner.attempts().length, 1);
  assert.equal(g.learner.attempts()[0].response, 'n');
});

test('countdown stays at three when the first animation frame predates its start', async () => {
  const g = await runtime(); g.app.start();
  const before = { time: g.app.state.t, elapsed: g.app.state.elapsed, progress: g.app.state.drops[0].progress };
  const callbacks = [...g.frames.values()]; g.frames.clear();
  // A frame timestamp can precede performance.now() sampled while handling Start.
  callbacks.forEach(callback => callback(999));
  assert.equal(g.el('countdownNumber').textContent, '3');
  assert.deepEqual({ time: g.app.state.t, elapsed: g.app.state.elapsed, progress: g.app.state.drops[0].progress }, before);
  g.tick(1100); assert.equal(g.el('countdownNumber').textContent, '2');
  g.tick(1000); assert.equal(g.el('countdownNumber').textContent, '1');
  g.tick(900); assert.equal(g.app.state.countingDown, false);
  assert.equal(g.app.state.paused, false);
  assert.deepEqual({ time: g.app.state.t, elapsed: g.app.state.elapsed, progress: g.app.state.drops[0].progress }, before);
});

test('a paused or hidden session has no queued animation work, and resumes without adding paused time', async () => {
  const g = await runtime(); g.app.start();
  assert.equal(g.frames.size, 1, 'initial countdown is awake'); g.skip(); g.tick();
  g.app.pause(true); const before = g.app.state.t;
  assert.equal(g.frames.size, 0); assert.equal(g.document.body.classList.contains('game-paused'), true);
  for (let i = 0; i < 100; i++) g.tick();
  assert.equal(g.app.state.t, before);
  g.app.pause(false); assert.equal(g.frames.size, 1, 'resume countdown is awake'); g.skip(); g.tick();
  assert.ok(before - g.app.state.t < .02, 'resume starts with a fresh frame clock');
  assert.equal(g.document.body.classList.contains('game-paused'), false);
  g.hidden(true); assert.equal(g.frames.size, 0); g.hidden(false); assert.equal(g.frames.size, 0, 'visibility does not silently resume');
  g.app.dispose(); assert.equal(g.frames.size, 0);
});


test('ordinary motion does not measure layout; observed field and sprite changes remain bounded', async () => {
  const g = await runtime(); g.app.start(); g.skip(); g.tick();
  g.counts.fieldReads = g.counts.dropReads = 0;
  for (let i = 0; i < 90; i++) g.tick();
  assert.equal(g.counts.fieldReads, 0); assert.equal(g.counts.dropReads, 0);
  const drop = g.app.state.drops[0], field = g.el('field');
  field.width = 300; field.height = 350; g.resize(field);
  drop.el.spriteWidth = 85; drop.el.spriteHeight = 100; g.resize(drop.el);
  assert.equal(drop.w, 85); assert.equal(drop.h, 100);
  assert.ok(drop.x >= 5 && drop.x <= 210); assert.ok(drop.y < 350 - drop.h - 27);
  assert.equal(g.counts.fieldReads, 2); assert.equal(g.counts.dropReads, 2);
  g.counts.fieldReads = g.counts.dropReads = 0; g.tick();
  assert.equal(g.counts.fieldReads + g.counts.dropReads, 0);
});

test('answers leave hidden progress DOM and unchanged keyboards intact; opening progress renders current results', async () => {
  const g = await runtime({ mobile: true });
  assert.equal(g.counts.html.get('masteryMap') || 0, 0, 'hidden progress is not built at startup');
  g.app.start(); g.skip();
  const keyboardBuilds = g.counts.html.get('keyboard');
  g.answer(g.app.accepted(g.app.state.drops[0])[0]);
  g.app.state.sinceSpawn = 9999; g.tick();
  assert.equal(g.counts.html.get('keyboard'), keyboardBuilds, 'new romaji target keeps the same keys');
  assert.equal(g.counts.html.get('masteryMap') || 0, 0);
  assert.equal(g.counts.html.get('unlockDetails') || 0, 0);
  g.el('gardenBtn').onclick();
  assert.equal(g.el('progressDialog').open, true);
  assert.equal(g.counts.html.get('masteryMap'), 1); assert.equal(g.counts.html.get('unlockDetails'), 1);
  assert.match(g.el('masteryMap').innerHTML, /familiarity/);
  assert.equal(g.frames.size, 0, 'progress panel pauses the game');
});

test('timer and danger DOM only change at visible boundaries rather than every frame', async () => {
  const g = await runtime(); g.app.start(); g.skip(); g.tick();
  const timeWrites = g.counts.text.get('time'), waterWrites = g.counts.classes.get('field.waterline:danger-active');
  for (let i = 0; i < 20; i++) g.tick();
  assert.equal(g.counts.text.get('time'), timeWrites);
  assert.equal(g.counts.classes.get('field.waterline:danger-active'), waterWrites);
  g.app.state.drops[0].progress = .79; g.tick();
  assert.equal(g.counts.classes.get('field.waterline:danger-active'), waterWrites + 1);
  g.tick(); assert.equal(g.counts.classes.get('field.waterline:danger-active'), waterWrites + 1);
});
