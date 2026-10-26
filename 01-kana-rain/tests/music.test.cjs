// Menu music scheduling and gating against a recording fake of the Web Audio API.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/music.js'), 'utf8');

function fakeAudio() {
  const log = { starts: [], stops: [], ramps: [], targets: [], disconnected: 0 };
  const listeners = {};
  class Param {
    constructor(value = 0) { this.value = value; }
    setValueAtTime(value) { this.value = value; this.first ??= value; }
    linearRampToValueAtTime(value, time) { log.ramps.push({ param: this, value, time }); }
    exponentialRampToValueAtTime() {}
    setTargetAtTime(value, time) { log.targets.push({ param: this, value, time }); }
    cancelScheduledValues() {}
  }
  class Node {
    connect(node) { this.output = node; return node; }
    disconnect() { log.disconnected++; this.output = null; }
  }
  class Source extends Node {
    start(when) {
      assert.ok(when >= context.currentTime - .04, 'never schedules notes in the past');
      log.starts.push({ node: this, when, at: context.currentTime });
    }
    stop(when = context.currentTime) { log.stops.push({ node: this, when }); }
  }
  const context = {
    state: 'running', currentTime: 0, sampleRate: 48000, destination: new Node(),
    addEventListener: (name, fn) => { listeners[name] = fn; },
    createGain: () => Object.assign(new Node(), { kind: 'gain', gain: new Param(1) }),
    createBiquadFilter: () => Object.assign(new Node(), { frequency: new Param(), gain: new Param(), Q: new Param() }),
    createStereoPanner: () => Object.assign(new Node(), { pan: new Param() }),
    createConvolver: () => new Node(),
    createPeriodicWave: () => ({ periodic: true }),
    createBuffer: (channels, length, sampleRate) => {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      return { length, sampleRate, getChannelData: channel => data[channel] };
    },
    createBufferSource: () => Object.assign(new Source(), { kind: 'buffer', playbackRate: new Param(1) }),
    createOscillator: () => Object.assign(new Source(), { kind: 'oscillator', frequency: new Param(440), detune: new Param(), setPeriodicWave(wave) { this.wave = wave; } })
  };
  return { context, log, listeners };
}

function load({ context = null, menu = true, enabled = true } = {}) {
  let clock = 0;
  const timers = [], documentListeners = {};
  const root = {
    KanaAudio: { enabled, playing: false }, KanaSfx: { context },
    setTimeout: (fn, ms) => { const timer = { at: clock + ms / 1000, fn }; timers.push(timer); return timer; },
    clearTimeout: timer => { const index = timers.indexOf(timer); if (index >= 0) timers.splice(index, 1); }
  };
  const document = {
    hidden: false, addEventListener: (name, fn) => { documentListeners[name] = fn; },
    body: { classList: { contains: name => name === 'is-menu' && state.menu } }
  };
  const state = { menu };
  vm.runInNewContext(source, { window: root, document, Math, Float32Array, Object, Map, WeakMap, WeakSet, Set });
  function advance(seconds, step = .05) {
    for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += step) {
      clock += step;
      if (context) context.currentTime += step;
      for (const timer of timers.filter(timer => timer.at <= clock + 1e-9).sort((a, b) => a.at - b.at)) {
        timers.splice(timers.indexOf(timer), 1);
        timer.fn();
      }
    }
  }
  return { root, document, state, advance, music: root.KanaMusic, documentListeners };
}

test('the loop repeats on exact multiples of its length, with no gap or overlap at the seam', () => {
  const { context, log } = fakeAudio();
  const { music, advance } = load({ context });
  assert.equal(music.sync(), true);
  const { intro, loop } = music.timing, start = log.starts[0].when;
  advance(intro + 3 * loop + 1);
  // Scored notes: koto strings (buffers with a playback rate), shakuhachi tones and taiko.
  // Water drops are left out: their timing is chosen afresh in every cycle.
  const scored = log.starts.filter(({ node }) => node.kind === 'buffer' ? node.buffer.sampleRate === 32000 : node.wave || node.frequency.first === 150);
  const label = ({ node }) => node.kind === 'buffer' ? 'string:' + node.buffer.length : node.wave ? 'flute:' + node.frequency.value.toFixed(2) : 'taiko';
  const cycle = k => scored.filter(({ when }) => when >= start + intro + k * loop - .05 && when < start + intro + (k + 1) * loop - .05)
    .map(event => ({ label: label(event), offset: event.when - start - intro - k * loop })).sort((a, b) => a.offset - b.offset);
  const byLabel = events => events.reduce((groups, { label, offset }) => ({ ...groups, [label]: [...groups[label] || [], offset] }), {});
  const [first, second, third] = [cycle(0), cycle(1), cycle(2)];
  assert.ok(first.length > 100, 'a full cycle was scheduled');
  for (const next of [second, third]) {
    assert.equal(next.length, first.length, 'every cycle plays the same score');
    const expected = byLabel(first), actual = byLabel(next);
    assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort());
    for (const [name, offsets] of Object.entries(expected)) {
      assert.equal(actual[name].length, offsets.length, name);
      // Koto timing is humanized by up to 8 ms; everything else is exact.
      offsets.forEach((offset, index) => assert.ok(Math.abs(actual[name][index] - offset) <= .017, name + ' onset ' + index + ' keeps its place in the loop'));
    }
  }
  // The last note of one cycle leads into the first of the next by its scored rest only.
  const lastOffset = first.at(-1).offset - loop;
  assert.ok(first[0].offset >= -.01 && first[0].offset - lastOffset < 2 * music.timing.beat, 'no silent bar at the seam');
});

test('music waits for a running context, then follows menu, mute and pronunciations', () => {
  const quiet = load();
  assert.equal(quiet.music.sync(), false, 'no context before a gesture');
  assert.equal(quiet.music.playing, false);

  const { context, log, listeners } = fakeAudio();
  context.state = 'suspended';
  const { music, root, state, advance, documentListeners } = load({ context });
  assert.equal(music.sync(), false, 'a suspended context is not used');
  assert.equal(log.starts.length, 0);
  context.state = 'running';
  listeners.statechange();
  assert.equal(music.playing, true, 'the resumed context starts the music');
  assert.ok(documentListeners.pointerdown && documentListeners.keydown && documentListeners.visibilitychange);

  root.KanaAudio.playing = true;
  advance(.3);
  assert.ok(log.targets.some(({ value }) => value === music.ducking.speech), 'a pronunciation lowers the music');
  music.duck(.075);
  assert.ok(log.targets.some(({ value }) => value === music.ducking.effects), 'an interface tone pushes the music below it');

  state.menu = false;
  const startedBefore = log.starts.length, now = context.currentTime;
  assert.equal(music.sync(), false);
  assert.equal(music.playing, false, 'leaving the title screen stops the music');
  const fades = log.ramps.filter(({ value, time }) => value === 0 && Math.abs(time - now - .7) < 1e-9);
  assert.equal(fades.length, 2, 'dry and reverb sends fade out over 0.7 s');
  advance(1);
  assert.equal(log.starts.length, startedBefore, 'no notes are scheduled after leaving the menu');
  const started = new Set(log.starts.map(({ node }) => node)), stopped = new Set(log.stops.map(({ node }) => node));
  assert.ok([...started].every(node => stopped.has(node) || node.onended === undefined), 'every pending note is stopped');

  state.menu = true;
  assert.equal(music.sync(), true, 'returning to the menu restarts it');
  root.KanaAudio.enabled = false;
  const mutedAt = context.currentTime;
  music.sync();
  assert.equal(music.playing, false);
  assert.ok(log.ramps.some(({ value, time }) => value === 0 && Math.abs(time - mutedAt - .05) < 1e-9), 'mute fades almost at once');
});

test('the muted preference keeps the menu silent after a gesture', () => {
  const { context, log } = fakeAudio();
  const { music, documentListeners } = load({ context, enabled: false });
  documentListeners.pointerdown();
  assert.equal(music.playing, false);
  assert.equal(log.starts.length, 0);
});

test('interface tones ask the music to step aside for their full length', async () => {
  const durations = [];
  class AudioContext {
    constructor() { this.state = 'running'; this.currentTime = 1; }
    createGain() { return { gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
    createOscillator() { return { frequency: { setValueAtTime() {} }, connect() {}, disconnect() {}, start() {}, stop() {} }; }
  }
  const listeners = new Map();
  const root = { AudioContext, KanaAudio: { enabled: true, playing: false }, KanaMusic: { duck: seconds => durations.push(seconds) }, queueMicrotask() {}, setTimeout };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/sfx.js'), 'utf8'), { window: root, document: { addEventListener: (name, fn) => listeners.set(name, fn) }, Promise, Set });
  listeners.get('pointerdown')();
  assert.equal(root.KanaSfx.context.state, 'running', 'the shared context is exposed to the music');
  assert.equal(await root.KanaSfx.play('start'), true);
  assert.equal(durations.length, 1);
  assert.ok(Math.abs(durations[0] - .235) < 1e-9, 'the duck covers the last note of the cue');
});
