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
    document, location: { search: options.explore ? '?all' : '' }, navigator: {}, performance: { now: () => now },
    URL, URLSearchParams, Blob, console, queueMicrotask, ResizeObserver,
    innerWidth: options.mobile ? 390 : 1000, innerHeight: 800, matchMedia: () => ({ matches: !!options.mobile }),
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
  return {
    app: context.KanaRain, learner: context.Learner, el, counts, frames, document,
    tick(ms = 16) { now += ms; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(now)); },
    hidden(value) { document.hidden = value; listeners.get('visibilitychange')(); },
    resize(target) { observers.filter(observer => observer.targets.has(target)).forEach(observer => observer.callback([{ target }])); },
    answer(text) { el('answer').value = text; el('answerForm').onsubmit({ preventDefault() {} }); },
    type(text) { el('answer').value = text; el('answer').oninput(); },
    touch(key) { el('keyboard').onclick({ target: { closest: () => ({ dataset: { key } }) } }); },
    skip() { el('skipCountdown').onclick(); }
  };
}

function play(g, milliseconds) {
  while (milliseconds > 0) { const step = Math.min(50, milliseconds); g.tick(step); milliseconds -= step; }
}

async function inputRain(ids, mode = 'hira') {
  const g = await runtime({ explore: true });
  // Input matching fixtures represent already introduced kana, independent of admission pacing.
  for (const id of ids) g.app.gameData.novelty.seen[id] = true;
  g.el('mode').value = mode; g.el('mode').onchange();
  g.app.start({ reviewIds: [ids[0]] }); g.skip();
  // Spawn real rounds in a fixed order so the short answer is highlighted first.
  g.app.state.queue = ids.slice(1).map(id => ({ id }));
  for (let i = 1; i < ids.length; i++) { g.app.state.sinceSpawn = 9999; g.tick(); }
  g.app.state.queue = [];
  assert.deepEqual(Array.from(g.app.state.drops, drop => drop.id), ids);
  return g;
}

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

test('whole-word nasal aliases and different word prefixes also finish without Enter', async () => {
  for (const response of ['hon', 'honn']) {
    const g = await inputRain(['w:ほん'], 'words');
    g.type('hon'); play(g, 100);
    if (response === 'honn') g.type(response);
    play(g, 400);
    assert.equal(g.app.state.correct, 1); assert.equal(g.app.state.attempts, 1);
    assert.equal(g.learner.attempts().at(-1).response, response);
    assert.equal(g.el('answer').value, '');
  }
  for (const response of ['ashi', 'ashita']) {
    const g = await inputRain(['w:あし', 'w:あした'], 'words');
    g.type('ashi'); play(g, 100);
    if (response === 'ashita') g.type(response);
    play(g, 400);
    assert.equal(g.app.state.correct, 1); assert.equal(g.app.state.attempts, 1);
    assert.equal(g.learner.attempts().at(-1).itemId, response === 'ashi' ? 'w:あし' : 'w:あした');
  }
});

test('Enter remains immediate and the touch keyboard also auto-submits n only once', async () => {
  const forced = await inputRain(['kana:ん', 'kana:ね']);
  forced.type('n'); play(forced, 100); forced.answer('n');
  assert.equal(forced.app.state.correct, 1, 'Enter commits before the ambiguity window ends');
  play(forced, 400); assert.equal(forced.app.state.attempts, 1);
  const touch = await inputRain(['kana:ん', 'kana:ね']);
  touch.touch('n'); play(touch, 350);
  assert.equal(touch.app.state.correct, 1); assert.equal(touch.app.state.attempts, 1);
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
