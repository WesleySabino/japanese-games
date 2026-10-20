const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function catalogue() {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/data.js'), 'utf8'), context);
  return context.JPData;
}
function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let sample = Math.imul(state ^ state >>> 15, state | 1);
    sample ^= sample + Math.imul(sample ^ sample >>> 7, sample | 61);
    return ((sample ^ sample >>> 14) >>> 0) / 4294967296;
  };
}
const toHiragana = text => Array.from(text, char => String.fromCodePoint(char.codePointAt(0) - 0x60)).join('');
const readings = kana => new Set([kana.romaji, ...kana.alt]);

test('all 104 katakana have their exact reversible hiragana counterpart, including yoon and homophones', () => {
  const data = catalogue(), kata = data.kana.filter(kana => kana.script === 'katakana');
  assert.equal(kata.length, 104);
  const partners = new Set();
  for (const kana of kata) {
    const pair = data.counterpart(kana.id);
    assert.equal(pair, data.kanaByChar[toHiragana(kana.char)], kana.id + ' exact written partner');
    assert.equal(pair.script, 'hiragana');
    assert.equal(pair.row, kana.row); assert.equal(pair.col, kana.col); assert.equal(pair.pairId, kana.pairId);
    assert.equal(data.counterpart(pair.id), kana, kana.id + ' reversible partner');
    partners.add(pair.id);
  }
  assert.equal(partners.size, 104);
});

test('each bridge offers six distinct hiragana, exactly one partner and no shared accepted reading across 128 seeds', () => {
  const data = catalogue(), before = JSON.stringify(data.kana);
  assert.equal(data.hiraganaChoiceCount, 6);
  for (const kana of data.kana.filter(kana => kana.script === 'katakana')) {
    const correct = data.counterpart(kana.id), positions = new Set();
    for (let seed = 0; seed < 128; seed++) {
      const choices = data.hiraganaChoices(kana.id, seeded(seed)), label = kana.id + ' seed ' + seed;
      assert.equal(choices.length, 6, label);
      assert.equal(new Set(choices.map(choice => choice.id)).size, 6, label);
      assert.equal(choices.filter(choice => choice === correct).length, 1, label);
      positions.add(choices.indexOf(correct));
      const accepted = new Set();
      for (const choice of choices) {
        assert.equal(choice, data.kanaById[choice.id], label + ' returns catalogue objects');
        assert.equal(choice.script, 'hiragana', label);
        assert.doesNotMatch(choice.char, /[a-z]/i, label + ' displayed symbols have no Latin label');
        for (const reading of readings(choice)) {
          assert.equal(accepted.has(reading), false, label + ' ambiguous accepted reading ' + reading);
          accepted.add(reading);
        }
      }
      const matchingKind = choices.filter(choice => choice.kind === correct.kind);
      assert.equal(matchingKind.length, correct.kind === 'handakuten' ? 5 : 6, label + ' uses the available matching kind first');
      assert.ok(choices.filter(choice => choice.kind !== correct.kind).every(choice => choice.kind === 'basic'), label + ' the five handakuten use a basic fallback for the sixth option');
      assert.deepEqual(Array.from(data.hiraganaChoices(kana.id, seeded(seed)), choice => choice.id), Array.from(choices, choice => choice.id), label + ' deterministic with the same RNG');
    }
    assert.equal(positions.size, 6, kana.id + ' correct choice can occupy all six positions');
  }
  assert.equal(JSON.stringify(data.kana), before, 'choice generation never mutates or reorders the catalogue');
});

test('homophone and alternate-reading distractors never make more than one bridge answer defensible', () => {
  const data = catalogue();
  for (const id of ['kana:ジ', 'kana:ヂ', 'kana:ズ', 'kana:ヅ', 'kana:オ', 'kana:ヲ', 'kana:シ', 'kana:チ', 'kana:フ', 'kana:ジャ']) {
    const correct = data.counterpart(id), correctReadings = readings(correct);
    for (let seed = 100; seed < 228; seed++) {
      for (const option of data.hiraganaChoices(id, seeded(seed)).filter(option => option !== correct)) {
        assert.ok([...readings(option)].every(reading => !correctReadings.has(reading)), id + ' rejects shared primary or alternate readings');
      }
    }
  }
});

test('hiragana inputs retain their own correct symbol and choice arrays are independent between calls', () => {
  const data = catalogue();
  for (const kana of data.kana.filter(kana => kana.script === 'hiragana')) {
    const first = data.hiraganaChoices(kana.id, seeded(42)), second = data.hiraganaChoices(kana.id, seeded(42));
    assert.notEqual(first, second);
    assert.equal(first.filter(choice => choice === kana).length, 1, kana.id);
    first.pop(); assert.equal(second.length, 6);
  }
});

test('bridge helpers reject unknown IDs, missing exact pairs and invalid RNG output', () => {
  const data = catalogue();
  for (const id of ['kana:?', 'kana:', 'ア', '__proto__', '', null, undefined]) {
    assert.throws(() => data.counterpart(id), /Unknown kana id/);
    assert.throws(() => data.hiraganaChoices(id), /Unknown kana id/);
  }
  const orphan = catalogue(); orphan.kanaById['kana:ア'].pairId = 'pair:missing';
  assert.throws(() => orphan.counterpart('kana:ア'), /No script counterpart/);
  assert.throws(() => orphan.hiraganaChoices('kana:ア'), /No script counterpart/);
  assert.throws(() => data.hiraganaChoices('kana:ア', null), /RNG must be a function/);
  for (const value of [-1, 1, NaN, Infinity, '0.5']) assert.throws(() => data.hiraganaChoices('kana:ア', () => value), /RNG must return a number/);
});
