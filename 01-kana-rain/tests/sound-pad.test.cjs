// Sound pad: family → sound composition for touch play. Synthetic, in-memory progress only.
const test = require('node:test');
const assert = require('node:assert/strict');
const { runtime, play, inputRain } = require('./runtime-harness.cjs');

const FAMILIES = ['a', 'k', 's', 't', 'n', 'h', 'm', 'y', 'r', 'w', 'g', 'z', 'd', 'b', 'p'];
const SLOTS = ['a', 'i', 'u', 'e', 'o', 'ya', 'yu', 'yo', 'n'];
const stage = g => g.el('keyboard').dataset.stage;

// Model the existing fixed pad buttons, not browser tab order. Real Enter/Space/Tab is covered in browser QA.
function focusablePad(g) {
  const pad = g.el('keyboard'), Button = pad.constructor;
  const button = dataset => { const b = new Button(); b.dataset = dataset; b.closest = () => b; return b; };
  const families = FAMILIES.map(family => button({ family })), slots = SLOTS.map(slot => button({ slot })), back = button({ pad: 'back' });
  slots.forEach(b => { b.disabled = true; });
  const buttons = [...families, ...slots, back];
  pad.contains = b => buttons.includes(b);
  pad.querySelectorAll = selector => selector === '[data-slot]' ? slots : [];
  pad.querySelector = selector => selector === '[data-slot]:not(:disabled)' ? slots.find(b => !b.disabled) || null : families.find(b => selector === `[data-family="${b.dataset.family}"]`) || null;
  return {
    families, slots, back,
    activate(dataset, detail = 0) {
      const b = buttons.find(b => Object.entries(dataset).every(([key, value]) => b.dataset[key] === value));
      assert.ok(b, 'the activation belongs to a real fixed pad button');
      if (detail === 0) b.focus();
      pad.onclick({ target: b, detail });
      return b;
    }
  };
}

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

test('katakana is typed on desktop and composed on phones like hiragana; a new one shows its hiragana partner', async () => {
  for (const mobile of [false, true]) {
    const g = await runtime({ explore: true, mobile });
    g.el('mode').value = 'kata'; g.el('mode').onchange();
    for (const k of g.data.kana.filter(k => k.script === 'katakana')) {
      const partner = g.data.counterpart(k.id);
      assert.deepEqual(g.app.padPath(k.id), g.app.padPath(partner.id), k.char + ' shares the pad cell of ' + partner.char);
      if (g.app.state && !g.app.state.over) g.app.end('Next katakana');
      g.app.gameData.novelty.seen[k.id] = true;
      g.app.start({ reviewIds: [k.id] }); g.skip();
      assert.equal(g.el('keyboard').classList.contains('hidden'), !mobile, 'the pad opens only on phones');
      const drop = g.app.state.target;
      assert.equal(drop.id, k.id); assert.equal(drop.responseFormat, 'romaji');
      assert.equal(drop.el.children.find(child => child.className === 'hint')?.textContent, partner.char, k.char + ' debut hint is its hiragana, not romaji');
      if (mobile) g.compose(k.id); else g.answer(k.romaji);
      assert.equal(g.app.state.correct, 1, k.char + ' answered by its sound');
      const event = g.learner.attempts().at(-1);
      assert.equal(event.itemId, k.id); assert.equal(event.correct, true); assert.equal(event.firstAttempt, true);
      assert.equal(event.facet, 'form→sound'); assert.equal(event.responseFormat, 'romaji');
      assert.equal(event.inputMethod, mobile ? 'composer' : 'typing');
      assert.ok(!event.assistanceReasons.includes('recognition-options'));
    }
  }
});

test('a wrong katakana sound names its hiragana partner and an already introduced sound counterpart', async () => {
  const g = await inputRain(['kana:ネ', 'kana:ノ'], 'kata');
  g.app.gameData.novelty.seen['kana:ヌ'] = true;
  g.answer('no');
  assert.equal(g.app.state.correct, 1, 'no answers the visible ノ, as typing does in hiragana');
  g.answer('nu');
  assert.equal(g.app.state.errors, 1);
  assert.equal(g.el('feedback').textContent, 'ネ = ね. You typed nu → ヌ.');
  const event = g.learner.attempts().at(-1);
  assert.equal(event.itemId, 'kana:ネ'); assert.equal(event.correct, false); assert.equal(event.chosenItemId, 'kana:ヌ');
  assert.equal(event.responseFormat, 'romaji'); assert.equal(event.inputMethod, 'typing');
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

test('keyboard pad activation focuses a valid sound and Back or a committed answer returns to its family', async () => {
  for (const [ids, mode] of [[['kana:か', 'kana:ね'], 'hira'], [['kana:カ', 'kana:ネ'], 'kata']]) {
    const g = await inputRain(ids, mode, { mobile: true }), pad = focusablePad(g);
    const family = id => pad.families.find(b => b.dataset.family === id), sound = id => pad.slots.find(b => b.dataset.slot === id);
    pad.activate({ family: 'w' });
    assert.equal(g.document.activeElement, sound('a')); assert.equal(sound('i').disabled, true, 'blank cells cannot become the focus destination');
    pad.activate({ pad: 'back' }); assert.equal(g.document.activeElement, family('w')); assert.equal(g.app.state.attempts, 0);
    pad.activate({ family: 'k' }); assert.equal(g.document.activeElement, sound('a'));
    pad.activate({ slot: 'a' }); assert.equal(g.app.state.correct, 1); assert.equal(g.document.activeElement, family('k'));
    pad.activate({ family: 'w' }); pad.activate({ slot: 'a' });
    assert.equal(g.app.state.errors, 1); assert.equal(g.learner.attempts().at(-1).itemId, ids[1]); assert.equal(g.document.activeElement, family('w'));
    assert.equal(g.el('answer').inputMode, 'none'); assert.notEqual(g.document.activeElement, g.el('answer'), 'a physical keyboard on a coarse phone does not open its native keyboard');
  }
});

test('pointer pad presses change stages without forcing keyboard focus, including Back and commit', async () => {
  const g = await inputRain(['kana:か'], 'hira', { mobile: true }), pad = focusablePad(g), outside = g.el('pauseBtn');
  outside.focus(); pad.activate({ family: 'w' }, 1); assert.equal(g.document.activeElement, outside);
  g.tick(80); pad.activate({ pad: 'back' }, 1); assert.equal(g.document.activeElement, outside);
  g.tick(80); pad.activate({ family: 'k' }, 1); assert.equal(g.document.activeElement, outside);
  g.tick(80); pad.activate({ slot: 'a' }, 1); assert.equal(g.app.state.correct, 1); assert.equal(g.document.activeElement, outside);
  assert.equal(g.el('answer').inputMode, 'none');
});

test('keyboard pad focus survives pause and follows an expiry reset only while focus still belongs to the pad', async () => {
  const g = await inputRain(['kana:か', 'kana:ね'], 'hira', { mobile: true }), pad = focusablePad(g);
  const family = pad.families.find(b => b.dataset.family === 'k'), sound = pad.slots.find(b => b.dataset.slot === 'a');
  pad.activate({ family: 'k' }); g.app.pause(true); g.el('keyboard').onfocusout({ relatedTarget: g.el('resumeBtn') });
  g.app.pause(false); g.el('keyboard').onfocusout({ relatedTarget: g.el('skipCountdown') }); g.skip();
  assert.equal(stage(g), 'sound'); assert.equal(g.document.activeElement, sound, 'resume returns keyboard users to their unfinished composition');
  g.app.state.drops[1].progress = 1; g.tick();
  assert.equal(stage(g), 'family'); assert.equal(g.document.activeElement, family); assert.equal(g.app.state.attempts, 0);
  pad.activate({ family: 'k' }); const outside = g.el('pauseBtn'); outside.focus();
  g.app.state.drops[0].progress = 1; g.tick(); assert.equal(stage(g), 'family'); assert.equal(g.document.activeElement, outside, 'an automatic reset never steals focus back from another control');
});

test('hiding the pad and finishing a run clear its keyboard focus destination', async () => {
  const g = await inputRain(['kana:か'], 'hira', { mobile: true }), pad = focusablePad(g);
  pad.activate({ family: 'k' }); g.el('keyboardBtn').onclick();
  assert.equal(stage(g), 'family'); assert.equal(g.el('keyboard').classList.contains('hidden'), true); assert.equal(g.document.activeElement, g.el('answer'), 'requesting the native keyboard explicitly still focuses it');
  g.el('keyboardBtn').onclick(); assert.notEqual(g.document.activeElement, g.el('answer'));
  pad.activate({ family: 'k' }); g.app.end('Focused pad cleanup');
  assert.equal(g.document.activeElement, g.el('againBtn'), 'disposal does not restore a hidden pad button over the result action');
});

test('explicit answer focus or typing replaces the pad focus destination without changing partial input', async () => {
  for (const action of ['focus', 'input']) {
    const g = await inputRain(['kana:ん', 'kana:ね']), answer = g.el('answer');
    g.el('keyboardBtn').onclick(); const pad = focusablePad(g); pad.activate({ family: 'k' });
    if (action === 'focus') { answer.focus(); answer.onfocus(); answer.value = 'n'; }
    else g.type('n');
    g.app.pause(true); g.app.pause(false); g.skip();
    assert.equal(g.document.activeElement, answer, action + ' explicitly returns to typing, not the earlier sound button');
    assert.equal(answer.value, 'n'); assert.equal(g.app.state.attempts, 0); assert.equal(stage(g), 'sound', 'focus intent does not rewrite the unfinished pad stage');
    if (action === 'input') { play(g, 400); assert.equal(g.app.state.correct, 1); assert.equal(g.learner.attempts().at(-1).itemId, 'kana:ん'); }
  }
});

test('moving from the pad to another active control ends pad focus restoration', async () => {
  const g = await inputRain(['kana:か']); g.el('keyboardBtn').onclick(); const pad = focusablePad(g);
  pad.activate({ family: 'k' }); const outside = g.el('helpBtn'); outside.focus();
  g.el('keyboard').onfocusout({ relatedTarget: outside });
  g.app.pause(true); g.app.pause(false); g.skip();
  assert.equal(g.document.activeElement, g.el('answer'), 'resume uses the normal typing destination after deliberately leaving the pad');
  assert.equal(g.app.state.attempts, 0); assert.equal(stage(g), 'sound');
});
