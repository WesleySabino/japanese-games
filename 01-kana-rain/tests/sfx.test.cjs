// A mute from either sound control must cancel tones already scheduled by the capture listener.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('both sound controls silence active interface tones when their target handler mutes', async () => {
  for (const id of ['soundBtn', 'settingsSoundBtn']) {
    const listeners = new Map(), microtasks = [], voices = [];
    class AudioContext {
      constructor() { this.state = 'running'; this.currentTime = 4; }
      createGain() { return { gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {} }, connect() {}, disconnect() {} }; }
      createOscillator() {
        const voice = { frequency: { setValueAtTime() {} }, connect() {}, disconnect() {}, start() {}, stops: [], stop(at) { this.stops.push(at); } };
        voices.push(voice); return voice;
      }
    }
    const root = { AudioContext, KanaAudio: { enabled: true, playing: false }, queueMicrotask: fn => microtasks.push(fn), setTimeout };
    const document = { addEventListener: (name, listener) => listeners.set(name, listener) };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/sfx.js'), 'utf8'), { window: root, document, Promise, Set });
    listeners.get('pointerdown')();
    assert.equal(await root.KanaSfx.play('streak'), true);
    const button = { id, disabled: false, getAttribute: () => null, matches: () => false, classList: { contains: () => false } };
    // Browser order: document capture, the button's mute handler, then queued microtasks.
    listeners.get('click')({ target: { closest: () => button } });
    root.KanaAudio.enabled = false;
    microtasks.forEach(fn => fn());
    assert.ok(voices.length >= 3, id + ' has an active cue to cancel');
    assert.ok(voices.every(voice => voice.stops.length === 2 && voice.stops.at(-1) <= 4.02), id + ' stops every pending tone immediately');
    const before = voices.length;
    assert.equal(await root.KanaSfx.play('menu'), false);
    assert.equal(voices.length, before, 'muted cues do not wait to play later');
  }
});

test('hiding cancels active tones and pending context resumes cannot play after returning', async () => {
  const listeners = new Map(), voices = [];
  let resume;
  class AudioContext {
    constructor() { this.state = 'suspended'; this.currentTime = 4; }
    resume() { return new Promise(resolve => { resume = () => { this.state = 'running'; resolve(); }; }); }
    createGain() { return { gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {} }, connect() {}, disconnect() {} }; }
    createOscillator() {
      const voice = { frequency: { setValueAtTime() {} }, connect() {}, disconnect() {}, start() {}, stops: [], stop(at) { this.stops.push(at); } };
      voices.push(voice); return voice;
    }
  }
  const root = { AudioContext, KanaAudio: { enabled: true, playing: false }, setTimeout, queueMicrotask };
  const document = { hidden: false, addEventListener: (name, listener) => listeners.set(name, listener) };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/sfx.js'), 'utf8'), { window: root, document, Promise, Set });
  listeners.get('pointerdown')();
  const pending = root.KanaSfx.play('start');
  document.hidden = true; listeners.get('visibilitychange')?.();
  document.hidden = false; resume();
  assert.equal(await pending, false, 'a stale tone cannot play when an old resume settles');
  assert.equal(voices.length, 0);
  assert.equal(await root.KanaSfx.play('streak'), true, 'a fresh visible cue can play');
  document.hidden = true; listeners.get('visibilitychange')?.();
  assert.ok(voices.every(voice => voice.stops.length === 2));
  assert.equal(await root.KanaSfx.play('heart'), false, 'a hidden document stays silent');
});
