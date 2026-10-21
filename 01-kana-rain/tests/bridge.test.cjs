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
const toHiragana = text => Array.from(text, char => String.fromCodePoint(char.codePointAt(0) - 0x60)).join('');

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

test('each katakana is answered by exactly the sounds its hiragana partner accepts', () => {
  const data = catalogue();
  for (const kana of data.kana.filter(kana => kana.script === 'katakana')) {
    const pair = data.counterpart(kana.id);
    assert.equal(kana.romaji, pair.romaji, kana.id);
    assert.deepEqual(Array.from(kana.alt), Array.from(pair.alt), kana.id + ' alternate spellings');
  }
});

test('the counterpart helper rejects unknown IDs and missing exact pairs', () => {
  const data = catalogue();
  for (const id of ['kana:?', 'kana:', 'ア', '__proto__', '', null, undefined]) assert.throws(() => data.counterpart(id), /Unknown kana id/);
  const orphan = catalogue(); orphan.kanaById['kana:ア'].pairId = 'pair:missing';
  assert.throws(() => orphan.counterpart('kana:ア'), /No script counterpart/);
});
