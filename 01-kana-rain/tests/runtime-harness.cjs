// Shared in-memory DOM for runtime and input tests. Not a test file itself.
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
      this.options = ['hira', 'kata', 'journey'].map(value => ({ value }));
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
    blur() { if (document.activeElement === this) document.activeElement = null; }
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
  const storage = new Map(options.storage || []), context = vm.createContext({
    document, location: { hostname: '127.0.0.1', search: options.explore ? '?all' : '' }, navigator: {}, performance: { now: () => now },
    URL, URLSearchParams, Blob, console, queueMicrotask, ResizeObserver, NihongoAnalytics: options.analytics,
    innerWidth: options.mobile ? 390 : 1000, innerHeight: 800, matchMedia: query => ({ matches: query.includes('prefers-reduced-motion') ? !!options.reducedMotion : !!options.mobile }),
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    requestAnimationFrame: callback => { const id = ++frameId; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id), setTimeout: () => 1, clearTimeout() {}, confirm: () => true,
    addEventListener: (name, fn) => listeners.set(name, fn),
    KanaAudio: { enabled: true, ready: Promise.resolve(), available: true, play: async () => false, stop() {}, hasRecording: () => false }
  });
  context.window = context;
  for (const name of ['data', 'learner', 'difficulty', 'novelty', 'game']) {
    await vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/' + name + '.js'), 'utf8'), context);
  }
  // A pad press as the click handler receives it; detail 0 is keyboard activation, 1 a pointer tap.
  const pad = (dataset, detail = 0) => el('keyboard').onclick({ target: { closest: () => ({ dataset }) }, detail });
  return {
    app: context.KanaRain, learner: context.Learner, data: context.JPData, el, counts, frames, document, storage,
    tick(ms = 16) { now += ms; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(now)); },
    hidden(value) { document.hidden = value; listeners.get('visibilitychange')(); },
    resize(target) { observers.filter(observer => observer.targets.has(target)).forEach(observer => observer.callback([{ target }])); },
    answer(text) { el('answer').value = text; el('answerForm').onsubmit({ preventDefault() {} }); },
    type(text) { el('answer').value = text; el('answer').oninput(); },
    pad,
    compose(id, detail = 0) { const path = context.KanaRain.padPath(id); pad({ family: path.family }, detail); pad({ slot: path.slot }, detail); },
    skip() { el('skipCountdown').onclick(); }
  };
}

function play(g, milliseconds) {
  while (milliseconds > 0) { const step = Math.min(50, milliseconds); g.tick(step); milliseconds -= step; }
}

async function inputRain(ids, mode = 'hira', options = {}) {
  const g = await runtime({ explore: true, ...options });
  // Input matching fixtures represent already introduced kana, independent of admission pacing.
  for (const id of ids) g.app.gameData.novelty.seen[id] = true;
  g.el('mode').value = mode; g.el('mode').onchange();
  g.app.start({ reviewIds: [ids[0]] }); g.skip();
  // Spawn real rounds in a fixed order so the first id is the lowest, highlighted drop.
  g.app.state.queue = ids.slice(1).map(id => ({ id }));
  for (let i = 1; i < ids.length; i++) { g.app.state.sinceSpawn = 9999; g.tick(); }
  g.app.state.queue = [];
  assert.deepEqual(Array.from(g.app.state.drops, drop => drop.id), ids);
  return g;
}

module.exports = { runtime, play, inputRain };
