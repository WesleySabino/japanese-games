const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function runtime(options = {}) {
  let now = 1000, frameId = 0;
  const frames = new Map(), nodes = new Map(), listeners = new Map(), observers = [];
  const counts = { fieldReads: 0, dropReads: 0, html: new Map(), text: new Map(), classes: new Map() };
  const bump = (map, key) => map.set(key, (map.get(key) || 0) + 1);
  class Element {
    constructor(id = '') {
      this.id = id; this.value = ''; this.style = { setProperty() {} }; this.dataset = {}; this.children = [];
      this.open = false; this.width = 800; this.height = 600; this.spriteWidth = 65; this.spriteHeight = 85;
      this.options = ['hira', 'kata', 'mix', 'pair', 'words'].map(value => ({ value }));
      const classes = new Set();
      this.classList = {
        add: (...values) => values.forEach(value => classes.add(value)),
        remove: (...values) => values.forEach(value => classes.delete(value)),
        contains: value => classes.has(value),
        toggle: (value, on = !classes.has(value)) => {
          bump(counts.classes, this.id + ':' + value);
          on ? classes.add(value) : classes.delete(value); return on;
        }
      };
    }
    get clientWidth() { if (this.id === 'field') counts.fieldReads++; return this.width; }
    get clientHeight() { if (this.id === 'field') counts.fieldReads++; return this.height; }
    get offsetWidth() { if (this.className?.startsWith('drop')) counts.dropReads++; return this.spriteWidth; }
    get offsetHeight() { if (this.className?.startsWith('drop')) counts.dropReads++; return this.spriteHeight; }
    get textContent() { return this.text || ''; }
    set textContent(value) { bump(counts.text, this.id); this.text = String(value); }
    get innerHTML() { return this.html || this.textContent; }
    set innerHTML(value) { bump(counts.html, this.id); this.html = value; }
    setAttribute(key, value) { this[key] = value; }
    querySelector(selector) { this.nested ||= new Map(); if (!this.nested.has(selector)) this.nested.set(selector, new Element(this.id + selector)); return this.nested.get(selector); }
    querySelectorAll() { return []; }
    addEventListener() {}
    appendChild(child) { this.children.push(child); }
    contains(child) { return this.children.includes(child); }
    focus() { document.activeElement = this; }
    blur() {}
    remove() { this.removed = true; }
    showModal() { this.open = true; }
    close() { this.open = false; }
    getBoundingClientRect() { return { height: 100 }; }
  }
  const el = id => { if (!nodes.has(id)) nodes.set(id, new Element(id)); return nodes.get(id); };
  for (const id of ['scriptDialog', 'featureDialog', 'pauseOverlay', 'settingsDialog', 'progressDialog', 'helpDialog', 'results']) el(id);
  const document = {
    body: new Element('body'), documentElement: new Element(), activeElement: null, hidden: false,
    getElementById: el, createElement: () => new Element(), addEventListener: (name, fn) => listeners.set(name, fn),
    querySelector: selector => selector === 'dialog[open]' ? [...nodes.values()].find(node => node.open) : null,
    querySelectorAll: selector => selector === 'dialog.game-dialog[open]' ? [...nodes.values()].filter(node => node.open) :
      selector === 'dialog.game-dialog' ? [...nodes.values()].filter(node => node.id.endsWith('Dialog') || ['pauseOverlay', 'results'].includes(node.id)) : []
  };
  class ResizeObserver {
    constructor(callback) { this.callback = callback; this.targets = new Set(); observers.push(this); }
    observe(target) { this.targets.add(target); }
    unobserve(target) { this.targets.delete(target); }
  }
  const storage = new Map(), context = vm.createContext({
    document, location: { search: '' }, navigator: {}, performance: { now: () => now },
    URL, URLSearchParams, Blob, console, queueMicrotask, ResizeObserver,
    innerWidth: options.mobile ? 390 : 1000, innerHeight: 800, matchMedia: () => ({ matches: !!options.mobile }),
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    requestAnimationFrame: callback => { const id = ++frameId; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id), setTimeout: () => 1, clearTimeout() {}, confirm: () => true,
    addEventListener: (name, fn) => listeners.set(name, fn),
    KanaAudio: { enabled: true, ready: Promise.resolve(), available: true, play: async () => false, stop() {}, hasRecording: () => false }
  });
  context.window = context;
  for (const name of ['data', 'learner', 'difficulty', 'game']) {
    await vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/' + name + '.js'), 'utf8'), context);
  }
  return {
    app: context.KanaRain, el, counts, frames, document,
    tick(ms = 16) { now += ms; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(now)); },
    hidden(value) { document.hidden = value; listeners.get('visibilitychange')(); },
    resize(target) { observers.filter(observer => observer.targets.has(target)).forEach(observer => observer.callback([{ target }])); },
    answer(text) { el('answer').value = text; el('answerForm').onsubmit({ preventDefault() {} }); },
    skip() { el('skipCountdown').onclick(); }
  };
}

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

test('practice correction suspends frames until acknowledgement starts the next countdown', async () => {
  const g = await runtime(); g.el('practiceSelect').value = 'practice'; g.el('practiceSelect').onchange();
  g.app.start(); g.skip(); g.answer('wrong');
  assert.equal(g.app.state.awaitingFeedback, true); assert.equal(g.frames.size, 0);
  assert.equal(g.document.body.classList.contains('game-paused'), true);
  g.el('continueFeedbackBtn').onclick(); assert.equal(g.frames.size, 1); assert.equal(g.app.state.countingDown, true);
  g.skip(); g.tick(); assert.equal(g.app.state.paused, false);
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
