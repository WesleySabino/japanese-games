const test = require('node:test');
const assert = require('node:assert/strict');
const Difficulty = require('../src/difficulty.js');
const { runtime, play } = require('./runtime-harness.cjs');

// The shared curve reads an effective time: +1.6 s per correct answer, -20 s per expiration, never below 0.
const curve = (correct, expirations) => {
  const { speed, gap } = Difficulty.atTime(Math.max(0, correct * 1.6 - expirations * 20));
  return { speed, gap };
};
const weather = g => ({ speed: g.app.state.speed, gap: g.app.state.gap });

async function rain() {
  const g = await runtime();
  g.app.start(); g.skip();
  return g;
}
function nextDrop(g) {
  if (!g.app.state.drops.length) { g.app.state.sinceSpawn = 99999; g.tick(); }
  const drop = g.app.state.drops[0]; assert.ok(drop, 'an eligible drop is available'); return drop;
}
// The curve is read at the start of each active frame, so one more frame shows the change.
function answer(g) { g.answer(g.app.accepted(nextDrop(g))[0]); g.tick(); }
function expire(g) { nextDrop(g).progress = 1; g.tick(); g.tick(); }

test('active time alone no longer accelerates the rain', async () => {
  const g = await rain();
  assert.deepEqual(weather(g), curve(0, 0)); assert.equal(g.app.state.speed, 0.1);
  play(g, 5000);
  assert.ok(g.app.state.elapsed > 4.9);
  assert.deepEqual(weather(g), curve(0, 0), 'five seconds of play without answers keep the opening pace');
  g.app.state.elapsed = 90; g.tick();
  assert.deepEqual(weather(g), curve(0, 0), 'a long session without answers keeps the opening pace');
});

test('each correct answer advances the curve by 1.6 seconds', async () => {
  const g = await rain();
  for (let n = 1; n <= 3; n++) {
    answer(g);
    assert.equal(g.app.state.correct, n);
    assert.deepEqual(weather(g), curve(n, 0), n + ' correct answers');
  }
  assert.ok(g.app.state.speed > 0.1);
  g.app.state.correct = 50; g.tick();
  assert.deepEqual(weather(g), curve(50, 0), '50 correct answers equal 80 seconds of the former clock');
});

test('each expiration steps the curve back 20 seconds and costs its heart', async () => {
  const g = await rain();
  g.app.state.correct = 30; g.tick();
  assert.deepEqual(weather(g), curve(30, 0));
  expire(g);
  assert.equal(g.app.state.expirations, 1); assert.equal(g.app.state.lives, 2);
  assert.deepEqual(weather(g), curve(30, 1), '48 seconds step back to 28');
  expire(g);
  assert.equal(g.app.state.expirations, 2); assert.equal(g.app.state.lives, 1);
  assert.deepEqual(weather(g), curve(30, 2), '28 seconds step back to 8');
  answer(g);
  assert.deepEqual(weather(g), curve(31, 2), 'hits after an expiration push the curve forward again');
});

test('the effective time never drops below the opening pace', async () => {
  const early = await rain();
  early.app.state.correct = 5; early.tick();
  assert.deepEqual(weather(early), curve(5, 0));
  expire(early);
  assert.deepEqual(weather(early), curve(0, 0), '8 seconds minus 20 stops at the opening pace');
  assert.equal(early.app.state.speed, 0.1); assert.equal(early.app.state.gap, 2400);
  const g = await rain();
  expire(g);
  assert.deepEqual(weather(g), curve(0, 0));
  for (let n = 0; n < 12; n++) answer(g);
  assert.equal(g.app.state.correct, 12);
  assert.deepEqual(weather(g), curve(0, 0), '12 hits only repay the 20-second step back');
  answer(g);
  assert.deepEqual(weather(g), curve(13, 1)); assert.ok(g.app.state.speed > 0.1, 'the 13th hit accelerates again');
});

test('the default rain retains its adaptive curve and 3.5x ceiling', async () => {
    const g = await rain();
    assert.equal(g.app.state.difficulty, undefined);
    g.app.state.correct = 60; g.tick();
    assert.deepEqual(weather(g), curve(60, 0));
    g.app.state.correct = 1000; g.tick();
    const cap = Difficulty.atTime(150);
    assert.deepEqual(weather(g), { speed: cap.speed, gap: cap.gap }, 'stops at the existing ceiling');
    assert.equal(g.app.state.speed, 3.5 / Difficulty.rain.fallSeconds);
});

test('a new run starts again from the opening pace', async () => {
  const g = await rain();
  for (let n = 0; n < 3; n++) answer(g);
  expire(g);
  g.app.end('Restart'); g.app.start(); g.skip(); g.tick();
  assert.equal(g.app.state.correct, 0); assert.equal(g.app.state.expirations, 0);
  assert.deepEqual(weather(g), curve(0, 0));
});
