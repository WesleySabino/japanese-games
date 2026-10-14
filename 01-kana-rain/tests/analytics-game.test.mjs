import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const files = await Promise.all(['data.js', 'difficulty.js', 'novelty.js', 'game.js'].map(name => readFile(new URL('../src/' + name, import.meta.url), 'utf8')));
async function game() {
  const nodes = new Map(), events = [], listeners = new Map();
  let frame, now = 1000;
  class Element {
    constructor(id = '') {
      this.id = id; this.value = ''; this.style = { setProperty() {} }; this.dataset = {}; this.children = []; this.open = false;
      this.clientWidth = 800; this.clientHeight = 600; this.offsetWidth = 65; this.offsetHeight = 85;
      this.options = ['hira', 'kata'].map(value => ({ value }));
      const classes = new Set();
      this.classList = { add: (...values) => values.forEach(v => classes.add(v)), remove: (...values) => values.forEach(v => classes.delete(v)), contains: v => classes.has(v), toggle: (value, on = !classes.has(value)) => { on ? classes.add(value) : classes.delete(value); return on; } };
    }
    setAttribute(key, value) { this[key] = value; }
    querySelector(key) { this.nested ||= new Map(); if (!this.nested.has(key)) this.nested.set(key, new Element()); return this.nested.get(key); }
    querySelectorAll() { return []; }
    addEventListener() {}
    appendChild(child) { this.children.push(child); }
    focus() { document.activeElement = this; }
    blur() {}
    remove() { this.removed = true; }
    showModal() { this.open = true; }
    close() { this.open = false; }
    getBoundingClientRect() { return { height: 100 }; }
  }
  const element = id => { if (!nodes.has(id)) nodes.set(id, new Element(id)); return nodes.get(id); };
  const document = {
    body: new Element(), documentElement: new Element(), activeElement: null, hidden: false,
    getElementById: element, createElement: () => new Element(), addEventListener() {},
    querySelector: selector => selector === 'dialog[open]' ? [...nodes.values()].find(el => el.open) : null,
    querySelectorAll: selector => selector === 'dialog.game-dialog[open]' ? [...nodes.values()].filter(el => el.open) : []
  };
  const gd = {playStyle:'arcade'}, window = {
    Learner: { ready: Promise.resolve(), gameData: () => gd, state: () => null, mastery: () => 0, record: () => ({}), flush() {}, selectRound: ids => ids.slice(0, 8), shuffle() {}, reset() {} },
    KanaAudio: { enabled: true, ready: Promise.resolve(), available: true, play: async () => true, stop() {}, hasRecording: () => false },
    NihongoAnalytics: { track(name, params) { events.push({ name, params: { ...params } }); return true; } },
    addEventListener: (name, fn) => listeners.set(name, fn)
  };
  const context = vm.createContext({
    window, document, location: { search: '' }, navigator: {}, performance: { now: () => now },
    URL, URLSearchParams, innerWidth: 1000, innerHeight: 800, matchMedia: () => ({ matches: false }),
    ResizeObserver: class { observe() {} }, requestAnimationFrame: fn => { frame = fn; return 1; }, cancelAnimationFrame: () => { frame = null; },
    setTimeout: () => 1, clearTimeout() {}, confirm: () => true
  });
  vm.runInContext(files[0], context); vm.runInContext(files[1], context);
  vm.runInContext(files[2], context); await vm.runInContext(files[3], context);
  return {
    app: window.KanaRain, events, nodes,
    skip: () => element('skipCountdown').onclick(), finish: () => element('finishBtn').onclick(),
    tick: () => { now += 16; frame?.(now); }, settings: () => listeners.get('nihongo-analytics-settings-open')?.()
  };
}

test('real session starts only after countdown and resume does not count another start', async () => {
  const g = await game();
  g.app.start(); assert.equal(g.events.length, 0);
  g.skip();
  assert.deepEqual(g.events, [{ name: 'practice_start', params: { practice_mode: 'hira' } }]);
  g.app.pause(); g.app.pause(false); g.skip();
  assert.equal(g.events.length, 1);
  g.finish();
  assert.deepEqual(g.events.at(-1), { name: 'practice_complete', params: { practice_mode: 'hira', completion_reason: 'manual_finish' } });
  g.app.end('Repeated finish'); assert.equal(g.events.length, 2);
});

test('actual timer expiration emits a bounded completion once', async () => {
  const g = await game(); g.app.start(); g.skip(); g.app.state.t = 0; g.tick();
  assert.equal(g.app.state.over, true);
  assert.deepEqual(g.events.at(-1), { name: 'practice_complete', params: { practice_mode: 'hira', completion_reason: 'timer_elapsed' } });
  g.tick(); assert.equal(g.events.length, 2);
});

test('real ground miss with last heart emits hearts_lost without learner fields', async () => {
  const g = await game(); g.app.start(); g.skip(); g.app.state.lives = 1; g.app.state.drops[0].progress = 1; g.tick();
  assert.equal(g.app.state.over, true);
  assert.deepEqual(g.events.at(-1), { name: 'practice_complete', params: { practice_mode: 'hira', completion_reason: 'hearts_lost' } });
  for (const event of g.events) assert.deepEqual(Object.keys(event.params).sort(), event.name === 'practice_start' ? ['practice_mode'] : ['completion_reason', 'practice_mode']);
});

test('review sessions use review category; disposing and ending an unstarted countdown do not count', async () => {
  const g = await game();
  g.app.start(); g.app.end('Finished before countdown'); assert.equal(g.events.length, 0);
  g.app.start({ reviewIds: ['kana:あ'] }); g.skip();
  assert.deepEqual(g.events[0], { name: 'practice_start', params: { practice_mode: 'review' } });
  g.app.dispose(); assert.equal(g.events.length, 1);
});

test('analytics settings pause gameplay and leave a resumable session', async () => {
  const g = await game(); g.app.start(); g.skip(); g.settings();
  assert.equal(g.app.state.paused, true);
  assert.equal(g.nodes.get('pauseOverlay').open, true);
  g.app.pause(false); g.skip();
  assert.equal(g.app.state.paused, false);
  assert.equal(g.events.length, 1);
});
