const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function audio({ manifest, constructorError = false } = {}) {
  const requests = [], root = {
    URL, document: { baseURI: 'https://audio.test/' },
    fetch: async () => { if (manifest) await manifest; return { ok: true, json: async () => ({ byKana: { 'あ': 'audio/a.mp3', 'い': 'audio/i.mp3' } }) }; },
    Audio: class {
      constructor() { if (constructorError) throw new Error('Audio unavailable'); this.paused = true; this.ended = false; this.pending = deferred(); requests.push(this); }
      play() { this.paused = false; return this.pending.promise; }
      pause() { this.paused = true; }
    }
  };
  root.window = root;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/audio.js'), 'utf8'), root);
  return { api: root.KanaAudio, requests };
}

test('a pronunciation cancelled during manifest loading never constructs an audio element', async () => {
  const manifest = deferred(), { api, requests } = audio({ manifest: manifest.promise });
  const pending = api.play('あ'); api.stop(); manifest.resolve();
  assert.equal(await pending, false); assert.equal(requests.length, 0);
});

test('stop and mute invalidate a pronunciation whose play promise has not settled', async () => {
  for (const cancel of [api => api.stop(), api => { api.enabled = false; }]) {
    const { api, requests } = audio(); await api.ready;
    const pending = api.play('あ'); await new Promise(setImmediate);
    cancel(api); requests[0].pending.resolve();
    assert.equal(await pending, false, 'a cancelled request must not report success or record late assistance');
    assert.equal(api.playing, false); assert.equal(requests[0].paused, true);
  }
});

test('a superseded pronunciation cannot report success or clear a newer request', async () => {
  for (const outcome of ['resolve', 'reject']) {
    const { api, requests } = audio(); await api.ready;
    const old = api.play('あ'); await new Promise(setImmediate);
    const current = api.play('い'); await new Promise(setImmediate);
    requests[1].pending.resolve(); assert.equal(await current, true);
    requests[0].pending[outcome](new Error('old request failed'));
    assert.equal(await old, false); assert.equal(api.playing, true);
    assert.equal(requests[0].paused, true); assert.equal(requests[1].paused, false);
  }
});

test('constructor and playback failures return false and release the current request', async () => {
  const unavailable = audio({ constructorError: true }); await unavailable.api.ready;
  assert.equal(await unavailable.api.play('あ'), false);
  const { api, requests } = audio(); await api.ready;
  const pending = api.play('あ'); await new Promise(setImmediate);
  requests[0].pending.reject(new Error('playback blocked'));
  assert.equal(await pending, false); assert.equal(api.playing, false);
});
