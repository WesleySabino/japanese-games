// Sound pad: family → sound composition for touch play. Synthetic, in-memory progress only.
const test = require('node:test');
const assert = require('node:assert/strict');
const { runtime, play, inputRain } = require('./runtime-harness.cjs');

const FAMILIES = ['a', 'k', 's', 't', 'n', 'h', 'm', 'y', 'r', 'w', 'g', 'z', 'd', 'b', 'p'];
const SLOTS = ['a', 'i', 'u', 'e', 'o', 'ya', 'yu', 'yo', 'n'];
const stage = g => g.el('keyboard').dataset.stage;

test('each of the 208 kana has one two-tap path, and composing it answers that kana', async () => {
  for (const [script, mode] of [['hiragana', 'hira'], ['katakana', 'kata']]) {
    const g = await runtime({ explore: true, mobile: true });
    g.el('mode').value = mode; g.el('mode').onchange();
    const kana = g.data.kana.filter(k => k.script === script), cells = new Set();
    assert.equal(kana.length, 104);
    for (const k of kana) {
      const path = g.app.padPath(k.id);
      assert.ok(path && FAMILIES.includes(path.family) && SLOTS.includes(path.slot), k.char + ' has a fixed family and slot');
      assert.ok(g.app.accepted(k.id).includes(path.reading), k.char + ' path produces an accepted reading');
      cells.add(path.family + ':' + path.slot);
      g.app.gameData.novelty.seen[k.id] = true;
      if (g.app.state && !g.app.state.over) g.app.end('Next kana');
      g.app.start({ reviewIds: [k.id] }); g.skip();
      assert.deepEqual(Array.from(g.app.state.drops, d => d.id), [k.id]);
      g.compose(k.id);
      assert.equal(g.app.state.correct, 1, k.char + ' answered by its path');
      const event = g.learner.attempts().at(-1);
      assert.equal(event.itemId, k.id); assert.equal(event.correct, true); assert.equal(event.firstAttempt, true);
      assert.equal(event.response, path.reading); assert.equal(event.responseFormat, 'romaji'); assert.equal(event.inputMethod, 'composer');
    }
    assert.equal(cells.size, 104, script + ' kana never share a cell');
    const html = g.el('keyboard').innerHTML;
    assert.equal((html.match(/data-family=/g) || []).length, 15);
    assert.equal((html.match(/data-slot=/g) || []).length, 9);
  }
});

test('homophones resolve to the chosen row; the same sound still answers a lone homophone', async () => {
  for (const [lower, chosen, mode] of [['kana:じ', 'kana:ぢ', 'hira'], ['kana:ぢ', 'kana:じ', 'hira'], ['kana:ず', 'kana:づ', 'hira'], ['kana:を', 'kana:お', 'hira'], ['kana:ヂ', 'kana:ジ', 'kata'], ['kana:オ', 'kana:ヲ', 'kata']]) {
    const g = await inputRain([lower, chosen], mode);
    assert.equal(g.app.state.target.id, lower);
    g.compose(chosen);
    assert.equal(g.app.state.correct, 1); assert.equal(g.learner.attempts().at(-1).itemId, chosen);
    assert.deepEqual(Array.from(g.app.state.drops, d => d.id), [lower], 'the lower homophone is left falling');
  }
  // Same sound, other row: accepted as typing "ji", "zu" or "o" would be.
  for (const [alone, via] of [['kana:ぢ', 'kana:じ'], ['kana:づ', 'kana:ず'], ['kana:を', 'kana:お']]) {
    const g = await inputRain([alone]);
    g.compose(via);
    assert.equal(g.app.state.correct, 1); assert.equal(g.learner.attempts().at(-1).itemId, alone);
  }
});

test('N family: n answers ん at once and ne still answers ね, each exactly once', async () => {
  for (const [id, other] of [['kana:ん', 'kana:ね'], ['kana:ね', 'kana:ん']]) {
    const g = await inputRain(['kana:ん', 'kana:ね']);
    g.compose(id);
    assert.equal(g.app.state.correct, 1, 'no ambiguity wait');
    play(g, 400);
    assert.equal(g.app.state.attempts, 1); assert.equal(g.learner.attempts().length, 1);
    assert.deepEqual(Array.from(g.app.state.drops, d => d.id), [other]);
  }
});

test('the pad is built once, never holds drop readings, and Back or blank slots submit nothing', async () => {
  const g = await inputRain(['kana:か', 'kana:し'], 'hira', { mobile: true });
  assert.equal(g.counts.html.get('keyboard'), 1);
  assert.doesNotMatch(g.el('keyboard').innerHTML, /か|し|ka|shi/, 'built from families only, not from the rain');
  assert.equal(stage(g), 'family');
  g.pad({ family: 's' }); assert.equal(stage(g), 'sound'); assert.match(g.el('answer').placeholder, /S\/SH/);
  g.pad({ pad: 'back' }); assert.equal(stage(g), 'family');
  g.pad({ family: 'y' }); g.pad({ slot: 'i' }); g.pad({ slot: 'n' });
  g.pad({ family: 'w' }); // Ignored: only Back leaves the sound stage.
  assert.equal(stage(g), 'sound'); assert.equal(g.app.state.attempts, 0); assert.equal(g.learner.attempts().length, 0);
  g.pad({ pad: 'back' });
  g.compose('kana:し');
  assert.equal(g.app.state.correct, 1); assert.equal(stage(g), 'family');
  g.pad({ slot: 'i' });
  assert.equal(g.app.state.attempts, 1, 'a repeated sound press after the commit cannot submit again');
  g.app.state.queue = [{ id: 'kana:か' }]; g.app.state.sinceSpawn = 9999; g.tick();
  g.app.state.drops.at(-1).progress = .9; g.tick();
  assert.equal(g.app.state.target.id, 'kana:か');
  assert.equal(g.counts.html.get('keyboard'), 1, 'new drops and targets never rebuild the pad');
});

test('an unmatched composition is a mistake for the drop highlighted when it began, never a lost heart', async () => {
  const g = await inputRain(['kana:か', 'kana:ね']);
  const first = g.app.state.target;
  assert.equal(first.id, 'kana:か');
  g.pad({ family: 'm' });
  g.app.state.drops[1].progress = first.progress + .2; g.tick();
  assert.equal(g.app.state.target.id, 'kana:ね', 'another drop overtook during the composition');
  g.pad({ slot: 'a' });
  const event = g.learner.attempts().at(-1);
  assert.equal(event.itemId, 'kana:か'); assert.equal(event.correct, false); assert.equal(event.response, 'ma'); assert.equal(event.inputMethod, 'composer');
  assert.equal(first.wrong, 1); assert.equal(g.app.state.lives, 3); assert.equal(stage(g), 'family');
  assert.match(g.el('feedback').textContent, /You chose ma/);
  g.answer('ka');
  assert.equal(g.learner.attempts().at(-1).inputMethod, 'typing', 'typed answers keep their own label');
});

test('an expiring drop clears a half-built composition, like unfinished typing', async () => {
  const g = await inputRain(['kana:か', 'kana:ね']);
  g.pad({ family: 'k' }); assert.equal(stage(g), 'sound');
  g.app.state.drops[1].progress = .999; g.tick();
  assert.equal(g.app.state.lives, 2); assert.equal(stage(g), 'family');
  g.pad({ slot: 'a' });
  assert.equal(g.app.state.attempts, 0, 'a late sound press has no family to complete');
  g.compose('kana:か'); assert.equal(g.app.state.correct, 1);
});

test('pause and countdown ignore pad presses, keep the chosen family and exclude paused time', async () => {
  const g = await inputRain(['kana:か']);
  g.pad({ family: 'k' }); play(g, 50); g.app.pause(true);
  g.pad({ slot: 'a' }); g.tick(1000);
  g.app.pause(false); assert.equal(g.app.state.countingDown, true);
  g.pad({ slot: 'a' }); assert.equal(g.app.state.attempts, 0);
  g.skip(); assert.equal(stage(g), 'sound');
  g.pad({ slot: 'a' });
  assert.equal(g.app.state.correct, 1);
  assert.ok(g.learner.attempts().at(-1).inputActiveMs < 200, 'pause is not counted as composing time');
});

test('a pointer bounce right after a stage change is ignored; deliberate and keyboard presses count', async () => {
  const g = await inputRain(['kana:す', 'kana:か']);
  g.pad({ family: 's' }, 1); g.tick(16); g.pad({ slot: 'u' }, 1);
  assert.equal(g.app.state.attempts, 0, 'a second tap 16 ms later is a bounce');
  assert.equal(stage(g), 'sound');
  g.tick(80); g.pad({ slot: 'u' }, 1);
  assert.equal(g.app.state.correct, 1);
  g.pad({ family: 'k' }, 1);
  assert.equal(stage(g), 'family', 'a bounce of the committing tap cannot open a family');
  g.tick(80); g.pad({ family: 'k' }, 1); g.tick(80); g.pad({ slot: 'a' }, 1);
  assert.equal(g.app.state.correct, 2, 'taps 80 ms apart all register');
  g.app.state.queue = [{ id: 'kana:す' }]; g.app.state.sinceSpawn = 9999; g.tick();
  g.pad({ family: 's' }, 0); g.pad({ slot: 'u' }, 0);
  assert.equal(g.app.state.correct, 3, 'keyboard activation of pad buttons is never treated as a bounce');
});

test('on a phone the pad never focuses the answer field; the keyboard button opts into the device keyboard', async () => {
  const g = await inputRain(['kana:か'], 'hira', { mobile: true });
  assert.equal(g.el('answer').inputMode, 'none'); assert.notEqual(g.document.activeElement, g.el('answer'));
  g.app.pause(true); g.app.pause(false); g.skip();
  assert.notEqual(g.document.activeElement, g.el('answer'), 'resuming does not focus the field either');
  g.pad({ family: 'k' });
  g.el('keyboardBtn').onclick();
  assert.equal(g.el('keyboard').classList.contains('hidden'), true); assert.equal(stage(g), 'family');
  assert.equal(g.el('answer').inputMode, 'text'); assert.equal(g.document.activeElement, g.el('answer'));
  g.el('keyboardBtn').onclick();
  assert.equal(g.el('keyboard').classList.contains('hidden'), false); assert.equal(g.el('answer').inputMode, 'none');
});
