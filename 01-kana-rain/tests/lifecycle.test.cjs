const test = require('node:test');
const assert = require('node:assert/strict');
const { runtime, play } = require('./runtime-harness.cjs');

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('session phases expose consistent legacy flags and terminal actions are idempotent', async () => {
  const g = await runtime(), events = [];
  const check = phase => {
    assert.equal(g.app.lifecycle.session, phase);
    assert.equal(g.app.state.phase, phase);
    assert.equal(g.app.state.paused, ['paused', 'countdown'].includes(phase));
    assert.equal(g.app.state.countingDown, phase === 'countdown');
    assert.equal(g.app.state.over, phase === 'ended');
    assert.equal(Object.isFrozen(g.app.lifecycle), true);
    events.push(phase);
  };
  assert.equal(g.app.lifecycle.session, 'idle');
  g.app.start(); check('countdown');
  g.app.pause(true); check('paused');
  g.skip(); check('paused');
  g.app.pause(false); check('countdown');
  g.app.pause(false); check('countdown');
  g.skip(); check('playing'); g.skip(); check('playing');
  g.app.end('Finished'); check('ended');
  const sessions = g.app.gameData.sessions;
  g.app.end('Finished again'); g.app.dispose(); g.app.pause(false); g.skip(); check('ended');
  assert.equal(g.app.gameData.sessions, sessions); assert.equal(g.frames.size, 0);
  assert.ok(events.includes('playing'));
});

test('a hidden resume stays paused and can resume normally after returning', async () => {
  const g = await runtime(); g.app.start(); g.skip();
  g.hidden(true); const before = g.app.state.t;
  g.app.pause(false); g.skip(); play(g, 4000);
  assert.equal(g.app.state.paused, true);
  assert.equal(g.app.state.countingDown, false, 'a hidden countdown cannot be stranded without a frame');
  assert.equal(g.app.state.t, before); assert.equal(g.frames.size, 0);
  g.hidden(false); assert.equal(g.el('pauseOverlay').open, true);
  g.el('resumeBtn').onclick(); g.skip(); g.tick();
  assert.equal(g.app.state.paused, false); assert.equal(g.frames.size, 1);
});

test('panels keep their return destination when switched and cannot be resumed through', async () => {
  for (const origin of ['game', 'pause', 'results', 'title']) {
    const g = await runtime();
    if (origin !== 'title') { g.app.start(); g.skip(); }
    if (origin === 'pause') g.app.pause(true);
    if (origin === 'results') g.app.end('Finished');
    g.el('gardenBtn').onclick();
    if (origin === 'game' || origin === 'pause') {
      g.app.pause(false);
      assert.equal(g.app.state.countingDown, false, 'a panel still owns the pause');
      assert.equal(g.frames.size, 0);
    }
    g.el('helpBtn').onclick();
    assert.equal(g.el('progressDialog').open, false);
    g.el('closeHelp').onclick();
    if (origin === 'game') { assert.equal(g.app.state.countingDown, true); g.skip(); assert.equal(g.app.state.paused, false); }
    else if (origin === 'pause') { assert.equal(g.el('pauseOverlay').open, true); assert.equal(g.app.state.countingDown, false); }
    else if (origin === 'results') assert.equal(g.el('results').open, true);
    else assert.equal(g.app.state, null);
  }
});

test('hiding while already paused still cancels pronunciation', async () => {
  let stops = 0;
  const g = await runtime({ audio: { stop() { stops++; } } });
  g.app.start(); g.skip(); g.app.pause(true);
  const before = stops; g.hidden(true);
  assert.ok(stops > before, 'listening while paused must stop when the tab hides');
});

test('an unfinished IME composition cannot disable answers in the next session', async () => {
  const g = await runtime(); g.app.start(); g.skip();
  g.el('answer').oncompositionstart(); g.app.end('Finished');
  g.app.start(); g.skip();
  g.type(g.app.accepted(g.app.state.drops[0])[0]);
  assert.equal(g.app.state.correct, 1);
});

test('switching away from a reading import invalidates late failures and focus changes', async () => {
  const g = await runtime(), file = deferred();
  g.el('gardenBtn').onclick();
  g.el('importFile').files = [{ name: 'synthetic.json', size: 10, text: () => file.promise }];
  const reading = g.el('importFile').onchange();
  g.el('helpBtn').onclick(); const focused = g.document.activeElement;
  file.reject(new Error('late file error')); await reading;
  assert.equal(g.el('importStatus').textContent, '');
  assert.equal(g.document.activeElement, focused, 'a superseded operation cannot steal modal focus');
});

test('applying an import owns the panel until saved and blocks a new session', async () => {
  const g = await runtime(), saving = deferred();
  g.el('gardenBtn').onclick();
  g.el('importFile').files = [{ name: 'synthetic.json', size: 100, text: async () => g.learner.export() }];
  await g.el('importFile').onchange();
  g.learner.importProgress = () => saving.promise;
  const applying = g.el('applyImportBtn').onclick();
  assert.equal(g.el('applyImportBtn').disabled, true);
  g.app.start(); g.el('helpBtn').onclick(); g.el('closeGarden').onclick();
  assert.equal(g.app.state, null); assert.equal(g.el('progressDialog').open, true);
  saving.resolve({ saved: true, indexedDB: true }); await applying;
  assert.equal(g.el('importPreview').classList.contains('hidden'), true);
  assert.equal(g.el('closeGarden').disabled, false);
  g.el('closeGarden').onclick(); g.app.start(); assert.ok(g.app.state);
});

test('a failed import remains retryable and replacing a file invalidates the older preview', async () => {
  const g = await runtime(), old = deferred();
  g.el('gardenBtn').onclick();
  const file = text => [{ name: 'synthetic.json', size: 100, text }];
  g.el('importFile').files = file(() => old.promise);
  const reading = g.el('importFile').onchange(); assert.equal(g.app.lifecycle.import, 'reading');
  g.el('importFile').files = file(async () => g.learner.export());
  await g.el('importFile').onchange(); assert.equal(g.app.lifecycle.import, 'preview');
  old.resolve('invalid JSON'); await reading;
  assert.equal(g.app.lifecycle.import, 'preview'); assert.equal(g.el('applyImportBtn').disabled, false);
  let attempts = 0;
  g.learner.importProgress = async () => { attempts++; return { saved: attempts > 1, indexedDB: attempts > 1 }; };
  await g.el('applyImportBtn').onclick();
  assert.equal(g.app.lifecycle.import, 'preview'); assert.equal(g.el('applyImportBtn').disabled, false);
  assert.equal(g.el('importStatus').dataset.kind, 'error');
  await g.el('applyImportBtn').onclick(); assert.equal(g.app.lifecycle.import, 'idle');
  assert.equal(g.el('importStatus').dataset.kind, 'success');
});
